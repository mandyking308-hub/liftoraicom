import { supabase } from "@/integrations/supabase/client";

export type LaunchProfileRow = {
  id: string;
  business_id: string;
  brand_name: string | null;
  public_brand_name: string | null;
  domain_name: string | null;
  website_url: string | null;
  support_email: string | null;
  sales_email: string | null;
  legal_footer_entity_id: string | null;
  launch_status: "draft" | "setup_needed" | "internal_ready" | "approval_required" | "live" | "paused";
  audit_metadata: any;
  created_at: string;
  updated_at: string;
};

export type ChannelAccountRow = {
  id: string;
  business_id: string;
  channel_type:
    | "domain" | "website" | "email" | "instagram" | "tiktok" | "youtube"
    | "facebook" | "linkedin" | "x" | "metricool" | "manychat" | "analytics" | "other";
  account_name: string;
  account_url: string | null;
  login_method_summary: string | null;
  connected: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type ChecklistItemRow = {
  id: string;
  business_id: string;
  item_name: string;
  item_category: "brand" | "domain" | "email" | "website" | "legal" | "tracking" | "social" | "crm" | "offer" | "campaign";
  item_status: "missing" | "draft" | "configured" | "approval_required" | "complete" | "not_needed";
  required: boolean;
  link_to_fix: string | null;
  created_at: string;
  updated_at: string;
};

/* ---------- Fetch ---------- */
export async function fetchLaunchProfiles() {
  const { data, error } = await (supabase as any)
    .from("business_launch_profiles").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as LaunchProfileRow[];
}
export async function fetchChannelAccounts(business_id?: string) {
  let q = (supabase as any).from("business_channel_accounts").select("*").order("channel_type");
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ChannelAccountRow[];
}
export async function fetchChecklist(business_id?: string) {
  let q = (supabase as any).from("business_launch_checklist_items").select("*").order("created_at", { ascending: false });
  if (business_id) q = q.eq("business_id", business_id);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ChecklistItemRow[];
}

/* ---------- Module link map ---------- */
export const LAUNCH_MODULE_ROUTE: Record<ChecklistItemRow["item_category"], string> = {
  brand: "/founder/launch-factory/brand",
  domain: "/founder/launch-factory/domains",
  email: "/founder/launch-factory/email",
  website: "/founder/launch-factory/brand",
  legal: "/founder/launch-factory/legal-pages",
  tracking: "/founder/launch-factory/tracking",
  social: "/founder/launch-factory/socials",
  crm: "/founder/customer-sales",
  offer: "/founder/product",
  campaign: "/founder/social",
};

/* ---------- Default checklist by archetype/template ---------- */
export type ChecklistSeed = Pick<ChecklistItemRow, "item_name" | "item_category" | "required" | "link_to_fix">;

const BASE_CHECKLIST: ChecklistSeed[] = [
  { item_name: "Brand name confirmed", item_category: "brand", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.brand },
  { item_name: "Public-facing brand name confirmed", item_category: "brand", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.brand },
  { item_name: "Logo & visual identity prepared", item_category: "brand", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.brand },
  { item_name: "Domain registered (founder approval to purchase)", item_category: "domain", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.domain },
  { item_name: "DNS prepared (founder approval to publish)", item_category: "domain", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.domain },
  { item_name: "Website prepared (founder approval to publish)", item_category: "website", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.website },
  { item_name: "Support inbox configured", item_category: "email", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.email },
  { item_name: "Sales inbox configured", item_category: "email", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.email },
  { item_name: "SPF / DKIM / DMARC ready (approval to publish)", item_category: "email", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.email },
  { item_name: "Terms of Service page", item_category: "legal", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.legal },
  { item_name: "Privacy Policy page", item_category: "legal", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.legal },
  { item_name: "Cookie policy", item_category: "legal", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.legal },
  { item_name: "Legal footer entity assigned", item_category: "legal", required: true, link_to_fix: "/founder/entity-map/businesses" },
  { item_name: "Analytics / tracking installed", item_category: "tracking", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.tracking },
  { item_name: "Consent / cookie banner", item_category: "tracking", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.tracking },
  { item_name: "CRM record created for business", item_category: "crm", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.crm },
  { item_name: "Primary offer / product defined", item_category: "offer", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.offer },
  { item_name: "First campaign prepared (approval to send)", item_category: "campaign", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.campaign },
];

const SOCIAL_BY_ARCHETYPE: Record<string, ChecklistSeed[]> = {
  saas: [
    { item_name: "LinkedIn page prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "X account prepared (approval to create)", item_category: "social", required: false, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ],
  ecommerce: [
    { item_name: "Instagram account prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "TikTok account prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "Facebook page prepared (approval to create)", item_category: "social", required: false, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ],
  marketplace: [
    { item_name: "Instagram account prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "LinkedIn page prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ],
  agency: [
    { item_name: "LinkedIn page prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ],
  content: [
    { item_name: "YouTube channel prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "TikTok account prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
    { item_name: "Instagram account prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ],
};

export function generateChecklistSeeds(archetype_code?: string): ChecklistSeed[] {
  const social = SOCIAL_BY_ARCHETYPE[archetype_code ?? ""] ?? [
    { item_name: "Primary social channel prepared (approval to create)", item_category: "social", required: true, link_to_fix: LAUNCH_MODULE_ROUTE.social },
  ];
  return [...BASE_CHECKLIST, ...social];
}

/* ---------- Generate (live, internal) ---------- */
export async function generateChecklistForBusiness(args: {
  business_id: string;
  archetype_code?: string;
  replace?: boolean;
}) {
  const { business_id, archetype_code, replace = false } = args;
  if (replace) {
    await (supabase as any).from("business_launch_checklist_items").delete().eq("business_id", business_id);
  }
  const seeds = generateChecklistSeeds(archetype_code);
  const rows = seeds.map(s => ({
    business_id,
    item_name: s.item_name,
    item_category: s.item_category,
    item_status: "missing" as const,
    required: s.required,
    link_to_fix: s.link_to_fix,
  }));
  const { data, error } = await (supabase as any).from("business_launch_checklist_items").insert(rows).select();
  if (error) throw error;
  return (data ?? []) as ChecklistItemRow[];
}

/* ---------- Diagnostics ---------- */
export type LaunchWarning = {
  business_id: string;
  severity: "missing" | "approval" | "info";
  message: string;
  link: string;
};

export function diagnoseLaunch(profile: LaunchProfileRow, items: ChecklistItemRow[]): LaunchWarning[] {
  const warnings: LaunchWarning[] = [];
  const push = (severity: LaunchWarning["severity"], message: string, link: string) =>
    warnings.push({ business_id: profile.business_id, severity, message, link });

  if (!profile.domain_name) push("missing", "No domain on launch profile", "/founder/launch-factory/domains");
  if (!profile.support_email) push("missing", "No support email configured", "/founder/launch-factory/email");
  if (!profile.legal_footer_entity_id) push("missing", "No legal footer entity assigned", "/founder/entity-map/businesses");

  const requiredOpen = items.filter(i => i.required && (i.item_status === "missing" || i.item_status === "draft"));
  for (const cat of ["offer", "tracking", "legal"] as const) {
    const open = requiredOpen.filter(i => i.item_category === cat);
    if (open.length > 0) push("missing", `${open.length} required ${cat} item${open.length === 1 ? "" : "s"} unresolved`, LAUNCH_MODULE_ROUTE[cat]);
  }
  const approvals = items.filter(i => i.item_status === "approval_required");
  if (approvals.length > 0) push("approval", `${approvals.length} item${approvals.length === 1 ? "" : "s"} awaiting founder approval`, "/founder/launch-factory/checklist");
  return warnings;
}

export function summarizeLaunch(profile: LaunchProfileRow, items: ChecklistItemRow[]) {
  const total = items.length;
  const complete = items.filter(i => i.item_status === "complete" || i.item_status === "not_needed").length;
  const missing = items.filter(i => i.item_status === "missing").length;
  const approvalRequired = items.filter(i => i.item_status === "approval_required").length;
  return { total, complete, missing, approvalRequired, percent: total ? Math.round((complete / total) * 100) : 0 };
}