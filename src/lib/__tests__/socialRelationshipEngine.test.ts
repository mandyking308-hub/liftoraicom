import { describe, it, expect } from "vitest";
import {
  normaliseMode,
  validateProviderBaseUrl,
  buildIdempotencyKey,
  resolvePause,
  withinWorkingHours,
  jitterDelaySeconds,
  limitExceeded,
  evaluateAction,
  actionSupported,
  capabilityMap,
  classifyIntent,
  detectEscalation,
  isOptOut,
  decideReplyDisposition,
  classifyProviderFailure,
  providerSendConfirmed,
  crmDedupeKey,
  scoreProfile,
  computeRelationshipHealth,
  DEFAULT_POLICY,
} from "../../../supabase/functions/_shared/socialRelationshipLogic";

const FULL_CAPS = {
  profile_search: true,
  invite_connect: true,
  follow: true,
  start_chat: true,
  send_message: true,
  read_chats: true,
  read_messages: true,
  webhook_support: true,
};

const basePolicy = {
  ...DEFAULT_POLICY,
  timezone: "UTC",
  working_days: [1, 2, 3, 4, 5],
  allow_connect_then_dm: false,
  allow_ai_autosend: false,
  require_real_account_declaration: true,
};

// Wednesday 2026-06-17 10:00 UTC — inside working hours.
const WORK_NOW = new Date("2026-06-17T10:00:00Z");

function ctx(overrides: Partial<Parameters<typeof evaluateAction>[0]> = {}) {
  return evaluateAction({
    now: WORK_NOW,
    mode: "approved_batch_autopilot",
    action_type: "send_invitation",
    capabilities: FULL_CAPS,
    pause: { paused: false },
    policy: basePolicy,
    usage: { day: 0, week: 0 },
    account: { account_status: "ok", real_account_declared: true, cooldown_until: null },
    connection_ok: true,
    target_approved: true,
    batch_approved: true,
    suppressed: false,
    ...overrides,
  });
}

describe("mode + safe defaults", () => {
  it("defaults unknown modes to test_only", () => {
    expect(normaliseMode(undefined)).toBe("test_only");
    expect(normaliseMode("go_wild")).toBe("test_only");
    expect(normaliseMode("approved_batch_autopilot")).toBe("approved_batch_autopilot");
  });

  it("never sends in test_only or draft mode", () => {
    expect(ctx({ mode: "test_only" }).decision).toBe("draft");
    expect(ctx({ mode: "draft_actions" }).decision).toBe("draft");
    expect(ctx({ mode: "paused" }).decision).toBe("blocked");
  });
});

describe("provider base url validation", () => {
  it("accepts an https unipile dsn", () => {
    expect(validateProviderBaseUrl("api8.unipile.com:13845").ok).toBe(true);
  });
  it("rejects http, ip literals, localhost and non-allowlisted hosts", () => {
    expect(validateProviderBaseUrl("http://api.unipile.com").ok).toBe(false);
    expect(validateProviderBaseUrl("https://127.0.0.1").ok).toBe(false);
    expect(validateProviderBaseUrl("https://localhost").ok).toBe(false);
    expect(validateProviderBaseUrl("https://evil.example.com").ok).toBe(false);
    expect(validateProviderBaseUrl("").ok).toBe(false);
  });
});

describe("capabilities", () => {
  it("blocks unsupported actions rather than downgrading them", () => {
    const caps = capabilityMap([{ capability: "send_message", supported: true }, { capability: "invite_connect", supported: false }]);
    expect(actionSupported(caps, "send_message").supported).toBe(true);
    expect(actionSupported(caps, "send_invitation").supported).toBe(false);
    const r = ctx({ capabilities: { send_message: true } });
    expect(r.decision).toBe("blocked");
    expect(r.blockers).toContain("capability_unsupported:invite_connect");
  });
});

describe("pause hierarchy", () => {
  it("global pause beats everything", () => {
    const r = resolvePause([{ scope: "account", account_id: "a", is_paused: true }, { scope: "global", is_paused: true }], { account_id: "a" });
    expect(r).toMatchObject({ paused: true, scope: "global" });
  });
  it("account pause only matches its own account", () => {
    expect(resolvePause([{ scope: "account", account_id: "a", is_paused: true }], { account_id: "b" }).paused).toBe(false);
  });
  it("blocks the action when paused", () => {
    expect(ctx({ pause: { paused: true, scope: "business" } }).blockers).toContain("paused_business");
  });
});

