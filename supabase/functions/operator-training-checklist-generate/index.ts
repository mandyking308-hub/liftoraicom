import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TASKS_BY_AREA: Record<string, string[]> = {
  "Command Centre basics": [
    "Open /founder/command-centre",
    "Select the business from the business selector",
    "Read the Founder Alert Strip",
    "Read 'Today's Actions' panel",
    "Do NOT click any external send / publish / push button without founder approval",
  ],
  "business activation": [
    "Open Business Activation Wizard card",
    "Run Dry-run checklist",
    "Create checklist when ready (CREATE BUSINESS ACTIVATION CHECKLIST)",
    "Mark complete items as done",
    "Do NOT click Approve go-live until readiness >= 90%",
  ],
  "customer journey": [
    "Open Customer Journey Flow Map",
    "Walk every stage: prospect → CRM → outreach → reply → proposal → onboarding → support",
    "Confirm each stage shows draft-only (no external send)",
  ],
  "approvals": [
    "Open Founder Approvals card",
    "Read pending approvals",
    "Reject anything you do not understand",
    "Approve only with confirmation phrase shown in dialog",
  ],
  "CRM memory": [
    "Open CRM Total Memory",
    "Search a test contact",
    "Confirm interactions/notes are visible",
    "Do NOT export customer data externally",
  ],
  "social/content": [
    "Open Social/Content panel",
    "Generate draft content pack only",
    "Do NOT click Publish — external publishing is locked",
  ],
  "proposals/demos/deals": [
    "Open Proposals card",
    "Generate draft proposal",
    "Do NOT click Send Externally — gate is locked",
  ],
  "invoices/payments": [
    "Open Invoices/Payments card",
    "Review draft invoice",
    "Do NOT click Send Invoice or Move Money — locked",
  ],
  "onboarding/support": [
    "Open Onboarding/Support card",
    "Run draft onboarding plan",
    "Draft support replies internally only",
  ],
  "complaints/recovery": [
    "Open Complaints/Recovery card",
    "Generate complaint recovery plan",
    "Escalate to founder before any external response",
  ],
  "Smartlead/Apollo locked actions": [
    "Confirm Smartlead lead push button is LOCKED",
    "Confirm Apollo reveal/spend is LOCKED",
    "Do NOT click Start Campaign / Push Leads / Reveal Email",
  ],
  "emergency pause": [
    "Open Business Activation card",
    "Click Pause Business Operations to stop activity",
    "Confirmation phrase: PAUSE BUSINESS OPERATIONS",
  ],
  "daily operations": [
    "Open Command Centre at start of day",
    "Read alerts, today's actions, journey map",
    "Approve/reject pending items",
    "Run rehearsal weekly to confirm readiness",
  ],
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
    const { business_id, operator_name, training_area, dry_run = true, confirm } = body;
    if (!training_area) return json({ error: "training_area required" }, 400);
    const tasks = TASKS_BY_AREA[training_area];
    if (!tasks) return json({ error: "unknown training_area" }, 400);

    if (dry_run || confirm !== "CREATE OPERATOR TRAINING CHECKLIST") {
      return json({
        dry_run: true,
        training_area,
        planned_tasks: tasks.length,
        confirmation_required: "CREATE OPERATOR TRAINING CHECKLIST",
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data, error } = await admin.from("operator_training_checklists").insert({
      business_id: business_id ?? null,
      checklist_name: `${training_area} – ${operator_name ?? "operator"}`,
      operator_name: operator_name ?? null,
      training_area,
      checklist_status: "ready",
      tasks,
    }).select().single();
    if (error) throw error;

    return json({ checklist_id: data.id, tasks_created: tasks.length, external_actions: "locked" });
  } catch (e: any) {
    return json({ error: e?.message ?? "error" }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}