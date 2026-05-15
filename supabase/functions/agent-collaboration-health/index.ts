import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function safeSelect(admin: any, table: string, builder: (q: any) => any) {
  try { const { data } = await builder(admin.from(table)); return data || []; } catch { return []; }
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

    const handovers = await safeSelect(admin, "agent_handover_log", (q: any) => q.select("id,contact_id,from_agent_key,to_agent_key,task_id,status,created_at,founder_review_required").order("created_at", { ascending: false }).limit(500));
    const tasks = await safeSelect(admin, "ai_agent_task_queue", (q: any) => q.select("id,contact_id,agent_key,status,due_at,founder_approval_required").limit(1000));
    const stewards = await safeSelect(admin, "customer_stewardship_assignments", (q: any) => q.select("id,contact_id,current_owner_agent_key,stewardship_status,customer_stage,updated_at").eq("stewardship_status", "active"));
    const approvals = await safeSelect(admin, "founder_approval_items", (q: any) => q.select("id,status,created_at").eq("status", "pending"));

    const issues: any[] = [];

    // Handovers with no receiving task
    const taskIds = new Set(tasks.map((t: any) => t.id));
    for (const h of handovers) {
      if (h.status === "open" || h.status === "pending") {
        if (!h.task_id || !taskIds.has(h.task_id)) {
          issues.push({ type: "handover_no_task", severity: "warn", handover_id: h.id, contact_id: h.contact_id, expected_agent: h.to_agent_key });
        }
      }
    }

    // Customer with multiple active stewards => conflict
    const byContact = new Map<string, any[]>();
    for (const s of stewards) {
      if (!s.contact_id) continue;
      const arr = byContact.get(s.contact_id) ?? [];
      arr.push(s); byContact.set(s.contact_id, arr);
    }
    for (const [cid, arr] of byContact) {
      if (arr.length > 1) {
        const owners = Array.from(new Set(arr.map((a: any) => a.current_owner_agent_key)));
        if (owners.length > 1) issues.push({ type: "owner_conflict", severity: "high", contact_id: cid, owners });
      }
    }

    // Stale stewardship (> 7d with no update)
    const now = Date.now();
    for (const s of stewards) {
      if (s.updated_at && now - new Date(s.updated_at).getTime() > 7 * 24 * 3600 * 1000) {
        issues.push({ type: "stale_stewardship", severity: "warn", stewardship_id: s.id, contact_id: s.contact_id });
      }
    }

    // Overdue founder approvals (> 3d)
    for (const a of approvals) {
      if (a.created_at && now - new Date(a.created_at).getTime() > 3 * 24 * 3600 * 1000) {
        issues.push({ type: "overdue_approval", severity: "warn", approval_id: a.id });
      }
    }

    // Stage/agent mismatches
    for (const s of stewards) {
      const stage = s.customer_stage; const owner = s.current_owner_agent_key;
      const expected: Record<string, string> = {
        proposal_ready: "proposal_agent",
        deal_ready: "commercial_agent",
        finance_supplier: "finance_agent",
        compliance_review: "compliance_agent",
      };
      if (stage && expected[stage] && owner !== expected[stage] && owner !== "founder_co_pilot") {
        issues.push({ type: "stage_owner_mismatch", severity: "warn", contact_id: s.contact_id, stage, owner, expected_owner: expected[stage] });
      }
    }

    const high = issues.filter((i) => i.severity === "high").length;
    const warn = issues.filter((i) => i.severity === "warn").length;
    const health_score = Math.max(0, 100 - (high * 15 + warn * 4));

    // Optional self-healing record (internal only)
    const body = await req.json().catch(() => ({}));
    let finding_id: string | null = null;
    if (body?.create_finding && (high > 0 || warn > 5)) {
      try {
        const { data: f } = await admin.from("self_healing_findings").insert({
          rule_key: "agent_collaboration_health",
          severity: high > 0 ? "high" : "warn",
          status: "open",
          summary: `Agent collaboration: ${high} high, ${warn} warn issues; score=${health_score}`,
          evidence: { issues: issues.slice(0, 50) },
          repair_kind: "internal_review",
          founder_review_required: true,
        }).select("id").single();
        finding_id = f?.id ?? null;
      } catch { /* no-op */ }
    }

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      health_score,
      counts: { handovers: handovers.length, tasks: tasks.length, stewards: stewards.length, approvals_pending: approvals.length },
      issues,
      finding_id,
      no_external_action: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});