describe("working hours, jitter and limits", () => {
  it("honours working days and hours", () => {
    expect(withinWorkingHours(WORK_NOW, basePolicy)).toBe(true);
    expect(withinWorkingHours(new Date("2026-06-17T03:00:00Z"), basePolicy)).toBe(false);
    expect(withinWorkingHours(new Date("2026-06-21T10:00:00Z"), basePolicy)).toBe(false); // Sunday
  });
  it("produces bounded deterministic jitter", () => {
    expect(jitterDelaySeconds(basePolicy, () => 0)).toBe(basePolicy.min_delay_seconds);
    expect(jitterDelaySeconds(basePolicy, () => 0.5)).toBeGreaterThan(basePolicy.min_delay_seconds);
    expect(jitterDelaySeconds(basePolicy, () => 1)).toBeLessThanOrEqual(basePolicy.max_delay_seconds);
  });
  it("enforces daily and weekly caps", () => {
    expect(limitExceeded(basePolicy, "send_invitation", { day: 10, week: 10 }).reason).toBe("daily_limit_reached");
    expect(limitExceeded(basePolicy, "send_invitation", { day: 1, week: 40 }).reason).toBe("weekly_limit_reached");
    expect(ctx({ usage: { day: 99, week: 99 } }).decision).toBe("blocked");
  });
  it("blocks outside working hours", () => {
    expect(ctx({ now: new Date("2026-06-17T23:00:00Z") }).blockers).toContain("outside_working_hours");
  });
});

describe("approval + account safety", () => {
  it("requires target and batch approval before ready", () => {
    expect(ctx({ target_approved: false }).decision).toBe("pending_approval");
    expect(ctx({ batch_approved: false }).decision).toBe("pending_approval");
    expect(ctx().decision).toBe("ready");
  });
  it("requires a real-account declaration", () => {
    expect(ctx({ account: { account_status: "ok", real_account_declared: false } }).blockers).toContain("real_account_not_declared");
  });
  it("blocks restricted accounts and active cooldowns", () => {
    expect(ctx({ account: { account_status: "restricted", real_account_declared: true } }).blockers).toContain("account_status_restricted");
    expect(
      ctx({ account: { account_status: "ok", real_account_declared: true, cooldown_until: "2026-06-18T00:00:00Z" } }).blockers,
    ).toContain("account_cooldown");
  });
  it("blocks suppressed profiles and unpermitted connect-then-dm", () => {
    expect(ctx({ suppressed: true, suppression_reason: "opt_out" }).blockers).toContain("suppressed:opt_out");
    expect(ctx({ connect_then_dm: true }).blockers).toContain("connect_then_dm_not_permitted");
  });
  it("blocks when the provider connection is not verified", () => {
    expect(ctx({ connection_ok: false }).blockers).toContain("provider_not_connected");
  });
});

describe("intent, opt-out and escalation", () => {
  it("detects opt-out language", () => {
    expect(isOptOut("Please remove me from your list")).toBe(true);
    expect(isOptOut("Sounds interesting")).toBe(false);
    expect(classifyIntent("unsubscribe please")).toBe("unsubscribe");
  });
  it("classifies core intents", () => {
    expect(classifyIntent("Tell me more about pricing")).toBe("interested");
    expect(classifyIntent("What does it cost")).toBe("question");
    expect(classifyIntent("not interested, thanks")).toBe("not_interested");
    expect(classifyIntent("ok")).toBe("neutral");
  });
  it("escalates legal, complaint, regulated and investor threads", () => {
    expect(detectEscalation("I'll speak to my lawyer").category).toBe("legal");
    expect(detectEscalation("This is a scam, I want a refund").category).toBe("complaint");
    expect(detectEscalation("We are an NHS trust").category).toBe("regulated");
    expect(detectEscalation("I'm a VC, interested in acquisition").category).toBe("investor");
    expect(detectEscalation("sure, sounds good").escalate).toBe(false);
  });
});

describe("AI reply guardrails", () => {
  const base = {
    mode: "approved_batch_autopilot",
    intent: "question" as const,
    allow_ai_autosend: true,
    ai_replies_today: 0,
    max_ai_replies_per_day: 3,
    last_outbound_ai_generated: false,
    inbound_text: "How does it work?",
    escalation_pending: false,
  };
  it("suppresses on escalation, opt-out and high-value threads", () => {
    expect(decideReplyDisposition({ ...base, escalation_pending: true }).disposition).toBe("suppress");
    expect(decideReplyDisposition({ ...base, intent: "unsubscribe" }).disposition).toBe("suppress");
    expect(decideReplyDisposition({ ...base, intent: "high_value" }).disposition).toBe("suppress");
    expect(decideReplyDisposition({ ...base, intent: "legal" }).disposition).toBe("suppress");
  });
  it("stops ai-to-ai chatter loops", () => {
    expect(
      decideReplyDisposition({ ...base, intent: "neutral", inbound_text: "thanks", last_outbound_ai_generated: true }).reason,
    ).toBe("ai_loop_guard");
  });
  it("respects the per-thread daily cap", () => {
    expect(decideReplyDisposition({ ...base, ai_replies_today: 3 }).disposition).toBe("suppress");
  });
  it("drafts unless autopilot + autosend are both on", () => {
    expect(decideReplyDisposition({ ...base, allow_ai_autosend: false }).disposition).toBe("draft");
    expect(decideReplyDisposition({ ...base, mode: "approval_required" }).disposition).toBe("draft");
    expect(decideReplyDisposition(base).disposition).toBe("send");
  });
});

