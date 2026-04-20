import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PER_RUN_LIMIT = 100;

// Send variance: random jitter between sends to avoid pattern detection
function jitterMs(): number {
  // 30s → 180s
  return Math.floor(30_000 + Math.random() * 150_000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const now = new Date();

    // ===== SYSTEM MODE GUARD =====
    const { data: modeRow } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "system_mode")
      .maybeSingle();
    const systemMode: string =
      typeof modeRow?.value === "string" ? modeRow.value : (modeRow?.value ?? "test");
    const isLive = systemMode === "live";

    // Pull due items ordered by priority FIRST (reply-priority items get priority=10),
    // then by scheduled_at. Includes previously delayed/throttled items whose retry time has arrived.
    const { data: due, error } = await supabase
      .from("email_queue")
      .select("id, contact_id, campaign_id, sequence_step, inbox_id, business_name, scheduled_at, priority, retry_count")
      .in("status", ["pending", "delayed", "throttled"])
      .lte("scheduled_at", now.toISOString())
      .order("priority", { ascending: true })
      .order("scheduled_at", { ascending: true })
      .limit(PER_RUN_LIMIT);
    if (error) return json({ error: error.message }, 500);
    if (!due?.length) return json({ processed: 0, sent: 0, blocked: 0, delayed: 0, mode: systemMode }, 200);

    let sent = 0, blocked = 0, failed = 0, delayed = 0;
    const touchedCampaigns = new Set<string>();

    for (let idx = 0; idx < due.length; idx++) {
      const item = due[idx];
      // Variance between sends (skip jitter on first item)
      if (idx > 0 && sent > 0) {
        await new Promise((r) => setTimeout(r, jitterMs()));
      }

      // ===== THROTTLE / WINDOW / REPUTATION CHECK =====
      if (item.inbox_id) {
        // Ramp enforcement (day 1-3 = 20, day 4-7 = 40, day 8+ = 80)
        const { data: ramp } = await supabase.rpc("enforce_inbox_ramp", { _inbox_id: item.inbox_id });
        const rampDecision = ramp as { allowed: boolean; reason?: string } | null;
        if (rampDecision && !rampDecision.allowed) {
          await supabase.from("email_queue").update({
            status: "delayed",
            block_reason: rampDecision.reason ?? "RAMP_LIMIT_REACHED",
            scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          }).eq("id", item.id);
          delayed += 1;
          continue;
        }

        const { data: throttle } = await supabase.rpc("check_send_throttle", {
          _inbox_id: item.inbox_id,
          _contact_id: item.contact_id,
        });
        const decision = throttle as { allowed: boolean; reason: string; retry_at: string | null } | null;
        if (decision && !decision.allowed) {
          const retryAt = decision.retry_at ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const newStatus = decision.reason === "REPUTATION_PAUSE" || decision.reason === "DOMAIN_REPUTATION_PAUSE"
            ? "throttled" : "delayed";
          await supabase.from("email_queue").update({
            status: newStatus,
            block_reason: decision.reason,
            scheduled_at: retryAt,
          }).eq("id", item.id);
          await supabase.from("activity_log").insert({
            event_type: newStatus === "throttled" ? "send_blocked" : "send_delayed",
            description: `Queue ${item.id} ${newStatus}: ${decision.reason}`,
            entity_type: "email_queue",
            entity_id: item.id,
          });
          delayed += 1;
          continue;
        }
      }

      // Fetch sequence step content
      const { data: seq } = await supabase
        .from("outreach_sequences")
        .select("subject, body")
        .eq("campaign_id", item.campaign_id)
        .eq("step_number", item.sequence_step)
        .maybeSingle();

      // Re-check: skip if a reply has already arrived for this contact
      const { data: replyEvt } = await supabase.from("email_events")
        .select("id").eq("contact_id", item.contact_id).eq("event_type", "replied").limit(1);
      if (replyEvt && replyEvt.length) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: "REPLY_RECEIVED" })
          .eq("id", item.id);
        blocked += 1;
        touchedCampaigns.add(item.campaign_id);
        continue;
      }

      // Sanity check via shared edge function
      const checkRes = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/crm-send-check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          contact_id: item.contact_id,
          log_attempt: true,
          channel: "email",
          message: seq ? `[${seq.subject}] ${seq.body}\n\n<!-- tracking_pixel:${item.id} -->` : `Step ${item.sequence_step}`,
          ai_generated: false,
        }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));
      const allowed = checkJson?.allowed === true;

      if (!allowed) {
        await supabase.from("email_queue")
          .update({ status: "blocked", block_reason: checkJson?.reason ?? "BLOCKED" })
          .eq("id", item.id);
        blocked += 1;
        touchedCampaigns.add(item.campaign_id);
        continue;
      }

      // SIMULATED SEND in test mode; real SMTP wiring will replace this block in live.
      // The communication row + last_contacted_at update are already handled by crm-send-check (log_attempt)
      // and the contacts trigger handle_new_communication.
      try {
        if (!isLive) {
          // TEST MODE: do not call SMTP. Mark as sent (simulated) for analytics continuity.
          await supabase.from("activity_log").insert({
            event_type: "send_simulated",
            description: `TEST MODE — simulated send for queue ${item.id}`,
            entity_type: "email_queue",
            entity_id: item.id,
          });
        }
        // Log a synthetic "sent" email_event tagged with the queue id
        await supabase.from("email_events").insert({
          contact_id: item.contact_id,
          event_type: "sent",
          email_id: item.id,
        });

        await supabase.from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString(), last_attempt_at: new Date().toISOString() })
          .eq("id", item.id);

        // Reset consecutive_failures for the inbox on success
        if (item.inbox_id) {
          await supabase.from("inboxes")
            .update({ consecutive_failures: 0 })
            .eq("id", item.inbox_id);
        }

        sent += 1;
        touchedCampaigns.add(item.campaign_id);
      } catch (err) {
        // Soft-fail retry: mark_send_failure handles exponential backoff (5/20/60 min)
        // and only marks as "failed" after 3 attempts.
        const { data: retryResult } = await supabase.rpc("mark_send_failure", {
          _queue_id: item.id,
          _error: (err as Error).message,
        });
        const result = retryResult as { status: string } | null;
        if (result?.status === "failed") {
          failed += 1;
        } else {
          delayed += 1;
        }

        // Bump consecutive_failures on the inbox
        if (item.inbox_id) {
          await supabase.rpc("increment_inbox_failures", { _inbox_id: item.inbox_id }).then(
            () => {},
            async () => {
              // Fallback if RPC doesn't exist yet — just count it as a soft failure
              const { data: inb } = await supabase.from("inboxes")
                .select("consecutive_failures").eq("id", item.inbox_id).maybeSingle();
              await supabase.from("inboxes")
                .update({ consecutive_failures: (inb?.consecutive_failures ?? 0) + 1 })
                .eq("id", item.inbox_id);
            }
          );
        }
      }
    }

    for (const cid of touchedCampaigns) {
      await supabase.rpc("recompute_campaign_metrics", { _campaign_id: cid });
    }

    return json({ processed: due.length, sent, blocked, failed, delayed, mode: systemMode }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
