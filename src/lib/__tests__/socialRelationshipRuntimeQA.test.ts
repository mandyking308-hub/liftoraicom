import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const migration = read("supabase/migrations/20260805074500_social_relationship_runtime_contract_repair.sql");
const aiAccounting = read("supabase/migrations/20260805080500_social_relationship_ai_reply_accounting.sql");
const runner = read("supabase/functions/_shared/socialRelationshipRunner.ts");
const provider = read("supabase/functions/_shared/socialRelationshipProvider.ts");
const db = read("supabase/functions/_shared/socialRelationshipDb.ts");
const actions = read("supabase/functions/social-relationship-actions/index.ts");
const discovery = read("supabase/functions/social-relationship-discovery/index.ts");
const webhook = read("supabase/functions/social-relationship-webhook/index.ts");
const inbox = read("supabase/functions/social-relationship-inbox/index.ts");
const maintenance = read("supabase/functions/social-relationship-maintenance/index.ts");
const providerEndpoint = read("supabase/functions/social-relationship-provider/index.ts");
const targets = read("supabase/functions/social-relationship-targets/index.ts");
const founderUi = read("src/components/founder/social-relationships/SocialRelationshipPanelsSafe.tsx");

const validActionStatuses = new Set([
  "draft", "blocked", "pending_approval", "ready", "submitting", "sent",
  "accepted", "replied", "failed", "retrying", "submission_unknown",
  "dead_letter", "cancelled",
]);

