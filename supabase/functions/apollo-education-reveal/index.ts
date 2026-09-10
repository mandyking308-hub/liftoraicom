// Selected Education CRM business-email reveal — 10 September 2026.
//
// Operates on canonical contacts.id rows and updates the SAME CRM contact.
// Every paid Apollo request must reserve through the shared portfolio firewall.
// No phone reveal, no personal email reveal, no waterfall, no Smartlead, no send.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  buildOperationKey,
  getFirewallStatus,
  loadNoEmailPersonIds,
  releaseCredits,
  reserveCredits,
  settleCredits,
} from "../_shared/apolloCreditFirewall.ts";

const APOLLO_BUSINESS_EMAIL_REVEAL_URL = "https://api.apollo.io/api/v1/people/match";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CONTACTS = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const reportedCredits = (payload: any): number => {
  const raw = payload?.credits_consumed ?? payload?.credits_used ?? payload?.meta?.credits_consumed;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 1;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ENC_KEY = Deno.env.get("APOLLO_ENCRYPTION_KEY") ?? Deno.env.get("APOLLO_KEY_ENC") ?? Deno.env.get("APOLLO_ENC_KEY") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).in("role", ["founder", "admin"]);
  if (!roles?.length) return json({ error: "founder_role_required" }, 403);

  let body: { contact_ids?: string[]; confirm?: boolean; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* defaults */ }
  const contactIds = Array.from(new Set((body.contact_ids ?? []).filter(Boolean))).slice(0, MAX_CONTACTS);
  if (!contactIds.length) return json({ error: "contact_ids_required" }, 400);

  const { data: contacts, error: contactErr } = await admin.from("contacts")
    .select("id,name,email,organisation_id,education_group_id,research_program_key,apollo_person_id,sendable_status,is_globally_suppressed,hard_bounced,do_not_contact_at,unsubscribed_at")
    .in("id", contactIds);
  if (contactErr) return json({ error: "contact_lookup_failed", detail: contactErr.message }, 500);

  const selected = contacts ?? [];
  const invalid = selected.filter((c: any) =>
    !c.organisation_id || !c.education_group_id || !c.apollo_person_id || c.research_program_key !== "education_152_master_2026_09"
  );
  const suppressed = selected.filter((c: any) =>
    c.is_globally_suppressed || c.hard_bounced || c.do_not_contact_at || c.unsubscribed_at || c.sendable_status === "suppressed"
  );
  const alreadyHasEmail = selected.filter((c: any) => c.email && EMAIL_RE.test(String(c.email)));

  const firewall = await getFirewallStatus(admin);
  const dryRun = body.dry_run === true || body.confirm !== true;
  const eligible = selected.filter((c: any) =>
    !invalid.some((x: any) => x.id === c.id) &&
    !suppressed.some((x: any) => x.id === c.id) &&
    !alreadyHasEmail.some((x: any) => x.id === c.id)
  );

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      selected: selected.length,
      eligible: eligible.length,
      invalid: invalid.length,
      suppressed: suppressed.length,
      already_has_email: alreadyHasEmail.length,
      estimated_credits: eligible.length,
      firewall: {
        paid_enrichment_enabled: firewall.paid_enrichment_enabled,
        hard_credit_limit: firewall.hard_credit_limit,
        credits_remaining: firewall.credits_remaining,
        phone_reveal: firewall.allow_phone_reveal,
        personal_email_reveal: firewall.allow_personal_email_reveal,
        waterfall: firewall.allow_waterfall,
      },
      would_be_blocked: !firewall.ok || !firewall.paid_enrichment_enabled || firewall.hard_credit_limit <= 0,
      provider_calls: 0,
      smartlead_calls: 0,
      sends: 0,
      note: "Preview only. Re-call with confirm:true only after the portfolio firewall is deliberately configured. Business email only.",
    });
  }

  if (!firewall.ok || !firewall.paid_enrichment_enabled || firewall.hard_credit_limit <= 0) {
    return json({
      error: "apollo_credit_firewall_blocked",
      firewall_reason: firewall.reason ?? (firewall.paid_enrichment_enabled ? "hard_credit_limit_zero" : "paid_enrichment_disabled"),
      provider_calls: 0,
    }, 412);
  }
  if (firewall.allow_phone_reveal || firewall.allow_personal_email_reveal || firewall.allow_waterfall) {
    return json({ error: "unsafe_reveal_policy", detail: "Education reveal requires phone/personal/waterfall flags to remain false." }, 412);
  }

  const noEmailPreviously = await loadNoEmailPersonIds(admin, eligible.map((c: any) => String(c.apollo_person_id)));
  const targets = eligible.filter((c: any) => !noEmailPreviously.has(String(c.apollo_person_id)));
  if (!targets.length) {
    return json({ ok: true, attempted: 0, skipped_previous_no_email: eligible.length, provider_calls: 0 });
  }

  const { data: connection } = await admin.from("apollo_connections")
    .select("api_key_cipher,enrichment_api_status,is_active")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!connection?.api_key_cipher || connection.enrichment_api_status !== "ok") {
    return json({ error: "apollo_enrichment_connection_unavailable", provider_calls: 0 }, 412);
  }
  const { data: dec } = await admin.rpc("apollo_decrypt_key", { cipher: connection.api_key_cipher, enc_key: ENC_KEY });
  const apiKey = dec as string;
  if (!apiKey) return json({ error: "apollo_key_decrypt_failed", provider_calls: 0 }, 500);

  const results: Array<Record<string, unknown>> = [];
  let providerCalls = 0;
  let revealed = 0;
  let noEmail = 0;
  let duplicateEmail = 0;
  let firewallBlocked = 0;

  for (const contact of targets as any[]) {
    const pid = String(contact.apollo_person_id);
    const opKey = buildOperationKey({
      function_source: "apollo-education-reveal",
      scope: `contact:${contact.id}:business-email`,
      apollo_person_ids: [pid],
    });
    const reservation = await reserveCredits(admin, {
      operation_key: opKey,
      function_source: "apollo-education-reveal",
      estimated_credits: 1,
      apollo_person_ids: [pid],
      metadata: { contact_id: contact.id, organisation_id: contact.organisation_id, education_group_id: contact.education_group_id },
    });
    if (!reservation.allowed) {
      firewallBlocked++;
      results.push({ contact_id: contact.id, status: "firewall_blocked", reason: reservation.reason });
      if (reservation.reason === "hard_limit_would_be_exceeded" || reservation.reason === "paid_enrichment_disabled") break;
      continue;
    }

    let res: Response | null = null;
    let payload: any = null;
    try {
      const url = `${APOLLO_BUSINESS_EMAIL_REVEAL_URL}?id=${encodeURIComponent(pid)}&reveal_personal_emails=false`;
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(15_000),
      });
      providerCalls++;
      payload = await res.json().catch(() => null);
    } catch {
      await releaseCredits(admin, opKey, "network_or_timeout");
      results.push({ contact_id: contact.id, status: "provider_error" });
      continue;
    }

    if (!res.ok) {
      await releaseCredits(admin, opKey, `http_${res.status}`);
      results.push({ contact_id: contact.id, status: "provider_error", http_status: res.status });
      continue;
    }

    const person = payload?.person ?? payload?.matched_person ?? payload;
    const email = person?.email && EMAIL_RE.test(String(person.email)) ? String(person.email).trim().toLowerCase() : null;
    const actualCredits = reportedCredits(payload);
    await settleCredits(admin, {
      operation_key: opKey,
      actual_credits: actualCredits,
      no_email_person_ids: email ? [] : [pid],
      revealed_person_ids: email ? [pid] : [],
      metadata: { contact_id: contact.id, http_status: res.status, provider_reported_credits: actualCredits },
    });

    if (!email) {
      noEmail++;
      await admin.from("contacts").update({ apollo_enrichment_status: "no_email", reveal_status: "no_email", sendable_status: "no_email" }).eq("id", contact.id);
      results.push({ contact_id: contact.id, status: "no_email", credits_consumed: actualCredits });
      continue;
    }

    const { data: duplicate } = await admin.from("contacts")
      .select("id,email")
      .ilike("email", email)
      .neq("id", contact.id)
      .limit(1)
      .maybeSingle();
    if (duplicate?.id) {
      duplicateEmail++;
      await admin.from("contacts").update({
        apollo_enrichment_status: "succeeded",
        reveal_status: "identity_conflict",
        sendable_status: "duplicate",
      }).eq("id", contact.id);
      results.push({ contact_id: contact.id, status: "identity_conflict", existing_contact_id: duplicate.id, credits_consumed: actualCredits });
      continue;
    }

    const { error: updateErr } = await admin.from("contacts").update({
      email,
      email_verified_status: person?.email_status ?? "verified",
      apollo_enrichment_status: "succeeded",
      apollo_last_enriched_at: new Date().toISOString(),
      reveal_status: "revealed_business_email",
      sendable_status: "needs_review",
    }).eq("id", contact.id);
    if (updateErr) {
      results.push({ contact_id: contact.id, status: "crm_update_failed", credits_consumed: actualCredits });
      continue;
    }
    revealed++;
    results.push({ contact_id: contact.id, status: "revealed", organisation_id: contact.organisation_id, credits_consumed: actualCredits });
  }

  return json({
    ok: true,
    attempted: providerCalls,
    revealed,
    no_email: noEmail,
    duplicate_email_conflicts: duplicateEmail,
    firewall_blocked: firewallBlocked,
    skipped_previous_no_email: eligible.length - targets.length,
    provider_calls: providerCalls,
    smartlead_calls: 0,
    sends: 0,
    results,
  });
});
