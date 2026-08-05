/**
 * Liftor Social Relationship Engine — pure, provider-neutral logic.
 *
 * Deno-compatible plain TypeScript with NO runtime imports, so the exact same
 * module is used by the edge functions AND by the vitest suite. No drift.
 *
 * NOTHING in this file performs I/O. It only decides.
 */

/* ------------------------------------------------------------------ modes */

export type RelationshipMode =
  | "test_only"
  | "draft_actions"
  | "approval_required"
  | "approved_batch_autopilot"
  | "paused";

export const RELATIONSHIP_MODES: RelationshipMode[] = [
  "test_only",
  "draft_actions",
  "approval_required",
  "approved_batch_autopilot",
  "paused",
];

/** Safe-off default. Anything unrecognised collapses to test_only. */
export function normaliseMode(value?: string | null): RelationshipMode {
  const v = String(value ?? "").trim().toLowerCase();
  return (RELATIONSHIP_MODES as string[]).includes(v) ? (v as RelationshipMode) : "test_only";
}

/* ----------------------------------------------------------- capabilities */

export type ActionType =
  | "send_invitation"
  | "follow"
  | "start_chat"
  | "send_message"
  | "reply_message"
  | "accept_or_decline_received_invitation"
  | "sync_profile"
  | "sync_conversation";

export const ACTION_TYPES: ActionType[] = [
  "send_invitation",
  "follow",
  "start_chat",
  "send_message",
  "reply_message",
  "accept_or_decline_received_invitation",
  "sync_profile",
  "sync_conversation",
];

export const CAPABILITY_KEYS = [
  "profile_search",
  "company_search",
  "invite_connect",
  "follow",
  "start_chat",
  "send_message",
  "read_chats",
  "read_messages",
  "webhook_support",
  "relation_accepted_events",
  "comments_mentions",
] as const;

export type CapabilityKey = (typeof CAPABILITY_KEYS)[number];

/** Which capability must be declared supported for each queued action type. */
export const ACTION_CAPABILITY: Record<ActionType, CapabilityKey> = {
  send_invitation: "invite_connect",
  follow: "follow",
  start_chat: "start_chat",
  send_message: "send_message",
  reply_message: "send_message",
  accept_or_decline_received_invitation: "invite_connect",
  sync_profile: "profile_search",
  sync_conversation: "read_chats",
};

export interface CapabilityRow {
  capability: string;
  supported: boolean;
}

export function capabilityMap(rows: CapabilityRow[] | null | undefined): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const r of rows ?? []) out[String(r.capability)] = r.supported === true;
  return out;
}

/** Unsupported actions are BLOCKED — never silently downgraded or simulated. */
export function actionSupported(
  caps: Record<string, boolean>,
  action_type: ActionType | string,
): { supported: boolean; capability: string | null } {
  const cap = ACTION_CAPABILITY[action_type as ActionType];
  if (!cap) return { supported: false, capability: null };
  return { supported: caps[cap] === true, capability: cap };
}

/* ------------------------------------------------------------- provider URL */

const ALLOWED_PROVIDER_HOST_SUFFIXES = [".unipile.com", "unipile.com", ".manychat.com", "manychat.com"];

/**
 * Strict base-URL validation. Prevents SSRF / arbitrary URL injection through
 * a founder-entered or secret-supplied DSN.
 */
export function validateProviderBaseUrl(raw: string | null | undefined): {
  ok: boolean;
  url?: string;
  reason?: string;
} {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: false, reason: "base_url_missing" };
  let u: URL;
  try {
    u = new URL(value.includes("://") ? value : `https://${value}`);
  } catch {
    return { ok: false, reason: "base_url_unparseable" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "base_url_not_https" };
  if (u.username || u.password) return { ok: false, reason: "base_url_has_credentials" };
  const host = u.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    host.includes("169.254.")
  ) {
    return { ok: false, reason: "base_url_host_not_allowed" };
  }
  if (!ALLOWED_PROVIDER_HOST_SUFFIXES.some((s) => host === s || host.endsWith(s))) {
    return { ok: false, reason: "base_url_host_not_allowlisted" };
  }
  return { ok: true, url: `https://${u.host}${u.pathname.replace(/\/+$/, "")}` };
}

/* ------------------------------------------------------------ idempotency */

