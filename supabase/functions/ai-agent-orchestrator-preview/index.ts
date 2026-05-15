import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// AI Agent Orchestrator — PREVIEW ONLY.
// Inspects CRM ledger, conversations, provider events, proposals, deals,
// invoices, and system warnings; proposes a list of safe agent tasks.
// NO writes. NO sends. NO Apollo. NO Smartlead POSTs.

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

const safeSelect = async (admin: any, table: string, sel: string, build?: (q: any) => any) => {
  try {
    let q = admin.from(table).select(sel).limit(25);
    if (build) q = build(q);
    const { data, error } = await q;
    if (error) return [];
    return data ?? [];
  } catch {
    return [];
  }
};

type Task = {
  task_type: string;
  task_title: string;
  task_summary?: string;
  agent_key: string;
  priority_level: "low" | "normal" | "high" | "urgent";
  source_system?: string;
  source_table?: string;
  source_id?: string;
  contact_id?: string;
  conversation_id?: string;
  interaction_id?: string;
  proposal_id?: string;
  deal_id?: string;
  invoice_id?: string;
  supplier_id?: string;
  business_id?: string;
  dependencies: string[];
  blockers: string[];
  recommended_action: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    const tasks: Task[] = [];

    // 1. CRM ledger inbound replies → classify_inbound_reply / draft_reply
    const inbound = await safeSelect(admin, "crm_interaction_ledger", "id, contact_id, business_id, interaction_type, occurred_at",
      (q: any) => q.in("interaction_type", ["email_inbound", "reply_received"]).order("occurred_at", { ascending: false }));
    for (const row of inbound) {
      tasks.push({
        task_type: "classify_inbound_reply",
        task_title: `Classify inbound reply ${row.id}`,
        agent_key: "inbox_agent",
        priority_level: "high",
        source_system: "crm_interaction_ledger",
        source_table: "crm_interaction_ledger",
        source_id: row.id,
        contact_id: row.contact_id,
        business_id: row.business_id,
        interaction_id: row.id,
        dependencies: ["crm_ready"],
        blockers: [],
        recommended_action: "Classify intent and propose draft reply.",
      });
    }

    // 2. Conversations open without recent agent action → recommend_next_action
    const convs = await safeSelect(admin, "conversations", "id, contact_id, business_id, status, updated_at",
      (q: any) => q.eq("status", "open").order("updated_at", { ascending: false }));
    for (const c of convs) {
      tasks.push({
        task_type: "recommend_next_action",
        task_title: `Recommend next action for conversation ${c.id}`,
        agent_key: "ai_engagement_agent",
        priority_level: "normal",
        source_system: "conversations",
        source_table: "conversations",
        source_id: c.id,
        contact_id: c.contact_id,
        business_id: c.business_id,
        conversation_id: c.id,
        dependencies: ["crm_ready"],
        blockers: [],
        recommended_action: "Summarise + recommend next CRM action.",
      });
    }

    // 3. Provider events without CRM match → smartlead_event_review
    const provEvents = await safeSelect(admin, "smartlead_events", "id, event_type, occurred_at",
      (q: any) => q.order("occurred_at", { ascending: false }));
    for (const e of provEvents) {
      tasks.push({
        task_type: "smartlead_event_review",
        task_title: `Review Smartlead event ${e.event_type ?? "event"} ${e.id}`,
        agent_key: "outreach_agent",
        priority_level: "low",
        source_system: "smartlead",
        source_table: "smartlead_events",
        source_id: e.id,
        dependencies: [],
        blockers: [],
        recommended_action: "Match to CRM contact and propose follow-up.",
      });
    }

    // 4. Proposals in draft → prepare_proposal_preview
    const props = await safeSelect(admin, "proposals", "id, business_id, status",
      (q: any) => q.in("status", ["draft", "preview"]));
    for (const p of props) {
      tasks.push({
        task_type: "prepare_proposal_preview",
        task_title: `Refine proposal preview ${p.id}`,
        agent_key: "proposal_agent",
        priority_level: "normal",
        source_system: "proposals",
        source_table: "proposals",
        source_id: p.id,
        proposal_id: p.id,
        business_id: p.business_id,
        dependencies: [],
        blockers: [],
        recommended_action: "Generate proposal draft for founder approval.",
      });
    }

    // 5. Deals open → prepare_deal_preview
    const deals = await safeSelect(admin, "deals", "id, business_id, stage, status",
      (q: any) => q.not("stage", "in", '("won","lost","closed")'));
    for (const d of deals) {
      tasks.push({
        task_type: "prepare_deal_preview",
        task_title: `Recommend deal move ${d.id}`,
        agent_key: "deal_agent",
        priority_level: "normal",
        source_system: "deals",
        source_table: "deals",
        source_id: d.id,
        deal_id: d.id,
        business_id: d.business_id,
        dependencies: [],
        blockers: [],
        recommended_action: "Recommend stage move or next deal action.",
      });
    }

    // 6. Invoices unpaid → prepare_invoice_preview
    const invoices = await safeSelect(admin, "invoices", "id, business_id, status",
      (q: any) => q.in("status", ["sent", "overdue", "draft"]));
    for (const i of invoices) {
      tasks.push({
        task_type: "prepare_invoice_preview",
        task_title: `Recommend invoice action ${i.id}`,
        agent_key: "finance_agent",
        priority_level: i.status === "overdue" ? "high" : "normal",
        source_system: "invoices",
        source_table: "invoices",
        source_id: i.id,
        invoice_id: i.id,
        business_id: i.business_id,
        dependencies: [],
        blockers: [],
        recommended_action: "Recommend chase or finance follow-up.",
      });
    }

    // 7. System warnings → system_warning_triage
    const warnings = await safeSelect(admin, "system_warnings", "id, severity, title", (q: any) => q.eq("status", "open"));
    for (const w of warnings) {
      tasks.push({
        task_type: "system_warning_triage",
        task_title: `Triage warning ${w.title ?? w.id}`,
        agent_key: "ops_agent",
        priority_level: w.severity === "critical" ? "urgent" : "normal",
        source_system: "system_warnings",
        source_table: "system_warnings",
        source_id: w.id,
        dependencies: [],
        blockers: [],
        recommended_action: "Triage and propose remediation.",
      });
    }

    // 8. Founder daily brief — singleton task
    tasks.push({
      task_type: "founder_daily_brief",
      task_title: "Compile founder daily brief",
      agent_key: "founder_copilot_agent",
      priority_level: "normal",
      dependencies: [],
      blockers: [],
      recommended_action: "Compile cross-system daily brief for founder.",
    });

    const byAgent: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byType: Record<string, number> = {};
    for (const t of tasks) {
      byAgent[t.agent_key] = (byAgent[t.agent_key] ?? 0) + 1;
      byPriority[t.priority_level] = (byPriority[t.priority_level] ?? 0) + 1;
      byType[t.task_type] = (byType[t.task_type] ?? 0) + 1;
    }

    const queueEnabled = (Deno.env.get("AI_AGENT_TASK_QUEUE_ENABLED") ?? "").toLowerCase() === "true";

    return new Response(
      JSON.stringify({
        ok: true,
        no_writes: true,
        no_send: true,
        queue_enabled: queueEnabled,
        queue_status: queueEnabled ? "enabled" : "disabled",
        total_proposed: tasks.length,
        by_agent: byAgent,
        by_priority: byPriority,
        by_type: byType,
        sample: tasks.slice(0, 50),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});