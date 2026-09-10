// Education 152 CRM-native account import — 10 September 2026.
//
// Canonical company truth is public.organisations. strategic_target_accounts is
// a planning/prioritisation mirror linked back through existing_organisation_id.
// Dry-run by default; writes only with { confirm: true }.
// NO Apollo call, NO Smartlead call, NO contact creation, NO outreach side effect.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  EDUCATION_MASTER_LIST_NAME,
  EDUCATION_MASTER_LIST_TYPE,
  EDUCATION_RESEARCH_PROGRAM_KEY,
  toTargetAccountRow,
  validateEducationAccounts,
  type RawEducationAccountRow,
} from "../_shared/educationAccountUniverse.ts";
import {
  resolveEducationOrganisation,
  toEducationOrganisationPatch,
  type EducationOrganisationRow,
} from "../_shared/educationCrm.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Minimal CSV parser (quoted fields/newlines supported sufficiently for reviewed source file). */
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

/** Normalise the real reviewed CSV header into the existing validator contract. */
export function normaliseReviewedCsvRow(row: RawEducationAccountRow): RawEducationAccountRow {
  const raw = row as Record<string, unknown>;
  return {
    ...row,
    group_id: String(row.group_id ?? raw["Group ID"] ?? ""),
    account_name: String(row.account_name ?? raw["Account Name"] ?? ""),
    account_domain: String(row.account_domain ?? raw["Account Website (Domain)"] ?? raw["Domain"] ?? ""),
    qualification: String(row.qualification ?? raw["Qualification"] ?? ""),
    operating_footprint: String(row.operating_footprint ?? raw["Operating Footprint"] ?? ""),
    review_note: String(row.review_note ?? raw["Review Note"] ?? ""),
    primary_source: String(row.primary_source ?? raw["Primary Source"] ?? ""),
    source_version: String(row.source_version ?? raw["Source Version"] ?? "2026-09-08"),
  };
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

  const supplied: RawEducationAccountRow[] = Array.isArray(body.rows)
    ? body.rows
    : typeof body.csv === "string"
    ? parseCsv(body.csv)
    : [];
  if (!supplied.length) return json({ error: "no_rows_supplied", detail: "Provide rows[] or csv." }, 400);

  const rows = supplied.map(normaliseReviewedCsvRow);
  const { valid, errors, received } = validateEducationAccounts(rows);

  const [{ data: orgRows, error: orgErr }, { data: targetRows, error: targetErr }] = await Promise.all([
    admin.from("organisations")
      .select("id,name,education_group_id,website_domain,source_key,is_education_target"),
    admin.from("strategic_target_accounts")
      .select("id,source_key,existing_organisation_id")
      .like("source_key", "education_152_master:%"),
  ]);
  if (orgErr) return json({ error: "organisation_lookup_failed", detail: orgErr.message }, 500);
  if (targetErr) return json({ error: "strategic_lookup_failed", detail: targetErr.message }, 500);

  const organisations = [...((orgRows ?? []) as EducationOrganisationRow[])];
  const targetByKey = new Map((targetRows ?? []).filter((t: any) => t.source_key).map((t: any) => [t.source_key, t]));

  const plan = valid.map((account) => {
    const resolution = resolveEducationOrganisation(account, organisations);
    const target = targetByKey.get(account.source_key) as any;
    return {
      group_id: account.group_id,
      source_key: account.source_key,
      account_name: account.account_name,
      organisation_action: resolution.kind === "create" ? "create" : resolution.kind,
      organisation_match_reason: resolution.reason,
      existing_organisation_id: resolution.organisation?.id ?? null,
      strategic_action: target ? "update_or_verify" : "create",
    };
  });

  const ambiguous = plan.filter((p) => p.organisation_action === "ambiguous");
  const dryRun = body.dry_run === true || body.confirm !== true;
  const classification = valid.reduce<Record<string, number>>((acc, r) => {
    acc[r.qualification] = (acc[r.qualification] ?? 0) + 1;
    return acc;
  }, {});

  const totals = {
    received,
    valid: valid.length,
    invalid: received - valid.length,
    validation_errors: errors.length,
    ambiguous_organisation_matches: ambiguous.length,
    organisation_creates: plan.filter((p) => p.organisation_action === "create").length,
    organisation_matches: plan.filter((p) => p.organisation_action === "matched").length,
    existing_strategic_targets: targetRows?.length ?? 0,
    classification,
  };

  if (dryRun) {
    return json({
      ok: errors.length === 0 && ambiguous.length === 0,
      dry_run: true,
      reason: body.confirm === true ? "dry_run_requested" : "founder_confirm_required",
      list_name: EDUCATION_MASTER_LIST_NAME,
      totals,
      validation_errors: errors.slice(0, 50),
      ambiguous_matches: ambiguous.slice(0, 50),
      plan_sample: plan.slice(0, 20),
      canonical_company_table: "organisations",
      strategic_table_role: "planning_mirror",
      side_effects: { contacts_created: 0, apollo_calls: 0, smartlead_calls: 0, outreach_queue_rows: 0 },
    });
  }

  if (errors.length || ambiguous.length) {
    return json({
      ok: false,
      error: errors.length ? "validation_failed" : "ambiguous_organisation_match",
      totals,
      validation_errors: errors.slice(0, 50),
      ambiguous_matches: ambiguous.slice(0, 50),
    }, 412);
  }

  // Portfolio-level planning list. It does not own the CRM company records.
  const { data: listRow } = await admin.from("strategic_account_lists")
    .select("id").eq("list_name", EDUCATION_MASTER_LIST_NAME).maybeSingle();
  let listId = listRow?.id ?? null;
  if (!listId) {
    const { data: created, error: listErr } = await admin.from("strategic_account_lists").insert({
      list_name: EDUCATION_MASTER_LIST_NAME,
      list_type: EDUCATION_MASTER_LIST_TYPE,
      list_status: "research_only",
      founder_review_required: true,
      strategy_summary: "Planning mirror of the canonical Education 152 CRM organisations. No outreach side effects.",
      metadata: { research_program_key: EDUCATION_RESEARCH_PROGRAM_KEY, canonical_company_table: "organisations", outreach_eligible: false },
    }).select("id").single();
    if (listErr) return json({ error: "list_create_failed", detail: listErr.message }, 500);
    listId = created.id;
  }

  let organisationsCreated = 0;
  let organisationsUpdated = 0;
  let strategicCreated = 0;
  let strategicUpdated = 0;
  const writeErrors: Array<{ group_id: string; stage: string; message: string }> = [];

  for (const account of valid) {
    let resolution = resolveEducationOrganisation(account, organisations);
    let organisationId: string | null = resolution.organisation?.id ?? null;
    const orgPatch = toEducationOrganisationPatch(account);

    if (resolution.kind === "matched" && resolution.organisation) {
      const existing = resolution.organisation;
      if ((existing.education_group_id && existing.education_group_id !== account.group_id) ||
          (existing.source_key?.startsWith("education_152_master:") && existing.source_key !== account.source_key)) {
        writeErrors.push({ group_id: account.group_id, stage: "organisation_match", message: "conflicting education identity on matched organisation" });
        continue;
      }
      const { error } = await admin.from("organisations").update(orgPatch).eq("id", existing.id);
      if (error) { writeErrors.push({ group_id: account.group_id, stage: "organisation_update", message: error.message }); continue; }
      organisationsUpdated++;
      organisationId = existing.id;
      Object.assign(existing, orgPatch);
    } else {
      const { data: created, error } = await admin.from("organisations").insert(orgPatch).select("id,name,education_group_id,website_domain,source_key,is_education_target").single();
      if (error || !created) { writeErrors.push({ group_id: account.group_id, stage: "organisation_create", message: error?.message ?? "no row returned" }); continue; }
      organisationsCreated++;
      organisationId = created.id;
      organisations.push(created as EducationOrganisationRow);
      resolution = { kind: "matched", organisation: created as EducationOrganisationRow, reason: "created" };
    }

    const baseTarget = toTargetAccountRow(account, listId);
    const strategicPayload = {
      ...baseTarget,
      existing_organisation_id: organisationId,
      promoted_to_crm: true,
      metadata: {
        ...baseTarget.metadata,
        canonical_organisation_id: organisationId,
        canonical_company_table: "organisations",
      },
    };
    const existingTarget = targetByKey.get(account.source_key) as any;
    if (existingTarget?.id) {
      const { error } = await admin.from("strategic_target_accounts").update(strategicPayload).eq("id", existingTarget.id);
      if (error) writeErrors.push({ group_id: account.group_id, stage: "strategic_update", message: error.message });
      else strategicUpdated++;
    } else {
      const { data: createdTarget, error } = await admin.from("strategic_target_accounts").insert(strategicPayload).select("id,source_key,existing_organisation_id").single();
      if (error || !createdTarget) writeErrors.push({ group_id: account.group_id, stage: "strategic_create", message: error?.message ?? "no row returned" });
      else {
        strategicCreated++;
        targetByKey.set(account.source_key, createdTarget);
      }
    }
  }

  const [{ count: organisationCount }, { count: strategicCount }] = await Promise.all([
    admin.from("organisations").select("id", { count: "exact", head: true }).eq("is_education_target", true),
    admin.from("strategic_target_accounts").select("id", { count: "exact", head: true }).like("source_key", "education_152_master:%"),
  ]);
  await admin.from("strategic_account_lists").update({ target_count: strategicCount ?? 0, updated_at: new Date().toISOString() }).eq("id", listId);

  return json({
    ok: writeErrors.length === 0,
    dry_run: false,
    list_id: listId,
    totals: {
      ...totals,
      organisations_created: organisationsCreated,
      organisations_updated: organisationsUpdated,
      strategic_created: strategicCreated,
      strategic_updated: strategicUpdated,
      write_errors: writeErrors.length,
    },
    education_crm_organisation_count: organisationCount ?? 0,
    education_strategic_mirror_count: strategicCount ?? 0,
    write_errors: writeErrors.slice(0, 50),
    side_effects: { contacts_created: 0, apollo_calls: 0, smartlead_calls: 0, outreach_queue_rows: 0 },
  });
});