/** Deterministic, collision-resistant-enough key for one logical action. */
export function buildIdempotencyKey(parts: {
  business_id: string;
  account_id: string;
  action_type: string;
  target_ref: string;
  nonce?: string | null;
}): string {
  return [
    parts.business_id,
    parts.account_id,
    parts.action_type,
    parts.target_ref,
    parts.nonce ?? "v1",
  ]
    .map((p) => String(p ?? "").trim().toLowerCase())
    .join("|");
}

/* ----------------------------------------------------------------- pauses */

export interface PauseRow {
  scope: "global" | "business" | "provider" | "account" | string;
  business_id?: string | null;
  provider?: string | null;
  account_id?: string | null;
  is_paused?: boolean | null;
  reason?: string | null;
}

/** Pause hierarchy: global > business > provider > account. First hit wins. */
export function resolvePause(
  rows: PauseRow[] | null | undefined,
  ctx: { business_id?: string | null; provider?: string | null; account_id?: string | null },
): { paused: boolean; scope?: string; reason?: string } {
  const active = (rows ?? []).filter((r) => r.is_paused !== false);
  const g = active.find((r) => r.scope === "global");
  if (g) return { paused: true, scope: "global", reason: g.reason ?? "global_pause" };
  const b = active.find((r) => r.scope === "business" && r.business_id && r.business_id === ctx.business_id);
  if (b) return { paused: true, scope: "business", reason: b.reason ?? "business_pause" };
  const p = active.find((r) => r.scope === "provider" && r.provider && r.provider === ctx.provider);
  if (p) return { paused: true, scope: "provider", reason: p.reason ?? "provider_pause" };
  const a = active.find((r) => r.scope === "account" && r.account_id && r.account_id === ctx.account_id);
  if (a) return { paused: true, scope: "account", reason: a.reason ?? "account_pause" };
  return { paused: false };
}

/* -------------------------------------------------------- time & throttle */

export interface PolicyRow {
  mode?: string | null;
  daily_invite_limit?: number | null;
  weekly_invite_limit?: number | null;
  daily_message_limit?: number | null;
  weekly_message_limit?: number | null;
  max_ai_replies_per_conversation_per_day?: number | null;
  min_delay_seconds?: number | null;
  max_delay_seconds?: number | null;
  working_hours_start?: number | null;
  working_hours_end?: number | null;
  working_days?: number[] | null;
  timezone?: string | null;
  allow_connect_then_dm?: boolean | null;
  allow_ai_autosend?: boolean | null;
  require_real_account_declaration?: boolean | null;
}

export const DEFAULT_POLICY: Required<
  Pick<
    PolicyRow,
    | "daily_invite_limit"
    | "weekly_invite_limit"
    | "daily_message_limit"
    | "weekly_message_limit"
    | "max_ai_replies_per_conversation_per_day"
    | "min_delay_seconds"
    | "max_delay_seconds"
    | "working_hours_start"
    | "working_hours_end"
  >
> = {
  daily_invite_limit: 10,
  weekly_invite_limit: 40,
  daily_message_limit: 15,
  weekly_message_limit: 60,
  max_ai_replies_per_conversation_per_day: 3,
  min_delay_seconds: 90,
  max_delay_seconds: 420,
  working_hours_start: 9,
  working_hours_end: 17,
};

/** Hour/day check in the policy timezone (IANA), defaulting to Europe/London. */
export function withinWorkingHours(now: Date, policy: PolicyRow): boolean {
  const tz = policy.timezone || "Europe/London";
  let hour: number;
  let weekday: number;
  try {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const parts = fmt.formatToParts(now);
    hour = Number(parts.find((p) => p.type === "hour")?.value ?? now.getUTCHours());
    const wd = String(parts.find((p) => p.type === "weekday")?.value ?? "");
    weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
    if (weekday < 0) weekday = now.getUTCDay();
  } catch {
    hour = now.getUTCHours();
    weekday = now.getUTCDay();
  }
  const start = policy.working_hours_start ?? DEFAULT_POLICY.working_hours_start;
  const end = policy.working_hours_end ?? DEFAULT_POLICY.working_hours_end;
  const days = policy.working_days && policy.working_days.length ? policy.working_days : [1, 2, 3, 4, 5];
  if (!days.includes(weekday)) return false;
  return hour >= start && hour < end;
}

