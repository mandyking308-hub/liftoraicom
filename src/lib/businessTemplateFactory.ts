import { supabase } from "@/integrations/supabase/client";

export type TemplateRow = {
  id: string;
  template_name: string;
  archetype_code: string;
  description: string | null;
  required_modules: string[];
  recommended_modules: string[];
  required_agents: string[];
  recommended_agents: string[];
  required_kpis: string[];
  recommended_integrations: string[];
  required_documents: string[];
  default_workflows: string[];
  default_approval_rules: string[];
  default_risk_flags: string[];
  active: boolean;
};

export type ApplicationRow = {
  id: string;
  business_id: string;
  template_id: string | null;
  application_status: "draft" | "applied" | "partially_applied" | "needs_review" | "retired";
  modules_enabled: string[];
  agents_enabled: string[];
  missing_requirements: string[];
  setup_tasks_created: number;
  founder_confirmed: boolean;
  applied_at: string | null;
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type SetupTaskRow = {
  id: string;
  business_id: string;
  template_application_id: string | null;
  task_name: string;
  task_category: string | null;
  task_status: "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  priority: string;
  due_at: string | null;
  assigned_agent: string | null;
  founder_action_required: boolean;
  module_link: string | null;
};

/* ---------- module → route map for "link every task to relevant module" ---------- */
const MODULE_ROUTE: Record<string, string> = {
  onboarding: "/founder/business-onboarding-factory",
  subscription_billing: "/founder/revenue-autopilot",
  churn_tracking: "/founder/revenue-autopilot",
  support_sla: "/founder/command-centre",
  product_roadmap: "/founder/product",
  usage_metrics: "/founder/reports",
  seller_recruitment: "/founder/marketplace",
  listings: "/founder/marketplace/listings",
  supply_demand_liquidity: "/founder/marketplace/liquidity",
  seller_onboarding: "/founder/marketplace/seller-onboarding",
  payouts: "/founder/marketplace/payouts",
  disputes: "/founder/marketplace/risk",
  product_catalogue: "/founder/product",
  stock_inventory_placeholder: "/founder/command-centre",
  fulfilment: "/founder/command-centre",
  returns_refunds: "/founder/command-centre",
  reviews: "/founder/command-centre",
  abandoned_cart: "/founder/command-centre",
  lead_qualification: "/founder/lead-pipeline",
  proposal: "/founder/proposals",
  quote_to_cash: "/founder/command-centre",
  delivery_capacity: "/founder/capacity",
  retainer_renewal: "/founder/command-centre",
  human_handoff: "/founder/command-centre",
  content_calendar: "/founder/command-centre",
  rights_ip: "/founder/command-centre",
  distribution: "/founder/command-centre",
  licensing: "/founder/command-centre",
  social_growth: "/founder/command-centre",
  audience_analytics: "/founder/reports",
  curriculum: "/founder/command-centre",
  enrolments: "/founder/command-centre",
  learner_progress: "/founder/command-centre",
  certificates: "/founder/command-centre",
  community: "/founder/command-centre",
  lead_sourcing: "/founder/lead-pipeline",
  compliance: "/founder/command-centre",
  buyer_handoff: "/founder/command-centre",
  lead_quality: "/founder/data-quality",
  revenue_per_lead: "/founder/reports",
  member_onboarding: "/founder/business-onboarding-factory",
  engagement: "/founder/command-centre",
  moderation: "/founder/command-centre",
  renewal: "/founder/command-centre",
  churn: "/founder/command-centre",
  support: "/founder/command-centre",
};

/* ---------- fetch helpers ---------- */
export async function fetchTemplates() {
  const { data, error } = await supabase.from("business_operating_templates").select("*").order("template_name");
  if (error) throw error;
  return (data ?? []) as TemplateRow[];
}
export async function fetchApplications() {
  const { data, error } = await supabase.from("business_template_applications").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApplicationRow[];
}
export async function fetchSetupTasks(business_id?: string) {
  let q = supabase.from("business_setup_tasks").select("*").order("created_at", { ascending: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SetupTaskRow[];
}

/* ---------- recommend template from archetype ---------- */
export function recommendTemplate(templates: TemplateRow[], archetype_code: string): TemplateRow | undefined {
  return templates.find(t => t.archetype_code === archetype_code) ?? templates.find(t => t.archetype_code === "saas");
}

/* ---------- apply template → create application + setup tasks (live, internal) ---------- */
export async function applyTemplate(args: {
  business_id: string;
  template: TemplateRow;
  enable_recommended?: boolean;
  founder_confirmed?: boolean;
}): Promise<{ application: ApplicationRow; tasks: SetupTaskRow[] }> {
  const { business_id, template, enable_recommended = false, founder_confirmed = false } = args;
  const modules_enabled = [...template.required_modules, ...(enable_recommended ? template.recommended_modules : [])];
  const agents_enabled = [...template.required_agents, ...(enable_recommended ? template.recommended_agents : [])];
  // Missing requirements proxy: any required doc / kpi that hasn't been ticked off yet.
  const missing_requirements = [
    ...template.required_documents.map(d => `doc:${d}`),
    ...template.required_kpis.map(k => `kpi:${k}`),
  ];

  const appRow = {
    business_id,
    template_id: template.id,
    application_status: "applied" as const,
    modules_enabled,
    agents_enabled,
    missing_requirements,
    setup_tasks_created: 0,
    founder_confirmed,
    applied_at: new Date().toISOString(),
    audit_metadata: { template_name: template.template_name, archetype_code: template.archetype_code, source: "business_template_factory_v1" },
  };
  const { data: app, error: appErr } = await supabase
    .from("business_template_applications").insert(appRow).select().single();
  if (appErr) throw appErr;
  const application = app as ApplicationRow;

  const taskRows = buildSetupTasks(template, application);
  // Mark external-action tasks as founder_action_required (live-first, gated where it matters)
  const externalSignals = ["mass_email", "publish", "payout", "outreach", "buyer_contract", "contract_send", "proposal_send", "refund", "price_change", "license_grant", "ban", "invite"];
  const tasksToInsert = taskRows.map(t => ({
    business_id,
    template_application_id: application.id,
    task_name: t.task_name,
    task_category: t.task_category,
    task_status: "pending" as const,
    priority: t.priority,
    assigned_agent: t.assigned_agent,
    founder_action_required: externalSignals.some(s => t.task_name.toLowerCase().includes(s)),
    module_link: t.module_link,
  }));
  const { data: tasks, error: tErr } = await supabase
    .from("business_setup_tasks").insert(tasksToInsert).select();
  if (tErr) throw tErr;

  await supabase.from("business_template_applications")
    .update({ setup_tasks_created: (tasks ?? []).length })
    .eq("id", application.id);

  return { application, tasks: (tasks ?? []) as SetupTaskRow[] };
}

/** Build the live internal setup checklist from a template. */
export function buildSetupTasks(template: TemplateRow, _app: { id: string }): Array<{
  task_name: string; task_category: string; priority: string; assigned_agent: string | null; module_link: string | null;
}> {
  const out: Array<{ task_name: string; task_category: string; priority: string; assigned_agent: string | null; module_link: string | null; }> = [];

  for (const m of template.required_modules) {
    out.push({
      task_name: `Enable module: ${humanize(m)}`,
      task_category: "module",
      priority: "high",
      assigned_agent: "business_template_agent",
      module_link: MODULE_ROUTE[m] ?? null,
    });
  }
  for (const a of template.required_agents) {
    out.push({
      task_name: `Activate agent: ${humanize(a)}`,
      task_category: "agent",
      priority: "high",
      assigned_agent: a,
      module_link: null,
    });
  }
  for (const k of template.required_kpis) {
    out.push({
      task_name: `Configure KPI: ${humanize(k)}`,
      task_category: "kpi",
      priority: "normal",
      assigned_agent: "business_template_agent",
      module_link: "/founder/reports",
    });
  }
  for (const d of template.required_documents) {
    out.push({
      task_name: `Provide document: ${humanize(d)}`,
      task_category: "document",
      priority: "normal",
      assigned_agent: null,
      module_link: "/founder/documents",
    });
  }
  for (const i of template.recommended_integrations) {
    out.push({
      task_name: `Connect integration: ${humanize(i)}`,
      task_category: "integration",
      priority: "normal",
      assigned_agent: null,
      module_link: "/founder/integrations",
    });
  }
  for (const w of template.default_workflows) {
    out.push({
      task_name: `Configure workflow: ${humanize(w)}`,
      task_category: "workflow",
      priority: "normal",
      assigned_agent: "business_template_agent",
      module_link: "/founder/workflows",
    });
  }
  for (const r of template.default_approval_rules) {
    out.push({
      task_name: `Lock approval rule: ${humanize(r)}`,
      task_category: "approval_rule",
      priority: "high",
      assigned_agent: "business_template_agent",
      module_link: null,
    });
  }
  for (const f of template.default_risk_flags) {
    out.push({
      task_name: `Wire risk flag: ${humanize(f)}`,
      task_category: "risk_flag",
      priority: "normal",
      assigned_agent: "business_template_agent",
      module_link: null,
    });
  }
  return out;
}

function humanize(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

/** Detect wrong template applied. */
export function detectWrongTemplate(args: { archetype_code?: string; template?: TemplateRow }): string | null {
  if (!args.archetype_code || !args.template) return null;
  if (args.template.archetype_code !== args.archetype_code) {
    return `Template "${args.template.template_name}" is for ${args.template.archetype_code}, but business archetype is ${args.archetype_code}.`;
  }
  return null;
}

export { MODULE_ROUTE };