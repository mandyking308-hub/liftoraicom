import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const migrationPath = "supabase/migrations/20260923130000_stage1b_rpc_authorization_hardening.sql";
const migration = readFileSync(migrationPath, "utf8");
const driftChecker = readFileSync("scripts/check-stage1b-rpc-drift.sql", "utf8");

function functionBlock(marker: string) {
  const start = migration.indexOf(marker);
  if (start < 0) return "";
  const end = migration.indexOf("$function$;", start);
  return end < 0 ? "" : migration.slice(start, end + "$function$;".length);
}

describe("Stage 1B — public RPC authorization", () => {
  it("keeps every frozen public function classified and exact grants aligned", () => {
    const output = execFileSync("node", ["scripts/check-stage1b-rpc-classification.mjs"], {
      encoding: "utf8",
    });
    const report = JSON.parse(output);

    expect(report.status).toBe("PASS");
    expect(report.public_functions).toBe(386);
    expect(report.unknown_functions).toBe(0);
    expect(report.security_definer_search_paths_reviewed).toBe(211);
    expect(report.classifications.PUBLIC_ANON).toBe(8);
    expect(report.classifications.FOUNDER_ADMIN_ONLY).toBe(31);
    expect(report.stage1b_integration_status).toBe("RECONCILED_PENDING_APPLY");
    expect(report.anon_application_signatures_expected).toBe(18);
    expect(report.anon_application_signatures_classified).toBe(18);
    expect(report.anon_application_signatures_unresolved).toBe(0);
    expect(report.post_stage1b_anon_execute_grants).toBe(9);
    expect(report.production_migration_applied).toBe(false);
  });

  it("records authoritative catalog and caller evidence for all 18 RPC reconciliation rows", () => {
    const reconciliation = JSON.parse(
      readFileSync("docs/liftor-rebuild/stage1b-rpc-reconciliation.json", "utf8"),
    );
    const catalog = JSON.parse(
      readFileSync("docs/liftor-rebuild/stage1b-live-rpc-catalog-evidence.json", "utf8"),
    );
    expect(reconciliation.expected_prechange_anon_application_signature_count).toBe(18);
    expect(reconciliation.authoritative_live_reconciled_count).toBe(18);
    expect(reconciliation.unresolved_count).toBe(0);
    expect(reconciliation.production_migration_applied).toBe(false);
    expect(reconciliation.rows).toHaveLength(18);
    expect(catalog.result.exact_live_signature_count).toBe(18);
    expect(catalog.rows).toHaveLength(18);
    expect(catalog.migration_signature_gate_evidence.observed_count).toBe(18);
    expect(catalog.migration_signature_gate_evidence.exact_match_to_migration_gate).toBe(true);
    for (const row of reconciliation.rows) {
      expect(row.exact_signature).toMatch(/^public\./);
      expect(row.live.owner).toBe("postgres");
      expect(row.live.security_definer).toBe(true);
      expect(row.live.search_path).toBe("search_path=public");
      expect(row.live.anon_execute).toBe(true);
      expect(row.live.authenticated_execute).toBe(true);
      expect(row.live.public_execute).toBe(false);
      expect(row.live.definition_md5).toMatch(/^[a-f0-9]{32}$/);
      expect(row.intended_caller).toBeTruthy();
      expect(row.authorization_mechanism).toBeTruthy();
      expect(row.proposed_post_stage1b_grants).toBeTruthy();
      expect(row.migration_live_definition_parity.parity_status).toBeTruthy();
      expect(row.keep_revoke_rationale).toBeTruthy();
    }
    for (const row of catalog.rows) {
      expect(row.exact_definition).toContain("CREATE OR REPLACE FUNCTION");
      expect(row.raw_acl).toEqual([
        "postgres=X/postgres",
        "service_role=X/postgres",
        "anon=X/postgres",
        "authenticated=X/postgres",
      ]);
      expect(row.acl_entries.map((entry: any) => entry.acl_ordinal)).toEqual([1, 2, 3, 4]);
    }
    expect(
      reconciliation.rows.find((row: any) =>
        row.exact_signature === "public.get_customer_quarterly_report_by_token(text)",
      ).repository_callers.frontend_rpc_callers,
    ).toContainEqual({ path: "src/pages/public/CustomerReportView.tsx", line: 20 });
    expect(
      reconciliation.rows.find((row: any) =>
        row.exact_signature === "public.get_customer_survey_request_by_token(text)",
      ).repository_callers.frontend_rpc_callers,
    ).toContainEqual({ path: "src/pages/public/SurveyResponse.tsx", line: 27 });
    expect(reconciliation.planned_post_stage1b_grants).toEqual({
      anon_execute_count: 9,
      authenticated_execute_count: 17,
      public_execute_count: 0,
      service_role_execute_count: 18,
    });
    expect(catalog.migration_history.matching_row_count).toBe(0);
    expect(catalog.rollback_preflight.postgres_owned_public_function_count).toBe(241);
    expect(catalog.rollback_preflight.postgres_owned_raw_acl_null_count).toBe(0);
    expect(catalog.rollback_preflight.postgres_owned_non_owner_grantor_function_count).toBe(0);
    expect(catalog.rollback_preflight.acl_order_replay_preflight.owner_execute_entry_not_ordinal_one).toBe(0);
  });

  it("gates against the exact live pre-change signature set and keeps anon only for documented token/RLS paths", () => {
    const reconciliation = JSON.parse(
      readFileSync("docs/liftor-rebuild/stage1b-rpc-reconciliation.json", "utf8"),
    );
    const expected = reconciliation.rows.map((row: any) => row.exact_signature).sort();
    const signatureArray = migration.match(
      /v_candidate_anon_signatures\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\];/i,
    )?.[1] ?? "";
    const actual = [...signatureArray.matchAll(/'(public\.[^']+)'/g)]
      .map((match) => match[1])
      .sort();
    expect(actual).toEqual(expected);
    for (const row of reconciliation.rows) {
      const name = row.exact_signature.slice("public.".length).split("(")[0];
      const grant = row.proposed_post_stage1b_grants;
      expect(grant.anon_execute).toBe(
        [
          "accept_proposal_by_token",
          "get_customer_quarterly_report_by_token",
          "get_customer_survey_request_by_token",
          "get_proposal_by_token",
          "has_role",
          "log_demo_event",
          "supplier_list_assignments",
          "supplier_login_with_token",
          "supplier_update_assignment_status",
        ].includes(name),
      );
      expect(grant.public_execute).toBe(false);
    }
  });

  it("excludes trigger-returning helpers from the application RPC inventory", () => {
    const signatureArray = migration.match(
      /v_candidate_anon_signatures\s+text\[\]\s*:=\s*ARRAY\[([\s\S]*?)\];/i,
    )?.[1] ?? "";
    const liveEvidence = readFileSync("scripts/stage1b-live-catalog-evidence.sql", "utf8");
    const inventory = JSON.parse(
      readFileSync("docs/liftor-rebuild/stage1b-rpc-reconciliation.json", "utf8"),
    );

    expect(signatureArray.match(/'public\.[^']+'/g)).toHaveLength(18);
    expect(signatureArray).not.toContain("public.sor_touch_updated_at()");
    expect(migration).toContain("AND p.prorettype <> 'trigger'::regtype");
    expect(liveEvidence).toContain("AND p.prorettype <> 'trigger'::regtype");
    expect(driftChecker).toContain("p.prorettype = 'trigger'::regtype AS returns_trigger");
    expect(driftChecker).toContain("'code','TRIGGER_HELPER_CLIENT_EXECUTE'");
    expect(inventory.rows.map((row: any) => row.exact_signature)).not.toContain(
      "public.sor_touch_updated_at()",
    );
  });

  it("revokes client execution from the SOR trigger helper without changing its trigger", () => {
    const followup = readFileSync(
      "supabase/migrations/20260928120000_stage1b_sor_touch_acl_hardening.sql",
      "utf8",
    );
    const rollback = readFileSync(
      "docs/liftor-rebuild/stage1b-sor-touch-acl-rollback.sql",
      "utf8",
    );

    expect(followup).toContain(
      "REVOKE EXECUTE ON FUNCTION public.sor_touch_updated_at() FROM PUBLIC, anon, authenticated",
    );
    expect(followup).toContain("p.prorettype = 'trigger'::regtype");
    expect(followup).toContain("FROM pg_trigger t");
    expect(followup).toContain("after_raw_acl = p.proacl::text");
    expect(followup).not.toMatch(/CREATE\s+OR\s+REPLACE\s+FUNCTION/i);
    expect(followup).not.toMatch(/DROP\s+TRIGGER|CREATE\s+TRIGGER/i);
    expect(rollback).toContain("raw_acl");
    expect(rollback).toContain("acl_entries");
    expect(rollback).toContain("Rollback refused");
  });

  it("removes schema-wide ACL sweeps and blocks until exact live anon signatures are reconciled", () => {
    expect(migration).not.toContain("REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public");
    expect(migration).not.toContain("GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public");
    expect(migration).not.toContain("ALTER DEFAULT PRIVILEGES");
    expect(migration).toContain("CREATE TABLE stage1b_private.rpc_state_snapshot");
    expect(migration).toContain("prior_definition text NOT NULL");
    expect(migration).toContain("prior_anon_execute boolean NOT NULL");
    expect(migration).toContain("prior_authenticated_execute boolean NOT NULL");
    expect(migration).toContain("prior_public_execute boolean NOT NULL");
    expect(migration).toContain("prior_service_role_execute boolean NOT NULL");
    expect(migration).toContain("p.proacl IS NULL");
    expect(migration).toContain("exact raw ACL rollback requires explicit proacl values");
    expect(migration).toContain("cardinality(v_candidate_anon_signatures) <> 18");
    expect(migration).toContain("v_actual_anon_signatures IS DISTINCT FROM v_candidate_anon_signatures");
  });

  it("uses live-state snapshots and refuses rollback after function drift", () => {
    expect(migration).toContain("raw_acl_was_null boolean NOT NULL");
    expect(migration).toContain("prior_security_definer boolean NOT NULL");
    expect(migration).toContain("prior_proconfig text[]");
    expect(migration).toContain("prior_definition text NOT NULL");
    expect(migration).toContain("prior_definition_md5 text NOT NULL");
    expect(migration).toContain("after_raw_acl = p.proacl::text");
    expect(migration).toContain("after_definition_md5 = md5(pg_get_functiondef(p.oid))");

    const rollback = readFileSync("docs/liftor-rebuild/stage1b-rpc-rollback.sql", "utf8");
    expect(rollback).toContain("prior_definition_md5");
    expect(rollback).toContain("NULL proacl");
    expect(rollback).toContain("acl_entries");
    expect(rollback).toContain("proacl::text FROM pg_proc");
    expect(rollback).toContain("after_definition_md5");
    expect(rollback).toContain("prior_security_definer");
    expect(rollback).toContain("prior_proconfig");
    expect(rollback).toContain("acl_ordinal");
    expect(rollback).toContain("prior_anon_execute");
    expect(rollback).toContain("prior_authenticated_execute");
    expect(rollback).toContain("prior_public_execute");
    expect(rollback).toContain("Rollback refused");
    expect(rollback).toContain("Rollback verification failed");
    expect(rollback).toContain("EXECUTE r.prior_definition");
  });

  it("preserves existing lead_to_payment workflow rows and only inserts missing steps", () => {
    const rebuild = functionBlock("CREATE OR REPLACE FUNCTION public.rebuild_full_manual()");
    const seed = rebuild
      .split("-- Add missing canonical lead_to_payment steps")[1]
      ?.split("-- Rules registry")[0] ?? "";

    expect(seed).toContain("INSERT INTO system_workflow_steps");
    expect(seed).toContain("AND NOT EXISTS");
    expect(seed).toContain("existing.workflow_id = w.id");
    expect(seed).toContain("existing.step_index = s.idx");
    expect(seed).not.toMatch(/\bDELETE\s+FROM\s+system_workflow_steps\b/i);
    expect(seed).not.toMatch(/\bUPDATE\s+system_workflow_steps\b/i);
  });

  it("provides a read-only exact catalog capture for owners, ACLs, security, and bodies", () => {
    const evidence = readFileSync("scripts/stage1b-live-catalog-evidence.sql", "utf8");
    expect(evidence).toContain("pg_get_functiondef(p.oid)");
    expect(evidence).toContain("pg_get_userbyid(p.proowner)");
    expect(evidence).toContain("p.proacl::text AS raw_acl");
    expect(evidence).toContain("p.prosecdef AS security_definer");
    expect(evidence).toContain("p.proconfig AS configured_settings");
    expect(evidence).toContain("'acl_ordinal', acl_item.ordinal");
    expect(evidence).toContain("has_function_privilege('anon'");
    expect(evidence).toContain("has_function_privilege('authenticated'");
    expect(evidence).toContain("a.grantee = 0 AND a.privilege_type = 'EXECUTE'");
    expect(evidence).toContain("security_definer");
    expect(evidence).toContain("classification");
    expect(evidence).toContain("observed_anon_application_function_count");
    expect(evidence).toContain("prosrc_md5");
    expect(evidence).toContain("matching_stage1b_migration_history_rows");
    expect(evidence).toContain("20260923130000_stage1b_rpc_authorization_hardening");
  });

  it("uses the global contacts person row and the BCR business relationship for upserts", () => {
    const block = functionBlock("CREATE OR REPLACE FUNCTION public.upsert_contact(_email text");
    expect(block).toContain("INSERT INTO public.contacts (email, name, company, role, source)");
    expect(block).not.toMatch(/assigned_business\s*=\s*COALESCE/i);
    expect(block).toContain("public.business_contact_relationships (contact_id, business_id, business_name)");
    expect(block).toContain("ON CONFLICT (contact_id, business_name) DO NOTHING");
    expect(block).toContain("business_not_authorized");
    expect(block).toContain("inbox_assignment_requires_business_relationship");
  });

  it("authorizes outreach imports and resolves business scope before privileged writes", () => {
    const edge = readFileSync("supabase/functions/outreach-import-leads/index.ts", "utf8");
    expect(edge).toContain("authorizeOutreachImport(req.headers.get(\"authorization\")");
    expect(edge).toContain("supabase.auth.getUser(token)");
    expect(edge).toContain(".from(\"user_roles\")");
    expect(edge).toContain(".from(\"businesses\")");
    expect(edge).toContain(".from(\"business_contact_relationships\")");
    expect(edge).toContain("alreadyLinked.has");
    expect(edge).not.toContain("existingSet.has(email)");
  });

  it("keeps overloaded outreach-gate callers attached to the exact signature", () => {
    const review = JSON.parse(
      readFileSync("docs/liftor-rebuild/stage1b-public-rpc-review.json", "utf8"),
    );
    const oneArg = review.functions.find(
      (fn: any) => fn.exact_signature === "public.check_outreach_allowed(_contact_id uuid)",
    );
    const twoArgs = review.functions.find(
      (fn: any) => fn.exact_signature === "public.check_outreach_allowed(p_contact_id uuid, p_business_id uuid)",
    );

    expect(oneArg.caller_evidence.frontend_rpc_hits).toHaveLength(1);
    expect(oneArg.caller_evidence.edge_rpc_hits).toHaveLength(2);
    expect(twoArgs.classification).toBe("SERVICE_ROLE_INTERNAL");
    expect(twoArgs.intended_roles).toEqual(["service_role"]);
    expect(twoArgs.referenced_by_frontend_browser).toBe(false);
    expect(twoArgs.referenced_by_edge_functions).toBe(false);
    expect(twoArgs.caller_evidence.frontend_rpc_hits).toEqual([]);
    expect(twoArgs.caller_evidence.edge_rpc_hits).toEqual([]);
    expect(twoArgs.classification_reason).toMatch(/external callers remain unverified/i);
    expect(readFileSync("src/integrations/supabase/types.ts", "utf8")).toContain(
      "p_business_id?: string; p_contact_id: string",
    );
  });

  it("uses the caller identity, not SECURITY DEFINER current_user, for Apollo status", () => {
    const block = functionBlock(
      "-- Server-side authorization hardening for public.apollo_credit_status()",
    );

    expect(block).toContain("session_user NOT IN ('postgres', 'supabase_admin')");
    expect(block).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(block).toContain("public.has_role(auth.uid(), 'founder')");
    expect(block).toContain("public.has_role(auth.uid(), 'admin')");
    expect(block).not.toMatch(/\bcurrent_user\b/i);
  });

  it("fails closed when the JWT role is absent and binds role helper IDs to auth.uid()", () => {
    expect(migration).not.toMatch(/auth\.role\(\)\s*<>\s*'service_role'/i);

    const hasRole = functionBlock("CREATE OR REPLACE FUNCTION public.has_role(");
    const isFounderOrAdmin = functionBlock(
      "CREATE OR REPLACE FUNCTION public.is_founder_or_admin(",
    );
    expect(hasRole).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(hasRole).toContain("_user_id IS DISTINCT FROM auth.uid()");
    expect(isFounderOrAdmin).toContain("auth.role() IS DISTINCT FROM 'service_role'");
    expect(isFounderOrAdmin).toContain("_uid IS DISTINCT FROM auth.uid()");
  });

  it("restricts outbound operational status reads to founder/admin or trusted backend callers", () => {
    for (const [name, marker] of [
      ["get_outbound_status", "CREATE OR REPLACE FUNCTION public.get_outbound_status()"],
      [
        "get_business_outbound_status",
        "CREATE OR REPLACE FUNCTION public.get_business_outbound_status(_business_name text)",
      ],
    ]) {
      const block = functionBlock(marker);
      expect(block, name).toContain("session_user NOT IN ('postgres', 'supabase_admin')");
      expect(block, name).toContain("auth.role() IS DISTINCT FROM 'service_role'");
      expect(block, name).toContain("public._is_founder_or_admin()");
    }

    const publicAllowlist = migration
      .split("-- Explicit PUBLIC_ANON execution allowlist")[1]
      ?.split("$stage1b_grants$;")[0] ?? "";
    expect(publicAllowlist).not.toContain("public.get_outbound_status()");
    expect(publicAllowlist).not.toContain("public.get_business_outbound_status(text)");

    const helperAllowlist = migration
      .split("-- Explicit RLS_HELPER execution allowlist")[1]
      ?.split("$stage1b_grants$;")[0] ?? "";
    expect(helperAllowlist).not.toContain("public.is_kill_switch_active()");
    expect(helperAllowlist).toContain("public.worker_has_active_window(uuid, text)");
    expect(helperAllowlist).toContain("TO authenticated");
    expect(helperAllowlist).not.toContain("TO anon, authenticated");

    const anonHelperAllowlist = migration
      .split("-- Only has_role() is referenced by RLS policies targeted to PUBLIC/anon.")[1]
      ?.split("$stage1b_grants$;")[0] ?? "";
    expect(anonHelperAllowlist).toContain("public.has_role(uuid, app_role)");
    expect(anonHelperAllowlist).not.toContain("public.is_founder()");
    expect(anonHelperAllowlist).toContain("GRANT EXECUTE ON FUNCTION %s TO anon");
  });

  it("keeps the live checker exact-signature and fail-closed for guard regressions", () => {
    expect(driftChecker).toContain("DEFINER_AUTH_USES_CURRENT_USER");
    expect(driftChecker).toContain("NULLABLE_SERVICE_ROLE_GUARD");
    expect(driftChecker).toContain("(<>|!=)");
    expect(driftChecker).toContain("CALLER_IDENTITY_NOT_BOUND");
    expect(driftChecker).toContain("ANON_APPLICATION_ALLOWLIST_RECONCILIATION_REQUIRED");
    expect(driftChecker).toContain("ANON_APPLICATION_COUNT_NOT_CAPTURED");
    expect(driftChecker).toContain("reconciled_prechange_signature_count',18");
    expect(driftChecker).toContain("'expected_live_count',9");
    expect(driftChecker).not.toContain("has_function_privilege('public'");
    expect(driftChecker).toContain("rls_helpers(typed_signature)");
    expect(driftChecker).toContain("anon_rls_helpers(typed_signature)");
    expect(driftChecker).not.toContain("('public.is_kill_switch_active()')");
    expect(driftChecker).not.toContain("l.function_name NOT IN");
  });
});
