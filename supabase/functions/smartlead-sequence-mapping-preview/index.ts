import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const SMARTLEAD_BASE_URL = "https://server.smartlead.ai/api/v1";

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

/* ---- inline placeholder mapper (mirror of src/lib/providers/smartleadTemplateMapper.ts) ---- */
const LIFTOR_TO_SMARTLEAD: Record<string, string> = {
  "[First Name]": "{{first_name}}",
  "[FirstName]": "{{first_name}}",
  "[Last Name]": "{{last_name}}",
  "[LastName]": "{{last_name}}",
  "[Company]": "{{company_name}}",
  "[Company Name]": "{{company_name}}",
  "[Website]": "{{website}}",
  "[LinkedIn]": "{{linkedin_profile}}",
  "[Email]": "{{email}}",
};
const SUPPORTED = new Set([
  "{{first_name}}", "{{last_name}}", "{{company_name}}",
  "{{website}}", "{{linkedin_profile}}", "{{email}}", "{{signature}}",
]);
function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function convertText(input: string) {
  let out = input ?? "";
  for (const [from, to] of Object.entries(LIFTOR_TO_SMARTLEAD)) {
    out = out.replace(new RegExp(escRe(from), "gi"), to);
  }
  return out;
}
function convert(subject: string, body: string) {
  const cs = convertText(subject);
  const cb = convertText(body);
  const unresolved = Array.from(new Set([
    ...(cs.match(/\[[A-Za-z][^\]\n]{0,40}\]/g) ?? []),
    ...(cb.match(/\[[A-Za-z][^\]\n]{0,40}\]/g) ?? []),
  ]));
  const tokens = [...(cs.match(/\{\{[^}\n]+\}\}/g) ?? []), ...(cb.match(/\{\{[^}\n]+\}\}/g) ?? [])];
  const unsupported = Array.from(new Set(tokens.filter((t) => !SUPPORTED.has(t.toLowerCase()))));
  const lower = cb.toLowerCase();
  const has_unsubscribe = /unsubscribe|opt[- ]?out|reply\s+stop|no longer.*hear|remove me/.test(lower);
  const tail = cb.trim().split(/\n+/).slice(-4).join("\n");
  const has_signature = /(^|\n)\s*(?:[–-]{1,2}\s*\S+|best,|thanks,|cheers,|kind regards,|regards,)/i.test(tail);
  const issues: any[] = [];
  for (const u of unresolved) issues.push({ severity: "error", code: "unresolved_placeholder", message: u });
  for (const t of unsupported) issues.push({ severity: "warning", code: "unsupported_smartlead_token", message: t });
  if (!has_unsubscribe) issues.push({ severity: "error", code: "missing_unsubscribe", message: "no opt-out language" });
  if (!has_signature) issues.push({ severity: "warning", code: "missing_signature", message: "no sign-off" });
  if (!subject?.trim()) issues.push({ severity: "error", code: "empty_subject", message: "subject empty" });
  if (!body?.trim()) issues.push({ severity: "error", code: "empty_body", message: "body empty" });
  const validation_status = issues.some(i => i.severity === "error") ? "error"
    : issues.some(i => i.severity === "warning") ? "warning" : "ok";
  return {
    converted_subject: cs, converted_body: cb,
    detected_unresolved_brackets: unresolved,
    detected_unsupported_smartlead_tokens: unsupported,
    has_unsubscribe, has_signature,
    issues, validation_status,
  };
}

