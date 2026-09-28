#!/usr/bin/env node
import { readFileSync } from "node:fs";

const review = JSON.parse(readFileSync("docs/liftor-rebuild/stage1b-public-rpc-review.json", "utf8"));
const migration = readFileSync(
  "supabase/migrations/20260923130000_stage1b_rpc_authorization_hardening.sql",
  "utf8",
);
const exceptions = JSON.parse(
  readFileSync("docs/liftor-rebuild/stage1b-rpc-exceptions.json", "utf8"),
);
const reconciliation = JSON.parse(
  readFileSync("docs/liftor-rebuild/stage1b-rpc-reconciliation.json", "utf8"),
);
const liveCatalogEvidence = JSON.parse(
  readFileSync("docs/liftor-rebuild/stage1b-live-rpc-catalog-evidence.json", "utf8"),
);
const allowed = new Set([
  "PUBLIC_ANON",
  "AUTHENTICATED_USER",
  "FOUNDER_ADMIN_ONLY",
  "SERVICE_ROLE_INTERNAL",
  "WEBHOOK_SYSTEM",
  "DB_INTERNAL",
  "DEAD_OR_LEGACY",
  "UNKNOWN_REQUIRES_REVIEW",
]);
const errors = [];
const functions = review.functions ?? [];
const signatures = new Set();
const oids = new Set();
const expectedClassCounts = {
  DB_INTERNAL: 283,
  PUBLIC_ANON: 8,
  SERVICE_ROLE_INTERNAL: 29,
  FOUNDER_ADMIN_ONLY: 31,
  DEAD_OR_LEGACY: 31,
  WEBHOOK_SYSTEM: 4,
};
const expectedRlsHelpers = [
  "public._is_founder_or_admin()",
  "public.current_worker_id()",
  "public.has_role(uuid, app_role)",
  "public.is_founder()",
  "public.is_founder_or_admin(uuid)",
  "public.is_oversight_reviewer()",
  "public.worker_has_active_window(uuid, text)",
];
const expectedAnonRlsHelpers = ["public.has_role(uuid, app_role)"];

function extractGrantAllowlist(label) {
  const start = migration.indexOf(label);
  if (start < 0) return [];
  const end = migration.indexOf("$stage1b_grants$;", start);
  if (end < 0) return [];
  return [...migration.slice(start, end).matchAll(/'(public\.[^']+)'/g)]
    .map((match) => match[1])
    .sort();
}

function extractFunctionBlock(marker) {
  const start = migration.indexOf(marker);
  if (start < 0) return "";
  const end = migration.indexOf("$function$;", start);
  return end < 0 ? "" : migration.slice(start, end + "$function$;".length);
}

if (review.function_count !== 386 || functions.length !== review.function_count) {
  errors.push(`function count mismatch: header=${review.function_count}, records=${functions.length}`);
}
const actualClassCounts = Object.fromEntries(
  [...new Set(functions.map((fn) => fn.classification))]
    .map((classification) => [classification, functions.filter((fn) => fn.classification === classification).length]),
);
for (const [classification, count] of Object.entries(expectedClassCounts)) {
  if (actualClassCounts[classification] !== count) {
    errors.push(`classification count mismatch for ${classification}: expected=${count}, actual=${actualClassCounts[classification] ?? 0}`);
  }
  if (review.classification_counts?.[classification] !== count) {
    errors.push(`review header count mismatch for ${classification}: expected=${count}, actual=${review.classification_counts?.[classification] ?? 0}`);
  }
}
for (const fn of functions) {
  if (!allowed.has(fn.classification)) errors.push(`invalid classification: ${fn.exact_signature}`);
  if (!fn.typed_signature) errors.push(`missing typed signature: ${fn.exact_signature}`);
  if (signatures.has(fn.typed_signature)) errors.push(`duplicate typed signature: ${fn.typed_signature}`);
  signatures.add(fn.typed_signature);
  if (oids.has(fn.function_oid)) errors.push(`duplicate function oid: ${fn.function_oid}`);
  oids.add(fn.function_oid);
  if (fn.classification === "UNKNOWN_REQUIRES_REVIEW") errors.push(`unknown function: ${fn.exact_signature}`);
  if (!fn.classification_reason) errors.push(`missing classification reason: ${fn.exact_signature}`);
  if (fn.security === "SECURITY DEFINER" && fn.search_path_status !== "CONFIGURED") {
    errors.push(`definer lacks configured search_path: ${fn.exact_signature}`);
  }
  if (fn.classification === "FOUNDER_ADMIN_ONLY" && !fn.server_side_auth_evidence) {
    errors.push(`founder/admin RPC lacks server-side auth evidence: ${fn.exact_signature}`);
  }
  if (fn.classification === "DEAD_OR_LEGACY" && !/no current repository runtime caller/i.test(fn.classification_reason)) {
    errors.push(`legacy classification lacks explicit no-caller evidence: ${fn.exact_signature}`);
  }
}

