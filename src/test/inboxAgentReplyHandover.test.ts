import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const handover = readFileSync("supabase/functions/inbox-agent-reply-handover/index.ts", "utf8");
const orchestrator = readFileSync("supabase/functions/agent-handover-orchestrator/index.ts", "utf8");
const hookMigration = readFileSync(
  "drizzle/migrations/0031_inbox_agent_reply_hook.sql",
  "utf8",
);

/**
 * Contract: a recorded inbound reply becomes inbox_agent work, and that work can
 * never reach a recipient without a founder. The reply hook must only wake on
 * replies, so sends and status changes never raise agent work.
 */
describe("Inbox agent reply handover", () => {
  it("creates only founder-approved, non-executing inbox_agent tasks", () => {
    const taskInsert = handover.slice(
      handover.indexOf('from("ai_agent_task_queue")'),
      handover.indexOf("recommended_action"),
    );
    expect(taskInsert).toContain('agent_key: p.to_agent_key');
    expect(taskInsert).toContain("founder_approval_required: true");
    expect(taskInsert).toContain("auto_execute_allowed: false");
    expect(taskInsert).toContain("execution_enabled: false");
    expect(taskInsert).toContain("dry_run_only: true");
    expect(handover).toContain('recommended_action:\n                  "Classify the reply and prepare a suggested answer for founder approval. Do not send anything."');
  });

  it("never sends or mutates a provider from the reply path", () => {
    // The only outside call is the AI gateway that writes the draft.
    const calls = handover.match(/fetch\("([^"]+)"/g) ?? [];
    expect(calls).toEqual(['fetch("https://ai.gateway.lovable.dev/v1/chat/completions"']);
    expect(handover).not.toContain("api.smartlead.ai");
    expect(handover).not.toMatch(/\/campaigns\/\d+\/(start|pause|resume)/);
    expect(handover).toContain("no_external_action: true");
    expect(handover).toContain("emails_sent: 0");
    expect(handover).toContain("smartlead_posts: 0");
  });

  it("requires a founder, admin or scheduled-job caller", () => {
    expect(handover).toContain('from "../_shared/founderGuard.ts"');
    expect(handover).toContain("await founderGuard(req");
  });

  it("writes agent_handover_log using only columns that exist", () => {
    // agent_handover_log has no customer-stage columns; writing them fails the insert.
    const handoverInsert = handover.slice(
      handover.indexOf('from("agent_handover_log")'),
      handover.indexOf("summary.created++"),
    );
    expect(handoverInsert).not.toContain("from_customer_stage:");
    expect(handoverInsert).not.toContain("to_customer_stage:");
    expect(handover).toContain("from_customer_stage: \"contacted\"");
    expect(handover).toContain("to_customer_stage: \"new_reply\"");
  });

  it("keeps the orchestrator off the same missing stage columns", () => {
    const insertBlock = orchestrator.slice(
      orchestrator.indexOf('from("agent_handover_log")'),
      orchestrator.indexOf("summary.created++"),
    );
    expect(insertBlock).not.toMatch(/^\s*from_customer_stage:/m);
    expect(insertBlock).not.toMatch(/^\s*to_customer_stage:/m);
    expect(orchestrator).toContain("agent_handover_log has no customer-stage columns");
  });

  it("wakes the agent only on reply rows, on both landing paths", () => {
    expect(hookMigration).toContain("when (new.event_type = 'reply_received')");
    expect(hookMigration).toContain("when (new.provider_event_type = 'reply_received')");
    expect(hookMigration).toContain("after insert on public.smartlead_activity_events");
    expect(hookMigration).toContain("after insert on public.outbound_provider_events");
    // No recurring scheduled work: the hook is the only wake signal.
    expect(hookMigration).not.toContain("cron.schedule");
  });

  it("reads replies from both the poll and the signed receiver", () => {
    expect(handover).toContain('eq("event_type", "reply_received")');
    expect(handover).toContain('eq("provider_event_type", "reply_received")');
    expect(handover).toContain("smartlead_activity_events");
    expect(handover).toContain("outbound_provider_events");
  });
});

describe("inbox agent sorts and drafts", () => {
  const fs = require("node:fs");
  const src: string = fs.readFileSync("supabase/functions/inbox-agent-reply-handover/index.ts", "utf8");
  it("writes drafts only, never calls Smartlead", () => {
    expect(src).toContain('from("smartlead_reply_drafts").insert');
    expect(src).not.toMatch(/reply-email-thread|server\.smartlead\.ai/);
  });
  it("opt-outs get no draft and are marked do-not-contact", () => {
    expect(src).toMatch(/category === "wants_out"\) \{[\s\S]*apply_reply_stop_suppression[\s\S]*do_not_contact: true/);
  });
});

describe("inbox agent worker reliability", () => {
  const fs = require("node:fs");
  const src: string = fs.readFileSync("supabase/functions/inbox-agent-reply-handover/index.ts", "utf8");
  it("retries 3 times then dead-letters and tells the founder", () => {
    expect(src).toContain("const MAX_ATTEMPTS = 3;");
    expect(src).toContain('finish("dead_letter"');
  });
  it("founder notices can never send", () => {
    expect(src).toMatch(/send_allowed: false/);
  });
  it("holds replies whose business/campaign can't be matched", () => {
    expect(src).toContain("attribution_unmatched");
  });
});
