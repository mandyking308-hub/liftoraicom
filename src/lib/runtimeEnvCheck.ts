/**
 * Runtime env validation. Verifies required publishable env vars exist at startup.
 * Logs a warning to console (non-fatal) so the app still boots in degraded mode
 * rather than white-screening — fail-loud is delegated to the readiness engine.
 */
const REQUIRED = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_PUBLISHABLE_KEY",
  "VITE_SUPABASE_PROJECT_ID",
] as const;

export interface RuntimeEnvReport {
  ok: boolean;
  missing: string[];
  checkedAt: string;
}

export function verifyRuntimeEnv(): RuntimeEnvReport {
  const env = (import.meta as any).env ?? {};
  const missing = REQUIRED.filter((k) => !env[k] || String(env[k]).trim() === "");
  const report: RuntimeEnvReport = {
    ok: missing.length === 0,
    missing,
    checkedAt: new Date().toISOString(),
  };
  if (!report.ok && typeof console !== "undefined") {
    console.warn("[runtimeEnvCheck] Missing required env vars:", missing.join(", "));
  }
  return report;
}

// Run once at module load (side effect is safe — pure check, no throws).
export const RUNTIME_ENV_REPORT = verifyRuntimeEnv();