describe("failure classification", () => {
  it("never auto-retries ambiguous transport failures", () => {
    expect(classifyProviderFailure({ transport_error: true, attempt_count: 0, max_attempts: 3 }).klass).toBe("submission_unknown");
    expect(classifyProviderFailure({ http_status: 504, attempt_count: 0, max_attempts: 3 }).klass).toBe("submission_unknown");
  });
  it("retries rate limits and server errors until max attempts", () => {
    expect(classifyProviderFailure({ http_status: 429, attempt_count: 0, max_attempts: 3 }).klass).toBe("retry");
    expect(classifyProviderFailure({ http_status: 429, attempt_count: 2, max_attempts: 3 }).klass).toBe("dead_letter");
    expect(classifyProviderFailure({ http_status: 500, attempt_count: 0, max_attempts: 3 }).klass).toBe("retry");
  });
  it("dead-letters auth and rejection errors", () => {
    expect(classifyProviderFailure({ http_status: 403, attempt_count: 0, max_attempts: 3 }).klass).toBe("dead_letter");
    expect(classifyProviderFailure({ http_status: 422, attempt_count: 0, max_attempts: 3 }).klass).toBe("dead_letter");
  });
  it("only treats a real provider id as a confirmed send", () => {
    expect(providerSendConfirmed({ provider_id: "abc" })).toBe(true);
    expect(providerSendConfirmed({ provider_id: null })).toBe(false);
    expect(providerSendConfirmed(null)).toBe(false);
  });
});

describe("idempotency, dedupe and scoring", () => {
  it("builds a stable idempotency key", () => {
    const k1 = buildIdempotencyKey({ business_id: "B", account_id: "A", action_type: "send_invitation", target_ref: "P" });
    const k2 = buildIdempotencyKey({ business_id: "b", account_id: "a", action_type: "send_invitation", target_ref: "p" });
    expect(k1).toBe(k2);
    expect(k1).not.toBe(buildIdempotencyKey({ business_id: "B", account_id: "A", action_type: "start_chat", target_ref: "P" }));
  });
  it("dedupes CRM identity by provider id then url then name", () => {
    expect(crmDedupeKey({ network: "LinkedIn", provider_profile_id: "X1" })).toBe("linkedin:x1");
    expect(crmDedupeKey({ profile_url: "https://x.com/a/" })).toBe("url:https://x.com/a");
    expect(crmDedupeKey({ full_name: "Jo Bloggs", company_name: "Acme" })).toBe("name:jo bloggs|acme");
  });
  it("scores profiles against criteria and zeroes blocked profiles", () => {
    const s = scoreProfile({ job_title: "Head of Ops", industry: "Logistics", location: "London" }, { job_titles: ["head of ops"], industries: ["logistics"], locations: ["london"] });
    expect(s.score).toBe(70);
    expect(scoreProfile({ relationship_status: "blocked" }, {}).score).toBe(0);
  });
});

describe("health rollup", () => {
  const base = {
    credentials_present: true, connection_ok: true, accounts_count: 1, capable_accounts: 1,
    mode: "approved_batch_autopilot", paused: false, webhook_registered: true, recent_failures: 0,
  };
  it("reports LIVE only when everything is in place", () => {
    expect(computeRelationshipHealth(base).state).toBe("LIVE");
    expect(computeRelationshipHealth({ ...base, webhook_registered: false }).state).toBe("ARMED");
    expect(computeRelationshipHealth({ ...base, mode: "test_only" }).state).toBe("ARMED");
    expect(computeRelationshipHealth({ ...base, recent_failures: 9 }).state).toBe("DEGRADED");
    expect(computeRelationshipHealth({ ...base, paused: true }).state).toBe("BLOCKED");
    expect(computeRelationshipHealth({ ...base, credentials_present: false }).state).toBe("NOT_CONFIGURED");
    expect(computeRelationshipHealth({ ...base, accounts_count: 0 }).state).toBe("CONNECTED");
  });
});