function writtenStatuses(source: string) {
  return [...source.matchAll(/action_status:\s*["']([a-z_]+)["']/g)].map((match) => match[1]);
}

describe("Social Relationship Engine production runtime contract", () => {
  it("claims only ready or retrying actions and moves them atomically to submitting", () => {
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain("NOT IN ('ready', 'retrying')");
    expect(migration).toContain("action_status = 'submitting'");
    expect(migration).toContain("action_status IN ('ready', 'retrying')");
    expect(migration).not.toContain("action_status = 'submitted'");
  });

  it("the runner reads and writes only schema-valid action statuses", () => {
    expect(runner).toContain('.in("action_status", ["ready", "retrying"])');
    expect(runner).toContain('action_status: "submission_unknown"');
    expect(runner).toContain('action_status: "retrying"');
    expect(runner).toContain('action_status: "dead_letter"');
    for (const status of writtenStatuses(runner)) expect(validActionStatuses.has(status), status).toBe(true);
    expect(runner).not.toMatch(/action_status:\s*["'](?:approved|scheduled|retry|submitted|completed)["']/);
  });

  it("manual sending and approval require exact founder confirmation phrases", () => {
    expect(actions).toContain('const SEND_CONFIRMATION = "SEND APPROVED SOCIAL ACTIONS"');
    expect(actions).toContain('const APPROVE_CONFIRMATION = "APPROVE SOCIAL ACTION BATCH"');
    expect(actions).toContain("send_confirmation_required");
    expect(actions).toContain("approval_confirmation_required");
    expect(actions).toContain('action_status: "ready"');
    expect(actions).not.toMatch(/action_status:\s*["'](?:approved|scheduled|completed)["']/);
  });

  it("unattended maintenance is secret-gated and restricted to approved batch autopilot", () => {
    expect(maintenance).toContain("SOCIAL_RELATIONSHIP_MAINTENANCE_SECRET");
    expect(maintenance).toContain("unattended: true");
    expect(runner).toContain('context.mode !== "approved_batch_autopilot"');
  });

  it("provider chat requests use multipart FormData and the webhook uses v2 endpoints", () => {
    expect(provider).toContain("const isForm = init.body instanceof FormData");
    expect(provider).toContain("const form = new FormData()");
    expect(provider).toContain('form.append("attendees_ids", provider_profile_id)');
    expect(provider).toContain('form.set("account_id", account_id)');
    expect(provider).toContain('form.set("text", text)');
    expect(provider).toContain('this.call<Record<string, unknown>>("v2", "/webhooks/endpoints"');
    expect(provider).toContain("new AbortController()");
    expect(provider).toContain("retry_after_seconds");
  });

  it("capabilities do not advertise unsupported follow or new-chat actions", () => {
    expect(provider).toMatch(/linkedin:[\s\S]*?follow:\s*false/);
    expect(provider).toMatch(/instagram:[\s\S]*?start_chat:\s*false/);
    expect(provider).toMatch(/messenger:[\s\S]*?start_chat:\s*false/);
    expect(provider).toContain("manychat_relationship_actions_not_enabled");
    expect(founderUi).not.toContain('<option value="follow">');
  });

  it("webhooks verify timestamped HMAC before storing or processing events", () => {
    expect(webhook).toContain("unipile-signature");
    expect(webhook).toContain("HMAC");
    expect(webhook).toContain("`${parts.timestamp}.${rawBody}`");
    expect(webhook).toContain("> 300");
    expect(webhook.indexOf("await authenticate(req, rawBody)")).toBeLessThan(webhook.indexOf('from("social_relationship_webhook_events").insert'));
    expect(webhook).toContain("account_business_route_ambiguous");
  });

  it("business isolation is enforced across gates, discovery, inbox and provider setup", () => {
    for (const source of [db, runner, discovery, inbox, providerEndpoint, targets]) {
      expect(source).toContain("business_id");
    }
    expect(db).toContain("cross_business_account");
    expect(db).toContain("cross_business_profile");
    expect(db).toContain("cross_business_target");
    expect(discovery).toContain("account_not_found_or_cross_business");
    expect(inbox).toContain("account_not_found_or_cross_business");
    expect(providerEndpoint).toContain("account_not_found_or_cross_business");
  });

  it("live discovery is previewable but requires policy, account and founder approval to call the provider", () => {
    expect(discovery).toContain('const SEARCH_CONFIRMATION = "RUN APPROVED SOCIAL SEARCH"');
    expect(discovery).toContain('action === "preview_search"');
    expect(discovery).toContain('no_provider_call: true');
    expect(discovery).toContain('policy_mode_');
    expect(discovery).toContain("real_account_not_declared");
  });

  it("opt-outs and complaints suppress the profile and cancel pending actions", () => {
    expect(webhook).toContain("immediateStop");
    expect(webhook).toContain('target_status: "suppressed"');
    expect(webhook).toContain('action_status: "cancelled"');
    expect(webhook).toContain('patch.conversation_status = "suppressed"');
    expect(webhook).toContain("founder_approval_items");
  });

  it("ambiguous transport and 5xx outcomes remain unknown and never auto-retry", () => {
    expect(runner).toContain("response.transport_error === true");
    expect(runner).toContain("response.http_status >= 500");
    expect(runner).toContain('action_status: "submission_unknown"');
    const retryBranch = runner.slice(runner.indexOf("} else if ([408, 429]"));
    expect(retryBranch).toContain('action_status: "retrying"');
    expect(runner).toContain("Ambiguous provider submission outcome — reconcile before any retry.");
  });

  it("sent and replied statuses require a real provider identifier", () => {
    expect(runner).toContain("providerSendConfirmed(response.data) && externalId");
    expect(actions).toContain("provider_action_id_required_to_mark_sent");
    expect(founderUi).toContain("Enter the real provider action/message ID proving this was sent");
  });

  it("AI reply usage is counted only after a confirmed provider reply", () => {
    expect(aiAccounting).toContain("NEW.action_status <> 'replied'");
    expect(aiAccounting).toContain("NEW.provider_action_id IS NULL");
    expect(aiAccounting).toContain("ai_replies_today");
    expect(aiAccounting).toContain("last_ai_reply_at");
    expect(inbox).not.toContain("ai_replies_today: repliesToday + 1");
  });

  it("the founder UI offers only real controls and carries every required confirmation", () => {
    for (const phrase of [
      "CONFIRM REAL SOCIAL ACCOUNT", "REGISTER SOCIAL RELATIONSHIP WEBHOOK",
      "RUN APPROVED SOCIAL SEARCH", "APPROVE SOCIAL TARGET LIST",
      "APPROVE SOCIAL TARGETS", "APPROVE SOCIAL ACTION BATCH",
      "SEND APPROVED SOCIAL ACTIONS", "APPROVE SOCIAL REPLY",
      "ENABLE SOCIAL RELATIONSHIP ACTIONS", "RELEASE SOCIAL RELATIONSHIP PAUSE",
      "PROMOTE SOCIAL CONTACT TO CRM",
    ]) expect(founderUi).toContain(phrase);
    expect(founderUi).not.toContain("mocked success");
    expect(founderUi).not.toContain("UNIPILE_API_KEY");
  });
});
