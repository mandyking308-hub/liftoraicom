import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "APPLY BUSINESS LAUNCH PLAN";
const SOURCE_FUNCTION = "business-launch-plan-apply";

const ALL_MODULE_LABELS: Record<string, string> = {
  crm: "CRM", compliance: "Compliance",
  outbound_native: "Outbound — Native", outbound_smartlead: "Outbound — Smartlead",
  apollo_sourcing: "Apollo Sourcing", ai_engagement: "AI Engagement",
  founder_approval: "Founder Approval", proposals: "Proposals",
  demos: "Demos", deals: "Deals", finance: "Finance", suppliers: "Suppliers",
  reporting: "Reporting", monitoring: "Monitoring",
  knowledge: "Knowledge", manual: "Manual", testing: "Testing",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub as string;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const planId: string | null = body?.plan_id ?? null;
    const dryRun: boolean = body?.dry_run !== false;
    const phrase: string = String(body?.confirmation_phrase ?? "");
    if (!planId) return new Response(JSON.stringify({ error: "plan_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: plan, error: planErr } = await admin.from("business_launch_plans").select("*").eq("id", planId).maybeSingle();
    if (planErr || !plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const audit = async (status: string, blockedReason: string | null, targetTable: string | null, targetId: string | null, metadata: any = {}) => {
      await admin.from("agent_action_audit_log").insert({
        business_id: plan.business_id ?? null, agent_key: "business_launch_factory",
        action_type: "plan_apply", source_function: SOURCE_FUNCTION,
        target_table: targetTable, target_id: targetId,
        founder_user_id: userId, confirmation_phrase: phrase,
        dry_run: dryRun, action_status: status, blocked_reason: blockedReason, metadata,
      });
    };

    if (!dryRun && phrase !== CONFIRMATION_PHRASE) {
      await audit("blocked", "missing_confirmation_phrase", "business_launch_plans", planId, {});
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CONFIRMATION_PHRASE,
        emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const modules: string[] = Array.isArray(plan.selected_modules) ? plan.selected_modules : [];
    const agents: string[] = Array.isArray(plan.selected_agents) ? plan.selected_agents : [];
    const lanes: any = (plan.metadata as any)?.provider_lanes ?? {};

    const result: any = {
      ok: true, dry_run: dryRun, blocked: false, plan_id: planId,
      business_id: plan.business_id ?? null, business_created: false,
      profile_upserted: false, modules_seeded: 0, agents_seeded: 0,
      source_brief_created: false, campaign_draft_created: false,
      approvals_created: 0,
      emails_sent: 0, apollo_called: false, smartlead_post_called: false,
    };

    if (dryRun) {
      result.preview = {
        will_create_business: !plan.business_id,
        will_seed_modules: modules.length,
        will_seed_agents: agents.length,
        provider_lanes: lanes,
      };
      await audit("preview", "dry_run", "business_launch_plans", planId, { modules: modules.length, agents: agents.length });
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Business row
    let businessId = plan.business_id as string | null;
    if (!businessId) {
      const { data: biz, error: bizErr } = await admin.from("businesses").insert({ name: plan.launch_name }).select("id").maybeSingle();
      if (bizErr) {
        // probably name collision — try fetch existing
        const { data: existing } = await admin.from("businesses").select("id").eq("name", plan.launch_name).maybeSingle();
        businessId = existing?.id ?? null;
      } else {
        businessId = biz?.id ?? null;
        result.business_created = true;
      }
      if (businessId) {
        await admin.from("business_launch_plans").update({ business_id: businessId }).eq("id", planId);
      }
    }
    if (!businessId) {
      await audit("error", "business_create_failed", "business_launch_plans", planId, {});
      return new Response(JSON.stringify({ ...result, ok: false, error: "Could not create or resolve business" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    result.business_id = businessId;

    // 2. Operating profile
    await admin.from("business_operating_profiles").upsert({
      business_id: businessId,
      business_name: plan.launch_name,
      operating_status: "setup",
      smartlead_enabled: lanes.smartlead === true,
      native_email_enabled: lanes.native_email !== false,
      apollo_enabled: lanes.apollo === true,
      crm_enabled: modules.includes("crm"),
      agents_enabled: agents.length > 0,
      proposals_enabled: modules.includes("proposals"),
      finance_enabled: modules.includes("finance"),
      suppliers_enabled: modules.includes("suppliers"),
      founder_approval_required: true,
      auto_send_allowed: false,
      external_provider_mutation_allowed: false,
      metadata: { from_launch_plan: planId, template_key: (plan.metadata as any)?.template_key ?? null },
    }, { onConflict: "business_id" });
    result.profile_upserted = true;

    // 3. Modules
    const moduleRows = modules.map((k) => ({ business_id: businessId, module_key: k, module_label: ALL_MODULE_LABELS[k] ?? k, enabled: true }));
    if (moduleRows.length > 0) {
      const { error: modErr, count } = await admin.from("business_operating_modules").upsert(moduleRows, { onConflict: "business_id,module_key", count: "exact" });
      if (!modErr) result.modules_seeded = count ?? moduleRows.length;
    }

    // 4. Agents
    const agentRows = agents.map((k) => ({
      business_id: businessId, agent_key: k, enabled: true,
      operating_mode: "founder_approved", can_create_internal_records: true,
      can_send_external: false, can_call_provider_post: false, can_spend_credits: false,
      founder_approval_required: true, status: "ready",
    }));
    if (agentRows.length > 0) {
      const { error: agErr, count } = await admin.from("business_agent_assignments_v2").upsert(agentRows, { onConflict: "business_id,agent_key", count: "exact" });
      if (!agErr) result.agents_seeded = count ?? agentRows.length;
    }

    // 5. Source brief draft (best-effort, table may exist)
    try {
      const { data: brief } = await admin.from("business_sourcing_briefs").insert({
        business_id: businessId,
        title: `${plan.launch_name} — initial brief`,
        brief: plan.founder_brief ?? "",
        status: "draft",
      }).select("id").maybeSingle();
      if (brief?.id) result.source_brief_created = true;
    } catch { /* table may not exist or shape differs; non-fatal */ }

    // 6. Founder approval item
    try {
      const { data: appr } = await admin.from("founder_approval_items").insert({
        business_id: businessId,
        approval_type: "business_launch_review",
        source_system: "business_launch_factory",
        source_table: "business_launch_plans",
        source_id: planId,
        agent_key: "business_launch_factory",
        title: `Approve launch plan: ${plan.launch_name}`,
        summary: `Template ${(plan.metadata as any)?.template_key ?? ""}. Modules: ${modules.length}. Agents: ${agents.length}.`,
        recommended_action: "Review and approve internal launch configuration",
        priority_level: "high",
        status: "pending",
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
      }).select("id").maybeSingle();
      if (appr?.id) result.approvals_created++;
    } catch { /* non-fatal */ }

    await admin.from("business_launch_plans").update({ launch_status: "applied", business_id: businessId }).eq("id", planId);
    await audit("applied", null, "business_launch_plans", planId, { modules: result.modules_seeded, agents: result.agents_seeded });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});