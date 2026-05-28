// Static metadata for the Security Vault. NEVER store actual secret values here.
// All values are placeholders that the founder confirms in-app; environment
// presence is detected via import.meta.env without revealing values.

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface SecretRecord {
  name: string;
  system: string;
  purpose: string;
  storedIn: string;
  owner: string;
  rotation: string;
  lastRotated: string | null;
  risk: RiskLevel;
  notes: string;
  envVarHint?: string; // VITE_-prefixed env name we can probe (presence only)
  passwordManager: boolean;
}

export interface AccessRecord {
  system: string;
  loginMethod: string;
  owner: string;
  recovery: string;
  mfa: "enabled" | "required" | "missing" | "unknown";
  risk: RiskLevel;
  notes: string;
}

// Probe whether a VITE_-prefixed env variable is present at build time.
// We only return a boolean — values are never read or surfaced.
export function envPresent(name: string): boolean {
  try {
    const v = (import.meta as any).env?.[name];
    return typeof v === "string" && v.length > 0;
  } catch {
    return false;
  }
}

export const SECRETS_REGISTER: SecretRecord[] = [
  { name: "VITE_SUPABASE_URL", system: "Lovable Cloud", purpose: "Backend API endpoint", storedIn: "Lovable env", owner: "Founder", rotation: "On project rotation", lastRotated: null, risk: "low", notes: "Publishable URL; safe in code.", envVarHint: "VITE_SUPABASE_URL", passwordManager: false },
  { name: "VITE_SUPABASE_PUBLISHABLE_KEY", system: "Lovable Cloud", purpose: "Public anon key for client SDK", storedIn: "Lovable env", owner: "Founder", rotation: "Rotate on leak only", lastRotated: null, risk: "low", notes: "Anon key is publishable.", envVarHint: "VITE_SUPABASE_PUBLISHABLE_KEY", passwordManager: false },
  { name: "SUPABASE_SERVICE_ROLE_KEY", system: "Lovable Cloud", purpose: "Privileged edge-function access", storedIn: "Lovable Cloud secrets", owner: "Founder", rotation: "Every 90 days or on leak", lastRotated: null, risk: "critical", notes: "Never exposed to client.", passwordManager: true },
  { name: "LOVABLE_API_KEY", system: "Lovable AI Gateway", purpose: "AI model access", storedIn: "Lovable Cloud secrets", owner: "Founder", rotation: "On leak; managed by Lovable", lastRotated: null, risk: "high", notes: "Rotate via lovable_api_key tool.", passwordManager: true },
  { name: "GITHUB_PAT", system: "GitHub", purpose: "CI / release tagging", storedIn: "Password manager", owner: "Founder", rotation: "Every 180 days", lastRotated: null, risk: "high", notes: "Use fine-grained PAT, repo-scoped.", passwordManager: true },
  { name: "DOMAIN_REGISTRAR_LOGIN", system: "Domain registrar", purpose: "DNS / domain control", storedIn: "Password manager", owner: "Founder", rotation: "On staff change", lastRotated: null, risk: "critical", notes: "MFA mandatory.", passwordManager: true },
  { name: "EMAIL_PROVIDER_API", system: "Email provider", purpose: "Transactional email (when enabled)", storedIn: "Lovable Cloud secrets", owner: "Founder", rotation: "Every 180 days", lastRotated: null, risk: "high", notes: "Disabled until founder activates external send.", passwordManager: true },
];

