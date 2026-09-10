// Founder-controlled SELECTED education reveal (CRM-native, 10 Sep 2026 correction).
//
// Operates on master CRM contact IDs only. Structurally complete but UNUSABLE while
// the portfolio Apollo Credit Firewall is locked (paid_enrichment_enabled=false /
// hard_credit_limit=0): every paid call must first obtain an atomic reservation.
//
// HARD RULES enforced in this file:
//  - business email only: no phone reveal, no personal email, no waterfall
//  - founder/admin auth + explicit { confirm: true }; dry-run is the default
//  - duplicate business email fails closed (the contact is marked duplicate, never merged blindly)
//  - the SAME contact row is updated and its organisation_id link is preserved
//  - never sends, queues or auto-assigns a portfolio business
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  blockedResponseBody,
  buildOperationKey,
  getFirewallStatus,
  loadNoEmailPersonIds,
  releaseCredits,
  reserveCredits,
  settleCredits,
} from "../_shared/apolloCreditFirewall.ts";

const APOLLO_MATCH_URL = "https://api.apollo.io/api/v1/people/match";
const MAX_CONTACTS_PER_RUN = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

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

  const contactIds = (body.contact_ids ?? []).filter(Boolean).slice(0, MAX_CONTACTS_PER_RUN);
  if (!contactIds.length) return json({ error: "contact_ids_required" }, 400);

  const { data: contacts, error: cErr } = await admin
    .from("contacts")
    .select("id, name, email, company, organisation_id, apollo_person_id, apollo_organization_id, email_verified_status, sendable_status, is_globally_suppressed, hard_bounced, status, reveal_status")
    .in("id", contactIds);
  if (cErr) return json({ error: cErr.message }, 500);

  const eligible = (contacts ?? []).filter((c: any) =>
    c.apollo_person_id && !c.email && !c.is_globally_suppressed && !c.hard_bounced && c.status !== "DO_NOT_CONTACT"
  );
  const personIds = eligible.map((c: any) => String(c.apollo_person_id));
  const alreadyNoEmail = await loadNoEmailPersonIds(admin, personIds);
  const targets = eligible.filter((c: any) => !alreadyNoEmail.has(String(c.apollo_person_id)));

  const firewall = await getFirewallStatus(admin);
  const dryRun = body.confirm !== true || body.dry_run === true;

  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      reason: body.confirm === true ? "dry_run_requested" : "founder_confirm_required",
      requested: contactIds.length,
      eligible: targets.length,
      skipped_already_no_email: eligible.length - targets.length,
      estimated_credits: targets.length,
      firewall: {
        paid_enrichment_enabled: firewall.paid_enrichment_enabled,
        hard_credit_limit: firewall.hard_credit_limit,
        credits_remaining: firewall.credits_remaining,
        allow_phone_reveal: firewall.allow_phone_reveal,
        allow_personal_email_reveal: firewall.allow_personal_email_reveal,
        allow_waterfall: firewall.allow_waterfall,
        would_be_blocked: !firewall.paid_enrichment_enabled || firewall.hard_credit_limit <= 0,
      },
      apollo_calls: 0,
      note: "Plan only. No Apollo request was made and no credit was spent.",
    });
  }

  if (!firewall.paid_enrichment_enabled || firewall.hard_credit_limit <= 0) {
    return json({
      error: "apollo_credit_firewall_blocked",
      firewall_reason: !firewall.paid_enrichment_enabled ? "paid_enrichment_disabled" : "hard_credit_limit_zero",
      detail: "Portfolio Apollo paid enrichment is locked. No reveal can run.",
      apollo_calls: 0,
    }, 423);
  }

  const apiKey = Deno.env.get("APOLLO_API_KEY");
  if (!apiKey) return json({ error: "apollo_api_key_missing" }, 400);

  let revealed = 0, noEmail = 0, blocked = 0, duplicates = 0, failed = 0;

  for (const contact of targets) {
    const personId = String((contact as any).apollo_person_id);
    const operationKey = buildOperationKey({
      function_source: "apollo-education-reveal-selected",
      scope: `contact:${contact.id}`,
      apollo_person_ids: [personId],
    });

    const reservation = await reserveCredits(admin, {
      operation_key: operationKey,
      function_source: "apollo-education-reveal-selected",
      estimated_credits: 1,
      apollo_person_ids: [personId],
      metadata: { contact_id: contact.id, organisation_id: (contact as any).organisation_id },
    });
    if (!reservation.allowed) { blocked++; continue; }

    let email: string | null = null;
    let ok = false;
    try {
      const res = await fetch(APOLLO_MATCH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "x-api-key": apiKey },
        // Business email only. Phone and personal email are explicitly NOT requested.
        body: JSON.stringify({ id: personId, reveal_personal_emails: false, reveal_phone_number: false }),
      });
      ok = res.ok;
      if (res.ok) {
        const payload = await res.json();
        email = (payload?.person?.email ?? null) as string | null;
      }
    } catch { ok = false; }

    if (!ok) {
      await releaseCredits(admin, operationKey, "apollo_request_failed");
      failed++;
      continue;
    }

    await settleCredits(admin, {
      operation_key: operationKey,
      actual_credits: 1,
      no_email_person_ids: email ? [] : [personId],
      revealed_person_ids: email ? [personId] : [],
      metadata: { contact_id: contact.id },
    });

    if (!email) {
      noEmail++;
      await admin.from("contacts").update({
        reveal_status: "revealed_no_email",
        apollo_enrichment_status: "no_email",
        sendable_status: "no_email",
        apollo_last_enriched_at: new Date().toISOString(),
      }).eq("id", contact.id);
      continue;
    }

    // Duplicate business email fails closed — never merge or overwrite another record.
    const { data: clash } = await admin
      .from("contacts").select("id").ilike("email", email).neq("id", contact.id).maybeSingle();
    if (clash?.id) {
      duplicates++;
      await admin.from("contacts").update({
        reveal_status: "duplicate_email_blocked",
        sendable_status: "duplicate",
        apollo_enrichment_status: "skipped",
        notes: `Reveal returned an email already held by contact ${clash.id}. Not applied.`,
      }).eq("id", contact.id);
      continue;
    }

    // Same row updated; organisation_id link preserved; no business assignment, no send.
    const { error } = await admin.from("contacts").update({
      email,
      reveal_status: "revealed",
      apollo_enrichment_status: "succeeded",
      apollo_last_enriched_at: new Date().toISOString(),
      enriched_at: new Date().toISOString(),
      sendable_status: "needs_review",
      email_verified_status: "unverified",
    }).eq("id", contact.id);
    if (error) failed++; else revealed++;
  }

  return json({
    ok: true,
    dry_run: false,
    requested: contactIds.length,
    attempted: targets.length,
    revealed,
    no_email: noEmail,
    duplicates_blocked: duplicates,
    firewall_blocked: blocked,
    failed,
    side_effects: { emails_sent: 0, campaigns_started: 0, business_assignments: 0, phone_reveals: 0 },
  });
});
