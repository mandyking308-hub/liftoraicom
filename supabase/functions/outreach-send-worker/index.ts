import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SEND_WINDOW_START_UTC = 8;
const SEND_WINDOW_END_UTC = 17;
const PER_RUN_LIMIT = 100;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const now = new Date();
    const hourUtc = now.getUTCHours();
    const inWindow = hourUtc >= SEND_WINDOW_START_UTC && hourUtc < SEND_WINDOW_END_UTC;

    // Pull due pending items
    const { data: due, error } = await supabase
      .from("email_queue")
      .select("id, contact_id, campaign_id, sequence_step, inbox_id, business_name, scheduled_at")
      .eq("status", "pending")
      .lte("scheduled_at", now.toISOString())
      .order("scheduled_at", { ascending: true })
      .limit(PER_RUN_LIMIT);
    if (error) return json({ error: error.message }, 500);
    if (!due?.length) return json({ processed: 0, sent: 0, blocked: 0, skipped_window: 0 }, 200);

    let sent = 0, blocked = 0, failed = 0, skipped_window = 0;
    const touchedCampaigns = new Set<string>();

    for (const item of due) {
      // Window check (use UTC; per spec contact country could refine — kept simple)
      if (!inWindow) { skipped_window += 1; continue; }

      // Fetch sequence step content
      const { data: seq } = await supabase
        .from("outreach_sequences")
        .select("subject, body")
        .eq("campaign_id", item.campaign_id)
        .eq("step_number", item.sequence_step)
        .maybeSingle();

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
          message: seq ? `[${seq.subject}] ${seq.body}` : `Step ${item.sequence_step}`,
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

      // SIMULATED SEND: real SMTP wiring will replace this block.
      // The communication row + last_contacted_at update are already handled by crm-send-check (log_attempt)
      // and the contacts trigger handle_new_communication.
      try {
        // Log a synthetic "sent" email_event tagged with the queue id
        await supabase.from("email_events").insert({
          contact_id: item.contact_id,
          event_type: "sent",
          email_id: item.id,
        });

        await supabase.from("email_queue")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", item.id);
        sent += 1;
        touchedCampaigns.add(item.campaign_id);
      } catch (err) {
        await supabase.from("email_queue")
          .update({ status: "failed", block_reason: (err as Error).message.slice(0, 200) })
          .eq("id", item.id);
        failed += 1;
      }
    }

    for (const cid of touchedCampaigns) {
      await supabase.rpc("recompute_campaign_metrics", { _campaign_id: cid });
    }

    return json({ processed: due.length, sent, blocked, failed, skipped_window }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
