import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Proposal Agent — internal proposal draft / handoff review creation only.
// NEVER sends proposals. NEVER emails. NEVER calls Apollo / Smartlead.
// Requires: founder/admin auth, setting `proposal_agent_run_enabled`,
// confirmation phrase `RUN PROPOSAL AGENT`, dry_run=false.

const CONFIRMATION_PHRASE = "RUN PROPOSAL AGENT";
const SETTING_KEY = "proposal_agent_run_enabled";
const SOURCE_FUNCTION = "proposal-agent-run";

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userId = data.claims.sub as string;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin, userId };
}

async function logAudit(admin: any, userId: string, status: string, blocked: string | null, dryRun: boolean, phrase: string, targetId: string | null, metadata: any = {}) {
  await admin.from("agent_action_audit_log").insert({
    agent_key: "proposal_agent",
    action_type: SETTING_KEY,
    source_function: SOURCE_FUNCTION,
    target_table: "commercial_handoff_reviews",
    target_id: targetId,
    founder_user_id: userId,
    confirmation_phrase: phrase,
    dry_run: dryRun,
    action_status: status,
    blocked_reason: blocked,
    external_provider_called: false,
    email_sent: false,
    apollo_called: false,
    smartlead_post_called: false,
    metadata,
  });
}

const safe = async (q: any, fb: any = []) => { try { const { data } = await q; return data ?? fb; } catch { return fb; } };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const maxItems = Math.min(Math.max(Number(body?.max_items ?? 10), 1), 25);

    // Gather candidates: approved_action_queue rows of type proposal_*, plus
    // founder_approval_items with approval_type proposal_*, plus commercial_handoff_reviews handoff_type proposal_ready.
    const aaq = await safe(
      admin.from("approved_action_queue")
        .select("id, action_type, action_label, contact_id, conversation_id, agent_key, payload, approval_item_id, approved_at, execution_status")
        .eq("execution_status", "approved_pending_execution")
        .order("approved_at", { ascending: false })
        .limit(maxItems),
      []
    );
    const proposalAaq = (aaq as any[]).filter((r) => /proposal/i.test(r.action_type ?? "") || /proposal/i.test(r.action_label ?? ""));

    const handoffs = await safe(
      admin.from("commercial_handoff_reviews")
        .select("id, contact_id, conversation_id, handoff_type, qualification_summary, detected_need, proposed_offer, proposed_next_step, estimated_value_min, estimated_value_max, apply_status, created_at, business_id")
        .eq("apply_status", "preview")
        .in("handoff_type", ["proposal_ready", "demo_ready"])
        .order("created_at", { ascending: false })
        .limit(maxItems),
      []
    );

    const candidates: any[] = [];
    for (const a of proposalAaq) {
      candidates.push({
        source: "approved_action_queue",
        source_id: a.id,
        contact_id: a.contact_id,
        conversation_id: a.conversation_id,
        agent_key: a.agent_key ?? "proposal_agent",
        approval_item_id: a.approval_item_id ?? null,
        title: a.action_label,
        payload: a.payload ?? {},
      });
    }
    for (const h of handoffs as any[]) {
      candidates.push({
        source: "commercial_handoff_reviews",
        source_id: h.id,
        contact_id: h.contact_id,
        conversation_id: h.conversation_id,
        agent_key: "proposal_agent",
        approval_item_id: null,
        title: `Proposal draft from handoff · ${h.handoff_type}`,
        payload: {
          qualification_summary: h.qualification_summary,
          detected_need: h.detected_need,
          proposed_offer: h.proposed_offer,
          proposed_next_step: h.proposed_next_step,
          estimated_value_min: h.estimated_value_min,
          estimated_value_max: h.estimated_value_max,
          business_id: h.business_id ?? null,
        },
      });
    }

    const { data: enabledRaw } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: SETTING_KEY });
    const enabled = enabledRaw === true;

    const summary = {
      total_candidates: candidates.length,
      proposal_aaq: proposalAaq.length,
      handoff_candidates: handoffs.length,
    };

    if (!enabled) {
      await logAudit(admin, userId, "blocked", "setting_disabled", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "setting_disabled", setting_key: SETTING_KEY, ...summary, drafts_created: 0, approvals_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      await logAudit(admin, userId, "blocked", "missing_confirmation_phrase", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CONFIRMATION_PHRASE, ...summary, drafts_created: 0, approvals_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      await logAudit(admin, userId, "preview", "dry_run", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...summary, drafts_created: 0, approvals_created: 0, candidates: candidates.slice(0, 25) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Live: create commercial_handoff_reviews (proposal draft payload) + founder_approval_items
    let draftsCreated = 0;
    let approvalsCreated = 0;
    const createdIds: string[] = [];

    for (const c of candidates.slice(0, maxItems)) {
      const valueMin = c.payload?.estimated_value_min ?? null;
      const valueMax = c.payload?.estimated_value_max ?? null;
      const offer = c.payload?.proposed_offer ?? c.payload?.draft_subject ?? "Tailored Liftor proposal — to be drafted by founder.";
      const next = c.payload?.proposed_next_step ?? "Founder reviews and triggers proposal generation.";
      const summaryText = c.payload?.qualification_summary ?? c.payload?.recommended_action ?? c.title;

      const { data: chr, error: chrErr } = await admin.from("commercial_handoff_reviews").insert({
        business_id: c.payload?.business_id ?? null,
        contact_id: c.contact_id ?? null,
        conversation_id: c.conversation_id ?? null,
        approval_item_id: c.approval_item_id ?? null,
        handoff_type: "proposal_ready",
        qualification_summary: summaryText,
        detected_need: c.payload?.detected_need ?? null,
        proposed_offer: offer,
        proposed_next_step: next,
        estimated_value_min: valueMin,
        estimated_value_max: valueMax,
        proposal_allowed: false,
        demo_allowed: false,
        deal_allowed: false,
        founder_review_required: true,
        apply_status: "draft_pending_founder_review",
        blockers: ["awaiting_founder_proposal_generation", "no_external_send"],
        metadata: { source: SOURCE_FUNCTION, source_table: c.source, source_id: c.source_id, payload: c.payload },
      }).select("id").maybeSingle();

      if (chrErr) {
        await logAudit(admin, userId, "error", chrErr.message, false, phrase, null, { source: c.source, source_id: c.source_id });
        continue;
      }
      draftsCreated++;
      createdIds.push(chr!.id);
      await logAudit(admin, userId, "applied", null, false, phrase, chr!.id, { kind: "handoff_review_proposal_draft" });

      const { data: fai, error: faiErr } = await admin.from("founder_approval_items").insert({
        business_id: c.payload?.business_id ?? null,
        approval_type: "proposal_draft_review",
        source_system: "proposal-agent",
        source_table: "commercial_handoff_reviews",
        source_id: chr!.id,
        agent_key: "proposal_agent",
        contact_id: c.contact_id ?? null,
        conversation_id: c.conversation_id ?? null,
        title: `Proposal draft ready for review · ${c.title}`.slice(0, 500),
        summary: summaryText,
        recommended_action: "Review proposal draft outline. Generate full proposal only after founder approval. No external send happens automatically.",
        priority_level: "normal",
        risk_flags: [],
        compliance_flags: [],
        status: "pending",
        execution_enabled: false,
        auto_execute_allowed: false,
        send_allowed: false,
        metadata: { handoff_review_id: chr!.id, source_function: SOURCE_FUNCTION },
      }).select("id").maybeSingle();
      if (!faiErr && fai) {
        approvalsCreated++;
        await logAudit(admin, userId, "applied", null, false, phrase, fai.id, { kind: "founder_approval_item_proposal" });
      }

      // Mark feeder approved_action_queue row as fulfilled-into-draft (still execution_locked)
      if (c.source === "approved_action_queue") {
        await admin.from("approved_action_queue").update({
          execution_status: "draft_created_pending_review",
          metadata: { ...(c.payload ?? {}), proposal_handoff_review_id: chr!.id },
        }).eq("id", c.source_id);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      blocked: false,
      ...summary,
      drafts_created: draftsCreated,
      approvals_created: approvalsCreated,
      created_handoff_review_ids: createdIds,
      proposals_sent: 0,
      emails_sent: 0,
      provider_calls: 0,
      deals_created: 0,
      invoices_created: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