const outreachGateOverload = functions.find(
  (fn) => fn.exact_signature === "public.check_outreach_allowed(p_contact_id uuid, p_business_id uuid)",
);
if (!outreachGateOverload) {
  errors.push("missing exact two-argument check_outreach_allowed() review record");
} else {
  const callerEvidence = outreachGateOverload.caller_evidence ?? {};
  if (outreachGateOverload.classification !== "SERVICE_ROLE_INTERNAL") {
    errors.push("two-argument check_outreach_allowed() must remain conservatively service_role-only");
  }
  if (JSON.stringify(outreachGateOverload.intended_roles) !== JSON.stringify(["service_role"])) {
    errors.push("two-argument check_outreach_allowed() intended roles must remain service_role-only");
  }
  if (
    outreachGateOverload.referenced_by_frontend_browser ||
    outreachGateOverload.referenced_by_edge_functions ||
    (callerEvidence.frontend_rpc_hits ?? []).length > 0 ||
    (callerEvidence.edge_rpc_hits ?? []).length > 0
  ) {
    errors.push("two-argument check_outreach_allowed() has no exact repository caller; do not copy one-argument hits");
  }
  if (!/external callers remain unverified/i.test(outreachGateOverload.classification_reason ?? "")) {
    errors.push("two-argument check_outreach_allowed() must document that external callers remain unverified");
  }
}

for (const required of [
  "Stage 1B BLOCKED: anon application EXECUTE requires 18 exact signatures",
  "CREATE SCHEMA stage1b_private AUTHORIZATION postgres;",
  "prior_definition_md5",
  "prior_service_role_execute",
  "exact raw ACL rollback requires explicit proacl values",
  "scripts/stage1b-live-catalog-evidence.sql",
]) {
  if (!migration.includes(required)) errors.push(`migration missing control: ${required}`);
}
if (/\b(?:REVOKE|GRANT)\s+(?:ALL\s+)?(?:EXECUTE\s+)?ON\s+ALL\s+FUNCTIONS\b/i.test(migration)) {
  errors.push("migration must not use schema-wide function ACL statements");
}
if (/ALTER DEFAULT PRIVILEGES/i.test(migration)) {
  errors.push("migration must not change future-function defaults without the global/default-ACL evidence and exact rollback");
}
if (!migration.includes("CREATE TABLE stage1b_private.rpc_state_snapshot")) {
  errors.push("migration must persist actual pre-change definitions and ACL metadata for rollback");
}
if (!migration.includes("after_definition_md5 = md5(pg_get_functiondef(p.oid))")) {
  errors.push("migration must record the exact post-change function-definition hash for rollback drift protection");
}
if (/REVOKE\s+EXECUTE[^;]*\bservice_role\b/i.test(migration)) errors.push("migration revokes service_role execution");
if (/auth\.role\(\)\s*(?:<>|!=)\s*'service_role'/i.test(migration)) {
  errors.push("migration has a nullable auth.role() comparison that can fail open");
}
const publicAnonExpected = functions
  .filter((fn) => fn.classification === "PUBLIC_ANON")
  .map((fn) => fn.typed_signature)
  .sort();
const founderExpected = functions
  .filter((fn) => fn.classification === "FOUNDER_ADMIN_ONLY")
  .map((fn) => fn.typed_signature)
  .sort();
