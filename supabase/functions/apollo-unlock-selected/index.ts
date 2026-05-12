import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const HARD_CAP = 50;
const SINGLE_TIMEOUT_MS = 15_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Founder-only, explicit "Unlock the Apollo Unlock Pack" action.
// - Operates ONLY on lead_quality_profiles rows where
//   unlock_recommendation = 'recommended_first_batch_unique'.
// - Requires confirm:true in the request body.
// - Spends 1 Apollo credit per unique person (NOT per duplicate row).
// - Does NOT promote contacts. Does NOT enqueue. Does NOT send.

async function singleMatch(apiKey: string, id: string) {
  try {
    const resp = await fetch(
      `${APOLLO_BASE}/people/match?id=${encodeURIComponent(id)}&reveal_personal_emails=false`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(SINGLE_TIMEOUT_MS),
      },
    );
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: (err as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const ENC_KEY = Deno.env.get("APOLLO_KEY_ENC") ?? Deno.env.get("APOLLO_ENC_KEY") ?? "";

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
  if (!role) return json({ error: "Founder role required" }, 403);

  let body: { confirm?: boolean; dry_run?: boolean; business_name?: string; max?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const dryRun = body.dry_run === true;
  const businessName = body.business_name ?? "Neon Candy";

  // Pull the canonical 22 (or however many marked).
  const { data: shortlist, error: slErr } = await admin
    .from("lead_quality_profiles")
    .select("id, apollo_lead_id, unlock_shortlist_rank, risk_flags")
    .eq("unlock_recommendation", "recommended_first_batch_unique")
    .order("unlock_shortlist_rank", { ascending: true });
  if (slErr) return json({ error: slErr.message }, 500);
  const rows = (shortlist ?? []).slice(0, Math.min(HARD_CAP, body.max ?? HARD_CAP));
  if (!rows.length) return json({ error: "no_shortlist", detail: "No leads marked recommended_first_batch_unique." }, 412);

  const { data: leads } = await admin
    .from("apollo_leads").select("id, apollo_person_id, email, first_name, last_name, company")
    .in("id", rows.map((r) => r.apollo_lead_id));
  const leadById = new Map((leads ?? []).map((l) => [l.id, l]));

  // CRM spine pre-check: drop anything already in central CRM, internal, or suppressed.
  const leadEmails = (leads ?? []).map((l) => (l.email ?? "").toLowerCase()).filter(Boolean);
  const personIds  = (leads ?? []).map((l) => l.apollo_person_id).filter(Boolean) as string[];
  const { data: crmContacts } = await admin
    .from("contacts")
    .select("email,apollo_person_id,is_internal,sendable_status,hard_bounced,is_globally_suppressed");
  const crmByEmail = new Map<string, any>();
  const crmByPid = new Map<string, any>();
  for (const c of crmContacts ?? []) {
    if (c.email) crmByEmail.set(String(c.email).toLowerCase(), c);
    if ((c as any).apollo_person_id) crmByPid.set((c as any).apollo_person_id, c);
  }
  const { data: internalIds } = await admin.from("internal_email_identities").select("email");
  const internalSet = new Set((internalIds ?? []).map((i: any) => String(i.email).toLowerCase()));

  const skippedByCrm: any[] = [];
  const targets = rows
    .map((r) => ({ ...r, lead: leadById.get(r.apollo_lead_id) }))
    .filter((r) => {
      if (!r.lead?.apollo_person_id) return false;
      if (r.lead?.email && EMAIL_RE.test(r.lead.email)) return false; // already has email
      const pid = r.lead.apollo_person_id;
      const em  = (r.lead.email ?? "").toLowerCase();
      const hit = crmByPid.get(pid) || (em && crmByEmail.get(em)) || null;
      const reasons: string[] = [];
      if (hit) reasons.push("already_in_crm");
      if (hit?.is_internal) reasons.push("internal_identity");
      if (hit?.hard_bounced) reasons.push("hard_bounced");
      if (hit?.is_globally_suppressed) reasons.push("globally_suppressed");
      if (hit?.sendable_status && hit.sendable_status !== "sendable") reasons.push(`not_sendable:${hit.sendable_status}`);
      if (em && internalSet.has(em)) reasons.push("internal_identity");
      if (reasons.length) {
        skippedByCrm.push({ rank: r.unlock_shortlist_rank, apollo_person_id: pid, reasons });
        return false;
      }
      return true;
    });
  void leadEmails; void personIds;

  if (dryRun || body.confirm !== true) {
    return json({
      ok: true,
      dry_run: true,
      reason: body.confirm === true ? "dry_run_requested" : "founder_confirm_required",
      shortlist_count: rows.length,
      will_unlock: targets.length,
      estimated_apollo_credits: targets.length,
      skipped_by_crm: skippedByCrm.length,
      skipped_sample: skippedByCrm.slice(0, 5),
      sample: targets.slice(0, 5).map((t) => ({
        rank: t.unlock_shortlist_rank,
        apollo_person_id: t.lead?.apollo_person_id,
        name: `${t.lead?.first_name ?? ""} ${t.lead?.last_name ?? ""}`.trim(),
        company: t.lead?.company,
      })),
      note: "No Apollo credits spent. Re-call with { confirm: true } to execute unlock.",
    });
  }

  // Confirmed run — fetch Apollo key for the active connection.
  const { data: conn } = await admin.from("apollo_connections")
    .select("api_key_cipher, enrichment_api_status, is_active")
    .eq("business_name", businessName).maybeSingle();
  if (!conn) return json({ error: "no_apollo_connection", business_name: businessName }, 404);
  if (!conn.is_active) return json({ error: "apollo_connection_inactive" }, 412);
  if (conn.enrichment_api_status !== "ok") return json({ error: "enrichment_api_not_verified" }, 412);

  const { data: dec } = await admin.rpc("apollo_decrypt_key", { cipher: conn.api_key_cipher, enc_key: ENC_KEY });
  const apiKey = dec as string;
  if (!apiKey) return json({ error: "apollo_key_decrypt_failed" }, 500);

  // Log run start
  const { data: runRow } = await admin.from("apollo_automation_runs").insert({
    business_name: businessName,
    status: "running",
    notes: `unlock_selected: requested by ${u.user.id} · shortlist=${rows.length} · targets=${targets.length}`,
  }).select("id").maybeSingle();

  const results: any[] = [];
  let unlocked = 0, failed = 0;
  for (const t of targets) {
    const pid = t.lead!.apollo_person_id as string;
    const r = await singleMatch(apiKey, pid);
    const person = r.data?.person ?? r.data?.matched_person ?? null;
    const email: string | null = person?.email && EMAIL_RE.test(person.email) ? person.email : null;
    if (r.ok && email) {
      const domain = email.split("@")[1]?.toLowerCase() ?? null;
      await admin.from("apollo_leads")
        .update({ email, status: "enriched", enrichment_payload: person })
        .eq("id", t.apollo_lead_id);
      await admin.from("apollo_raw_leads")
        .update({ email, email_domain: domain })
        .eq("apollo_lead_id", t.apollo_lead_id);
      const newFlags = (t.risk_flags ?? []).filter((f: string) =>
        f !== "missing_email" && f !== "needs_apollo_unlock" && f !== "apollo_email_unavailable");
      await admin.from("lead_quality_profiles")
        .update({ risk_flags: newFlags, unlock_recommendation: "unlocked" })
        .eq("id", t.id);
      unlocked++;
      results.push({ rank: t.unlock_shortlist_rank, apollo_person_id: pid, status: "unlocked" });
    } else {
      failed++;
      const newFlags = Array.from(new Set([...(t.risk_flags ?? []), "apollo_email_unavailable"]));
      await admin.from("lead_quality_profiles")
        .update({ risk_flags: newFlags }).eq("id", t.id);
      results.push({
        rank: t.unlock_shortlist_rank, apollo_person_id: pid,
        status: "no_email", apollo_status: r.status, error: (r as any).error ?? null,
      });
    }
  }

  if (runRow?.id) {
    await admin.from("apollo_automation_runs").update({
      status: "completed",
      enrichment_credits_used: targets.length,
      contacts_new: 0,
      contacts_updated: unlocked,
      notes: `unlock_selected complete: unlocked=${unlocked} failed=${failed} attempted=${targets.length}`,
      errors: failed > 0 ? { failed_results: results.filter((r) => r.status !== "unlocked") } : null,
    }).eq("id", runRow.id);
  }

  return json({
    ok: true,
    confirmed: true,
    shortlist_count: rows.length,
    skipped_by_crm: skippedByCrm.length,
    attempted: targets.length,
    unlocked,
    failed,
    apollo_credits_spent_estimate: targets.length,
    results,
    note: "Unlock complete. Promotion to contacts and enqueue still require separate founder actions.",
  });
});