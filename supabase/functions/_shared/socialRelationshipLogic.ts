export type RelationshipMode =
  | "test_only"
  | "draft_actions"
  | "approval_required"
  | "approved_batch_autopilot"
  | "paused";

export type RelationshipActionType =
  | "send_invitation"
  | "connect"
  | "follow"
  | "start_chat"
  | "send_message"
  | "reply_message"
  | "accept_invitation"
  | "decline_invitation"
  | "sync_profile"
  | "sync_conversation";

export type RelationshipCapability =
  | "profile_search"
  | "company_search"
  | "send_invitation"
  | "follow"
  | "start_chat"
  | "send_message"
  | "read_chats"
  | "read_messages"
  | "webhooks"
  | "relation_events"
  | "comments_mentions"
  | "manage_invitations";

export type RelationshipIntent =
  | "interested"
  | "question"
  | "neutral"
  | "not_interested"
  | "unsubscribe"
  | "complaint"
  | "legal"
  | "high_value"
  | "press"
  | "investor"
  | "safeguarding"
  | "unknown";

export interface RelationshipPolicy {
  mode: RelationshipMode;
  timezone: string;
  workingDays: number[];
  workingHourStart: number;
  workingHourEnd: number;
  minDelaySeconds: number;
  maxJitterSeconds: number;
  allowConnectionThenMessage: boolean;
  lowRiskAiReplyEnabled: boolean;
  maxAiRepliesPerConversationDay: number;
}

export interface RelationshipActionContext {
  actionType: RelationshipActionType;
  requiredCapability: RelationshipCapability;
  policy: RelationshipPolicy;
  capabilitySupported: boolean;
  accountConnected: boolean;
  accountExecutionEnabled: boolean;
  realAccountConfirmed: boolean;
  accountCooldownUntil?: string | null;
  pausedScopes?: string[];
  approvalStatus: "pending" | "approved" | "rejected" | "not_required";
  suppressionActive?: boolean;
  profileRiskStatus?: string | null;
  doNotContact?: boolean;
  dailyCount?: number;
  dailyLimit?: number;
  weeklyCount?: number;
  weeklyLimit?: number;
  aiRepliesToday?: number;
  now?: Date;
}

export interface RelationshipActionDecision {
  allowed: boolean;
  draftOnly: boolean;
  blockerCodes: string[];
  nextEligibleAt?: string;
}

export const DEFAULT_RELATIONSHIP_POLICY: RelationshipPolicy = {
  mode: "test_only",
  timezone: "Europe/London",
  workingDays: [1, 2, 3, 4, 5],
  workingHourStart: 9,
  workingHourEnd: 17,
  minDelaySeconds: 180,
  maxJitterSeconds: 240,
  allowConnectionThenMessage: false,
  lowRiskAiReplyEnabled: false,
  maxAiRepliesPerConversationDay: 3,
};

export const ACTION_CAPABILITY: Record<RelationshipActionType, RelationshipCapability> = {
  send_invitation: "send_invitation",
  connect: "send_invitation",
  follow: "follow",
  start_chat: "start_chat",
  send_message: "send_message",
  reply_message: "send_message",
  accept_invitation: "manage_invitations",
  decline_invitation: "manage_invitations",
  sync_profile: "profile_search",
  sync_conversation: "read_messages",
};

export const LOW_RISK_AUTOPILOT_ACTIONS = new Set<RelationshipActionType>([
  "sync_profile",
  "sync_conversation",
  "reply_message",
]);

export function isValidUnipileDsn(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password || url.port) return false;
    if (url.pathname !== "/" && url.pathname !== "") return false;
    if (url.search || url.hash) return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local")) return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return host === "api.unipile.com" || host.endsWith(".unipile.com");
  } catch {
    return false;
  }
}

export function normaliseDsn(value: string): string {
  if (!isValidUnipileDsn(value)) throw new Error("invalid_unipile_dsn");
  return value.replace(/\/+$/, "");
}

export function idempotencyKey(parts: Array<string | null | undefined>): string {
  const raw = parts.map((p) => String(p ?? "").trim().toLowerCase()).join("|");
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `sr:${(hash >>> 0).toString(16).padStart(8, "0")}:${raw.length}`;
}

export function deterministicJitterSeconds(key: string, maxJitterSeconds: number): number {
  if (maxJitterSeconds <= 0) return 0;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = Math.imul(31, hash) + key.charCodeAt(i) | 0;
  return Math.abs(hash) % (maxJitterSeconds + 1);
}

export function localClockParts(now: Date, timezone: string): { weekday: number; hour: number } {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
    hour: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const weekdayText = parts.find((p) => p.type === "weekday")?.value ?? "Mon";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { weekday: weekdayMap[weekdayText] ?? 1, hour };
}

export function insideWorkingWindow(now: Date, policy: RelationshipPolicy): boolean {
  const { weekday, hour } = localClockParts(now, policy.timezone);
  return policy.workingDays.includes(weekday) && hour >= policy.workingHourStart && hour < policy.workingHourEnd;
}

