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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;
  const SMARTLEAD_WEBHOOK_SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;
  const SMARTLEAD_LEAD_PUSH_ENABLED =
    (Deno.env.get("SMARTLEAD_LEAD_PUSH_ENABLED") ?? "").toLowerCase() === "true";
  const SMARTLEAD_AI_INTAKE_APPLY_ENABLED =
    (Deno.env.get("SMARTLEAD_AI_INTAKE_APPLY_ENABLED") ?? "").toLowerCase() === "true";

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
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  const safe = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };
  const cnt = async (table: string, filters: (q: any) => any = (q) => q): Promise<number> => {
    return await safe(async () => {
      const { count } = await filters(admin.from(table).select("id", { count: "exact", head: true }));
      return count ?? 0;
    }, 0);
  };

  const { data: businesses } = await admin.from("businesses").select("id, name").limit(5);
  const business = businesses?.[0] ?? null;

  const providersRes = await safe(
    async () => await admin.from("outbound_providers").select("id, provider_type, mode, is_active"),
    { data: [] as any[] } as any,
  );
  const providers = providersRes?.data ?? [];
  const native = providers.find((p: any) => p.provider_type === "native_smtp" || p.provider_type === "ionos") ?? null;
  const smartlead = providers.find((p: any) => p.provider_type === "smartlead") ?? null;

  const apollo_candidate_pool = await cnt("contacts", (q) => q.eq("source_platform", "apollo"));
  const apollo_reveal_ready = await cnt("contacts", (q) => q.eq("source_platform", "apollo").not("email", "is", null));
  const apollo_safe_to_promote = await cnt("contacts", (q) =>
    q.eq("source_platform", "apollo").not("email", "is", null).not("lawful_basis", "is", null).not("unsubscribe_token", "is", null),
  );

  const contacts_total = await cnt("contacts");
  const outreach_allowed = await cnt("contacts", (q) => q.eq("compliance_status", "outreach_allowed"));
  const pending_review = await cnt("contacts", (q) => q.not("founder_review_requested_at", "is", null));
  const missing_lawful = await cnt("contacts", (q) => q.is("lawful_basis", null));
  const missing_unsub = await cnt("contacts", (q) => q.is("unsubscribe_token", null));
  const suppressed_or_blocked = await cnt("contacts", (q) =>
    q.or("is_globally_suppressed.eq.true,hard_bounced.eq.true,do_not_contact.eq.true,unsubscribed_at.not.is.null"),
  );

  const policiesRes = await safe(
    async () => await admin.from("outbound_channel_policies").select("intent, default_provider, is_active"),
    { data: [] as any[] } as any,
  );
  const policies = policiesRes?.data ?? [];
  const routeFor = (intent: string) => {
    const p = policies.find((x: any) => x.intent === intent && x.is_active);
    return p ? p.default_provider : null;
  };
  const routing = {
    policies_present: policies.length,
    cold_outreach: routeFor("cold_outreach"),
    proposal_send: routeFor("proposal_send"),
    invoice_chaser: routeFor("invoice_chaser"),
    supplier_message: routeFor("supplier_message"),
  };

  const smartlead_api_key_present = !!SMARTLEAD_API_KEY && SMARTLEAD_API_KEY.length > 8;
  let mailbox_count = 0, warmup_count = 0, campaign_count = 0;
  if (smartlead_api_key_present) {
    await safe(async () => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8_000);
      const [cRes, aRes] = await Promise.all([
        fetch(`https://server.smartlead.ai/api/v1/campaigns/?api_key=${encodeURIComponent(SMARTLEAD_API_KEY!)}`, { signal: ctrl.signal }),
        fetch(`https://server.smartlead.ai/api/v1/email-accounts/?offset=0&limit=100&api_key=${encodeURIComponent(SMARTLEAD_API_KEY!)}`, { signal: ctrl.signal }),
      ]);
      clearTimeout(t);
      try {
        const c = JSON.parse(await cRes.text());
        const arr = Array.isArray(c) ? c : Array.isArray(c?.data) ? c.data : [];
        campaign_count = arr.length;
      } catch {}
      try {
        const a = JSON.parse(await aRes.text());
        const arr: any[] = Array.isArray(a) ? a : Array.isArray(a?.data) ? a.data : [];
        mailbox_count = arr.length;
        warmup_count = arr.filter((x: any) =>
          x?.warmup_details?.status === "ACTIVE" || x?.warmup_status === "ACTIVE" || x?.warmup_enabled === true,
        ).length;
      } catch {}
      return null;
    }, null);
  }
  const mapping_count = await cnt("outbound_provider_campaign_mappings", (q) =>
    q.eq("provider_type", "smartlead").eq("mapping_status", "mapped").eq("is_active", true),
  );
  const lead_mappings_pushed = await cnt("outbound_provider_lead_mappings", (q) =>
    q.in("push_status", ["pushed", "pushing"]),
  );
  const sequence_mapping_ready = mapping_count > 0;
  const lead_push_preview_ready = mapping_count > 0;
  const webhook_ready = !!SMARTLEAD_WEBHOOK_SECRET && campaign_count > 0;

  const events_total = await cnt("outbound_provider_events");
  const reply_events = await cnt("outbound_provider_events", (q) =>
    q.in("event_type", ["EMAIL_REPLY", "reply", "lead_reply"]),
  );
  const ai_intake_preview_ready = events_total > 0;
  const ai_intake_apply_enabled = SMARTLEAD_AI_INTAKE_APPLY_ENABLED;

  const probe = async (table: string) =>
    await safe(async () => {
      const { error } = await admin.from(table).select("id").limit(1);
      return !error;
    }, false);
  const internal_proposals_present = await probe("internal_proposals");
  const demos_present = await probe("demos");
  const deals_present = await probe("deals");
  const finance_present = await probe("invoices");

  const sysRowsRes = await safe(
    async () => await admin.from("system_settings").select("key, value"),
    { data: [] as any[] } as any,
  );
  const sysMap: Record<string, any> = {};
  for (const r of sysRowsRes?.data ?? []) sysMap[r.key] = r.value;
  const auto_send_enabled = sysMap["auto_send_enabled"] === true || sysMap["auto_send_enabled"] === "true";
  const cron_status = sysMap["cron_enabled"] === true ? "enabled" : "disabled";
  const native_queue_pending = await cnt("email_queue", (q) => q.eq("status", "pending"));

  type Stage = { stage: string; status: "ready" | "blocked" | "deferred"; blocker: string | null; next_action: string };
  const stages: Stage[] = [
    { stage: "Source", status: apollo_safe_to_promote > 0 ? "ready" : "blocked", blocker: apollo_safe_to_promote > 0 ? null : "no_safe_apollo_contacts", next_action: "Promote compliant Apollo contacts (no Apollo call performed)." },
    { stage: "CRM", status: contacts_total > 0 ? "ready" : "blocked", blocker: contacts_total > 0 ? null : "no_contacts", next_action: "Ensure CRM contains compliant contacts." },
    { stage: "Compliance", status: outreach_allowed > 0 ? "ready" : "blocked", blocker: outreach_allowed > 0 ? null : "no_outreach_allowed_contacts", next_action: "Run compliance review on pending contacts." },
    { stage: "Routing", status: routing.cold_outreach === "smartlead" ? "ready" : "blocked", blocker: routing.cold_outreach === "smartlead" ? null : "cold_outreach_not_routed_to_smartlead", next_action: "Set cold_outreach policy to smartlead." },
    { stage: "Smartlead Campaign", status: campaign_count > 0 ? "ready" : "blocked", blocker: campaign_count > 0 ? null : "no_smartlead_campaign", next_action: "Founder creates draft Smartlead campaign." },
    { stage: "Sequence", status: sequence_mapping_ready ? "ready" : "blocked", blocker: sequence_mapping_ready ? null : "no_campaign_mapping", next_action: "Apply campaign mapping in Discovery panel." },
    { stage: "Lead Push", status: lead_push_preview_ready ? (SMARTLEAD_LEAD_PUSH_ENABLED ? "ready" : "deferred") : "blocked", blocker: lead_push_preview_ready ? (SMARTLEAD_LEAD_PUSH_ENABLED ? null : "lead_push_disabled") : "no_campaign_mapping", next_action: "Run lead push preview, then enable feature flag when ready." },
    { stage: "Webhook", status: webhook_ready ? "ready" : "blocked", blocker: webhook_ready ? null : (!SMARTLEAD_WEBHOOK_SECRET ? "no_webhook_configured" : "no_smartlead_campaign"), next_action: "Configure SMARTLEAD_WEBHOOK_SECRET and register webhook URL." },
    { stage: "AI Intake", status: ai_intake_apply_enabled ? "ready" : (ai_intake_preview_ready ? "deferred" : "blocked"), blocker: ai_intake_apply_enabled ? null : "ai_intake_apply_disabled", next_action: "Validate intake previews before enabling apply." },
    { stage: "Proposal", status: internal_proposals_present ? "ready" : "blocked", blocker: internal_proposals_present ? null : "proposals_module_missing", next_action: "Confirm internal proposals module wiring." },
    { stage: "Deal", status: deals_present ? "ready" : "blocked", blocker: deals_present ? null : "deals_module_missing", next_action: "Confirm deals pipeline available." },
    { stage: "Finance", status: finance_present ? "ready" : "blocked", blocker: finance_present ? null : "finance_module_missing", next_action: "Confirm invoice/finance module wiring." },
  ];

  const groups: Record<string, string[]> = {
    manual_founder_action: [],
    build_missing: [],
    safety_locked: [],
    external_provider_missing: [],
    live_activation_disabled: [],
  };
  const groupOf: Record<string, string> = {
    no_safe_apollo_contacts: "manual_founder_action",
    no_contacts: "manual_founder_action",
    no_outreach_allowed_contacts: "manual_founder_action",
    cold_outreach_not_routed_to_smartlead: "manual_founder_action",
    no_smartlead_campaign: "external_provider_missing",
    no_campaign_mapping: "manual_founder_action",
    warmup_not_enabled: "external_provider_missing",
    no_webhook_configured: "external_provider_missing",
    lead_push_disabled: "live_activation_disabled",
    scale_sending_disabled: "live_activation_disabled",
    ai_intake_apply_disabled: "live_activation_disabled",
    native_auto_send_disabled: "safety_locked",
    proposals_module_missing: "build_missing",
    deals_module_missing: "build_missing",
    finance_module_missing: "build_missing",
  };
  for (const s of stages) if (s.blocker && groupOf[s.blocker]) groups[groupOf[s.blocker]].push(s.blocker);
  if (!warmup_count) groups.external_provider_missing.push("warmup_not_enabled");
  groups.live_activation_disabled.push("scale_sending_disabled");
  if (!auto_send_enabled) groups.safety_locked.push("native_auto_send_disabled");

  return json({
    ok: true,
    dry_run: true,
    can_send_anything_now: false,
    business: {
      business_name: business?.name ?? null,
      business_id: business?.id ?? null,
      native_provider: native ? { mode: native.mode, is_active: native.is_active } : null,
      smartlead_provider: smartlead ? { mode: smartlead.mode, is_active: smartlead.is_active } : null,
    },
    apollo_source: {
      candidate_pool: apollo_candidate_pool,
      reveal_ready: apollo_reveal_ready,
      safe_to_promote: apollo_safe_to_promote,
      apollo_called: false,
    },
    crm_compliance: {
      contacts_total, outreach_allowed, pending_review,
      missing_lawful_basis: missing_lawful,
      missing_unsubscribe_token: missing_unsub,
      suppressed_bounced_dnc: suppressed_or_blocked,
    },
    routing,
    smartlead: {
      api_key_present: smartlead_api_key_present,
      mailbox_count, warmup_count, campaign_count, mapping_count,
      sequence_mapping_ready, lead_push_preview_ready, webhook_ready,
      lead_mappings_pushed, scale_sending_enabled: false,
    },
    events_ai: {
      events_total, reply_events,
      ai_intake_preview_ready,
      conversation_apply_enabled: ai_intake_apply_enabled,
      outbound_ai_send_enabled: false,
    },
    modules: { internal_proposals_present, demos_present, deals_present, finance_present },
    safety: {
      auto_send_enabled, cron_status, worker_fail_closed: true, native_queue_pending,
      scale_send_blockers: [
        ...(campaign_count === 0 ? ["no_smartlead_campaign"] : []),
        ...(mapping_count === 0 ? ["no_campaign_mapping"] : []),
        ...(warmup_count === 0 ? ["warmup_not_enabled"] : []),
        ...(!SMARTLEAD_WEBHOOK_SECRET ? ["no_webhook_configured"] : []),
        ...(SMARTLEAD_LEAD_PUSH_ENABLED ? [] : ["lead_push_disabled"]),
        "scale_sending_disabled",
      ],
    },
    stages,
    blocker_groups: groups,
    notes: "No leads pushed. No emails sent. No Apollo calls. No Smartlead POST calls. Read-only diagnostics.",
  });
});
