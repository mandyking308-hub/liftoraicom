import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Founder Approval Console — PREVIEW ONLY.
// Reads pending items from founder_approval_items + AI drafts + agent task
// queue + CRM next actions and returns a unified queue.
// NEVER writes. NEVER sends. NEVER calls Apollo or Smartlead.

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
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", data.claims.sub);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin };
}

const safe = async (q: any, fb: any = []) => { try { const { data } = await q; return data ?? fb; } catch { return fb; } };

type Item = {
  id: string;
  approval_type: string;
  source_system?: string;
  agent_key?: string;
  contact_id?: string | null;
  conversation_id?: string | null;
  proposal_id?: string | null;
  title: string;
  summary?: string;
  recommended_action?: string;
  draft_subject?: string | null;
  draft_body?: string | null;
  priority_level: string;
  risk_flags: string[];
  compliance_flags: string[];
  status: string;
  execution_enabled: boolean;
  send_allowed: boolean;
  created_at?: string;
  origin: "persisted" | "synthetic";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const types = await safe(admin.from("founder_approval_types").select("*").eq("active", true).order("type_key"), []);
    const persisted = await safe(
      admin.from("founder_approval_items").select("*").eq("status", "pending").order("created_at", { ascending: false }).limit(100),
      []
    );

    const items: Item[] = (persisted as any[]).map((p) => ({
      id: p.id,
      approval_type: p.approval_type,
      source_system: p.source_system,
      agent_key: p.agent_key,
      contact_id: p.contact_id,
      conversation_id: p.conversation_id,
      proposal_id: p.proposal_id,
      title: p.title,
      summary: p.summary,
      recommended_action: p.recommended_action,
      draft_subject: p.draft_subject,
      draft_body: p.draft_body,
      priority_level: p.priority_level,
      risk_flags: Array.isArray(p.risk_flags) ? p.risk_flags : [],
      compliance_flags: Array.isArray(p.compliance_flags) ? p.compliance_flags : [],
      status: p.status,
      execution_enabled: p.execution_enabled,
      send_allowed: p.send_allowed,
      created_at: p.created_at,
      origin: "persisted",
    }));

    // Synthetic surface: AI drafts, agent task queue, CRM next actions.
    const drafts = await safe(
      admin.from("ai_conversation_draft_reviews")
        .select("id,detected_intent,tone_profile,draft_subject,draft_body,risk_flags,compliance_flags,contact_id,conversation_id,approval_status,created_at")
        .eq("approval_status", "draft").order("created_at", { ascending: false }).limit(25),
      []
    );
    for (const d of drafts as any[]) {
      items.push({
        id: `draft:${d.id}`,
        approval_type: "ai_reply_draft",
        source_system: "ai-conversation-draft",
        agent_key: "inbox_agent",
        contact_id: d.contact_id,
        conversation_id: d.conversation_id,
        title: `AI reply · ${d.detected_intent ?? "general"}`,
        summary: `Tone: ${d.tone_profile ?? "warm_confident_concise"}`,
        recommended_action: "Review draft, edit if needed, then approve. Send remains gated.",
        draft_subject: d.draft_subject,
        draft_body: d.draft_body,
        priority_level: (d.risk_flags ?? []).includes("intent_unknown_hold_for_review") ? "high" : "normal",
        risk_flags: d.risk_flags ?? [],
        compliance_flags: d.compliance_flags ?? [],
        status: "pending",
        execution_enabled: false,
        send_allowed: false,
        created_at: d.created_at,
        origin: "persisted",
      });
    }

    const tasks = await safe(
      admin.from("ai_agent_task_queue")
        .select("id,task_type,task_title,task_summary,agent_key,priority_level,contact_id,conversation_id,status,created_at,risk_flags")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(25),
      []
    );
    for (const t of tasks as any[]) {
      items.push({
        id: `task:${t.id}`,
        approval_type: "crm_next_action",
        source_system: "ai-agent-orchestrator",
        agent_key: t.agent_key,
        contact_id: t.contact_id,
        conversation_id: t.conversation_id,
        title: t.task_title ?? t.task_type,
        summary: t.task_summary,
        recommended_action: "Approve task to allow agent to execute (apply still disabled).",
        priority_level: t.priority_level ?? "normal",
        risk_flags: t.risk_flags ?? [],
        compliance_flags: [],
        status: "pending",
        execution_enabled: false,
        send_allowed: false,
        created_at: t.created_at,
        origin: "persisted",
      });
    }

    const nextActions = await safe(
      admin.from("crm_contact_next_actions")
        .select("id,contact_id,action_type,action_title,priority_level,due_at,reason,status,created_at")
        .eq("status", "pending").order("created_at", { ascending: false }).limit(25),
      []
    );
    for (const n of nextActions as any[]) {
      items.push({
        id: `next:${n.id}`,
        approval_type: "crm_next_action",
        source_system: "crm-lifecycle",
        agent_key: "crm_agent",
        contact_id: n.contact_id,
        conversation_id: null,
        title: n.action_title ?? n.action_type ?? "CRM next action",
        summary: n.reason,
        recommended_action: "Approve to schedule. Execution still disabled.",
        priority_level: n.priority_level ?? "normal",
        risk_flags: [],
        compliance_flags: [],
        status: "pending",
        execution_enabled: false,
        send_allowed: false,
        created_at: n.created_at,
        origin: "synthetic",
      });
    }

    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const it of items) {
      byType[it.approval_type] = (byType[it.approval_type] ?? 0) + 1;
      byPriority[it.priority_level] = (byPriority[it.priority_level] ?? 0) + 1;
      if (it.agent_key) byAgent[it.agent_key] = (byAgent[it.agent_key] ?? 0) + 1;
    }

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      send_enabled: false,
      auto_execute_enabled: false,
      apply_enabled: false,
      apply_disabled_reason: "founder_approval_apply_disabled",
      total_pending: items.length,
      by_type: byType,
      by_priority: byPriority,
      by_agent: byAgent,
      types,
      items: items.slice(0, 100),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});