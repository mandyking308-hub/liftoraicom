import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Finding = {
  rule_key: string;
  business_id?: string | null;
  severity: string;
  finding_title: string;
  finding_summary?: string;
  source_table?: string | null;
  source_id?: string | null;
  recommended_repair?: string;
  repair_safe: boolean;
  founder_approval_required: boolean;
  metadata?: Record<string, unknown>;
};

async function safeCount(admin: any, table: string, filter?: (q: any) => any): Promise<number> {
  try {
    let q = admin.from(table).select("*", { count: "exact", head: true });
    if (filter) q = filter(q);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const persist = body?.persist === true;

    const { data: rules } = await admin.from("self_healing_rules").select("*").eq("enabled", true);
    const ruleMap: Record<string, any> = {};
    for (const r of rules || []) ruleMap[r.rule_key] = r;

    const findings: Finding[] = [];
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    const month = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const h48 = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const h72 = new Date(Date.now() - 72 * 3600 * 1000).toISOString();
    const d5 = new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString();

    function add(key: string, title: string, summary: string, count: number) {
      const rule = ruleMap[key]; if (!rule || count <= 0) return;
      findings.push({
        rule_key: key, severity: rule.severity, finding_title: title, finding_summary: summary,
        source_table: null, source_id: null,
        recommended_repair: rule.repair_action_type || "flag_for_review",
        repair_safe: rule.safe_auto_repair_allowed === true,
        founder_approval_required: rule.founder_approval_required !== false,
        metadata: { count },
      });
    }

    add("stuck_agent_tasks","Stuck agent tasks","Tasks pending > 24h",
      await safeCount(admin, "ai_agent_task_queue", (q)=>q.eq("status","pending").lt("created_at", dayAgo)));
    add("failed_edge_function","Failed workflow executions","Failures in last 7d",
      await safeCount(admin, "workflow_executions", (q)=>q.eq("status","failed").gte("created_at", weekAgo)));
    add("crm_empty_timeline","CRM contacts with no recent interactions","Contacts inactive > 30d",
      await safeCount(admin, "crm_contacts", (q)=>q.lt("updated_at", month)));
    add("high_unanswered_warm_leads","Unanswered warm leads","Warm replies pending > 48h",
      await safeCount(admin, "crm_interactions", (q)=>q.eq("interaction_type","reply").lt("created_at", h48)));
    add("overdue_founder_approvals","Overdue founder approvals","Approval items pending > 72h",
      await safeCount(admin, "founder_approvals", (q)=>q.eq("status","pending").lt("created_at", h72)));
    add("invoice_overdue","Overdue invoices","Invoices past due unpaid",
      await safeCount(admin, "invoices", (q)=>q.neq("status","paid").lt("due_date", new Date().toISOString())));
    add("supplier_assignment_stuck","Supplier assignments stuck","Pending > 5d",
      await safeCount(admin, "supplier_assignments", (q)=>q.eq("status","pending").lt("created_at", d5)));
    add("portfolio_business_blocked","Portfolio businesses blocked","Blocked > 24h",
      await safeCount(admin, "businesses", (q)=>q.eq("status","blocked").lt("updated_at", dayAgo)));
    add("failed_proposal_generation","Failed proposal generation","Proposals failed in last 7d",
      await safeCount(admin, "proposals", (q)=>q.eq("status","failed").gte("created_at", weekAgo)));

    let persisted = 0;
    if (persist && findings.length > 0) {
      const rows = findings.map((f) => ({ ...f }));
      const { data, error } = await admin.from("self_healing_findings").insert(rows).select("id");
      if (error) throw error;
      persisted = data?.length || 0;
    }

    return new Response(JSON.stringify({
      ok: true, scanned_rules: (rules || []).length, findings, persisted_count: persisted,
      no_external_action: true, no_provider_call: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as any)?.message || e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});