/** Bounded jitter. `rand` is injectable so tests are deterministic. */
export function jitterDelaySeconds(policy: PolicyRow, rand: () => number = Math.random): number {
  const min = Math.max(0, policy.min_delay_seconds ?? DEFAULT_POLICY.min_delay_seconds);
  const max = Math.max(min, policy.max_delay_seconds ?? DEFAULT_POLICY.max_delay_seconds);
  const r = Math.min(0.999999, Math.max(0, rand()));
  return Math.floor(min + r * (max - min));
}

export interface UsageCounts {
  day: number;
  week: number;
}

export function limitFor(policy: PolicyRow, action_type: string): { day: number; week: number } {
  const invite = action_type === "send_invitation" || action_type === "follow";
  return invite
    ? {
        day: policy.daily_invite_limit ?? DEFAULT_POLICY.daily_invite_limit,
        week: policy.weekly_invite_limit ?? DEFAULT_POLICY.weekly_invite_limit,
      }
    : {
        day: policy.daily_message_limit ?? DEFAULT_POLICY.daily_message_limit,
        week: policy.weekly_message_limit ?? DEFAULT_POLICY.weekly_message_limit,
      };
}

export function limitExceeded(
  policy: PolicyRow,
  action_type: string,
  usage: UsageCounts,
): { exceeded: boolean; reason?: string } {
  const lim = limitFor(policy, action_type);
  if (usage.day >= lim.day) return { exceeded: true, reason: "daily_limit_reached" };
  if (usage.week >= lim.week) return { exceeded: true, reason: "weekly_limit_reached" };
  return { exceeded: false };
}

/* -------------------------------------------------------- action decision */

export type ActionDecision = "blocked" | "draft" | "pending_approval" | "ready";

export interface EvaluateActionInput {
  now: Date;
  mode: RelationshipMode | string;
  action_type: ActionType | string;
  capabilities: Record<string, boolean>;
  pause: { paused: boolean; scope?: string; reason?: string };
  policy: PolicyRow;
  usage: UsageCounts;
  account?: {
    account_status?: string | null;
    real_account_declared?: boolean | null;
    cooldown_until?: string | null;
  } | null;
  connection_ok: boolean;
  target_approved: boolean;
  batch_approved: boolean;
  suppressed: boolean;
  suppression_reason?: string | null;
  /** true when this action would DM immediately after connecting */
  connect_then_dm?: boolean;
  ignore_working_hours?: boolean;
}

export interface EvaluateActionResult {
  decision: ActionDecision;
  blockers: string[];
  reasons: string[];
}

/**
 * Single authoritative gate for every external social action.
 * Fails closed: any missing input results in a blocked or draft outcome.
 */
export function evaluateAction(input: EvaluateActionInput): EvaluateActionResult {
  const blockers: string[] = [];
  const reasons: string[] = [];
  const mode = normaliseMode(input.mode);

  if (input.pause.paused) blockers.push(`paused_${input.pause.scope ?? "unknown"}`);
  if (!input.connection_ok) blockers.push("provider_not_connected");

  const cap = actionSupported(input.capabilities, input.action_type);
  if (!cap.supported) blockers.push(`capability_unsupported:${cap.capability ?? input.action_type}`);

  const acct = input.account ?? null;
  if (!acct) blockers.push("no_account");
  else {
    if ((input.policy.require_real_account_declaration ?? true) && acct.real_account_declared !== true) {
      blockers.push("real_account_not_declared");
    }
    if (acct.account_status && !["ok", "unknown"].includes(acct.account_status)) {
      blockers.push(`account_status_${acct.account_status}`);
    }
    if (acct.cooldown_until && new Date(acct.cooldown_until).getTime() > input.now.getTime()) {
      blockers.push("account_cooldown");
    }
  }

  if (input.suppressed) blockers.push(`suppressed:${input.suppression_reason ?? "unknown"}`);

  if (input.connect_then_dm && input.policy.allow_connect_then_dm !== true) {
    blockers.push("connect_then_dm_not_permitted");
  }

  const lim = limitExceeded(input.policy, String(input.action_type), input.usage);
  if (lim.exceeded) blockers.push(lim.reason!);

  if (!input.ignore_working_hours && !withinWorkingHours(input.now, input.policy)) {
    blockers.push("outside_working_hours");
  }

  if (blockers.length) return { decision: "blocked", blockers, reasons };

  if (mode === "paused") return { decision: "blocked", blockers: ["policy_mode_paused"], reasons };
  if (mode === "test_only") {
    reasons.push("mode_test_only_no_external_action");
    return { decision: "draft", blockers, reasons };
  }
  if (mode === "draft_actions") {
    reasons.push("mode_draft_actions");
    return { decision: "draft", blockers, reasons };
  }

  if (!input.target_approved) {
    reasons.push("target_not_approved");
    return { decision: "pending_approval", blockers, reasons };
  }
  if (!input.batch_approved) {
    reasons.push("batch_not_approved");
    return { decision: "pending_approval", blockers, reasons };
  }
  if (mode === "approval_required") {
    reasons.push("mode_approval_required_action_authorised_by_batch");
  }
  return { decision: "ready", blockers, reasons };
}