const publicAnonActual = extractGrantAllowlist("-- Explicit PUBLIC_ANON execution allowlist");
const founderActual = extractGrantAllowlist("-- Explicit FOUNDER_ADMIN_ONLY execution allowlist");
const helperActual = extractGrantAllowlist("-- Explicit RLS_HELPER execution allowlist");
const anonHelperMarker = "-- Only has_role() is referenced by RLS policies targeted to PUBLIC/anon.";
const anonHelperActual = extractGrantAllowlist(anonHelperMarker);
const helperGrantStart = migration.indexOf("-- Explicit RLS_HELPER execution allowlist");
const helperGrantEnd = migration.indexOf("$stage1b_grants$;", helperGrantStart);
const helperGrantBlock = migration.slice(helperGrantStart, helperGrantEnd);
const anonHelperGrantStart = migration.indexOf(anonHelperMarker);
const anonHelperGrantEnd = migration.indexOf("$stage1b_grants$;", anonHelperGrantStart);
const anonHelperGrantBlock = migration.slice(anonHelperGrantStart, anonHelperGrantEnd);
const reconciledRows = reconciliation.rows ?? [];
const liveEvidenceRows = liveCatalogEvidence.rows ?? [];
const reconciledSignatures = reconciledRows.map((row) => row.exact_signature).sort();
const evidenceSignatures = liveEvidenceRows.map((row) => row.exact_signature).sort();
if (reconciledRows.length !== 18 || new Set(reconciledSignatures).size !== 18) {
  errors.push(`authoritative RPC reconciliation must contain 18 unique signatures; actual=${reconciledRows.length}`);
}
if (liveCatalogEvidence.result?.exact_live_signature_count !== 18 || JSON.stringify(reconciledSignatures) !== JSON.stringify(evidenceSignatures)) {
  errors.push("RPC reconciliation signatures do not exactly match the authoritative live catalog evidence");
}
if (liveCatalogEvidence.migration_signature_gate_evidence?.observed_count !== 18
    || liveCatalogEvidence.migration_signature_gate_evidence?.exact_match_to_catalog_rows !== true
    || liveCatalogEvidence.migration_signature_gate_evidence?.exact_match_to_migration_gate !== true
    || reconciliation.migration_signature_gate_observed_exact_match !== true) {
  errors.push("authoritative live signature set does not prove an exact match with the migration pre-change gate");
}
if (reconciliation.authoritative_live_reconciled_count !== 18 || reconciliation.unresolved_count !== 0) {
  errors.push("RPC reconciliation must resolve all 18 signatures with no unresolved rows");
}
for (const row of reconciledRows) {
  if (!row.exact_signature || !row.live?.owner || typeof row.live?.security_definer !== "boolean"
      || !row.live?.search_path || typeof row.live?.anon_execute !== "boolean"
      || typeof row.live?.authenticated_execute !== "boolean" || typeof row.live?.public_execute !== "boolean"
      || !row.intended_caller || !row.authorization_mechanism || !row.keep_revoke_rationale
      || !row.migration_live_definition_parity?.parity_status) {
    errors.push(`incomplete authoritative RPC reconciliation row: ${row.exact_signature ?? "missing signature"}`);
  }
}
const gateArrayMatch = migration.match(/v_candidate_anon_signatures\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\];/i);
const gateSignatures = gateArrayMatch
  ? [...gateArrayMatch[1].matchAll(/'(public\.[^']+)'/g)].map((match) => match[1]).sort()
  : [];
if (JSON.stringify(gateSignatures) !== JSON.stringify(reconciledSignatures)) {
  errors.push("migration pre-change anon signature gate does not exactly match all 18 live signatures");
}
for (const [name, expected, actual] of [
  ["PUBLIC_ANON", publicAnonExpected, publicAnonActual],
  ["FOUNDER_ADMIN_ONLY", founderExpected, founderActual],
  ["RLS_HELPER", [...expectedRlsHelpers].sort(), helperActual],
  ["ANON_RLS_HELPER", expectedAnonRlsHelpers, anonHelperActual],
]) {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    errors.push(`${name} execute grant list does not exactly match its reviewed allowlist`);
  }
}
const plannedAnonSignatures = reconciledRows
  .filter((row) => row.proposed_post_stage1b_grants.anon_execute)
  .map((row) => row.exact_signature)
  .sort();
const allowedAnonSignatures = [...new Set([...publicAnonActual, ...anonHelperActual])].sort();
if (JSON.stringify(plannedAnonSignatures) !== JSON.stringify(allowedAnonSignatures)) {
  errors.push("reconciled post-Stage-1B anon grants do not match the exact token and PUBLIC-RLS helper allowlists");
}
const plannedAuthenticatedSignatures = reconciledRows
  .filter((row) => row.proposed_post_stage1b_grants.authenticated_execute)
  .map((row) => row.exact_signature)
  .sort();
const allowedAuthenticatedSignatures = [...new Set([...publicAnonActual, ...founderActual, ...helperActual])].sort();
if (JSON.stringify(plannedAuthenticatedSignatures) !== JSON.stringify(allowedAuthenticatedSignatures.filter((signature) => reconciledSignatures.includes(signature)))) {
  errors.push("reconciled authenticated grants do not match the public, founder/admin, and RLS helper allowlists");
}
const candidateAnonCount = publicAnonExpected.length + expectedAnonRlsHelpers.length;
if (candidateAnonCount !== 9) {
  errors.push(`planned post-Stage-1B anon EXECUTE grant count changed unexpectedly: expected=9, actual=${candidateAnonCount}`);
}
if (!migration.includes("cardinality(v_candidate_anon_signatures) <> 18")
  || !migration.includes("v_actual_anon_signatures IS DISTINCT FROM v_candidate_anon_signatures")) {
  errors.push("migration must fail closed unless its pre-change signature gate equals the 18 live application signatures");
}
if (!helperGrantBlock.includes("TO authenticated") || /TO anon\s*,\s*authenticated/i.test(helperGrantBlock)) {
  errors.push("RLS_HELPER allowlist must grant authenticated only");
}
if (!anonHelperGrantBlock.includes("GRANT EXECUTE ON FUNCTION %s TO anon")) {
  errors.push("ANON_RLS_HELPER allowlist must grant anon explicitly");
}

