import { supabase } from "@/integrations/supabase/client";

export type EnvName = "production"|"staging"|"test"|"development"|"other";
export type EnvStatus = "unknown"|"healthy"|"warning"|"error"|"paused";
export type DeployStatus = "pending"|"deployed"|"failed"|"rolled_back"|"cancelled";
export type MigrationStatus = "pending"|"applied"|"failed"|"rolled_back"|"unknown";
export type EdgeStatus = "unknown"|"deployed"|"failed"|"deprecated"|"no_op";
export type Sensitivity = "low"|"medium"|"high"|"critical";

export interface EnvironmentRecord {
  id: string; environment_name: EnvName; environment_status: EnvStatus;
  app_url: string | null; supabase_project_summary: string | null; branch_summary: string | null;
  active: boolean; created_at: string; updated_at: string;
}
export interface DeploymentRecord {
  id: string; environment_id: string | null; commit_hash: string | null; release_name: string | null;
  deployment_status: DeployStatus; deployed_at: string | null; deployed_by: string | null;
  build_status: string | null; test_status: string | null; notes: string | null;
  created_at: string; audit_metadata: Record<string, any>;
}
export interface MigrationRecord {
  id: string; environment_id: string | null; migration_name: string;
  migration_status: MigrationStatus; applied_at: string | null; notes: string | null;
  created_at: string; updated_at: string;
}
export interface EdgeFunctionRecord {
  id: string; environment_id: string | null; function_name: string;
  deployed_status: EdgeStatus; last_deployed_at: string | null; last_error: string | null;
  external_action_possible: boolean; created_at: string; updated_at: string;
}
export interface EnvVarRecord {
  id: string; environment_id: string | null; variable_name: string;
  configured: boolean; sensitivity_level: Sensitivity; last_verified_at: string | null;
  notes: string | null; created_at: string; updated_at: string;
}

const sb: any = supabase as any;

export async function listEnvironments() {
  const { data } = await sb.from("environment_records").select("*").order("environment_name");
  return (data ?? []) as EnvironmentRecord[];
}
export async function listDeployments(limit = 200) {
  const { data } = await sb.from("deployment_records").select("*").order("created_at",{ascending:false}).limit(limit);
  return (data ?? []) as DeploymentRecord[];
}
export async function listMigrations(limit = 300) {
  const { data } = await sb.from("migration_records").select("*").order("created_at",{ascending:false}).limit(limit);
  return (data ?? []) as MigrationRecord[];
}
export async function listEdgeFunctions(limit = 300) {
  const { data } = await sb.from("edge_function_records").select("*").order("function_name").limit(limit);
  return (data ?? []) as EdgeFunctionRecord[];
}
export async function listEnvVars(limit = 500) {
  const { data } = await sb.from("environment_variable_records").select("*").order("variable_name").limit(limit);
  return (data ?? []) as EnvVarRecord[];
}

export interface DeploymentSummary {
  environments: number;
  envWarning: number;
  envError: number;
  totalDeployments: number;
  failedDeployments: number;
  pending: number;
  rolledBack: number;
  failedMigrations: number;
  pendingMigrations: number;
  failedFunctions: number;
  missingCriticalVars: number;
  missingHighVars: number;
  watchItems: string[];
}

export async function summariseDeployment(): Promise<DeploymentSummary> {
  const [envs, deps, migs, fns, vars] = await Promise.all([
    sb.from("environment_records").select("environment_status,active"),
    sb.from("deployment_records").select("deployment_status,created_at").order("created_at",{ascending:false}).limit(500),
    sb.from("migration_records").select("migration_status").limit(1000),
    sb.from("edge_function_records").select("deployed_status").limit(500),
    sb.from("environment_variable_records").select("configured,sensitivity_level").limit(1000),
  ]);
  const e = envs.data ?? []; const d = deps.data ?? []; const m = migs.data ?? []; const f = fns.data ?? []; const v = vars.data ?? [];
  const envWarn = e.filter((x: any) => x.environment_status === "warning").length;
  const envErr = e.filter((x: any) => x.environment_status === "error").length;
  const failed = d.filter((x: any) => x.deployment_status === "failed").length;
  const pending = d.filter((x: any) => x.deployment_status === "pending").length;
  const rolled = d.filter((x: any) => x.deployment_status === "rolled_back").length;
  const failedMig = m.filter((x: any) => x.migration_status === "failed").length;
  const pendingMig = m.filter((x: any) => x.migration_status === "pending").length;
  const failedFn = f.filter((x: any) => x.deployed_status === "failed").length;
  const missingCritical = v.filter((x: any) => !x.configured && x.sensitivity_level === "critical").length;
  const missingHigh = v.filter((x: any) => !x.configured && x.sensitivity_level === "high").length;
  const watch: string[] = [];
  if (envErr > 0) watch.push(`${envErr} environment(s) in error`);
  if (failed > 0) watch.push(`${failed} failed deployment(s)`);
  if (failedMig > 0) watch.push(`${failedMig} failed migration(s)`);
  if (failedFn > 0) watch.push(`${failedFn} failed edge function(s)`);
  if (missingCritical > 0) watch.push(`${missingCritical} missing critical env var(s)`);
  if (missingHigh > 0) watch.push(`${missingHigh} missing high-sensitivity env var(s)`);
  return { environments: e.length, envWarning: envWarn, envError: envErr, totalDeployments: d.length, failedDeployments: failed, pending, rolledBack: rolled, failedMigrations: failedMig, pendingMigrations: pendingMig, failedFunctions: failedFn, missingCriticalVars: missingCritical, missingHighVars: missingHigh, watchItems: watch };
}