/* --------------------------------------------------------- intent / risk */

export type SocialIntent =
  | "interested"
  | "question"
  | "neutral"
  | "not_interested"
  | "unsubscribe"
  | "complaint"
  | "legal"
  | "high_value"
  | "other";

const OPT_OUT_PATTERNS = [
  /\bstop\b/i,
  /\bunsubscribe\b/i,
  /\bopt[\s-]?out\b/i,
  /\bremove me\b/i,
  /\bdo not contact\b/i,
  /\bdon'?t contact me\b/i,
  /\bleave me alone\b/i,
];

const LEGAL_PATTERNS = [/lawyer/i, /solicitor/i, /lawsuit/i, /\bgdpr\b/i, /subpoena/i, /legal action/i, /\bico\b/i];
const COMPLAINT_PATTERNS = [/complaint/i, /refund/i, /scam/i, /fraud/i, /report you/i, /misleading/i];
const SAFEGUARDING_PATTERNS = [/safeguard/i, /minor\b/i, /vulnerable/i, /self[\s-]?harm/i];
const REGULATED_PATTERNS = [/\bfca\b/i, /\bnhs\b/i, /\bhipaa\b/i, /regulated/i, /clinical/i, /patient/i];
const PRESS_PATTERNS = [/journalist/i, /press enquiry/i, /reporter/i, /on the record/i];
const INVESTOR_PATTERNS = [/investor/i, /\bvc\b/i, /term sheet/i, /acquisition/i, /acquire your/i];
const HIGH_VALUE_PATTERNS = [/enterprise/i, /\brfp\b/i, /procurement/i, /\$\s?\d{3,}/, /£\s?\d{3,}/, /\b\d+\s?m\b/i];
const NEGATIVE_PATTERNS = [/not interested/i, /no thanks/i, /\bspam\b/i, /angry/i, /waste of (my )?time/i, /stop messaging/i];
const INTEREST_PATTERNS = [/interested/i, /sounds good/i, /tell me more/i, /book a call/i, /let'?s talk/i, /keen\b/i];
const FILLER_PATTERNS = [/^\s*(ok|okay|thanks|thank you|cheers|great|noted|👍|ta)\s*[.!]*\s*$/i];

export function isOptOut(text: string): boolean {
  return OPT_OUT_PATTERNS.some((r) => r.test(text ?? ""));
}

export function classifyIntent(text: string): SocialIntent {
  const t = String(text ?? "");
  if (!t.trim()) return "neutral";
  if (isOptOut(t)) return "unsubscribe";
  if (LEGAL_PATTERNS.some((r) => r.test(t))) return "legal";
  if (COMPLAINT_PATTERNS.some((r) => r.test(t))) return "complaint";
  if (HIGH_VALUE_PATTERNS.some((r) => r.test(t)) || INVESTOR_PATTERNS.some((r) => r.test(t))) return "high_value";
  if (NEGATIVE_PATTERNS.some((r) => r.test(t))) return "not_interested";
  if (INTEREST_PATTERNS.some((r) => r.test(t))) return "interested";
  if (t.includes("?") || /^(what|how|why|when|where|who|can you|could you|do you|does it|is it|are you)\b/i.test(t.trim()))
    return "question";
  return "neutral";
}

export type EscalationCategory =
  | "legal"
  | "complaint"
  | "refund"
  | "safeguarding"
  | "regulated"
  | "high_value"
  | "press"
  | "investor"
  | "negative"
  | "uncertain"
  | "other";

export function detectEscalation(
  text: string,
  opts: { intent?: SocialIntent; length_limit?: number } = {},
): { escalate: boolean; category?: EscalationCategory; severity?: "low" | "medium" | "high" | "critical" } {
  const t = String(text ?? "");
  if (LEGAL_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "legal", severity: "critical" };
  if (SAFEGUARDING_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "safeguarding", severity: "critical" };
  if (COMPLAINT_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "complaint", severity: "high" };
  if (REGULATED_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "regulated", severity: "high" };
  if (PRESS_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "press", severity: "high" };
  if (INVESTOR_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "investor", severity: "high" };
  if (HIGH_VALUE_PATTERNS.some((r) => r.test(t))) return { escalate: true, category: "high_value", severity: "medium" };
  if (opts.intent === "not_interested") return { escalate: false };
  if (t.length > (opts.length_limit ?? 800)) return { escalate: true, category: "uncertain", severity: "medium" };
  return { escalate: false };
}

/* ----------------------------------------------------- AI reply guardrails */

export interface ReplyGuardInput {
  mode: RelationshipMode | string;
  intent: SocialIntent;
  allow_ai_autosend: boolean;
  ai_replies_today: number;
  max_ai_replies_per_day: number;
  last_outbound_ai_generated: boolean;
  inbound_text: string;
  escalation_pending: boolean;
}

export type ReplyDisposition = "suppress" | "draft" | "send";

export function decideReplyDisposition(input: ReplyGuardInput): {
  disposition: ReplyDisposition;
  reason: string;
} {
  const mode = normaliseMode(input.mode);
  if (input.escalation_pending) return { disposition: "suppress", reason: "escalation_pending" };
  if (input.intent === "unsubscribe" || input.intent === "not_interested") {
    return { disposition: "suppress", reason: "opt_out_or_negative" };
  }
  if (input.intent === "legal" || input.intent === "complaint" || input.intent === "high_value") {
    return { disposition: "suppress", reason: "requires_founder" };
  }
  // anti-loop: pointless "ok/thanks" chatter after our own AI message
  if (
    input.intent === "neutral" &&
    input.last_outbound_ai_generated &&
    FILLER_PATTERNS.some((r) => r.test(input.inbound_text ?? ""))
  ) {
    return { disposition: "suppress", reason: "ai_loop_guard" };
  }
  if (input.ai_replies_today >= Math.max(0, input.max_ai_replies_per_day)) {
    return { disposition: "suppress", reason: "ai_daily_cap" };
  }
  if (mode === "approved_batch_autopilot" && input.allow_ai_autosend) {
    return { disposition: "send", reason: "autopilot_low_risk" };
  }
  return { disposition: "draft", reason: "draft_only_mode" };
}

/* -------------------------------------------------------- retry semantics */

export type RetryClass = "retry" | "dead_letter" | "submission_unknown";

/**
 * Ambiguous transport failures must NEVER be auto-retried — we cannot know
 * whether the provider already sent the invitation or message.
 */
export function classifyProviderFailure(input: {
  http_status?: number | null;
  error_code?: string | null;
  transport_error?: boolean;
  attempt_count: number;
  max_attempts: number;
}): { klass: RetryClass; reason: string } {
  if (input.transport_error) return { klass: "submission_unknown", reason: "ambiguous_transport_failure" };
  const s = input.http_status ?? 0;
  if (s === 408 || s === 504) return { klass: "submission_unknown", reason: "timeout_ambiguous" };
  if (s === 429) {
    return input.attempt_count + 1 >= input.max_attempts
      ? { klass: "dead_letter", reason: "rate_limited_max_attempts" }
      : { klass: "retry", reason: "rate_limited" };
  }
  if (s >= 500) {
    return input.attempt_count + 1 >= input.max_attempts
      ? { klass: "dead_letter", reason: "provider_error_max_attempts" }
      : { klass: "retry", reason: "provider_error" };
  }
  if (s === 401 || s === 403) return { klass: "dead_letter", reason: "provider_auth_or_permission" };
  if (s >= 400) return { klass: "dead_letter", reason: "provider_rejected" };
  return { klass: "dead_letter", reason: "unclassified" };
}

/** Only a real provider ID proves a send happened. */
export function providerSendConfirmed(resp: { provider_id?: string | null } | null | undefined): boolean {
  return typeof resp?.provider_id === "string" && resp.provider_id.trim().length > 0;
}

/* ------------------------------------------------------------ CRM dedupe */

export function crmDedupeKey(profile: {
  network?: string | null;
  provider_profile_id?: string | null;
  profile_url?: string | null;
  full_name?: string | null;
  company_name?: string | null;
}): string {
  const pid = String(profile.provider_profile_id ?? "").trim().toLowerCase();
  if (pid) return `${String(profile.network ?? "").toLowerCase()}:${pid}`;
  const url = String(profile.profile_url ?? "").trim().toLowerCase().replace(/\/+$/, "");
  if (url) return `url:${url}`;
  return `name:${String(profile.full_name ?? "").trim().toLowerCase()}|${String(profile.company_name ?? "")
    .trim()
    .toLowerCase()}`;
}

/* ------------------------------------------------------------- scoring */

export function scoreProfile(
  profile: { job_title?: string | null; company_name?: string | null; industry?: string | null; location?: string | null; relationship_status?: string | null },
  criteria: { job_titles?: string[]; industries?: string[]; locations?: string[]; companies?: string[] } = {},
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const hit = (list: string[] | undefined, value: string | null | undefined, points: number, label: string) => {
    if (!list?.length || !value) return;
    if (list.some((x) => String(value).toLowerCase().includes(String(x).toLowerCase()))) {
      score += points;
      reasons.push(label);
    }
  };
  hit(criteria.job_titles, profile.job_title, 35, "job_title_match");
  hit(criteria.industries, profile.industry, 20, "industry_match");
  hit(criteria.locations, profile.location, 15, "location_match");
  hit(criteria.companies, profile.company_name, 20, "company_match");
  if (profile.relationship_status === "connected") {
    score += 10;
    reasons.push("already_connected");
  }
  if (profile.relationship_status === "blocked") {
    score = 0;
    reasons.push("blocked_profile");
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
}

/* --------------------------------------------------------------- health */

export type RelationshipHealthState =
  | "NOT_CONFIGURED"
  | "CONNECTED"
  | "ACCOUNTS_SYNCED"
  | "ARMED"
  | "LIVE"
  | "DEGRADED"
  | "BLOCKED";

export function computeRelationshipHealth(input: {
  credentials_present: boolean;
  connection_ok: boolean;
  accounts_count: number;
  capable_accounts: number;
  mode: RelationshipMode | string;
  paused: boolean;
  webhook_registered: boolean;
  recent_failures: number;
  last_provider_success_at?: string | null;
  now?: Date;
}): { state: RelationshipHealthState; reason: string } {
  if (input.paused) return { state: "BLOCKED", reason: "emergency_pause_active" };
  if (!input.credentials_present) return { state: "NOT_CONFIGURED", reason: "provider_secrets_missing" };
  if (!input.connection_ok) return { state: "NOT_CONFIGURED", reason: "connection_test_not_passed" };
  if (input.accounts_count === 0) return { state: "CONNECTED", reason: "no_accounts_synced" };
  if (input.capable_accounts === 0) return { state: "ACCOUNTS_SYNCED", reason: "no_capabilities_confirmed" };
  if (input.recent_failures >= 5) return { state: "DEGRADED", reason: "repeated_provider_failures" };
  const mode = normaliseMode(input.mode);
  if (mode !== "approved_batch_autopilot") return { state: "ARMED", reason: `mode_${mode}` };
  if (!input.webhook_registered) return { state: "ARMED", reason: "webhook_not_registered" };
  return { state: "LIVE", reason: "autopilot_active" };
}

/* =================================================================
 * PRODUCTION QA REPAIR — canonical status vocabulary + safety gates
 * The vocabulary below is the SINGLE source of truth and matches the
 * database CHECK constraints exactly. Nothing may write a status that
 * is not listed here.
 * ================================================================= */

export const ACTION_STATUSES = [
  "draft",
  "blocked",
  "pending_approval",
  "ready",
  "submitting",
  "sent",
  "accepted",
  "replied",
  "failed",
  "retrying",
  "submission_unknown",
  "dead_letter",
  "cancelled",
] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];

/** Statuses the runner may pick up. */
export const RUNNABLE_ACTION_STATUSES: ActionStatus[] = ["ready", "retrying"];
/** Statuses that prove a submission already left Liftor. */
export const TERMINAL_SUBMITTED_STATUSES: ActionStatus[] = [
  "submitting",
  "sent",
  "accepted",
  "replied",
  "submission_unknown",
];
/** Statuses that may still be cancelled by the founder. */
export const CANCELLABLE_ACTION_STATUSES: ActionStatus[] = [
  "draft",
  "blocked",
  "pending_approval",
  "ready",
  "retrying",
];

export function isActionStatus(value: unknown): value is ActionStatus {
  return (ACTION_STATUSES as readonly string[]).includes(String(value));
}

/** Map a gate decision to the queue status. Never invents a status. */
export function decisionToStatus(decision: ActionDecision): ActionStatus {
  switch (decision) {
    case "blocked":
      return "blocked";
    case "draft":
      return "draft";
    case "pending_approval":
      return "pending_approval";
    case "ready":
      return "ready";
    default:
      return "draft";
  }
}

/** Status for a provider-confirmed success, by action type. */
export function successStatusFor(action_type: string): ActionStatus {
  if (action_type === "accept_or_decline_received_invitation") return "accepted";
  if (action_type === "reply_message") return "replied";
  return "sent";
}

export const TARGET_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "suppressed",
  "invited",
  "connected",
  "in_conversation",
  "qualified",
  "closed",
] as const;
export type TargetStatus = (typeof TARGET_STATUSES)[number];

