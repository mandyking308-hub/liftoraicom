import { supabase } from "@/integrations/supabase/client";

export interface AccessGovSnapshot {
  systems_total: number;
  systems_active: number;
  high_risk_systems: number;
  systems_unknown_owner: number;
  secrets_total: number;
  secrets_configured: number;
  secrets_missing: number;
  rotation_due_now: number;
  rotation_due_30d: number;
  never_rotated: number;
  assignments_active: number;
  assignments_requested: number;
  assignments_expired: number;
  audit_events_30d: number;
  recent_critical_events: number;
  recommended_action: string;
}

export async function computeAccessGovSnapshot(): Promise<AccessGovSnapshot> {
  const sb: any = supabase as any;
  const [sysRes, secRes, asgRes, audRes] = await Promise.all([
    sb.from("access_systems").select("id,system_name,system_type,owner,risk_level,active"),
    sb.from("secret_inventory").select("id,configured,last_rotated_at,rotation_due_at,active,risk_level"),
    sb.from("access_assignments").select("id,access_status,expires_at"),
    sb.from("access_audit_events").select("id,severity,created_at"),
  ]);
  const systems = sysRes.data ?? [];
  const secrets = secRes.data ?? [];
  const assignments = asgRes.data ?? [];
  const audits = audRes.data ?? [];

  const now = Date.now();
  const in30 = now + 30 * 86400000;
  const past30 = now - 30 * 86400000;

  const systems_active = systems.filter((s: any) => s.active).length;
  const high_risk_systems = systems.filter((s: any) => s.active && ["high", "critical"].includes(s.risk_level)).length;
  const systems_unknown_owner = systems.filter((s: any) => s.active && ["high", "critical"].includes(s.risk_level) && !s.owner).length;

  const activeSecrets = secrets.filter((s: any) => s.active);
  const secrets_configured = activeSecrets.filter((s: any) => s.configured).length;
  const secrets_missing = activeSecrets.filter((s: any) => !s.configured).length;
  const rotation_due_now = activeSecrets.filter((s: any) => s.rotation_due_at && new Date(s.rotation_due_at).getTime() <= now).length;
  const rotation_due_30d = activeSecrets.filter((s: any) => s.rotation_due_at && new Date(s.rotation_due_at).getTime() > now && new Date(s.rotation_due_at).getTime() <= in30).length;
  const never_rotated = activeSecrets.filter((s: any) => s.configured && !s.last_rotated_at).length;

  const assignments_active = assignments.filter((a: any) => a.access_status === "active").length;
  const assignments_requested = assignments.filter((a: any) => a.access_status === "requested").length;
  const assignments_expired = assignments.filter((a: any) => a.access_status === "active" && a.expires_at && new Date(a.expires_at).getTime() < now).length;

  const audit_events_30d = audits.filter((e: any) => new Date(e.created_at).getTime() >= past30).length;
  const recent_critical_events = audits.filter((e: any) => ["high", "critical"].includes(e.severity) && new Date(e.created_at).getTime() >= past30).length;

  let recommended_action = "Access estate is clean. No rotations or revocations due.";
  if (recent_critical_events > 0) recommended_action = `${recent_critical_events} critical audit event(s) in last 30 days — review immediately.`;
  else if (rotation_due_now > 0) recommended_action = `${rotation_due_now} secret(s) overdue for rotation.`;
  else if (assignments_expired > 0) recommended_action = `${assignments_expired} active assignment(s) past expiry — revoke.`;
  else if (systems_unknown_owner > 0) recommended_action = `${systems_unknown_owner} high-risk system(s) have no owner assigned.`;
  else if (assignments_requested > 0) recommended_action = `${assignments_requested} access request(s) waiting for founder approval.`;
  else if (rotation_due_30d > 0) recommended_action = `${rotation_due_30d} secret(s) due rotation in next 30 days — schedule.`;

  return {
    systems_total: systems.length,
    systems_active,
    high_risk_systems,
    systems_unknown_owner,
    secrets_total: secrets.length,
    secrets_configured,
    secrets_missing,
    rotation_due_now,
    rotation_due_30d,
    never_rotated,
    assignments_active,
    assignments_requested,
    assignments_expired,
    audit_events_30d,
    recent_critical_events,
    recommended_action,
  };
}

// Secret-like string detector. Never store or return matched values — only positions/types.
const PATTERNS: { type: string; re: RegExp }[] = [
  { type: "aws_access_key", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: "google_api_key", re: /\bAIza[0-9A-Za-z\-_]{35}\b/ },
  { type: "stripe_secret", re: /\bsk_(?:live|test)_[0-9A-Za-z]{20,}\b/ },
  { type: "stripe_restricted", re: /\brk_(?:live|test)_[0-9A-Za-z]{20,}\b/ },
  { type: "openai_key", re: /\bsk-[A-Za-z0-9]{20,}\b/ },
  { type: "github_token", re: /\bghp_[A-Za-z0-9]{30,}\b/ },
  { type: "slack_token", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/ },
  { type: "jwt", re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { type: "private_key_block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { type: "generic_high_entropy", re: /\b[A-Za-z0-9_\-]{40,}\b/ },
];

export function detectSecretLikeStrings(input: string): { type: string; count: number }[] {
  if (!input) return [];
  const counts: Record<string, number> = {};
  for (const { type, re } of PATTERNS) {
    const g = new RegExp(re.source, "g");
    const m = input.match(g);
    if (m && m.length) counts[type] = (counts[type] ?? 0) + m.length;
  }
  return Object.entries(counts).map(([type, count]) => ({ type, count }));
}

export function redactSecretLikeStrings(input: string): string {
  if (!input) return input;
  let out = input;
  for (const { re } of PATTERNS) {
    const g = new RegExp(re.source, "g");
    out = out.replace(g, "[REDACTED]");
  }
  return out;
}