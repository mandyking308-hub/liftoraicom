// Founder-only, read-only Gmail connection diagnostic for Global PR Radar.
// Does NOT ingest emails, does NOT write any DB row, does NOT create drafts,
// does NOT send anything, does NOT log tokens.
import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PR_GMAIL_ACCOUNT = Deno.env.get("PR_GMAIL_ACCOUNT") ?? "mandyking308@gmail.com";
const REQUIRED_SECRETS = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "PR_GMAIL_ACCOUNT"];

const REQUIRED_LABELS = [
  "Liftor/PR Opportunities",
  "Liftor/PR Opportunities/Editorielle",
  "Liftor/PR Opportunities/Source of Sources",
  "Liftor/PR Opportunities/HARO",
  "Liftor/PR Opportunities/Qwoted",
  "Liftor/PR Opportunities/PressPlugs",
  "Liftor/PR Opportunities/ResponseSource",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const gate = await requireFounder(req);
  if ("error" in gate) return gate.error;

  const missing = REQUIRED_SECRETS.filter((k) => !(Deno.env.get(k) ?? "").trim());
  if (missing.length) {
    return json({
      ok: false,
      reason: "gmail_not_configured",
      account: PR_GMAIL_ACCOUNT,
      missing,
      token_refresh_ok: false,
      labels_visible: false,
      labels_found: [],
      labels_missing: REQUIRED_LABELS,
      ready_for_live_test: false,
    });
  }

  // Attempt token refresh — narrowest read-only flow.
  let accessToken = "";
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("GMAIL_CLIENT_ID")!,
        client_secret: Deno.env.get("GMAIL_CLIENT_SECRET")!,
        refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN")!,
        grant_type: "refresh_token",
      }),
    });
    if (!r.ok) {
      const status = r.status;
      return json({
        ok: false,
        reason: "token_refresh_failed",
        account: PR_GMAIL_ACCOUNT,
        missing: [],
        token_refresh_ok: false,
        labels_visible: false,
        labels_found: [],
        labels_missing: REQUIRED_LABELS,
        http_status: status,
        message: "Refresh token rejected by Google. Re-run OAuth setup.",
        ready_for_live_test: false,
      });
    }
    const j = await r.json();
    accessToken = j.access_token;
  } catch (e) {
    return json({
      ok: false,
      reason: "token_refresh_error",
      account: PR_GMAIL_ACCOUNT,
      token_refresh_ok: false,
      labels_visible: false,
      labels_found: [],
      labels_missing: REQUIRED_LABELS,
      message: String((e as Error).message || e).slice(0, 200),
      ready_for_live_test: false,
    });
  }

  // List labels only — no message reads.
  let labelNames: string[] = [];
  try {
    const lr = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!lr.ok) {
      return json({
        ok: false,
        reason: "labels_fetch_failed",
        account: PR_GMAIL_ACCOUNT,
        token_refresh_ok: true,
        labels_visible: false,
        labels_found: [],
        labels_missing: REQUIRED_LABELS,
        http_status: lr.status,
        ready_for_live_test: false,
      });
    }
    const lj = await lr.json();
    labelNames = (lj.labels ?? []).map((l: any) => String(l.name || "")).filter(Boolean);
  } catch (e) {
    return json({
      ok: false,
      reason: "labels_fetch_error",
      account: PR_GMAIL_ACCOUNT,
      token_refresh_ok: true,
      labels_visible: false,
      labels_found: [],
      labels_missing: REQUIRED_LABELS,
      message: String((e as Error).message || e).slice(0, 200),
      ready_for_live_test: false,
    });
  }

  const found = REQUIRED_LABELS.filter((n) => labelNames.includes(n));
  const missingLabels = REQUIRED_LABELS.filter((n) => !labelNames.includes(n));
  const ready = missingLabels.length === 0;

  return json({
    ok: true,
    account: PR_GMAIL_ACCOUNT,
    missing: [],
    token_refresh_ok: true,
    labels_visible: true,
    labels_total: labelNames.length,
    labels_found: found,
    labels_missing: missingLabels,
    ready_for_live_test: ready,
    notes: [
      "Read-only diagnostic. No emails were ingested.",
      "No Gmail draft created. No external send.",
      "Cron remains inactive — all PR runs are manual.",
    ],
  });
});