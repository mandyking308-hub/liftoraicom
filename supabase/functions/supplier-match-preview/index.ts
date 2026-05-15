import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Supplier Match — PREVIEW ONLY.
// Recommends supplier candidates for deals/projects requiring assignment.
// NEVER creates assignments. NEVER sends. NEVER calls Apollo or Smartlead.

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

function scoreSupplier(s: any, requiredSkills: string[]): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const status = String(s.status ?? "").toUpperCase();
  if (status === "APPROVED") { score += 40; reasons.push("approved"); }
  else if (status === "QUALIFIED") { score += 25; reasons.push("qualified"); }
  else if (status === "REJECTED" || status === "INACTIVE") { return { score: -1, reasons: ["status_excluded"] }; }

  const max = Number(s.max_concurrent_assignments ?? 0);
  const cur = Number(s.active_assignment_count ?? 0);
  if (max > 0) {
    if (cur < max) { score += 20; reasons.push(`capacity_${cur}_of_${max}`); }
    else { score -= 30; reasons.push("at_capacity"); }
  }

  const skills: string[] = Array.isArray(s.skills) ? s.skills.map((x: any) => String(x).toLowerCase()) : [];
  const req = (requiredSkills ?? []).map((x) => String(x).toLowerCase());
  if (req.length > 0) {
    const matched = req.filter((r) => skills.includes(r));
    if (matched.length > 0) {
      score += 10 * matched.length;
      reasons.push(`skills_match_${matched.length}_of_${req.length}`);
    } else {
      reasons.push("no_skill_match");
    }
  }

  const supplierScore = Number(s.supplier_score ?? 0);
  if (supplierScore > 0) { score += Math.min(20, supplierScore / 5); reasons.push(`supplier_score_${supplierScore}`); }

  return { score: Math.round(score), reasons };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin } = auth;

    let body: any = {};
    try { body = await req.json(); } catch { body = {}; }
    const dealIdFilter: string | null = body?.deal_id ?? null;

    const deals = (await safe(
      admin.from("deals").select("id,business_name,status,required_skills,estimated_value_min,estimated_value_max").limit(200),
      []
    )) as any[];
    const assignments = (await safe(
      admin.from("assignments").select("id,deal_id,supplier_id,status").limit(500),
      []
    )) as any[];
    const suppliers = (await safe(
      admin.from("suppliers").select("id,name,business_name,status,active_assignment_count,max_concurrent_assignments,supplier_score,skills").limit(500),
      []
    )) as any[];

    const dealsHavingAssignments = new Set(assignments.map((a) => a.deal_id).filter(Boolean));
    const candidates = deals.filter((d) => {
      if (dealIdFilter) return d.id === dealIdFilter;
      if (String(d.status ?? "").toUpperCase() !== "WON") return false;
      return !dealsHavingAssignments.has(d.id);
    });

    const recommendations = candidates.slice(0, 25).map((d) => {
      const required: string[] = Array.isArray(d.required_skills) ? d.required_skills : [];
      const ranked = suppliers
        .map((s) => ({ supplier: s, ...scoreSupplier(s, required) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((r) => ({
          supplier_id: r.supplier.id,
          name: r.supplier.name,
          business_name: r.supplier.business_name,
          status: r.supplier.status,
          active_assignment_count: r.supplier.active_assignment_count ?? 0,
          max_concurrent_assignments: r.supplier.max_concurrent_assignments ?? 0,
          score: r.score,
          reasons: r.reasons,
        }));
      return {
        deal_id: d.id,
        business_name: d.business_name,
        required_skills: required,
        candidates: ranked,
        blockers: ranked.length === 0 ? ["no_eligible_supplier"] : [],
      };
    });

    return new Response(JSON.stringify({
      ok: true,
      preview_only: true,
      writes: 0,
      emails_sent: 0,
      provider_calls: 0,
      assignments_created: 0,
      apply_enabled: false,
      apply_disabled_reason: "supplier_match_apply_disabled",
      total_deals_needing_supplier: candidates.length,
      recommendations,
      eligible_supplier_pool: suppliers.filter((s) => {
        const st = String(s.status ?? "").toUpperCase();
        return st === "APPROVED" || st === "QUALIFIED";
      }).length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});