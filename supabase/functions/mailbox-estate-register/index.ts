import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  LEGACY_NEON_CANDY_ESTATE,
  MAILBOX_CSV_HEADERS,
  parseMailboxCsv,
  planMailboxRegistration,
  toInboxRow,
  type ExistingMailbox,
} from "../_shared/mailboxRegistrationParser.ts";

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

const CONFIRMATION = "REGISTER MAILBOXES";

/**
 * Bulk mailbox registration — preview and apply in one founder-gated function.
 *
 * mode="preview" (default): validates and returns the exact plan. No writes to
 *   public.inboxes. Only the batch record is stored for audit.
 * mode="apply": requires the confirmation phrase. Idempotent — re-running the
 *   same batch updates in place and never duplicates a mailbox.
 *
 * This registers mailboxes Liftor already owns. It never purchases a mailbox or
 * domain, never calls Smartlead, and never touches the legacy Neon Candy estate.
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
  } catch {
    return json({ ok: false, error: "invalid_body" }, 400);
  }

  const mode = String(body.mode ?? "preview").toLowerCase() === "apply" ? "apply" : "preview";
  const csv = String(body.csv ?? "");
  const batchKey = String(body.batch_key ?? "").trim() || `batch-${Date.now()}`;
  const confirmation = String(body.confirmation ?? "").trim();

  if (!csv.trim()) {
    return json({
      ok: false,
      error: "csv_required",
      expected_headers: MAILBOX_CSV_HEADERS,
      example: "email_address,business_name,estate_key,sending_domain,from_name,daily_send_limit,ramp_daily_cap,warmup_status",
    }, 400);
  }

  const parsed = parseMailboxCsv(csv);

  // Existing mailboxes for the emails in this batch — the basis of idempotency.
  const emails = parsed.valid.map((r) => r.email_address);
  let existing: ExistingMailbox[] = [];
  if (emails.length > 0) {
    const { data } = await admin
      .from("inboxes")
      .select("id, email_address, estate_key, segregation_locked")
      .in("email_address", emails);
    existing = (data ?? []) as ExistingMailbox[];
  }

  const plan = planMailboxRegistration(parsed.valid, existing);
  const counts = {
    submitted: parsed.submitted_rows,
    valid: parsed.valid.length,
    invalid: parsed.errors.length,
    to_insert: plan.filter((p) => p.action === "insert").length,
    to_update: plan.filter((p) => p.action === "update").length,
    to_skip: plan.filter((p) => p.action === "skip").length,
  };

  const previewPayload = plan.map((p) => ({
    row_number: p.row_number,
    email_address: p.email_address,
    action: p.action,
    reason: p.reason,
    business_name: p.row.business_name,
    estate_key: p.row.estate_key,
    sending_domain: p.row.sending_domain,
    daily_send_limit: p.row.daily_send_limit,
    ramp_daily_cap: p.row.ramp_daily_cap,
  }));

  // ---------- PREVIEW ----------
  if (mode === "preview") {
    await admin.from("mailbox_registration_batches").upsert(
      {
        batch_key: batchKey,
        estate_key: parsed.valid[0]?.estate_key ?? "unassigned",
        mode: "preview",
        submitted_rows: counts.submitted,
        valid_rows: counts.valid,
        invalid_rows: counts.invalid,
        errors: parsed.errors,
        preview: previewPayload,
        created_by: u.user.id,
      },
      { onConflict: "batch_key" },
    );

    return json({
      ok: parsed.errors.length === 0,
      mode: "preview",
      batch_key: batchKey,
      counts,
      errors: parsed.errors,
      duplicates_in_batch: parsed.duplicates_in_batch,
      plan: previewPayload,
      apply_instructions: `Re-send with mode="apply", the same batch_key and confirmation="${CONFIRMATION}".`,
      notes: "Nothing written to the mailbox estate. No Smartlead call. No email sent.",
    });
  }

  // ---------- APPLY ----------
  if (confirmation !== CONFIRMATION) {
    return json({ ok: false, error: "confirmation_phrase_mismatch", expected: CONFIRMATION }, 400);
  }
  if (parsed.errors.length > 0) {
    return json({
      ok: false,
      error: "batch_has_invalid_rows",
      counts,
      errors: parsed.errors,
      notes: "Apply refused. Fix every invalid row and preview again.",
    }, 400);
  }

  const { data: batchRow } = await admin
    .from("mailbox_registration_batches")
    .upsert(
      {
        batch_key: batchKey,
        estate_key: parsed.valid[0]?.estate_key ?? "unassigned",
        mode: "apply",
        submitted_rows: counts.submitted,
        valid_rows: counts.valid,
        invalid_rows: 0,
        errors: [],
        preview: previewPayload,
        created_by: u.user.id,
      },
      { onConflict: "batch_key" },
    )
    .select("id")
    .maybeSingle();

  const batchId = (batchRow?.id as string) ?? null;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const failures: { email_address: string; error: string }[] = [];

  // Resolve/create sending domain rows so the estate is domain-aware.
  const domainIds = new Map<string, string>();
  for (const domain of Array.from(new Set(parsed.valid.map((r) => r.sending_domain)))) {
    const { data: existingDomain } = await admin
      .from("sending_domains")
      .select("id")
      .eq("domain_name", domain)
      .maybeSingle();
    if (existingDomain?.id) {
      domainIds.set(domain, existingDomain.id as string);
      continue;
    }
    const { data: created } = await admin
      .from("sending_domains")
      .insert({ domain_name: domain })
      .select("id")
      .maybeSingle();
    if (created?.id) domainIds.set(domain, created.id as string);
  }

  for (const p of plan) {
    if (p.action === "skip") {
      skipped += 1;
      continue;
    }
    const row = {
      ...toInboxRow(p.row, batchId),
      sending_domain_id: domainIds.get(p.row.sending_domain) ?? null,
    };
    if (p.action === "update" && p.existing_id) {
      // Never downgrade proven provider readiness on an existing mailbox.
      const { smtp_ready: _s, imap_ready: _i, provider_ready: _p, warmup_ready: _w, ...safe } = row;
      const { error } = await admin.from("inboxes").update(safe).eq("id", p.existing_id);
      if (error) failures.push({ email_address: p.email_address, error: "update_failed" });
      else updated += 1;
    } else {
      const { error } = await admin.from("inboxes").insert(row);
      if (error) {
        // A concurrent insert of the same mailbox is not a failure.
        if (String(error.code) === "23505") skipped += 1;
        else failures.push({ email_address: p.email_address, error: "insert_failed" });
      } else {
        inserted += 1;
      }
    }
  }

  if (batchId) {
    await admin
      .from("mailbox_registration_batches")
      .update({
        inserted_rows: inserted,
        updated_rows: updated,
        skipped_rows: skipped,
        errors: failures,
        applied_at: new Date().toISOString(),
        applied_by: u.user.id,
      })
      .eq("id", batchId);
  }

  return json({
    ok: failures.length === 0,
    mode: "apply",
    batch_key: batchKey,
    batch_id: batchId,
    inserted,
    updated,
    skipped,
    failures,
    protected_estate: LEGACY_NEON_CANDY_ESTATE,
    notes:
      "Mailboxes registered in Liftor only. Provider readiness and warm-up remain FALSE until Smartlead confirms them. No Smartlead call, no purchase, no email sent.",
  });
});