export const ACCESS_MAP: AccessRecord[] = [
  { system: "GitHub", loginMethod: "Email + MFA", owner: "Founder", recovery: "Recovery codes in password manager", mfa: "required", risk: "critical", notes: "Repo + actions + packages." },
  { system: "Lovable Cloud (Supabase)", loginMethod: "Lovable account", owner: "Founder", recovery: "Account recovery via Lovable support", mfa: "required", risk: "critical", notes: "Database, auth, edge functions, storage." },
  { system: "Lovable", loginMethod: "Email + MFA", owner: "Founder", recovery: "Email reset", mfa: "required", risk: "critical", notes: "Source of truth for builds and deploys." },
  { system: "Domain registrar", loginMethod: "Email + MFA", owner: "Founder", recovery: "Registrar recovery process", mfa: "required", risk: "critical", notes: "Holds liftorai.com." },
  { system: "Email provider", loginMethod: "Email + MFA", owner: "Founder", recovery: "Backup codes", mfa: "required", risk: "high", notes: "DKIM/SPF/DMARC managed here." },
  { system: "Smartlead", loginMethod: "Email + MFA", owner: "Founder", recovery: "Email reset", mfa: "enabled", risk: "high", notes: "External sending OFF by default." },
  { system: "Metricool", loginMethod: "Email + MFA", owner: "Founder", recovery: "Email reset", mfa: "enabled", risk: "medium", notes: "Read-mostly analytics access." },
  { system: "ManyChat", loginMethod: "OAuth (Facebook)", owner: "Founder", recovery: "Via Facebook account", mfa: "enabled", risk: "high", notes: "External messaging OFF by default." },
  { system: "Apollo", loginMethod: "Email + MFA", owner: "Founder", recovery: "Email reset", mfa: "enabled", risk: "high", notes: "Outbound disabled until founder approves." },
  { system: "Stripe", loginMethod: "Email + MFA", owner: "Founder", recovery: "Recovery codes", mfa: "required", risk: "critical", notes: "Live keys gated." },
  { system: "Analytics provider", loginMethod: "Email + MFA", owner: "Founder", recovery: "Email reset", mfa: "enabled", risk: "low", notes: "Public site metrics only." },
];

export const GITHUB_PROTECTION_CHECKLIST = [
  "Main branch protected (no direct pushes)",
  "Require PR review or founder approval before merge",
  "Require tests to pass before merge",
  "Keep clean release tags (vMAJOR.MINOR.PATCH)",
  "Create release notes after each major build phase",
  "Never commit secrets",
  "Never commit raw credentials",
  "Enable secret scanning + push protection",
  "Dependabot security updates enabled",
];

export const SUPABASE_BACKUP_CHECKLIST = [
  "Database schema backup taken (founder approval)",
  "Table list exported (metadata only)",
  "RLS policy review completed and signed off",
  "Edge functions list captured",
  "Storage bucket list captured (no file contents exported)",
  "Scheduled jobs list captured",
  "Auth settings notes recorded (providers, password rules)",
  "Backup date recorded with founder signature",
  "Restore notes attached with verified steps",
];

export const SECURITY_AUDIT_CHECKLIST = [
  "All /founder/* routes wrapped in FounderRoute",
  "No public access to founder pages confirmed",
  "RLS policies reviewed for every public-schema table",
  "No secrets present in source code (grep clean)",
  "No raw credentials present in database rows",
  "External sending disabled by default",
  "Paid APIs disabled by default",
  "Audit logging present for sensitive actions",
  "Manual update drafts reviewed by founder",
  "Legal/IP restrictions enforced (no competitor copy/brand/code/data)",
  "Demo data isolated from live data",
  "Backup + restore drill performed and dated",
];

export const RESTORE_RUNBOOK_STEPS = [
  { title: "Restore from GitHub", steps: ["Identify last known good tag/commit", "Clone repo on clean machine", "Verify branch protection still active", "Open in Lovable and confirm build status"] },
  { title: "Check Supabase schema", steps: ["Open Lovable Cloud → Database", "Confirm tables, columns, RLS policies match last snapshot", "Run supabase--linter to detect drift"] },
  { title: "Verify environment variables", steps: ["Open Project Settings → Secrets", "Confirm all required secret names present (values hidden)", "Confirm no extra unrecognised secrets"] },
  { title: "Run tests", steps: ["bunx vitest run", "Confirm all suites pass", "Investigate any failure before restoring traffic"] },
  { title: "Run build", steps: ["Lovable runs build automatically", "Confirm typecheck clean", "Confirm no missing imports"] },
  { title: "Check Command Centre", steps: ["Open /founder/command-centre", "Confirm Security Vault card shows last good snapshot", "Confirm no critical alerts"] },
  { title: "Confirm no external sending", steps: ["Open SystemModeBanner / runtime mode", "Confirm external send providers disabled", "Confirm Smartlead/Apollo/email all OFF"] },
  { title: "Confirm founder approval gates active", steps: ["Open Approvals/Ops module", "Confirm all gates listed as ENFORCED", "Confirm no gate was disabled during restore"] },
  { title: "Validate manuals + audit logs", steps: ["Open Manuals Hub", "Confirm no silent overwrites", "Open audit logs and confirm restore event recorded"] },
];