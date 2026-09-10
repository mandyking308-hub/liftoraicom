// Education 152 master-account import (Stage 4).
//
// Idempotent upsert of the reviewed September 152-company universe into the
// EXISTING strategic-account tables. Dry-run by default; writes only with
// { confirm: true }. Makes NO Apollo call, NO Smartlead call, creates NO
// contacts, NO Relationship Intelligence rows and NO outreach/queue rows.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  EDUCATION_MASTER_LIST_NAME,
  EDUCATION_MASTER_LIST_TYPE,
  EDUCATION_RESEARCH_PROGRAM_KEY,
  planEducationImport,
  toTargetAccountRow,
  validateEducationAccounts,
  type ExistingAccountRow,
  type RawEducationAccountRow,
} from "../_shared/educationAccountUniverse.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Minimal CSV parser (quoted fields supported), header row required. */
export function parseCsv(text: string): RawEducationAccountRow[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    if (c === "\r") continue;
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim().length));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h) => h.trim());
  return nonEmpty.slice(1).map((r) => {
    const obj: RawEducationAccountRow = {};
    header.forEach((h, idx) => { (obj as Record<string, unknown>)[h] = (r[idx] ?? "").trim(); });
    return obj;
  });
}

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

  let body: { rows?: RawEducationAccountRow[]; csv?: string; confirm?: boolean; dry_run?: boolean } = {};
  try { body = await req.json(); } catch { /* allow empty */ }

  const rows: RawEducationAccountRow[] = Array.isArray(body.rows)
    ? body.rows
    : typeof body.csv === "string"
    ? parseCsv(body.csv)
    : [];
  if (!rows.length) return json({ error: "no_rows_supplied", detail: "Provide rows[] or csv." }, 400);

  const { valid, errors, received } = validateEducationAccounts(rows);

  // Existing education master accounts (scoped by source key prefix only).
  const { data: existingRaw, error: exErr } = await admin
    .from("strategic_target_accounts")
    .select("id, source_key, account_name, account_domain, account_type, geography, source_notes, metadata")
    .like("source_key", "education_152_master:%");
  if (exErr) return json({ error: exErr.message }, 500);
  const existing = (existingRaw ?? []) as ExistingAccountRow[];

  const plan = planEducationImport(valid, existing);
  const totals = {
    received,
    valid: valid.length,
    invalid: received - valid.length,
    create: plan.filter((p) => p.action === "create").length,
    update: plan.filter((p) => p.action === "update").length,
    unchanged: plan.filter((p) => p.action === "unchanged").length,
    errors: errors.length,
    existing_education_accounts: existing.length,
  };

  const dryRun = body.dry_run === true || body.confirm !== true;
  if (dryRun) {
    return json({
      ok: true,
      dry_run: true,
      reason: body.confirm === true ? "dry_run_requested" : "founder_confirm_required",
      list_name: EDUCATION_MASTER_LIST_NAME,
      totals,
      validation_errors: errors.slice(0, 50),
      plan_sample: plan.slice(0, 10),
      side_effects: {
        contacts_created: 0,
        relationship_intelligence_rows: 0,
        apollo_calls: 0,
        smartlead_calls: 0,
        outreach_queue_rows: 0,
      },
      note: "No writes performed. Re-call with { confirm: true } to upsert the account universe. This path never creates contacts, research candidates, Apollo calls or outreach.",
    });
  }

  if (errors.length) {
    return json({ ok: false, error: "validation_failed", totals, validation_errors: errors.slice(0, 50) }, 412);
  }

  // Portfolio-level master list (no business ownership, research only).
  const { data: listRow } = await admin
    .from("strategic_account_lists")
    .select("id")
    .eq("list_name", EDUCATION_MASTER_LIST_NAME)
    .maybeSingle();
  let listId = listRow?.id ?? null;
  if (!listId) {
    const { data: created, error: listErr } = await admin
      .from("strategic_account_lists")
      .insert({
        list_name: EDUCATION_MASTER_LIST_NAME,
        list_type: EDUCATION_MASTER_LIST_TYPE,
        list_status: "research_only",
        founder_review_required: true,
        strategy_summary: "Canonical September 2026 education account universe. Internal research only — cannot trigger outreach.",
        metadata: { research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY, outreach_eligible: false },
      })
      .select("id").single();
    if (listErr) return json({ error: listErr.message }, 500);
    listId = created.id;
  }

  const existingByKey = new Map(existing.filter((e) => e.source_key).map((e) => [e.source_key as string, e]));
  let created = 0, updated = 0, unchanged = 0;
  let orgsCreated = 0, orgsMatched = 0;
  const writeErrors: Array<{ group_id: string; message: string }> = [];

  for (const account of valid) {
    const entry = plan.find((p) => p.source_key === account.source_key);

    // CRM-NATIVE: the canonical education company record lives in `organisations`.
    // It is resolved/upserted FIRST, then the strategic target account points at it.
    const orgPayload = toOrganisationRow(account);
    let organisationId: string | null = null;

    const { data: orgBySource } = await admin
      .from("organisations").select("id").eq("source_key", account.source_key).maybeSingle();
    let orgRow = orgBySource ?? null;
    if (!orgRow && account.account_domain) {
      const { data: orgByDomain } = await admin
        .from("organisations").select("id").ilike("account_domain", account.account_domain).maybeSingle();
      orgRow = orgByDomain ?? null;
    }

    if (orgRow?.id) {
      organisationId = orgRow.id;
      const { error } = await admin.from("organisations").update(orgPayload).eq("id", organisationId);
      if (error) { writeErrors.push({ group_id: account.group_id, message: `organisation:${error.message}` }); continue; }
      orgsMatched++;
    } else {
      const { data: newOrg, error } = await admin
        .from("organisations").insert(orgPayload).select("id").single();
      if (error) { writeErrors.push({ group_id: account.group_id, message: `organisation:${error.message}` }); continue; }
      organisationId = newOrg.id;
      orgsCreated++;
    }

    const payload = toTargetAccountRow(account, listId, organisationId);
    const found = existingByKey.get(account.source_key);
    if (found) {
      if (entry?.action === "unchanged" && found.existing_organisation_id === organisationId) { unchanged++; continue; }
      const { error } = await admin.from("strategic_target_accounts").update(payload).eq("id", found.id);
      if (error) writeErrors.push({ group_id: account.group_id, message: error.message });
      else updated++;
    } else {
      const { error } = await admin.from("strategic_target_accounts").insert(payload);
      if (error) writeErrors.push({ group_id: account.group_id, message: error.message });
      else created++;
    }
  }


  const { count: finalCount } = await admin
    .from("strategic_target_accounts")
    .select("id", { count: "exact", head: true })
    .like("source_key", "education_152_master:%");

  await admin.from("strategic_account_lists")
    .update({ target_count: finalCount ?? 0, updated_at: new Date().toISOString() })
    .eq("id", listId);

  return json({
    ok: writeErrors.length === 0,
    dry_run: false,
    list_id: listId,
    totals: { ...totals, created, updated, unchanged, write_errors: writeErrors.length },
    education_master_account_count: finalCount ?? 0,
    write_errors: writeErrors.slice(0, 20),
    side_effects: {
      contacts_created: 0,
      relationship_intelligence_rows: 0,
      apollo_calls: 0,
      smartlead_calls: 0,
      outreach_queue_rows: 0,
    },
  });
});
