import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  CANONICAL_CHECKLIST_KEYS,
  computeActivationChecklist,
  type ChecklistInputs,
} from "../_shared/smartleadActivationChecklist.ts";
import { LEGACY_NEON_CANDY_ESTATE } from "../_shared/mailboxRegistrationParser.ts";

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
 * Recomputes the canonical 12-key Smartlead activation checklist from live
 * evidence and writes it to the EXISTING public.smartlead_activation_checklist.
 *
 * Read-only against Smartlead. Never sends. Never reports green on assumption.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: { role: string }) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch { /* GET-style call is fine */ }
  const estateKey = String(body.estate_key ?? "").trim() || null;
  const persist = body.persist !== false;

  const count = async (
    table: string,
    build: (q: ReturnType<typeof admin.from>) => unknown,
  ): Promise<number> => {
    // deno-lint-ignore no-explicit-any
    const q: any = build(admin.from(table) as any);
    const { count: c } = await q;
    return c ?? 0;
  };

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("id, status, credentials_present, provider_health, webhook_configured, last_test_at")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  const [
    receivedEvents,
    processedEvents,
    suppressionEvents,
    campaignMappings,
    activeCampaignMappings,
    leadMappings,
    sendingDomains,
  ] = await Promise.all([
    count("outbound_provider_events", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead")),
    count("outbound_provider_events", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead").eq("processing_status", "processed")),
    count("outbound_provider_events", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead").in("provider_event_type", ["email_bounced", "lead_unsubscribed"])),
    count("outbound_provider_campaign_mappings", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead")),
    count("outbound_provider_campaign_mappings", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead").eq("mapping_status", "mapped").eq("is_active", true)),
    count("outbound_provider_lead_mappings", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true }).eq("provider_type", "smartlead")),
    count("sending_domains", (q) =>
      // deno-lint-ignore no-explicit-any
      (q as any).select("id", { count: "exact", head: true })),
  ]);

  // Mailbox estate — the legacy Neon Candy estate is never counted as
  // education/portfolio sending capacity.
  let mailboxQ = admin
    .from("inboxes")
    .select("id, provider_ready, warmup_ready, warmup_status, daily_send_limit, ramp_daily_cap, estate_key")
    .neq("estate_key", LEGACY_NEON_CANDY_ESTATE);
  if (estateKey) mailboxQ = mailboxQ.eq("estate_key", estateKey);
  const { data: mailboxes } = await mailboxQ;
  const estate = mailboxes ?? [];

  const inputs: ChecklistInputs = {
    provider: provider
      ? {
          exists: true,
          status: provider.status,
          credentials_present: provider.credentials_present,
          provider_health: provider.provider_health,
          webhook_configured: provider.webhook_configured,
          last_test_at: provider.last_test_at,
        }
      : null,
    webhook_secret_present: (Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? "").length > 0,
    received_event_count: receivedEvents,
    processed_event_count: processedEvents,
    suppression_event_count: suppressionEvents,
    campaign_mapping_count: campaignMappings,
    active_campaign_mapping_count: activeCampaignMappings,
    lead_mapping_count: leadMappings,
    estate_mailbox_count: estate.length,
    estate_mailbox_provider_ready_count: estate.filter((m) => m.provider_ready === true).length,
    estate_mailbox_warmed_count: estate.filter(
      (m) => m.warmup_ready === true || String(m.warmup_status ?? "").toLowerCase() === "completed",
    ).length,
    estate_mailbox_with_caps_count: estate.filter(
      (m) => Number(m.daily_send_limit ?? 0) > 0 && Number(m.ramp_daily_cap ?? 0) > 0,
    ).length,
    sending_domain_count: sendingDomains,
    // Proven evidence only. Both stay false until the real thing happens.
    dry_run_test_passed: false,
    founder_live_approval: false,
  };

  const report = computeActivationChecklist(inputs);

  let persisted = 0;
  if (persist) {
    const nowIso = new Date().toISOString();
    for (const item of report.items) {
      const row = {
        checklist_key: item.checklist_key,
        checklist_label: item.checklist_label,
        status: item.status,
        blocker_reason: item.blocker_reason,
        metadata: item.metadata,
        last_checked_at: nowIso,
        updated_at: nowIso,
      };
      const { data: existing } = await admin
        .from("smartlead_activation_checklist")
        .select("id")
        .eq("checklist_key", item.checklist_key)
        .is("business_id", null)
        .is("liftor_campaign_id", null)
        .maybeSingle();
      if (existing?.id) {
        await admin.from("smartlead_activation_checklist").update(row).eq("id", existing.id);
      } else {
        await admin.from("smartlead_activation_checklist").insert(row);
      }
      persisted += 1;
    }
  }

  return json({
    ok: true,
    persisted,
    canonical_keys: CANONICAL_CHECKLIST_KEYS,
    ready_count: report.ready_count,
    not_ready_count: report.not_ready_count,
    blocked_count: report.blocked_count,
    ready_for_live_send: report.ready_for_live_send,
    blockers: report.blockers,
    items: report.items,
    evidence: inputs,
    notes: "Read-only recompute. No Smartlead call, no mailbox change, no email sent.",
  });
});
