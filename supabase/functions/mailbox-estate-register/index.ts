import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  LEGACY_NEON_CANDY_ESTATE,
  parseMailboxCsv,
  planMailboxRegistration,
  toInboxRow,
} from "../_shared/mailboxRegistrationParser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/**
 * Mailbox Estate Register — BULK CSV/TSV PREVIEW / APPLY.
 *
 * No provider calls. Idempotent registration of mailboxes into public.inboxes.
 * Neon Candy legacy estate is read-only and protected.
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
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }

  const csv: string = body.csv ?? "";
  const dry_run: boolean = body.dry_run !== false;
  const apply: boolean = body.apply === true;

  if (!csv.trim()) return json({ ok: false, error: "csv_required" }, 400);

  const parsed = parseMailboxCsv(csv);
  if (!parsed.ok) {
    return json({
      ok: false,
      error: "csv_validation_failed",
      parser_version: parsed.parser_version,
      submitted_rows: parsed.submitted_rows,
      valid_rows: parsed.valid.length,
      errors: parsed.errors,
      duplicates_in_batch: parsed.duplicates_in_batch,
    }, 400);
  }

  // Fetch existing mailboxes for idempotency
  const emails = parsed.valid.map((r) => r.email_address);
  const { data: existing } = await admin
    .from("inboxes")
    .select("id, email_address, estate_key, segregation_locked")
    .in("email_address", emails);

  const plan = planMailboxRegistration(parsed.valid, existing ?? []);

  if (dry_run || !apply) {
    return json({
      ok: true,
      dry_run: true,
      apply: false,
      parser_version: parsed.parser_version,
      submitted_rows: parsed.submitted_rows,
      valid_rows: parsed.valid.length,
      plan_summary: {
        insert: plan.filter((p) => p.action === "insert").length,
        update: plan.filter((p) => p.action === "update").length,
        skip: plan.filter((p) => p.action === "skip").length,
      },
      plan: plan.map((p) => ({
        row_number: p.row_number,
        email_address: p.email_address,
        action: p.action,
        reason: p.reason,
        existing_id: p.existing_id,
      })),
      notes: "Dry run. No rows written. Set apply=true and dry_run=false to persist.",
    });
  }

  // Apply
  const batchId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const results: { email_address: string; action: string; id: string | null; error: string | null }[] = [];

  for (const item of plan) {
    if (item.action === "skip") {
      results.push({ email_address: item.email_address, action: "skip", id: item.existing_id, error: null });
      continue;
    }

    const row = toInboxRow(item.row, batchId);
    if (item.action === "insert") {
      const { data, error } = await admin.from("inboxes").insert({ ...row, created_at: nowIso, updated_at: nowIso }).select("id").single();
      results.push({ email_address: item.email_address, action: "insert", id: data?.id ?? null, error: error?.message ?? null });
    } else {
      const { data, error } = await admin
        .from("inboxes")
        .update({ ...row, updated_at: nowIso })
        .eq("id", item.existing_id!)
        .select("id")
        .single();
      results.push({ email_address: item.email_address, action: "update", id: data?.id ?? null, error: error?.message ?? null });
    }
  }

  const errors = results.filter((r) => r.error);
  return json({
    ok: errors.length === 0,
    dry_run: false,
    apply: true,
    batch_id: batchId,
    parser_version: parsed.parser_version,
    results,
    failed_count: errors.length,
    notes: errors.length === 0
      ? "Mailboxes registered/updated. Readiness flags remain FALSE until provider confirms."
      : `Some rows failed: ${errors.map((e) => e.email_address).join(", ")}`,
  }, errors.length === 0 ? 200 : 207);
});