export function evaluateRelationshipAction(ctx: RelationshipActionContext): RelationshipActionDecision {
  const blockers: string[] = [];
  const now = ctx.now ?? new Date();
  const mode = ctx.policy.mode;

  if (mode === "paused") blockers.push("policy_paused");
  if (ctx.pausedScopes?.length) blockers.push(...ctx.pausedScopes.map((s) => `pause:${s}`));
  if (!ctx.accountConnected) blockers.push("account_not_connected");
  if (!ctx.accountExecutionEnabled) blockers.push("account_execution_disabled");
  if (!ctx.realAccountConfirmed) blockers.push("real_account_not_confirmed");
  if (!ctx.capabilitySupported) blockers.push(`capability_unsupported:${ctx.requiredCapability}`);
  if (ctx.suppressionActive) blockers.push("profile_suppressed");
  if (ctx.doNotContact) blockers.push("do_not_contact");
  if (["high", "blocked"].includes(String(ctx.profileRiskStatus ?? ""))) blockers.push("profile_risk_blocked");

  if (ctx.accountCooldownUntil) {
    const cooldown = new Date(ctx.accountCooldownUntil);
    if (Number.isFinite(cooldown.getTime()) && cooldown > now) blockers.push("account_cooldown_active");
  }

  if ((ctx.dailyLimit ?? Infinity) <= (ctx.dailyCount ?? 0)) blockers.push("daily_limit_reached");
  if ((ctx.weeklyLimit ?? Infinity) <= (ctx.weeklyCount ?? 0)) blockers.push("weekly_limit_reached");
  if (!insideWorkingWindow(now, ctx.policy)) blockers.push("outside_working_hours");

  const outbound = !["sync_profile", "sync_conversation"].includes(ctx.actionType);
  if (outbound && mode === "test_only") blockers.push("test_only_no_external_action");
  if (outbound && mode === "draft_actions") blockers.push("draft_mode_no_external_action");
  if (outbound && mode === "approval_required" && ctx.approvalStatus !== "approved") blockers.push("approval_required");
  if (outbound && mode === "approved_batch_autopilot" && ctx.approvalStatus !== "approved") blockers.push("approved_batch_required");

  if (ctx.actionType === "reply_message") {
    if ((ctx.aiRepliesToday ?? 0) >= ctx.policy.maxAiRepliesPerConversationDay) blockers.push("ai_daily_cap_reached");
    if (mode === "approved_batch_autopilot" && !ctx.policy.lowRiskAiReplyEnabled) blockers.push("ai_reply_autopilot_disabled");
  }

  const draftOnly = mode === "test_only" || mode === "draft_actions";
  return { allowed: blockers.length === 0, draftOnly, blockerCodes: [...new Set(blockers)] };
}

const OPT_OUT = /\b(stop|unsubscribe|opt[ -]?out|remove me|do not contact|don'?t contact)\b/i;
const NOT_INTERESTED = /\b(not interested|no thanks|no thank you|please don'?t|not for me)\b/i;
const COMPLAINT = /\b(complaint|scam|fraud|harassment|spam|report you|angry|unacceptable|refund)\b/i;
const LEGAL = /\b(lawyer|solicitor|lawsuit|legal action|gdpr|subpoena|court|regulator)\b/i;
const HIGH_VALUE = /\b(enterprise|rfp|tender|procurement|million|strategic partnership|acquisition)\b/i;
const PRESS = /\b(press|journalist|media|interview|publication|editor)\b/i;
const INVESTOR = /\b(investor|investment|funding|term sheet|venture capital|private equity)\b/i;
const SAFEGUARDING = /\b(safeguarding|child|minor|abuse|self harm|suicide|immediate danger)\b/i;
const QUESTION = /\?|\b(how|what|when|where|why|who|can you|could you|would you)\b/i;
const INTERESTED = /\b(interested|tell me more|book|schedule|demo|quote|sounds good|yes please|let'?s talk)\b/i;

export function classifyRelationshipIntent(content: string): RelationshipIntent {
  const text = String(content ?? "").trim();
  if (!text) return "unknown";
  if (SAFEGUARDING.test(text)) return "safeguarding";
  if (OPT_OUT.test(text)) return "unsubscribe";
  if (LEGAL.test(text)) return "legal";
  if (COMPLAINT.test(text)) return "complaint";
  if (PRESS.test(text)) return "press";
  if (INVESTOR.test(text)) return "investor";
  if (HIGH_VALUE.test(text)) return "high_value";
  if (NOT_INTERESTED.test(text)) return "not_interested";
  if (INTERESTED.test(text)) return "interested";
  if (QUESTION.test(text)) return "question";
  if (/^(ok|okay|thanks|thank you|great|perfect|👍|🙏)[.! ]*$/i.test(text)) return "neutral";
  return "neutral";
}

export function requiresFounderEscalation(intent: RelationshipIntent): boolean {
  return ["complaint", "legal", "high_value", "press", "investor", "safeguarding", "unknown"].includes(intent);
}

export function shouldSuppressImmediately(intent: RelationshipIntent): boolean {
  return ["unsubscribe", "not_interested", "complaint"].includes(intent);
}

export function classifyProviderFailure(status: number, phase: "preflight" | "transport" | "provider_response"):
  "retryable" | "hard_failure" | "ambiguous" {
  if (phase === "transport" || status >= 500) return "ambiguous";
  if (status === 408 || status === 429) return "retryable";
  if (status >= 400) return "hard_failure";
  return "hard_failure";
}
