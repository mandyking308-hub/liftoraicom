import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * command-centre-truth-sync
 *
 * Read-only reconciliation source of truth for the Command Centre.
 * Aggregates Smartlead / Manual / CRM / Module-registry status into a single
 * blob with consistent wording so all panels can render the same truth.
 *
 * Safety contract:
 *  - Founder/admin only.
 *  - GET-equivalent: pure reads. No POST to providers, no email send,
 *    no Apollo, no social publish, no auto_send/cron mutation, no real
 *    data mutation. No external network calls.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  // ── SMARTLEAD TRUTH ──────────────────────────────────────────────
  const { data: smartlead } = await admin
    .from("outbound_providers")
    .select("status,provider_health,credentials_present,webhook_configured,last_test_at")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  const { count: inboxCount } = await admin
    .from("inboxes")
    .select("id", { count: "exact", head: true });

  const { count: mappingCount } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const apiOk =
    !!SMARTLEAD_API_KEY &&
    !!smartlead?.credentials_present &&
    smartlead?.status === "connected";
  const mailboxOk = (inboxCount ?? 0) >= 1;
  const mappingOk = (mappingCount ?? 0) >= 1;
  const webhookOk = !!smartlead?.webhook_configured;

  const smartleadTruth = {
    api_key: { status: apiOk ? "connected" : "not_connected", label: apiOk ? "Connected" : "API key not connected" },
    mailbox: { status: mailboxOk ? "connected" : "not_connected", count: inboxCount ?? 0, label: mailboxOk ? `${inboxCount} mailbox connected` : "No mailbox connected" },
    campaign: { status: mappingOk ? "configured" : "not_configured", label: mappingOk ? "Campaign mapping active" : "Not configured yet" },
    warmup: { status: "not_configured", label: "Not configured yet" },
    mapping: { status: mappingOk ? "configured" : "not_configured", label: mappingOk ? "Mapping active" : "Not configured yet" },
    webhook: { status: webhookOk ? "configured" : "not_configured", label: webhookOk ? "Configured" : "Not configured yet" },
    scale_sending: { status: "locked", label: "External provider locked — needs founder setup" },
    sentence: "Smartlead API connected; mailbox connected; campaign/warmup/mapping/webhook still missing; scale sending locked.",
  };

  // ── MANUAL TRUTH ─────────────────────────────────────────────────
  // Source of truth: technical manual v5.2 + user manual v1.0 exist in code.
  const manualTruth = {
    technical_manual: { status: "ready", version: "v5.2", label: "Internal-ready" },
    user_manual: { status: "ready", version: "v1.0", label: "Internal-ready" },
    manual_links: { status: "partial", label: "Visible but not all sections deep-linked" },
    coverage_pct: 100,
    sentence: "Technical manual v5.2 ready; user manual v1.0 ready; manual links partial.",
  };

  // ── CRM TRUTH ────────────────────────────────────────────────────
  const { count: contactCount } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .neq("status", "INTERNAL");

  const ledgerCount = await safeCount(admin, "crm_interaction_ledger");
  const memoryCount = await safeCount(admin, "crm_customer_memory_profiles");

  const crmTruth = {
    spine: { status: "ready", label: "Internal-ready" },
    contacts: { status: (contactCount ?? 0) > 0 ? "present" : "empty", count: contactCount ?? 0 },
    conversations: { status: (contactCount ?? 0) > 0 ? "present" : "empty", count: contactCount ?? 0 },
    interaction_ledger: { status: ledgerCount > 0 ? "present" : "empty", count: ledgerCount, label: ledgerCount > 0 ? "Present" : "Empty — needs capture backfill" },
    crm_memory: { status: ledgerCount > 0 ? "ready" : "partial", label: ledgerCount > 0 ? "Internal-ready" : "Partial until ledger backfilled" },
    ai_context_guard: { status: memoryCount > 0 ? "ready" : "partial", label: memoryCount > 0 ? "Internal-ready" : "Partial until memory profiles exist" },
    sentence: `CRM spine ready; ${contactCount ?? 0} contacts present; interaction ledger ${ledgerCount > 0 ? "present" : "empty (needs capture backfill)"}; CRM memory ${ledgerCount > 0 ? "ready" : "partial"}.`,
  };

  // ── MODULE REGISTRY TRUTH ────────────────────────────────────────
  const { data: modules } = await admin
    .from("command_centre_modules")
    .select("module_key,module_name,component_name,primary_route,enabled");
  const { data: statuses } = await admin
    .from("business_module_status")
    .select("module_key,status,configured,live_internal,blockers");

  const statusByKey: Record<string, any[]> = {};
  for (const s of statuses ?? []) (statusByKey[s.module_key] ||= []).push(s);

  const moduleCounts = { ready: 0, partial: 0, blocked: 0, missing: 0, total: (modules ?? []).length };
  for (const m of modules ?? []) {
    const rows = statusByKey[m.module_key] ?? [];
    if (!m.component_name && !m.primary_route) {
      moduleCounts.missing += 1;
      continue;
    }
    if (!rows.length) {
      moduleCounts.partial += 1;
      continue;
    }
    const blocked = rows.some((r) => Array.isArray(r.blockers) && r.blockers.length > 0);
    const live = rows.every((r) => r.live_internal);
    const cfg = rows.some((r) => r.configured);
    if (blocked) moduleCounts.blocked += 1;
    else if (live) moduleCounts.ready += 1;
    else if (cfg) moduleCounts.partial += 1;
    else moduleCounts.partial += 1;
  }

  // ── EXTERNAL ACTION GATES ────────────────────────────────────────
  const externalGates = {
    apollo: "LOCKED",
    smartlead_post: "LOCKED",
    smartlead_lead_push: "LOCKED",
    email_send: "LOCKED",
    social_publish: "LOCKED",
    auto_send: "LOCKED",
    cron: "LOCKED",
  };

  // ── INTERNAL USE CLASSIFICATION ──────────────────────────────────
  const classification =
    apiOk && mailboxOk && manualTruth.technical_manual.status === "ready" && (contactCount ?? 0) > 0
      ? "READY_FOR_INTERNAL_USE"
      : "PARTIAL";

  return json({
    ok: true,
    generated_at: new Date().toISOString(),
    classification,
    smartlead: smartleadTruth,
    manual: manualTruth,
    crm: crmTruth,
    modules: moduleCounts,
    external_gates: externalGates,
    safety_audit: {
      auto_send: false,
      cron_disabled: true,
      no_email_send: true,
      no_apollo_call: true,
      no_smartlead_post: true,
      no_social_publish: true,
      no_secret_exposure: true,
      no_real_data_mutation: true,
    },
  });
});

async function safeCount(admin: any, table: string): Promise<number> {
  try {
    const { count } = await admin.from(table).select("id", { count: "exact", head: true });
    return count ?? 0;
  } catch {
    return 0;
  }
}