/** Post-action target status — 'actioned' is NOT a valid value. */
export function targetStatusAfterAction(action_type: string): TargetStatus {
  if (action_type === "send_invitation") return "invited";
  if (action_type === "start_chat" || action_type === "send_message" || action_type === "reply_message") {
    return "in_conversation";
  }
  return "approved";
}

export const ACCOUNT_STATUSES = [
  "unknown",
  "ok",
  "credentials",
  "disconnected",
  "challenge",
  "rate_limited",
  "cooldown",
  "disabled",
] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/** 'restricted' is NOT a valid account status — map provider failures safely. */
export function accountStatusForHttp(http_status: number | null | undefined): AccountStatus | null {
  if (http_status === 429) return "rate_limited";
  if (http_status === 401) return "credentials";
  if (http_status === 403) return "challenge";
  return null;
}

export const SUPPRESSION_REASONS = [
  "opt_out",
  "negative_reply",
  "complaint",
  "do_not_contact",
  "client",
  "supplier",
  "duplicate_person",
  "high_risk",
  "manual",
] as const;

export function normaliseSuppressionReason(value: unknown): string {
  const v = String(value ?? "").trim().toLowerCase();
  return (SUPPRESSION_REASONS as readonly string[]).includes(v) ? v : "manual";
}

/* ------------------------------------------------- founder confirmation */

