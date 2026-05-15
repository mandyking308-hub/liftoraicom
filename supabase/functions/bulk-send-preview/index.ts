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
 * Bulk Send Preview — read-only readiness for Smartlead scale sending.
 * Aggregates: provider config, mappings, mailbox/campaign presence,
 * lead push readiness, webhook readiness. Returns can_send_scale=false.
 * No Smartlead writes. No DB writes.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SMARTLEAD_API_KEY = Deno.env.get("SMARTLEAD_API_KEY") ?? null;
  const SMARTLEAD_WEBHOOK_SECRET = Deno.env.get("SMARTLEAD_WEBHOOK_SECRET") ?? null;

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

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const limit = Math.min(Math.max(Number(body.limit ?? 10), 1), 50);

  const { data: provider } = await admin
    .from("outbound_providers")
    .select("*")
    .eq("provider_type", "smartlead")
    .maybeSingle();

  const credentialsPresent = !!SMARTLEAD_API_KEY && SMARTLEAD_API_KEY.length > 8;

  // Read-only Smartlead checks (count campaigns + accounts)
  let campaignCount = 0;
  let accountCount = 0;
  if (credentialsPresent) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10_000);
      const [cRes, aRes] = await Promise.all([
        fetch(
          `https://server.smartlead.ai/api/v1/campaigns/?include_tags=true&api_key=${encodeURIComponent(
            SMARTLEAD_API_KEY!,
          )}`,
          { signal: ctrl.signal },
        ),
        fetch(
          `https://server.smartlead.ai/api/v1/email-accounts/?offset=0&limit=100&api_key=${encodeURIComponent(
            SMARTLEAD_API_KEY!,
          )}`,
          { signal: ctrl.signal },
        ),
      ]);
      clearTimeout(t);
      const cTxt = await cRes.text();
      const aTxt = await aRes.text();
      try {
        const c = JSON.parse(cTxt);
        campaignCount = Array.isArray(c) ? c.length : Array.isArray(c?.data) ? c.data.length : 0;
      } catch {
        /* */
      }
      try {
        const a = JSON.parse(aTxt);
        accountCount = Array.isArray(a) ? a.length : Array.isArray(a?.data) ? a.data.length : 0;
      } catch {
        /* */
      }
    } catch {
      /* swallow */
    }
  }

  const { data: mappings } = await admin
    .from("outbound_provider_campaign_mappings")
    .select("id, mapping_status, is_active")
    .eq("provider_id", provider?.id ?? "00000000-0000-0000-0000-000000000000");

  const mappedCount = (mappings ?? []).filter(
    (m: any) => m.mapping_status === "mapped" && m.is_active,
  ).length;

  const provider_ready = !!provider && credentialsPresent;
  const scale_provider_configured = !!provider && provider.mode === "scale";
  const sending_accounts_present = accountCount > 0;
  const smartlead_campaign_present = campaignCount > 0;
  const smartlead_campaign_mapped = mappedCount > 0;
  const lead_push_ready = smartlead_campaign_present && sending_accounts_present;
  const webhook_ready = !!SMARTLEAD_WEBHOOK_SECRET && smartlead_campaign_present;
  const batch_preview_ready =
    provider_ready &&
    sending_accounts_present &&
    smartlead_campaign_present &&
    smartlead_campaign_mapped &&
    webhook_ready;

  const blockers: string[] = [];
  if (!sending_accounts_present) blockers.push("no_sending_accounts_in_smartlead");
  if (!smartlead_campaign_present) blockers.push("no_campaigns_in_smartlead");
  if (!smartlead_campaign_mapped) blockers.push("no_campaign_mapping");
  if (!webhook_ready) blockers.push("no_webhook_configured");
  blockers.push("scale_sending_disabled");

  return json({
    ok: true,
    dry_run: true,
    can_send_scale: false,
    provider_ready,
    scale_provider_configured,
    smartlead_campaign_mapped,
    smartlead_campaign_present,
    sending_accounts_present,
    lead_push_ready,
    webhook_ready,
    batch_preview_ready,
    eligible_count: 0,
    excluded_count: 0,
    counts: {
      smartlead_campaigns: campaignCount,
      smartlead_email_accounts: accountCount,
      active_mappings: mappedCount,
    },
    limit,
    blockers,
    notes:
      "NO SEND POSSIBLE YET. Read-only preview. No Smartlead writes, no DB writes, no email sent.",
  });
});