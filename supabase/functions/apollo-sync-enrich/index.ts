import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const HARD_CAP = 25;
const CHUNK_SIZE = 5;                       // process at most N leads per invocation
const EXECUTION_BUDGET_MS = 100_000;        // stop safely before the 150s platform idle timeout
const APOLLO_BULK_TIMEOUT_MS = 25_000;
const APOLLO_SINGLE_TIMEOUT_MS = 15_000;
const DB_OP_TIMEOUT_MS = 10_000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Body { run_id: string; force?: boolean; selected_apollo_person_ids?: string[]; }

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function bulkMatch(apiKey: string, ids: string[]) {
  try {
    const resp = await fetch(`${APOLLO_BASE}/people/bulk_match`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
      body: JSON.stringify({
        reveal_personal_emails: false,
        details: ids.map((id) => ({ id })),
      }),
      signal: AbortSignal.timeout(APOLLO_BULK_TIMEOUT_MS),
    });
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: (err as Error).message };
  }
}

async function singleMatch(apiKey: string, id: string) {
  try {
    const resp = await fetch(`${APOLLO_BASE}/people/match?id=${encodeURIComponent(id)}&reveal_personal_emails=false`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(APOLLO_SINGLE_TIMEOUT_MS),
    });
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok, status: resp.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: (err as Error).message };
  }
}

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v); },
      (e) => { clearTimeout(t); reject(e); },
    );
  });
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
    // Allow resume from "enriching" (previous invocation hit budget) and "completed" (manual top-up).
    if (!["awaiting_enrichment_approval", "search_running", "enriching", "partial"].includes(run.status)) {
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

    // Pull leads with has_email_flag = true, capped. Skip ones already finalized so resume is credit-safe.
    let leadsQuery = supabase
      .from("apollo_leads")
      .select("*")
      .eq("run_id", run.id)
      .eq("has_email_flag", true)
      // Skip already-processed states so resume never re-spends Apollo credits.
      .not("status", "in", "(imported,skipped_no_email,suppressed,error)")
      .limit(HARD_CAP);
    const selectedIds = Array.isArray(body.selected_apollo_person_ids)
      ? body.selected_apollo_person_ids.filter((s) => typeof s === "string" && s.length > 0)
      : null;
    if (selectedIds && selectedIds.length > 0) {
      leadsQuery = leadsQuery.in("apollo_person_id", selectedIds);
    }
    const { data: allLeads, error: leadErr } = await leadsQuery;
    if (leadErr) return json({ error: leadErr.message }, 500);

    // Process at most CHUNK_SIZE per invocation; remainder is resumable.
    const leads = (allLeads ?? []).slice(0, CHUNK_SIZE);
    const remainingFromQuery = Math.max(0, (allLeads ?? []).length - leads.length);

    await supabase.from("apollo_sync_runs").update({ status: "enriching" }).eq("id", run.id);
    const startedAt = Date.now();
    const budgetExceeded = () => Date.now() - startedAt > EXECUTION_BUDGET_MS;

    const ids = leads.map((l) => l.apollo_person_id);
    if (!ids.length) {
      await supabase.from("apollo_sync_runs").update({
        status: "completed", completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return json({ ok: true, enriched: 0, message: "no candidates with has_email" }, 200);
    }

    const errors: any[] = [];
    const enrichedById = new Map<string, any>();

    // Mark this chunk as enriching so UI shows in-flight rows
    await supabase.from("apollo_leads").update({ status: "enriching" }).in("id", leads.map((l) => l.id));

    // Try bulk first (batch of up to 10) — short timeout so we fall back fast.
    let bulkSucceeded = true;
    for (let i = 0; i < ids.length; i += 10) {
      if (budgetExceeded()) { bulkSucceeded = false; errors.push({ stage: "bulk_match", reason: "budget_exceeded_before_bulk" }); break; }
      const batch = ids.slice(i, i + 10);
      const r = await bulkMatch(apiKey, batch);
      if (!r.ok) {
        bulkSucceeded = false;
        errors.push({ stage: "bulk_match", http: r.status, batch_start: i, error: (r as any).error });
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
        if (budgetExceeded()) { errors.push({ stage: "single_match", reason: "budget_exceeded", id }); break; }
        const r = await singleMatch(apiKey, id);
        if (!r.ok) {
          errors.push({ stage: "single_match", id, http: r.status, error: (r as any).error });
          continue;
        }
        const person = r.data?.person ?? r.data;
        if (person) enrichedById.set(id, person);
      }
    }

    const attempted = ids.length;
    let returned = 0;
    let imported = 0;
    let newCount = 0;
    let updatedCount = 0;
    let skippedNoEmail = 0;
    let duplicate = 0;
    let suppressed = 0;
    let processed = 0;
    let lastSuccessful: string | null = null;

    for (const lead of leads) {
      if (budgetExceeded()) {
        errors.push({ stage: "persist", reason: "budget_exceeded", lead_id: lead.id });
        break;
      }
      const person = enrichedById.get(lead.apollo_person_id);
      const email = (person?.email ?? "").trim().toLowerCase();
      const emailStatus = person?.email_status ?? null;
      const sendable = isLikelySendable(email, emailStatus);

      if (!sendable) {
        skippedNoEmail += 1;
        await withTimeout(
          supabase.from("apollo_leads").update({
            enrichment_payload: person ?? {},
            email: email || null,
            status: "skipped_no_email",
          }).eq("id", lead.id),
          DB_OP_TIMEOUT_MS, "lead_skip_update",
        ).catch((e) => errors.push({ stage: "lead_skip_update", id: lead.apollo_person_id, error: (e as Error).message }));
        processed += 1;
        continue;
      }
      returned += 1;

      // Check for global suppression / dedupe by email
      const { data: existing } = await withTimeout(
        supabase
        .from("contacts")
        .select("id, is_globally_suppressed, hard_bounced")
        .eq("email", email)
        .maybeSingle(),
        DB_OP_TIMEOUT_MS, "contact_lookup",
      ).catch(() => ({ data: null }));

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
        const { data: ins, error: insErr } = await withTimeout(
          supabase
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
          .single(),
          DB_OP_TIMEOUT_MS, "contact_insert",
        ).catch((e) => ({ data: null, error: { message: (e as Error).message } as any }));
        if (insErr) {
          errors.push({ stage: "contact_insert", id: lead.apollo_person_id, msg: insErr.message });
          await withTimeout(supabase.from("apollo_leads").update({
            enrichment_payload: person, email, status: "error", error: insErr.message,
          }).eq("id", lead.id), DB_OP_TIMEOUT_MS, "lead_error_update").catch(() => {});
          continue;
        }
        contactId = ins?.id ?? null;
      }

      if (isSuppressed) {
        suppressed += 1;
        await withTimeout(supabase.from("apollo_leads").update({
          enrichment_payload: person, email, contact_id: contactId, status: "suppressed",
        }).eq("id", lead.id), DB_OP_TIMEOUT_MS, "lead_suppressed_update").catch(() => {});
        processed += 1;
        continue;
      }

      if (isDupe) duplicate += 1;
      imported += 1;
      if (isDupe) updatedCount += 1; else newCount += 1;

      // Upsert business_contact_relationships row (one per (contact, business))
      await withTimeout(supabase.from("business_contact_relationships").upsert({
        contact_id: contactId,
        business_name: run.business_name,
        source_segment_id: run.segment_id,
        qualification: "needs_review",
        current_stage: "ready_to_stage",
        campaign_eligible: false,
      }, { onConflict: "contact_id,business_name" }), DB_OP_TIMEOUT_MS, "bcr_upsert").catch((e) => errors.push({ stage: "bcr_upsert", error: (e as Error).message }));

      await withTimeout(supabase.from("apollo_leads").update({
        enrichment_payload: person,
        email,
        contact_id: contactId,
        status: "imported",
      }).eq("id", lead.id), DB_OP_TIMEOUT_MS, "lead_imported_update").catch(() => {});
      processed += 1;
      lastSuccessful = email;
    }

    // Reset any leads we marked "enriching" but didn't finish back to has_email so resume picks them up.
    const finishedIds = new Set<string>();
    for (const lead of leads) {
      if (enrichedById.has(lead.apollo_person_id) || lead.id /* always */) {
        // Only finalized statuses are imported/skipped_no_email/suppressed/error; others should revert.
      }
    }
    await supabase.from("apollo_leads")
      .update({ status: "has_email" })
      .eq("run_id", run.id)
      .eq("status", "enriching")
      .catch(() => {});

    // Increment cumulative counters across resumes.
    const newAttempted = (run.enrichment_attempted ?? 0) + attempted;
    const newReturned = (run.emails_returned ?? 0) + returned;
    const newImported = (run.contacts_imported ?? 0) + imported;
    const newNew = (run.contacts_new ?? 0) + newCount;
    const newUpdated = (run.contacts_updated ?? 0) + updatedCount;
    const newSkipped = (run.contacts_skipped_no_email ?? 0) + skippedNoEmail;
    const newDup = (run.contacts_duplicate ?? 0) + duplicate;
    const newSup = (run.contacts_suppressed ?? 0) + suppressed;

    // Determine if more work remains (either chunk leftovers or budget-cut leads).
    const remainingCount = remainingFromQuery + Math.max(0, leads.length - processed);
    const isPartial = remainingCount > 0;
    const finalStatus = isPartial ? "partial" : "completed";

    await supabase.from("apollo_sync_runs").update({
      status: finalStatus,
      enrichment_attempted: newAttempted,
      emails_returned: newReturned,
      contacts_imported: newImported,
      contacts_new: newNew,
      contacts_updated: newUpdated,
      contacts_skipped_no_email: newSkipped,
      contacts_duplicate: newDup,
      contacts_suppressed: newSup,
      apollo_credits_used: newAttempted,
      errors: [...(Array.isArray(run.errors) ? run.errors : []), ...errors],
      completed_at: isPartial ? null : new Date().toISOString(),
    }).eq("id", run.id);

    // Fire-and-forget qualification on completion only — DO NOT await (caused 504 on enrich response).
    if (!isPartial) {
      try {
        // Detached; we don't care about the response.
        supabase.functions.invoke("apollo-qualify", { body: { run_id: run.id } }).catch(() => {});
      } catch (_) { /* ignore */ }
    }

    return json({
      ok: true,
      status: finalStatus,
      processed_count: processed,
      remaining_count: remainingCount,
      resume_available: isPartial,
      attempted,
      emails_returned: returned,
      imported,
      new_contacts: newCount,
      updated_contacts: updatedCount,
      skipped_no_email: skippedNoEmail,
      duplicate,
      suppressed,
      last_successful: lastSuccessful,
      errors,
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
