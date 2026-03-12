import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiagnosticCheck {
  system: string;
  category: string;
  status: "pass" | "fail" | "warning";
  detail: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const checks: DiagnosticCheck[] = [];

    const check = async (system: string, category: string, fn: () => Promise<{ ok: boolean; detail: string }>) => {
      try {
        const r = await fn();
        checks.push({ system, category, status: r.ok ? "pass" : "fail", detail: r.detail });
      } catch (e) {
        checks.push({ system, category, status: "fail", detail: String(e) });
      }
    };

    // ── Legal Infrastructure ──
    const legalDocs = [
      "Terms of Service", "Privacy Policy", "Acceptable Use Policy",
      "AI Usage Policy", "Automation Safety Policy", "Security Policy",
      "Cookie Policy", "Data Processing Agreement",
    ];
    await check("Legal Document Versions", "Legal Infrastructure", async () => {
      const { data, error } = await supabase.from("legal_document_versions").select("document_name").limit(20);
      if (error) return { ok: false, detail: error.message };
      const found = data?.map((d: any) => d.document_name) ?? [];
      const missing = legalDocs.filter(d => !found.includes(d));
      return missing.length === 0
        ? { ok: true, detail: `All ${legalDocs.length} legal documents versioned` }
        : { ok: false, detail: `Missing: ${missing.join(", ")}` };
    });

    await check("User Legal Acceptance Table", "Legal Infrastructure", async () => {
      const { error } = await supabase.from("user_legal_acceptance").select("id").limit(1);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: "user_legal_acceptance table accessible" };
    });

    // ── Automation Systems ──
    await check("Workflow Automation Builder", "Automation Systems", async () => {
      const { data, error } = await supabase.from("automation_workflows").select("id, status").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} workflows found` };
    });

    await check("Automation Execution Engine", "Automation Systems", async () => {
      const { data, error } = await supabase.from("workflow_executions").select("id, status").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} executions found` };
    });

    await check("Automation Optimisation Engine", "Automation Systems", async () => {
      const { data, error } = await supabase.from("optimisation_insights").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} optimisation insights` };
    });

    // ── AI Systems ──
    await check("AI Agent Management Framework", "AI Systems", async () => {
      const { data, error } = await supabase.from("ai_agents").select("id, name, status").limit(10);
      if (error) return { ok: false, detail: error.message };
      const active = data?.filter((a: any) => a.status === "active").length ?? 0;
      return { ok: true, detail: `${data?.length ?? 0} agents registered, ${active} active` };
    });

    await check("AI Brain Orchestration", "AI Systems", async () => {
      const { data, error } = await supabase.from("brain_insights").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `Brain layer operational, ${data?.length ?? 0} insights` };
    });

    await check("AI Decision Engine", "AI Systems", async () => {
      const { data, error } = await supabase.from("decision_recommendations").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `Decision engine accessible, ${data?.length ?? 0} recommendations` };
    });

    // ── Platform Infrastructure ──
    const infraTables: [string, string][] = [
      ["profiles", "Client Portal"],
      ["organisations", "Organisation Layer"],
      ["monitored_systems", "System Monitoring"],
      ["integrations", "Integration Layer"],
      ["activity_log", "Activity System"],
    ];
    for (const [table, label] of infraTables) {
      await check(label, "Platform Infrastructure", async () => {
        const { error } = await supabase.from(table).select("id").limit(1);
        if (error) return { ok: false, detail: error.message };
        return { ok: true, detail: `${label} operational` };
      });
    }

    // ── Deployment Systems ──
    await check("Deployment & Launch Manager", "Deployment Systems", async () => {
      const { data, error } = await supabase.from("deployments").select("id, status").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} deployments tracked` };
    });

    await check("Platform Expansion Manager", "Deployment Systems", async () => {
      const { data, error } = await supabase.from("launched_platforms").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} launched platforms` };
    });

    // ── Security Systems ──
    await check("Role & Access Control", "Security Systems", async () => {
      const { data, error } = await supabase.from("platform_roles").select("id, name").limit(10);
      if (error) return { ok: false, detail: error.message };
      return { ok: (data?.length ?? 0) > 0, detail: `${data?.length} roles configured` };
    });

    await check("Audit Logging", "Security Systems", async () => {
      const { error } = await supabase.from("access_audit_log").select("id").limit(1);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: "Audit log accessible" };
    });

    await check("Compliance System", "Security Systems", async () => {
      const { data, error } = await supabase.from("compliance_items").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} compliance items` };
    });

    // ── Database Connectivity ──
    await check("Database Connectivity", "Database", async () => {
      const { error } = await supabase.from("build_log_entries").select("id").limit(1);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: "Database responding normally" };
    });

    // ── Knowledge & Documentation ──
    await check("Knowledge Base", "Documentation", async () => {
      const { data, error } = await supabase.from("knowledge_entries").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} knowledge entries` };
    });

    await check("Founder Manual", "Documentation", async () => {
      const { data, error } = await supabase.from("manual_pages").select("id").limit(5);
      if (error) return { ok: false, detail: error.message };
      return { ok: true, detail: `${data?.length ?? 0} manual pages` };
    });

    // ── Save diagnostic run ──
    const passed = checks.filter(c => c.status === "pass").length;
    const failed = checks.filter(c => c.status === "fail").length;
    const warnings = checks.filter(c => c.status === "warning").length;

    const { data: run, error: runErr } = await supabase.from("platform_diagnostic_runs").insert({
      systems_checked: checks.length,
      failures_detected: failed,
      warnings,
      status: failed > 0 ? "degraded" : "healthy",
      details: checks,
    }).select("id").single();

    if (runErr) throw runErr;

    // Create alert if failures detected
    if (failed > 0) {
      const failedSystems = checks.filter(c => c.status === "fail").map(c => c.system).join(", ");
      await supabase.from("brain_insights").insert({
        title: `Platform Diagnostics: ${failed} system(s) degraded`,
        description: `Failed systems: ${failedSystems}`,
        insight_type: "performance",
        priority: failed >= 3 ? "critical" : "high",
        source_module: "Platform Diagnostics Agent",
        status: "new",
      });
    }

    return new Response(JSON.stringify({
      run_id: run.id,
      status: failed > 0 ? "degraded" : "healthy",
      systems_checked: checks.length,
      passed,
      failed,
      warnings,
      checks,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
