import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Read-only commercial readiness audit. No sends, no provider calls, no mutations.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData } = await userClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    const allowed = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Packages
    const { data: packages } = await admin
      .from("client_system_packages")
      .select("*")
      .order("package_name");
    const activePackages = (packages ?? []).filter((p: any) => p.active);

    // 2) Public site readiness — check legal docs and active proposal flow
    const safeCount = async (table: string, filter?: (q: any) => any) => {
      try {
        let q: any = admin.from(table).select("id", { count: "exact", head: true });
        if (filter) q = filter(q);
        const { count, error } = await q;
        if (error) return null;
        return count ?? 0;
      } catch { return null; }
    };

    const legalDocs = await safeCount("legal_documents");
    const proposals = await safeCount("proposals");
    const internalProposals = await safeCount("internal_proposals");
    const demos = await safeCount("demo_systems");
    const businessProfiles = await safeCount("business_operating_profiles");
    const knowledgeProfiles = await safeCount("business_knowledge_profiles");
    const launchPlans = await safeCount("business_launch_plans");

    const publicSiteReadiness = {
      legal_documents_present: (legalDocs ?? 0) > 0,
      legal_documents_count: legalDocs,
      packages_listed: activePackages.length,
      ready: (legalDocs ?? 0) > 0 && activePackages.length >= 3,
    };

    const proposalIntakeReadiness = {
      proposals_table_present: proposals !== null,
      internal_proposals_table_present: internalProposals !== null,
      counts: { proposals, internal_proposals: internalProposals },
      ready: proposals !== null && internalProposals !== null,
    };

    const clientPortalReadiness = {
      business_profiles_present: businessProfiles !== null,
      knowledge_profiles_present: knowledgeProfiles !== null,
      launch_plans_present: launchPlans !== null,
      counts: { business_profiles: businessProfiles, knowledge_profiles: knowledgeProfiles, launch_plans: launchPlans },
      ready: (businessProfiles ?? 0) >= 1 && (knowledgeProfiles ?? 0) >= 1,
    };

    const demoReadiness = {
      demos_table_present: demos !== null,
      demo_count: demos,
      ready: (demos ?? 0) >= 1,
    };

    const packageReadiness = {
      total: (packages ?? []).length,
      active: activePackages.length,
      with_pricing: activePackages.filter((p: any) => p.setup_fee_min || p.monthly_fee_min).length,
      with_modules: activePackages.filter((p: any) => Array.isArray(p.included_modules) && p.included_modules.length > 0).length,
      ready: activePackages.length >= 3 &&
             activePackages.every((p: any) => Array.isArray(p.included_modules) && p.included_modules.length > 0),
    };

    const blockers: string[] = [];
    if (!publicSiteReadiness.ready) blockers.push("Public site missing legal docs or active packages");
    if (!proposalIntakeReadiness.ready) blockers.push("Proposal intake tables not present");
    if (!clientPortalReadiness.ready) blockers.push("Client portal needs at least one business + knowledge profile");
    if (!demoReadiness.ready) blockers.push("No demo systems available");
    if (!packageReadiness.ready) blockers.push("Less than 3 active packages or modules incomplete");

    // Founder-only data exposure warnings (heuristic — flag tables that should never be public)
    const founderOnlyExposureWarnings: string[] = [];
    // We do not query the values — just flag known sensitive surfaces for review.
    const sensitiveSurfaces = [
      "provider_secret_registry",
      "agent_action_audit_log",
      "internal_operating_schedules",
      "business_operating_profiles",
      "user_roles",
    ];
    for (const t of sensitiveSurfaces) {
      // We rely on RLS — if the table query above succeeded with service role we cannot infer client exposure.
      // Just include a reminder list for the UI to display.
      founderOnlyExposureWarnings.push(`${t}: must remain founder/admin only via RLS`);
    }

    let nextSalesAction = "Publish at least one demo and confirm legal docs to begin outbound proposals";
    if (publicSiteReadiness.ready && proposalIntakeReadiness.ready && demoReadiness.ready && packageReadiness.ready) {
      nextSalesAction = "Send first founder-approved sales batch using AI Outreach package as anchor";
    } else if (packageReadiness.ready && !demoReadiness.ready) {
      nextSalesAction = "Build a public demo for the strongest active package";
    } else if (!packageReadiness.ready) {
      nextSalesAction = "Complete module + pricing on remaining packages before going public";
    }

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      packages: packages ?? [],
      readiness: {
        public_site: publicSiteReadiness,
        proposal_intake: proposalIntakeReadiness,
        client_portal: clientPortalReadiness,
        demos: demoReadiness,
        packages: packageReadiness,
      },
      blockers,
      founder_only_exposure_warnings: founderOnlyExposureWarnings,
      next_sales_action: nextSalesAction,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});