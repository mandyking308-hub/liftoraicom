import { describe, expect, it, vi } from "vitest";
import { classifyConversation, oldestConversationFirst, reviewableReply, threadKey } from "../../../supabase/functions/_shared/crmReplyDrafting";

describe("approval-only conversation rules", () => {
  it("refreshes unchecked and oldest conversations before recently checked ones", () => {
    expect(oldestConversationFirst(["recent", "old", "new"], (id) => id, new Map([["recent", "2026-11-25T14:00:00Z"], ["old", "2026-11-25T12:00:00Z"]]))).toEqual(["new", "old", "recent"]);
  });
  it("only genuine matched incoming replies can start drafting", () => {
    expect(reviewableReply({ direction: "REPLY", reply_kind: "reply", contact_id: "person-a" })).toBe(true);
    expect(reviewableReply({ direction: "REPLY", reply_kind: "auto_reply", contact_id: "person-a" })).toBe(false);
    expect(reviewableReply({ direction: "REPLY", reply_kind: "bounce", contact_id: "person-a" })).toBe(false);
    expect(reviewableReply({ direction: "REPLY", reply_kind: "reply", contact_id: null })).toBe(false);
  });
  it("separates identical provider lead ids across businesses and campaigns", () => {
    const lead = { business_id: "Kindnesss", provider_campaign_id: "4664652", provider_lead_id: "42" };
    expect(threadKey(lead)).not.toBe(threadKey({ ...lead, business_id: "Another business" }));
    expect(threadKey(lead)).not.toBe(threadKey({ ...lead, provider_campaign_id: "4103531" }));
  });
  it("drafts with the scoped conversation and approved claims without provider send calls", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { tool_calls: [{ function: { arguments: JSON.stringify({ category: "question", reason: "Needs details", summary: "Asked about reports", draft: "Here is the approved information." }) } }] } }] })));
    const result = await classifyConversation("test-key", "Alex", "What reports?", "Introduction", { businessName: "Kindnesss", history: "Earlier response: asked about school reports", approvedClaims: ["Reporting supports schools"] }, fetcher);
    expect(result.status).toBe(200);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("https://ai.gateway.lovable.dev/v1/chat/completions");
    const request = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(request.messages[1].content).toContain("Earlier response: asked about school reports");
    expect(request.messages[1].content).toContain("Reporting supports schools");
  });
  it("does not retry an AI access denial", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: { message: "Access denied" } }), { status: 403 }));
    expect(await classifyConversation("test-key", "", "hello", "", undefined, fetcher)).toEqual({ status: 403, error: "Access denied" });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});