const upsertContact = extractFunctionBlock(
  "CREATE OR REPLACE FUNCTION public.upsert_contact(_email text",
);
if (!upsertContact.includes("INSERT INTO public.contacts (email, name, company, role, source)")) {
  errors.push("upsert_contact must write the global contact row without assigning a business field");
}
if (/assigned_business\s*=\s*COALESCE/i.test(upsertContact)) {
  errors.push("upsert_contact must not make contacts.assigned_business authoritative");
}
if (!upsertContact.includes("INSERT INTO public.business_contact_relationships (contact_id, business_id, business_name)")) {
  errors.push("upsert_contact must attach the person to the canonical business relationship layer");
}
if (!upsertContact.includes("ON CONFLICT (contact_id, business_name) DO NOTHING")) {
  errors.push("upsert_contact must preserve existing business-specific relationship state on repeat imports");
}
if (!upsertContact.includes("business_not_authorized") || !upsertContact.includes("inbox_assignment_requires_business_relationship")) {
  errors.push("upsert_contact must fail closed for invalid business or unsupported single-business inbox context");
}

const apolloGuard = extractFunctionBlock(
  "-- Server-side authorization hardening for public.apollo_credit_status()",
);
if (!apolloGuard || /\bcurrent_user\b/i.test(apolloGuard)) {
  errors.push("apollo_credit_status() must not authorize using SECURITY DEFINER current_user");
}
for (const required of [
  "session_user NOT IN ('postgres', 'supabase_admin')",
  "auth.role() IS DISTINCT FROM 'service_role'",
  "public.has_role(auth.uid(), 'founder')",
  "public.has_role(auth.uid(), 'admin')",
]) {
  if (!apolloGuard.includes(required)) errors.push(`apollo_credit_status() guard missing ${required}`);
}

for (const [name, marker] of [
  ["get_outbound_status()", "CREATE OR REPLACE FUNCTION public.get_outbound_status()"],
  ["get_business_outbound_status(text)", "CREATE OR REPLACE FUNCTION public.get_business_outbound_status(_business_name text)"],
]) {
  const block = extractFunctionBlock(marker);
  if (!block || /auth\.role\(\)\s*(?:<>|!=)\s*'service_role'/i.test(block)) {
    errors.push(`${name} is missing or has a nullable service-role guard`);
  }
  if (!block.includes("public._is_founder_or_admin()")) {
    errors.push(`${name} must check founder/admin authorization server-side`);
  }
}

for (const [name, marker, arg] of [
  ["has_role(uuid, app_role)", "CREATE OR REPLACE FUNCTION public.has_role(", "_user_id"],
  ["is_founder_or_admin(uuid)", "CREATE OR REPLACE FUNCTION public.is_founder_or_admin(", "_uid"],
]) {
  const block = extractFunctionBlock(marker);
  const binding = new RegExp(`${arg}\\s+IS DISTINCT FROM\\s+auth\\.uid\\(\\)`, "i");
  if (!block || !binding.test(block)) {
    errors.push(`${name} must bind caller-supplied identity to auth.uid()`);
  }
  if (block && /auth\.role\(\)\s*(?:<>|!=)\s*'service_role'/i.test(block)) {
    errors.push(`${name} has a nullable service-role comparison`);
  }
}

if (review.unknown_count !== 0) errors.push(`review header reports ${review.unknown_count} unknown functions`);
if (!Array.isArray(exceptions.exceptions) || exceptions.exceptions.length !== 1) {
  errors.push("managed extension exception allowlist is missing or not explicit");
}

if (errors.length) {
  console.error(JSON.stringify({ status: "FAIL", errors }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  status: "PASS",
  stage1b_integration_status: "RECONCILED_PENDING_APPLY",
  public_functions: functions.length,
  classifications: review.classification_counts,
  unknown_functions: 0,
  security_definer_search_paths_reviewed: functions.filter((f) => f.security === "SECURITY DEFINER").length,
  founder_admin_server_auth_records: functions.filter((f) => f.classification === "FOUNDER_ADMIN_ONLY").length,
  anon_application_signatures_expected: 18,
  anon_application_signatures_classified: reconciliation.authoritative_live_reconciled_count,
  anon_application_signatures_unresolved: reconciliation.unresolved_count,
  post_stage1b_anon_execute_grants: candidateAnonCount,
  post_stage1b_authenticated_execute_grants: reconciliation.planned_post_stage1b_grants.authenticated_execute_count,
  live_catalog_evidence: "CAPTURED_AUTHORITATIVE_READ_ONLY",
  production_migration_applied: reconciliation.production_migration_applied,
}));