/** Exact phrase the founder must type before anything leaves Liftor. */
export const SEND_CONFIRMATION_PHRASE = "SEND FOR REAL";

/** Manual runs always require the phrase — regardless of mode. */
export function confirmationAccepted(phrase: unknown): boolean {
  return String(phrase ?? "").trim().toUpperCase() === SEND_CONFIRMATION_PHRASE;
}

/** Only approved-batch autopilot may dispatch unattended. */
export function unattendedDispatchAllowed(mode: RelationshipMode | string): boolean {
  return normaliseMode(mode) === "approved_batch_autopilot";
}

/** No live provider search or send in the safe-off modes. */
export function externalCallsAllowed(mode: RelationshipMode | string): boolean {
  const m = normaliseMode(mode);
  return m === "approval_required" || m === "approved_batch_autopilot";
}

/* ------------------------------------------------- timezone-aware windows */

/** Local (policy timezone) calendar day + ISO week-start, for usage windows. */
export function localWindowStarts(now: Date, timezone?: string | null): { day: string; week: string } {
  const tz = timezone || "Europe/London";
  let y: number, m: number, d: number, weekday: number;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    y = Number(get("year"));
    m = Number(get("month"));
    d = Number(get("day"));
    weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    if (!y || !m || !d) throw new Error("bad_parts");
    if (weekday < 0) weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  } catch {
    y = now.getUTCFullYear();
    m = now.getUTCMonth() + 1;
    d = now.getUTCDate();
    weekday = now.getUTCDay();
  }
  const day = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const mondayOffset = (weekday + 6) % 7;
  const wk = new Date(Date.UTC(y, m - 1, d));
  wk.setUTCDate(wk.getUTCDate() - mondayOffset);
  return { day, week: wk.toISOString().slice(0, 10) };
}