/* ---- handler ---- */
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
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  let liftorCampaignId = String(body.liftor_campaign_id ?? "").trim();
  let providerCampaignId = String(body.provider_campaign_id ?? "").trim();

  // Resolve from active mapping if either is missing.
  if (!liftorCampaignId || !providerCampaignId) {
    const { data: mapping } = await admin
      .from("outbound_provider_campaign_mappings")
      .select("liftor_campaign_id, provider_campaign_id, is_active, mapping_status")
      .eq("provider_type", "smartlead")
      .eq("is_active", true)
      .eq("mapping_status", "mapped")
      .order("last_synced_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    liftorCampaignId = liftorCampaignId || String(mapping?.liftor_campaign_id ?? "");
    providerCampaignId = providerCampaignId || String(mapping?.provider_campaign_id ?? "");
  }

  // Default to known Early Access Collaboration Test campaign if nothing else.
  if (!liftorCampaignId) liftorCampaignId = "d621d6bc-76af-48a2-a8f2-c7505dbb9654";

  // Liftor sequence
  const { data: liftorSteps, error: lsErr } = await admin
    .from("outreach_sequences")
    .select("step_number, subject, body, delay_days")
    .eq("campaign_id", liftorCampaignId)
    .order("step_number", { ascending: true });
  if (lsErr) return json({ ok: false, error: "liftor_sequence_fetch_failed", detail: lsErr.message }, 500);

  const converted = (liftorSteps ?? []).map((s: any) => ({
    step_number: s.step_number,
    delay_days: s.delay_days,
    subject: s.subject,
    body: s.body,
    conversion: convert(s.subject ?? "", s.body ?? ""),
  }));

  // Smartlead sequence (read-only) — only if api key + provider campaign id available.
  let smartleadSequence: any[] | null = null;
  let smartleadHttpStatus = 0;
  let smartleadError: string | null = null;
  let smartleadEndpointSupported = false;

  if (providerCampaignId && SMARTLEAD_API_KEY && SMARTLEAD_API_KEY.length > 8) {
    const url = `${SMARTLEAD_BASE_URL}/campaigns/${encodeURIComponent(providerCampaignId)}/sequences?api_key=${encodeURIComponent(SMARTLEAD_API_KEY)}`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12_000);
    try {
      const res = await fetch(url, { method: "GET", signal: ctrl.signal });
      smartleadHttpStatus = res.status;
      smartleadEndpointSupported = res.ok;
      const txt = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(txt); } catch { /* */ }
      if (res.ok) {
        smartleadSequence = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.data) ? parsed.data
          : Array.isArray(parsed?.sequences) ? parsed.sequences
          : [];
      } else {
        smartleadError = `sequences_http_${res.status}`;
      }
    } catch (e: any) {
      smartleadError = `fetch_error: ${e?.message ?? String(e)}`;
    } finally {
      clearTimeout(t);
    }
  }

  const liftorCount = converted.length;
  const smartleadCount = smartleadSequence?.length ?? null;
  const mismatchWarnings: string[] = [];
  if (smartleadCount != null && smartleadCount !== liftorCount) {
    mismatchWarnings.push(`step_count_mismatch: liftor=${liftorCount} smartlead=${smartleadCount}`);
  }
  if (smartleadCount === 0) mismatchWarnings.push("smartlead_sequence_empty");
  if (!providerCampaignId) mismatchWarnings.push("no_active_smartlead_campaign_mapping");

  const totalErrors = converted.reduce((acc, s) => acc + s.conversion.issues.filter(i => i.severity === "error").length, 0);
  const totalWarnings = converted.reduce((acc, s) => acc + s.conversion.issues.filter(i => i.severity === "warning").length, 0);

  return json({
    ok: true,
    liftor_campaign_id: liftorCampaignId,
    provider_campaign_id: providerCampaignId || null,
    smartlead_endpoint: {
      called: !!providerCampaignId && !!SMARTLEAD_API_KEY,
      supported: smartleadEndpointSupported,
      http_status: smartleadHttpStatus,
      error: smartleadError,
    },
    liftor_step_count: liftorCount,
    smartlead_step_count: smartleadCount,
    mismatch_warnings: mismatchWarnings,
    converted_steps: converted,
    smartlead_sequence_raw: smartleadSequence,
    validation_summary: {
      total_errors: totalErrors,
      total_warnings: totalWarnings,
      overall_status: totalErrors > 0 ? "error" : totalWarnings > 0 ? "warning" : "ok",
    },
    apply_available: false,
    apply_disabled_reason: "sequence_apply_endpoint_not_built",
    notes: "Read-only. No Smartlead writes. No campaign / sequence mutation. No leads pushed. No emails sent.",
  });
});