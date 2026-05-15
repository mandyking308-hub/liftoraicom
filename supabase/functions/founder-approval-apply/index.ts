import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Business-live writer (founder-approved internal record creation only).
// Requires: founder/admin auth, business-live setting "founder_approval_item_creation_enabled" enabled,
// confirmation_phrase === "CREATE FOUNDER APPROVAL ITEMS", and dry_run === false.
// NEVER sends email. NEVER calls Apollo. NEVER POSTs to Smartlead.

const CREATE_PHRASE = "CREATE FOUNDER APPROVAL ITEMS";
const CREATE_SETTING_KEY = "founder_approval_item_creation_enabled";
const DECISION_PHRASE = "RECORD FOUNDER DECISION";
const DECISION_SETTING_KEY = "founder_approval_decision_recording_enabled";
const QUEUE_SETTING_KEY = "approved_action_queue_creation_enabled";
const VALID_DECISIONS = new Set(["approve", "reject", "edit_required", "escalate", "park"]);
const TARGET_TABLE = "founder_approval_items";
const SOURCE_FUNCTION = "founder-approval-apply";

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
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

async function logAudit(admin: any, userId: string, status: string, blockedReason: string | null, dryRun: boolean, phrase: string, targetId: string | null, metadata: any = {}, actionType = CREATE_SETTING_KEY) {
  await admin.from("agent_action_audit_log").insert({
    agent_key: "founder_console",
    action_type: actionType,
    source_function: SOURCE_FUNCTION,
    target_table: TARGET_TABLE,
    target_id: targetId,
    founder_user_id: userId,
    confirmation_phrase: phrase,
    dry_run: dryRun,
    action_status: status,
    blocked_reason: blockedReason,
    external_provider_called: false,
    email_sent: false,
    apollo_called: false,
    smartlead_post_called: false,
    metadata,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const baseAudit = { records_created: 0, emails_sent: 0, provider_calls: 0 };
    const decision = body?.decision ?? null;

    // ===== Decision recording path =====
    if (decision && body?.item_id) {
      if (!VALID_DECISIONS.has(decision)) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_decision", allowed: Array.from(VALID_DECISIONS) }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: decEnabled } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: DECISION_SETTING_KEY });
      if (decEnabled !== true) {
        await logAudit(admin, userId, "blocked", "decision_setting_disabled", dryRun, phrase, body.item_id, { decision }, DECISION_SETTING_KEY);
        return new Response(JSON.stringify({ ok: true, blocked: true, reason: "decision_setting_disabled", setting_key: DECISION_SETTING_KEY, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (phrase !== DECISION_PHRASE) {
        await logAudit(admin, userId, "blocked", "missing_confirmation_phrase", dryRun, phrase, body.item_id, { decision }, DECISION_SETTING_KEY);
        return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: DECISION_PHRASE, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (dryRun) {
        await logAudit(admin, userId, "preview", "dry_run", dryRun, phrase, body.item_id, { decision }, DECISION_SETTING_KEY);
        return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const statusMap: Record<string, string> = { approve: "approved", reject: "rejected", edit_required: "edit_required", escalate: "escalated", park: "parked" };
      const newStatus = statusMap[decision];
      const { data: existing } = await admin.from("founder_approval_items").select("id, source_table, source_id, agent_key, contact_id, conversation_id, business_id, title, draft_subject, draft_body, recommended_action, risk_flags, compliance_flags, approval_type").eq("id", body.item_id).maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ ok: false, error: "approval_item_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const update: any = {
        founder_decision: decision,
        status: newStatus,
        founder_notes: body?.founder_notes ?? null,
        decided_at: new Date().toISOString(),
      };
      const { error: upErr } = await admin.from("founder_approval_items").update(update).eq("id", body.item_id);
      if (upErr) {
        await logAudit(admin, userId, "error", upErr.message, false, phrase, body.item_id, { decision }, DECISION_SETTING_KEY);
        return new Response(JSON.stringify({ ok: false, error: upErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Mirror approval_status onto linked AI conversation draft if approval source was a draft
      if (existing.source_table === "ai_conversation_draft_reviews" && existing.source_id) {
        const draftStatusMap: Record<string, string> = { approve: "approved", reject: "rejected", edit_required: "edit_required", escalate: "escalated", park: "parked" };
        await admin.from("ai_conversation_draft_reviews")
          .update({ approval_status: draftStatusMap[decision], reviewed_by: userId, reviewed_at: new Date().toISOString() })
          .eq("id", existing.source_id);
      }

      let queuedId: string | null = null;
      if (decision === "approve") {
        const { data: queueEnabled } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: QUEUE_SETTING_KEY });
        if (queueEnabled === true) {
          const draft = !!existing.draft_body;
          const externalSend = draft || existing.approval_type === "ai_reply" || existing.approval_type === "outbound_send";
          const providerMutation = externalSend || /smartlead|apollo|provider/i.test(existing.approval_type ?? "");
          const { data: q, error: qErr } = await admin.from("approved_action_queue").insert({
            business_id: existing.business_id ?? null,
            approval_item_id: existing.id,
            agent_key: existing.agent_key ?? null,
            action_type: existing.approval_type ?? "general",
            action_label: existing.title ?? "Approved action",
            contact_id: existing.contact_id ?? null,
            conversation_id: existing.conversation_id ?? null,
            payload: {
              draft_subject: existing.draft_subject ?? null,
              draft_body: existing.draft_body ?? null,
              recommended_action: existing.recommended_action ?? null,
              risk_flags: existing.risk_flags ?? [],
              compliance_flags: existing.compliance_flags ?? [],
              founder_notes: body?.founder_notes ?? null,
            },
            execution_status: "approved_pending_execution",
            execution_allowed: false,
            external_send_required: externalSend,
            provider_mutation_required: providerMutation,
            founder_user_id: userId,
            blocked_reason: "no_send_function_enabled",
            metadata: { source: "founder-approval-apply" },
          }).select("id").maybeSingle();
          if (qErr) {
            await logAudit(admin, userId, "error", qErr.message, false, phrase, body.item_id, { decision, queue_error: true }, QUEUE_SETTING_KEY);
          } else {
            queuedId = q?.id ?? null;
            await logAudit(admin, userId, "applied", null, false, phrase, queuedId, { decision, queued: true }, QUEUE_SETTING_KEY);
          }
        }
      }

      await logAudit(admin, userId, "applied", null, false, phrase, body.item_id, { decision, queued_id: queuedId }, DECISION_SETTING_KEY);
      return new Response(JSON.stringify({
        ok: true,
        blocked: false,
        decision_recorded: true,
        id: body.item_id,
        new_status: newStatus,
        approved_action_queued: !!queuedId,
        approved_action_id: queuedId,
        records_created: queuedId ? 1 : 0,
        emails_sent: 0,
        provider_calls: 0,
        downstream_actions_executed: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== Item creation path (legacy) =====
    const { data: createEnabled } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: CREATE_SETTING_KEY });
    if (createEnabled !== true) {
      await logAudit(admin, userId, "blocked", "setting_disabled", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "setting_disabled", setting_key: CREATE_SETTING_KEY, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CREATE_PHRASE) {
      await logAudit(admin, userId, "blocked", "missing_confirmation_phrase", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CREATE_PHRASE, ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      await logAudit(admin, userId, "preview", "dry_run", dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "no_items_or_decision", ...baseAudit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const rows = items.slice(0, 50).map((it: any) => ({
      business_id: it.business_id ?? null,
      approval_type: String(it.approval_type ?? "general_review"),
      source_system: it.source_system ?? null,
      source_table: it.source_table ?? null,
      source_id: it.source_id ?? null,
      agent_key: it.agent_key ?? null,
      contact_id: it.contact_id ?? null,
      conversation_id: it.conversation_id ?? null,
      title: String(it.title ?? "Untitled approval").slice(0, 500),
      summary: it.summary ?? null,
      recommended_action: it.recommended_action ?? null,
      draft_subject: it.draft_subject ?? null,
      draft_body: it.draft_body ?? null,
      priority_level: it.priority_level ?? "normal",
      risk_flags: it.risk_flags ?? [],
      compliance_flags: it.compliance_flags ?? [],
      status: "pending",
      execution_enabled: false,
      auto_execute_allowed: false,
      send_allowed: false,
    }));
    const { data: inserted, error } = await admin.from("founder_approval_items").insert(rows).select("id");
    if (error) {
      await logAudit(admin, userId, "error", error.message, dryRun, phrase, null, { body });
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    for (const r of inserted ?? []) await logAudit(admin, userId, "applied", null, false, phrase, r.id, {});
    return new Response(JSON.stringify({ ok: true, blocked: false, records_created: inserted?.length ?? 0, ids: inserted?.map((r: any) => r.id) ?? [], emails_sent: 0, provider_calls: 0, downstream_actions_executed: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