/* ------------------------------------------------ webhook HMAC verification */

export interface SignatureParts {
  timestamp: number | null;
  v0: string | null;
}

/** Parse `t=1699999999,v0=abc...` (Unipile-Signature). */
export function parseUnipileSignatureHeader(header: string | null | undefined): SignatureParts {
  const out: SignatureParts = { timestamp: null, v0: null };
  for (const chunk of String(header ?? "").split(",")) {
    const [k, v] = chunk.split("=");
    const key = String(k ?? "").trim();
    const val = String(v ?? "").trim();
    if (key === "t" && /^\d+$/.test(val)) out.timestamp = Number(val);
    if (key === "v0" && val) out.v0 = val.toLowerCase();
  }
  return out;
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const x = String(a ?? "");
  const y = String(b ?? "");
  if (x.length !== y.length || !x.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
  ]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export const WEBHOOK_MAX_SKEW_SECONDS = 300;

/**
 * Verify a Unipile webhook: HMAC-SHA256 over `${t}.${rawBody}`, rejecting
 * signatures older (or further in the future) than 5 minutes.
 */
export async function verifyUnipileWebhookSignature(input: {
  header: string | null | undefined;
  rawBody: string;
  secret: string;
  now?: Date;
}): Promise<{ valid: boolean; reason: string }> {
  if (!input.secret) return { valid: false, reason: "hmac_secret_not_configured" };
  const parts = parseUnipileSignatureHeader(input.header);
  if (parts.timestamp === null || !parts.v0) return { valid: false, reason: "signature_header_malformed" };
  const nowSec = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (Math.abs(nowSec - parts.timestamp) > WEBHOOK_MAX_SKEW_SECONDS) {
    return { valid: false, reason: "signature_expired" };
  }
  const expected = await hmacSha256Hex(input.secret, `${parts.timestamp}.${input.rawBody}`);
  return timingSafeEqualHex(expected, parts.v0)
    ? { valid: true, reason: "ok" }
    : { valid: false, reason: "signature_mismatch" };
}

/** Stable dedupe key when the provider gives us no event id. */
export async function stablePayloadHash(rawBody: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(rawBody ?? "")));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 48);
}

