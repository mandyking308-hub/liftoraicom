import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder");
    if (!allowed) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const { business_id, dry_run = true, confirm } = body;
    if (!business_id) return json({ error: "business_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: training } = await admin.from("business_training_runs").select("support_summary, customer_summary").eq("business_id", business_id).order("created_at", { ascending: false }).limit(1);
    const hasTraining = (training ?? []).length > 0;

    const standards = {
      standard_response_time_hours: 24,
      high_priority_response_time_hours: 4,
      complaint_acknowledgement_hours: 4,
      complaint_resolution_target_days: 7,
      support_response_time_hours: 12,
      onboarding_first_checkin_days: 3,
      bedding_in_checkin_days: 14,
      quarterly_report_cadence: "quarterly",
      renewal_checkin_days_before: 30,
      winback_after_inactive_days: 60,
      escalation_rules: [
        { level: 1, when: "no response within 24h", action: "escalate to human owner" },
        { level: 2, when: "complaint not acknowledged within 4h", action: "escalate to founder" },
        { level: 3, when: "high-value customer at risk", action: "founder review required" },
      ],
      owner_agent_rules: [
        { area: "support", owner_agent: "support_agent", human_review: true },
        { area: "complaints", owner_agent: "complaints_agent", human_review: true },
        { area: "onboarding", owner_agent: "onboarding_agent", human_review: true },
        { area: "renewal", owner_agent: "retention_agent", human_review: true },
        { area: "winback", owner_agent: "winback_agent", human_review: true },
      ],
    };

    if (dry_run || confirm !== "CREATE BUSINESS OPERATING STANDARDS") {
      return json({
        dry_run: true,
        proposed_standards: standards,
        based_on_training: hasTraining,
        confirmation_required: "CREATE BUSINESS OPERATING STANDARDS",
      });
    }

    const { data: row, error } = await admin.from("business_operating_standards").insert({
      business_id,
      standards_status: "ready",
      ...standards,
    }).select().single();
    if (error) throw error;

    return json({ standards_id: row.id, standards, external_actions: "locked" });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}