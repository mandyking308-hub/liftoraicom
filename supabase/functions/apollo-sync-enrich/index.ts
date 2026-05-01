import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const HARD_CAP = 25;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body { run_id: string; force?: boolean; }

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function bulkMatch(apiKey: string, ids: string[]) {
  const resp = await fetch(`${APOLLO_BASE}/people/bulk_match`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
    body: JSON.stringify({
      reveal_personal_emails: false,
      details: ids.map((id) => ({ id })),
    }),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

async function singleMatch(apiKey: string, id: string) {
  const resp = await fetch(`${APOLLO_BASE}/people/match?id=${encodeURIComponent(id)}&reveal_personal_emails=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
    body: JSON.stringify({}),
  });
  const data = await resp.json().catch(() => null);
  return { ok: resp.ok, status: resp.status, data };
}

function isLikelySendable(email: string | null | undefined, status: string | null | undefined): boolean {
  if (!email || !EMAIL_RE.test(email)) return false;
  if (!status) return true;
  // Apollo email_status: verified, likely_to_engage, guessed, unavailable, etc.
  return !["unavailable", "no_email", "bounced"].includes(status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const enc = Deno.env.get("APOLLO_ENCRYPTION_KEY");
    if (!enc) return json({ error: "APOLLO_ENCRYPTION_KEY missing" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body: Body = await req.json();
    if (!body?.run_id) return json({ error: "run_id required" }, 400);

    const { data: run, error: runErr } = await supabase
      .from("apollo_sync_runs")
      .select("*")
      .eq("id", body.run_id)
      .maybeSingle();
    if (runErr || !run) return json({ error: "run_not_found" }, 404);
    if (run.status === "cancelled") {
      return json({ error: "run_cancelled", detail: "This sync run was cancelled before enrichment." }, 412);
    }
    if (!["awaiting_enrichment_approval", "search_running"].includes(run.status)) {
      return json({ error: "run_not_in_enrichable_state", state: run.status }, 412);
    }

    // Block enrichment when the search produced a poor-fit batch unless the founder forces it.
    if (!body.force && Array.isArray(run.errors)) {
      const hasPoorFitFlag = (run.errors as unknown[]).some((entry) =>
        typeof entry === "string" && entry.includes("segment_fit_poor_blocking_enrichment"),
      );
      if (hasPoorFitFlag) {
        return json({
          error: "segment_fit_poor",
          detail: "Search results do not match the segment taxonomy. Cancel this run and fix the segment, or re-run with force=true.",
        }, 412);
      }
    }

    const { data: conn } = await supabase
      .from("apollo_connections")
      .select("*")
      .eq("business_name", run.business_name)
      .maybeSingle();
    if (!conn) return json({ error: "no_apollo_connection" }, 404);
    if (conn.enrichment_api_status !== "ok") {
      return json({ error: "enrichment_api_not_verified", detail: conn.enrichment_api_error }, 412);
    }

    const { data: dec } = await supabase.rpc("apollo_decrypt_key", { cipher: conn.api_key_cipher, enc_key: enc });
    const apiKey = dec as string;

    // Pull leads with has_email_flag = true, capped
    const { data: leads, error: leadErr } = await supabase
      .from("apollo_leads")
      .select("*")
      .eq("run_id", run.id)
      .eq("has_email_flag", true)
      .limit(HARD_CAP);
    if (leadErr) return json({ error: leadErr.message }, 500);

    await supabase.from("apollo_sync_runs").update({ status: "enriching" }).eq("id", run.id);

    const ids = (leads ?? []).map((l) => l.apollo_person_id);
    if (!ids.length) {
      await supabase.from("apollo_sync_runs").update({
        status: "completed", completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return json({ ok: true, enriched: 0, message: "no candidates with has_email" }, 200);
    }

    const errors: any[] = [];
    const enrichedById = new Map<string, any>();

    // Try bulk first (batch of up to 10)
    let bulkSucceeded = true;
    for (let i = 0; i < ids.length; i += 10) {
      const batch = ids.slice(i, i + 10);
      const r = await bulkMatch(apiKey, batch);
      if (!r.ok) {
        bulkSucceeded = false;
        errors.push({ stage: "bulk_match", http: r.status, batch_start: i });
        break;
      }
      const matches = (r.data?.matches ?? []) as any[];
      matches.forEach((m, idx) => {
        const id = batch[idx];
        if (m && id) enrichedById.set(id, m);
      });
    }

    // Fallback: per-person enrichment for any still-missing
    if (!bulkSucceeded || enrichedById.size < ids.length) {
      for (const id of ids) {
        if (enrichedById.has(id)) continue;
        const r = await singleMatch(apiKey, id);
        if (!r.ok) {
          errors.push({ stage: "single_match", id, http: r.status });
          continue;
        }
        const person = r.data?.person ?? r.data;
        if (person) enrichedById.set(id, person);
      }
    }

    let attempted = ids.length;
    let returned = 0;
    let imported = 0;
    let skippedNoEmail = 0;
    let duplicate = 0;
    let suppressed = 0;

    for (const lead of leads ?? []) {
      const person = enrichedById.get(lead.apollo_person_id);
      const email = (person?.email ?? "").trim().toLowerCase();
      const emailStatus = person?.email_status ?? null;
      const sendable = isLikelySendable(email, emailStatus);

      if (!sendable) {
        skippedNoEmail += 1;
        await supabase.from("apollo_leads").update({
          enrichment_payload: person ?? {},
          email: email || null,
          status: "skipped_no_email",
        }).eq("id", lead.id);
        continue;
      }
      returned += 1;

      // Check for global suppression / dedupe by email
      const { data: existing } = await supabase
        .from("contacts")
        .select("id, is_globally_suppressed, hard_bounced")
        .eq("email", email)
        .maybeSingle();

      let contactId: string | null = existing?.id ?? null;
      let isDupe = false;
      let isSuppressed = false;

      if (existing) {
        isDupe = true;
        if (existing.is_globally_suppressed || existing.hard_bounced) {
          isSuppressed = true;
        }
      } else {
        // Insert new central contact
        const { data: ins, error: insErr } = await supabase
          .from("contacts")
          .insert({
            email,
            name: [person?.first_name, person?.last_name].filter(Boolean).join(" ") || person?.name || "",
            first_name: person?.first_name ?? null,
            last_name: person?.last_name ?? null,
            company: person?.organization?.name ?? person?.organization_name ?? "",
            role: person?.title ?? "",
            linkedin_url: person?.linkedin_url ?? null,
            country: person?.country ?? null,
            phone: person?.phone_numbers?.[0]?.sanitized_number ?? person?.phone ?? null,
            apollo_person_id: lead.apollo_person_id,
            apollo_organization_id: lead.apollo_org_id,
            source: "apollo",
            assigned_business: run.business_name,
            first_imported_business: run.business_name,
            apollo_enrichment_status: "succeeded",
            apollo_last_enriched_at: new Date().toISOString(),
            email_verified_status: emailStatus ?? "unknown",
            sendable_status: "needs_review",
            industry: person?.organization?.industry ?? null,
          })
          .select("id")
          .single();
        if (insErr) {
          errors.push({ stage: "contact_insert", id: lead.apollo_person_id, msg: insErr.message });
          await supabase.from("apollo_leads").update({
            enrichment_payload: person, email, status: "error", error: insErr.message,
          }).eq("id", lead.id);
          continue;
        }
        contactId = ins.id;
      }

      if (isSuppressed) {
        suppressed += 1;
        await supabase.from("apollo_leads").update({
          enrichment_payload: person, email, contact_id: contactId, status: "suppressed",
        }).eq("id", lead.id);
        continue;
      }

      if (isDupe) duplicate += 1;
      imported += 1;

      // Upsert business_contact_relationships row (one per (contact, business))
      await supabase.from("business_contact_relationships").upsert({
        contact_id: contactId,
        business_name: run.business_name,
        source_segment_id: run.segment_id,
        qualification: "needs_review",
        current_stage: "ready_to_stage",
        campaign_eligible: false,
      }, { onConflict: "contact_id,business_name" });

      await supabase.from("apollo_leads").update({
        enrichment_payload: person,
        email,
        contact_id: contactId,
        status: "imported",
      }).eq("id", lead.id);
    }

    await supabase.from("apollo_sync_runs").update({
      status: "completed",
      enrichment_attempted: attempted,
      emails_returned: returned,
      contacts_imported: imported,
      contacts_skipped_no_email: skippedNoEmail,
      contacts_duplicate: duplicate,
      contacts_suppressed: suppressed,
      errors,
      completed_at: new Date().toISOString(),
    }).eq("id", run.id);

    // Trigger qualification asynchronously (best-effort)
    try {
      await supabase.functions.invoke("apollo-qualify", { body: { run_id: run.id } });
    } catch (e) {
      // ignore — qualification is best-effort
    }

    return json({
      ok: true,
      attempted,
      emails_returned: returned,
      imported,
      skipped_no_email: skippedNoEmail,
      duplicate,
      suppressed,
      errors,
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
