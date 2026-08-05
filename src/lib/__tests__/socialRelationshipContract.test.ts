/**
 * Production QA repair regression suite for the Social Relationship Engine.
 * These tests exist because each defect below shipped once already.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  ACTION_STATUSES,
  RUNNABLE_ACTION_STATUSES,
  CANCELLABLE_ACTION_STATUSES,
  TERMINAL_SUBMITTED_STATUSES,
  TARGET_STATUSES,
  ACCOUNT_STATUSES,
  accountStatusForHttp,
  confirmationAccepted,
  decisionToStatus,
  externalCallsAllowed,
  hmacSha256Hex,
  isActionStatus,
  localWindowStarts,
  normaliseSuppressionReason,
  parseRetryAfterSeconds,
  parseUnipileSignatureHeader,
  sanitiseWebhookPayload,
  stablePayloadHash,
  successStatusFor,
  targetStatusAfterAction,
  unattendedDispatchAllowed,
  validateCallbackUrl,
  verifyUnipileWebhookSignature,
  SEND_CONFIRMATION_PHRASE,
} from "../../../supabase/functions/_shared/socialRelationshipLogic";
import {
  buildUnipileForm,
  sanitiseProviderError,
  UnipileAdapter,
} from "../../../supabase/functions/_shared/socialRelationshipProvider";

const FN_DIR = join(process.cwd(), "supabase/functions");
const MIGRATION_DIR = join(process.cwd(), "supabase/migrations");

function readAllEngineSources(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.startsWith("social-relationship") || entry.name === "_shared") walk(full);
        continue;
      }
      if (!entry.name.endsWith(".ts")) continue;
      if (!full.includes("socialRelationship") && !full.includes("social-relationship")) continue;
      out.push({ file: full, text: readFileSync(full, "utf8") });
    }
  };
  walk(FN_DIR);
  return out;
}

/* ------------------------------------------------- 1. status contract */