/** Never persist tokens, keys or signatures from an inbound payload. */
const SENSITIVE_PAYLOAD_KEYS = /(secret|token|api[_-]?key|authorization|password|signature|cookie|access[_-]?key)/i;

export function sanitiseWebhookPayload(payload: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (Array.isArray(payload)) return payload.slice(0, 25).map((v) => sanitiseWebhookPayload(v, depth + 1));
  if (payload && typeof payload === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(payload as Record<string, unknown>)) {
      if (SENSITIVE_PAYLOAD_KEYS.test(k)) {
        out[k] = "[redacted]";
        continue;
      }
      out[k] = sanitiseWebhookPayload(v, depth + 1);
    }
    return out;
  }
  if (typeof payload === "string") return payload.slice(0, 2000);
  return payload;
}

/* ------------------------------------------------------- callback URL */

/**
 * Webhook callback URLs are derived from our own functions host, never from
 * arbitrary user input.
 */
export function validateCallbackUrl(
  raw: string | null | undefined,
  allowedHostSuffixes: string[] = [".supabase.co", ".functions.supabase.co", ".lovable.app"],
): { ok: boolean; url?: string; reason?: string } {
  const value = String(raw ?? "").trim();
  if (!value) return { ok: false, reason: "callback_url_missing" };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "callback_url_unparseable" };
  }
  if (u.protocol !== "https:") return { ok: false, reason: "callback_url_not_https" };
  if (u.username || u.password || u.search) return { ok: false, reason: "callback_url_unsafe" };
  const host = u.hostname.toLowerCase();
  if (!allowedHostSuffixes.some((s) => host === s.replace(/^\./, "") || host.endsWith(s))) {
    return { ok: false, reason: "callback_url_host_not_allowlisted" };
  }
  return { ok: true, url: `https://${u.host}${u.pathname.replace(/\/+$/, "")}` };
}

/** Retry-After may be seconds or an HTTP date. */
export function parseRetryAfterSeconds(header: string | null | undefined, now = new Date()): number | null {
  const v = String(header ?? "").trim();
  if (!v) return null;
  if (/^\d+$/.test(v)) return Math.max(0, Math.min(86400, Number(v)));
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.min(86400, Math.round((t - now.getTime()) / 1000)));
}