describe("status contract", () => {
  const schemaStatuses = (() => {
    const sql = readFileSync(
      join(MIGRATION_DIR, "20260805055211_b7395c17-2cd0-4ea3-b731-da61458b6791.sql"),
      "utf8",
    );
    const m = sql.match(/action_status TEXT NOT NULL DEFAULT 'draft' CHECK \(action_status IN \(([^)]+)\)\)/s);
    return (m?.[1] ?? "").split(",").map((v) => v.trim().replace(/'/g, "")).filter(Boolean);
  })();

  it("TypeScript vocabulary matches the database CHECK exactly", () => {
    expect([...ACTION_STATUSES].sort()).toEqual([...schemaStatuses].sort());
  });

  it("runnable / cancellable / submitted sets are all valid statuses", () => {
    for (const s of [...RUNNABLE_ACTION_STATUSES, ...CANCELLABLE_ACTION_STATUSES, ...TERMINAL_SUBMITTED_STATUSES]) {
      expect(isActionStatus(s)).toBe(true);
    }
  });

  it("maps gate decisions and provider success onto valid statuses only", () => {
    expect(decisionToStatus("ready")).toBe("ready");
    expect(decisionToStatus("blocked")).toBe("blocked");
    expect(successStatusFor("send_invitation")).toBe("sent");
    expect(successStatusFor("reply_message")).toBe("replied");
    expect(successStatusFor("accept_or_decline_received_invitation")).toBe("accepted");
    expect(ACTION_STATUSES).not.toContain("approved");
    expect(ACTION_STATUSES).not.toContain("completed");
  });

  it("target and account statuses never use the invalid legacy values", () => {
    expect(targetStatusAfterAction("send_invitation")).toBe("invited");
    expect(TARGET_STATUSES).toContain(targetStatusAfterAction("start_chat"));
    expect(TARGET_STATUSES).not.toContain("actioned");
    expect(ACCOUNT_STATUSES).not.toContain("restricted");
    expect(accountStatusForHttp(429)).toBe("rate_limited");
    expect(accountStatusForHttp(403)).toBe("challenge");
    expect(accountStatusForHttp(401)).toBe("credentials");
    expect(accountStatusForHttp(500)).toBeNull();
  });

  it("no engine source writes a status outside the schema vocabulary", () => {
    const offenders: string[] = [];
    const banned = ["approved", "scheduled", "retry", "submitted", "completed"];
    for (const { file, text } of readAllEngineSources()) {
      for (const m of text.matchAll(/action_status:\s*"([a-z_]+)"/g)) {
        if (!isActionStatus(m[1])) offenders.push(`${file}: action_status "${m[1]}"`);
      }
      for (const m of text.matchAll(/action_status",\s*"([a-z_]+)"/g)) {
        if (!isActionStatus(m[1])) offenders.push(`${file}: eq action_status "${m[1]}"`);
      }
      for (const b of banned) {
        if (text.includes(`action_status: "${b}"`)) offenders.push(`${file}: banned ${b}`);
      }
      for (const m of text.matchAll(/target_status:\s*"([a-z_]+)"/g)) {
        if (!(TARGET_STATUSES as readonly string[]).includes(m[1])) offenders.push(`${file}: target_status "${m[1]}"`);
      }
      for (const m of text.matchAll(/account_status:\s*"([a-z_]+)"/g)) {
        if (!(ACCOUNT_STATUSES as readonly string[]).includes(m[1])) {
          offenders.push(`${file}: account_status "${m[1]}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the claim RPC only transitions ready/retrying → submitting", () => {
    const sql = readdirSync(MIGRATION_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(MIGRATION_DIR, f), "utf8"))
      .filter((t) => t.includes("social_relationship_claim_action"))
      .slice(-1)[0];
    expect(sql).toBeTruthy();
    const fn = sql.slice(sql.indexOf("CREATE OR REPLACE FUNCTION public.social_relationship_claim_action"));
    expect(fn).toContain("action_status = 'submitting'");
    expect(fn).toContain("IN ('ready','retrying')");
    expect(fn).toContain("FOR UPDATE");
    // a second claim is impossible
    expect(fn).toContain("IN ('submitting','sent','accepted','replied','submission_unknown')");
    expect(fn).toContain("RETURN 'duplicate'");
    expect(fn).not.toContain("'approved'");
    expect(fn).not.toContain("'completed'");
  });
});

/* ------------------------------------------------- 2. provider payloads */

describe("unipile provider transport", () => {
  it("builds multipart form data with repeated array keys and no manual content-type", () => {
    const fd = buildUnipileForm({ account_id: "acc_1", text: "hello", attendees_ids: ["p1", "p2"] });
    expect(fd.get("account_id")).toBe("acc_1");
    expect(fd.get("text")).toBe("hello");
    expect(fd.getAll("attendees_ids")).toEqual(["p1", "p2"]);
    expect(fd.get("content-type")).toBeNull();
  });

  it("start_chat and send_message use multipart, not JSON", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipProvider.ts"), "utf8");
    const startChat = src.slice(src.indexOf("async startChat"), src.indexOf("async listChats"));
    expect(startChat).toContain("form: { account_id, text, attendees_ids: [provider_profile_id] }");
    expect(startChat).not.toContain("body: { account_id, attendees_ids");
    expect(src).toContain('body = buildUnipileForm(init.form)');
    // content-type is only ever set for JSON bodies
    expect(src).toContain('headers["content-type"] = "application/json"');
  });

  it("uses AbortController timeouts and parses Retry-After", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipProvider.ts"), "utf8");
    expect(src).toContain("new AbortController()");
    expect(src).toContain("signal: controller.signal");
    expect(src).toContain('parseRetryAfterSeconds(res.headers.get("retry-after"))');
    expect(parseRetryAfterSeconds("120")).toBe(120);
    expect(parseRetryAfterSeconds(null)).toBeNull();
    const future = new Date(Date.now() + 60000).toUTCString();
    expect(parseRetryAfterSeconds(future)).toBeGreaterThan(50);
  });

  it("never leaks the api key or dsn in an error", () => {
    const err = sanitiseProviderError({ message: "bad key sk-secret-123 at https://api9.unipile.com:1234" }, "sk-secret-123", "https://api9.unipile.com:1234");
    expect(err).not.toContain("sk-secret-123");
    expect(err).not.toContain("api9.unipile.com");
    expect(err).toContain("[redacted]");
  });

  it("is not configured (and makes no calls) without secrets", async () => {
    const a = new UnipileAdapter({ apiKey: "", dsn: "" });
    expect(a.configured()).toBe(false);
    const r = await a.testConnection();
    expect(r.ok).toBe(false);
    expect(r.provider_calls).toBe(0);
  });
});

/* ------------------------------------------------- 3. webhook security */

describe("webhook HMAC verification", () => {
  const secret = "whsec_test_value";
  const body = JSON.stringify({ event: "message_received", chat_id: "c1" });

  it("accepts a fresh, correctly signed request", async () => {
    const now = new Date();
    const t = Math.floor(now.getTime() / 1000);
    const v0 = await hmacSha256Hex(secret, `${t}.${body}`);
    const r = await verifyUnipileWebhookSignature({ header: `t=${t},v0=${v0}`, rawBody: body, secret, now });
    expect(r.valid).toBe(true);
  });

  it("rejects a replayed signature older than 5 minutes", async () => {
    const now = new Date();
    const t = Math.floor(now.getTime() / 1000) - 600;
    const v0 = await hmacSha256Hex(secret, `${t}.${body}`);
    const r = await verifyUnipileWebhookSignature({ header: `t=${t},v0=${v0}`, rawBody: body, secret, now });
    expect(r.valid).toBe(false);
    expect(r.reason).toBe("signature_expired");
  });

  it("rejects a tampered body and a wrong secret", async () => {
    const t = Math.floor(Date.now() / 1000);
    const v0 = await hmacSha256Hex(secret, `${t}.${body}`);
    expect((await verifyUnipileWebhookSignature({ header: `t=${t},v0=${v0}`, rawBody: body + "x", secret })).valid).toBe(false);
    expect((await verifyUnipileWebhookSignature({ header: `t=${t},v0=${v0}`, rawBody: body, secret: "other" })).valid).toBe(false);
  });

  it("fails closed with no secret or a malformed header", async () => {
    expect((await verifyUnipileWebhookSignature({ header: "t=1,v0=aa", rawBody: body, secret: "" })).reason).toBe("hmac_secret_not_configured");
    expect((await verifyUnipileWebhookSignature({ header: "garbage", rawBody: body, secret })).reason).toBe("signature_header_malformed");
    expect(parseUnipileSignatureHeader("t=12,v0=ABCD").v0).toBe("abcd");
  });

  it("dedupes with a stable payload hash and stores sanitised payloads only", async () => {
    expect(await stablePayloadHash(body)).toBe(await stablePayloadHash(body));
    expect(await stablePayloadHash(body)).not.toBe(await stablePayloadHash(body + "x"));
    const clean: any = sanitiseWebhookPayload({ api_key: "abc", nested: { access_token: "t", ok: 1 } });
    expect(clean.api_key).toBe("[redacted]");
    expect(clean.nested.access_token).toBe("[redacted]");
    expect(clean.nested.ok).toBe(1);
  });

  it("the webhook function verifies HMAC and never stores invalid statuses", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-webhook/index.ts"), "utf8");
    expect(src).toContain("verifyUnipileWebhookSignature");
    expect(src).toContain("sanitiseWebhookPayload");
    expect(src).not.toContain('processing_status: signature_valid ? "pending" : "rejected"');
    expect(src).toContain('processing_status: signature_valid ? "received" : "failed"');
  });
});

/* --------------------------------------- 4. webhook registration route */

describe("webhook registration", () => {
  it("uses the documented v2 endpoints route, not the invented v1 one", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipProvider.ts"), "utf8");
    expect(src).toContain('this.call<Record<string, unknown>>("webhooks/endpoints", {');
    expect(src).toContain('apiVersion: "v2"');
    expect(src).not.toMatch(/call<[^>]*>\("webhooks",/);
  });

  it("only accepts https callbacks on allowlisted hosts", () => {
    expect(validateCallbackUrl("https://abc.supabase.co/functions/v1/social-relationship-webhook").ok).toBe(true);
    expect(validateCallbackUrl("http://abc.supabase.co/x").ok).toBe(false);
    expect(validateCallbackUrl("https://evil.example.com/x").ok).toBe(false);
    expect(validateCallbackUrl("https://abc.supabase.co/x?secret=leak").ok).toBe(false);
    expect(validateCallbackUrl("").ok).toBe(false);
  });
});

/* ------------------------------------------------- 5. capability matrix */

describe("capability matrix honesty", () => {
  const adapter = new UnipileAdapter({ apiKey: "k", dsn: "https://api9.unipile.com:13943" });

  it("does not declare follow or company_search as supported", () => {
    const li = adapter.capabilities("linkedin");
    expect(li.follow).toBe(false);
    expect(li.company_search).toBe(false);
    expect(li.invite_connect).toBe(true);
    expect(li.profile_search).toBe(true);
  });

  it("declares instagram/messenger as messaging-only, never search or invite", () => {
    for (const n of ["instagram", "messenger"]) {
      const c = adapter.capabilities(n);
      expect(c.profile_search).toBe(false);
      expect(c.invite_connect).toBe(false);
      expect(c.start_chat).toBe(true);
      expect(c.send_message).toBe(true);
    }
  });

  it("unknown networks get an all-false matrix", () => {
    expect(Object.values(adapter.capabilities("x")).every((v) => v === false)).toBe(true);
  });

  it("the founder UI does not offer the unimplemented follow action", () => {
    const ui = readFileSync(
      join(process.cwd(), "src/components/founder/social-relationships/SocialRelationshipPanels.tsx"),
      "utf8",
    );
    expect(ui).not.toContain('<option value="follow">');
  });
});

/* ------------------------------------------------- 6. business isolation */

describe("business isolation", () => {
  it("runner scopes every account/profile/target read and write to the action's business", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipRunner.ts"), "utf8");
    for (const table of [
      "social_relationship_accounts",
      "social_relationship_profiles",
      "social_relationship_targets",
    ]) {
      const idx = src.indexOf(`.from("${table}")`);
      expect(idx).toBeGreaterThan(-1);
      expect(src.slice(idx, idx + 400)).toContain('business_id", action.business_id');
    }
    expect(src).toContain("account_not_in_business");
  });

  it("suppression lookups are scoped to the business or explicit global rows", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipDb.ts"), "utf8");
    expect(src).toContain("business_id.eq.${business_id},business_id.is.null");
    expect(src).toContain('if (!s.business_id && s.scope !== "global") continue;');
  });

  it("account sync refuses to attach an account bound to another business", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-provider/index.ts"), "utf8");
    expect(src).toContain("account_bound_to_other_business");
    expect(src).toContain('.neq("business_id", business_id)');
  });

  it("discovery verifies the selected account belongs to the business", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-discovery/index.ts"), "utf8");
    expect(src).toContain('.eq("id", account_id).eq("business_id", business_id)');
  });
});

/* ------------------------------------------------- 7. safe-off + approval */

describe("safe-off, approval and confirmation gates", () => {
  it("external calls are impossible in the safe-off modes", () => {
    expect(externalCallsAllowed("test_only")).toBe(false);
    expect(externalCallsAllowed("draft_actions")).toBe(false);
    expect(externalCallsAllowed("paused")).toBe(false);
    expect(externalCallsAllowed("approval_required")).toBe(true);
    expect(externalCallsAllowed("approved_batch_autopilot")).toBe(true);
    expect(externalCallsAllowed("nonsense")).toBe(false);
  });

  it("unattended dispatch is autopilot-only", () => {
    expect(unattendedDispatchAllowed("approval_required")).toBe(false);
    expect(unattendedDispatchAllowed("approved_batch_autopilot")).toBe(true);
  });

  it("the confirmation phrase is exact", () => {
    expect(confirmationAccepted(SEND_CONFIRMATION_PHRASE)).toBe(true);
    expect(confirmationAccepted(" send for real ")).toBe(true);
    expect(confirmationAccepted("yes")).toBe(false);
    expect(confirmationAccepted(undefined)).toBe(false);
  });

  it("run_due cannot send without the confirmation phrase and an external mode", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-actions/index.ts"), "utf8");
    const runDue = src.slice(src.indexOf('if (action === "run_due")'), src.indexOf('if (action === "resolve_unknown")'));
    expect(runDue).toContain("confirmationAccepted(body.confirmation)");
    expect(runDue).toContain("externalCallsAllowed(ctx.mode)");
    expect(runDue.indexOf("confirmationAccepted")).toBeLessThan(runDue.indexOf("runDueActions"));
  });

  it("maintenance requires autopilot and the scheduler secret", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-maintenance/index.ts"), "utf8");
    expect(src).toContain("require_autopilot: true");
    expect(src).toContain("SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET");
    const runner = readFileSync(join(FN_DIR, "_shared/socialRelationshipRunner.ts"), "utf8");
    expect(runner).toContain("unattended_dispatch_requires_autopilot");
  });

  it("the runner only picks up approved ready/retrying actions", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipRunner.ts"), "utf8");
    expect(src).toContain('.in("action_status", RUNNABLE_ACTION_STATUSES)');
    expect(src).toContain('.not("approved_at", "is", null)');
    expect(src).toContain("action.not_before ?? action.scheduled_for");
  });

  it("new policies are created safe-off and live modes need confirmation", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-provider/index.ts"), "utf8");
    expect(src).toContain('insert({ business_id, mode: "test_only", ...patch })');
    expect(src).toContain("confirmation_required");
  });
});

/* ------------------------------------------------- 8. idempotency */

describe("idempotency and ambiguity", () => {
  it("submission_unknown keeps the claim and never auto-retries", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipRunner.ts"), "utf8");
    const branch = src.slice(src.indexOf('if (klass.klass === "submission_unknown")'), src.indexOf('} else if (klass.klass === "retry")'));
    expect(branch).toContain('action_status: "submission_unknown"');
    expect(branch).not.toContain("scheduled_for");
    expect(branch).toContain("social_relationship_escalations");
  });

  it("retries honour Retry-After and only mark sent with a real provider id", () => {
    const src = readFileSync(join(FN_DIR, "_shared/socialRelationshipRunner.ts"), "utf8");
    expect(src).toContain("resp.retry_after_seconds");
    expect(src).toContain('action_status: "retrying"');
    expect(src).toContain("providerSendConfirmed(resp.data)");
  });
});

/* ------------------------------------------------- 9. limits and time */

describe("timezone-aware usage windows", () => {
  it("uses the policy timezone for the day boundary", () => {
    // 23:30 UTC on 1 June is already 2 June in Auckland.
    const at = new Date("2026-06-01T23:30:00Z");
    expect(localWindowStarts(at, "UTC").day).toBe("2026-06-01");
    expect(localWindowStarts(at, "Pacific/Auckland").day).toBe("2026-06-02");
  });

  it("week start is the local Monday and bad timezones fall back safely", () => {
    const wed = new Date("2026-06-03T12:00:00Z");
    expect(localWindowStarts(wed, "UTC").week).toBe("2026-06-01");
    expect(localWindowStarts(wed, "Not/AZone").day).toBe("2026-06-03");
  });

  it("usage helpers take the timezone through from the policy", () => {
    const db = readFileSync(join(FN_DIR, "_shared/socialRelationshipDb.ts"), "utf8");
    expect(db).toContain("localWindowStarts(now, timezone)");
    expect(db).toContain("now, ctx.policy.timezone");
    // missing rows mean zero USAGE, never zero allowance
    expect(db).toContain('r.window_kind === "day" && r.window_start === w.day)?.used_count ?? 0');
  });
});

/* ------------------------------------------------- 10. inbound safety */

describe("inbound safety and CRM", () => {
  it("opt-out suppresses and cancels every pending action for that profile", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-webhook/index.ts"), "utf8");
    const branch = src.slice(src.indexOf("if (isOptOut(text))"));
    expect(branch).toContain('.in("action_status", CANCELLABLE_ACTION_STATUSES)');
    expect(branch).toContain('.eq("profile_id", conv!.profile_id)');
    expect(branch).toContain('target_status: "suppressed"');
    expect(CANCELLABLE_ACTION_STATUSES).not.toContain("sent");
    expect(CANCELLABLE_ACTION_STATUSES).not.toContain("submitting");
  });

  it("suppression reasons are normalised to allowed values", () => {
    expect(normaliseSuppressionReason("founder_suppressed")).toBe("manual");
    expect(normaliseSuppressionReason("opt_out")).toBe("opt_out");
    expect(normaliseSuppressionReason(undefined)).toBe("manual");
  });

  it("CRM promotion dedupes within the business", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-inbox/index.ts"), "utf8");
    expect(src).toContain('.eq("business_id", business_id).eq("profile_id", conv.profile.id)');
    expect(src).toContain('link_status: body.crm_contact_id ? "linked" : "pending_review"');
    expect(src).toContain("source_platform: conv.network");
  });

  it("thread sync is blocked in safe-off modes", () => {
    const src = readFileSync(join(FN_DIR, "social-relationship-inbox/index.ts"), "utf8");
    expect(src).toContain("mode_blocks_external_actions");
  });
});

/* ------------------------------------------------- 11. frontend honesty */

describe("frontend honesty", () => {
  const ui = readFileSync(
    join(process.cwd(), "src/components/founder/social-relationships/SocialRelationshipPanels.tsx"),
    "utf8",
  );

  it("uses the final status vocabulary in badges and filters", () => {
    expect(ui).toContain('["sent", "accepted", "replied"].includes(a.action_status)');
    expect(ui).not.toContain('a.action_status === "completed"');
    expect(ui).toContain('["pending_approval", "draft"].includes(a.action_status)');
  });

  it("gates real sends behind the confirmation phrase", () => {
    expect(ui).toContain('SEND_CONFIRMATION_PHRASE = "SEND FOR REAL"');
    expect(ui).toContain('call("run_due", { limit: 5, confirmation: confirmPhrase })');
    expect(ui).toContain("disabled={!confirmOk(confirmPhrase) || !EXTERNAL_MODES.includes(mode)}");
  });

  it("never renders provider secrets", () => {
    expect(ui).not.toMatch(/UNIPILE_API_KEY\s*[:=]\s*["'`]/);
    expect(ui).not.toContain("api_key");
  });
});
