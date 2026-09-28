import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { authorizeConversationBusiness } from "../../supabase/functions/_shared/customerCommercialLifecycle";

const salesBrainPath = "supabase/functions/sales-conversation-brain/index.ts";
const callerAuthPath = "supabase/functions/_shared/callerAuth.ts";

describe("sales conversation business authorization", () => {
  it("rejects a valid conversation UUID when it belongs to a different business", () => {
    const result = authorizeConversationBusiness({
      callerAuthorized: true,
      requestedBusinessId: "2e4d9802-3914-4d89-bc15-7f4d685ae923",
      conversationBusinessId: "710f7e1b-eae4-4514-bbdf-20459e06e8d1",
    });

    expect(result).toEqual({ ok: false, reason: "business_context_mismatch" });
  });

  it("validates JWT and role, binds business context, then creates service role and loads the conversation", () => {
    const salesBrain = readFileSync(salesBrainPath, "utf8");
    const callerAuth = readFileSync(callerAuthPath, "utf8");
    const authorizeStart = callerAuth.indexOf("export async function authorizeFounderOrAdmin(");
    const requireStart = callerAuth.indexOf("export async function requireFounderOrAdmin(", authorizeStart);
    const authorizeBody = callerAuth.slice(authorizeStart, requireStart);

    expect(authorizeBody).toContain("userClient.auth.getUser");
    expect(authorizeBody).toContain('roleSet.has("founder")');
    expect(authorizeBody).toContain('roleSet.has("admin")');
    expect(authorizeBody).not.toContain("adminClient()");

    const order = [
      salesBrain.indexOf("await authorizeFounderOrAdmin(req"),
      salesBrain.indexOf("requireCustomerSalesBusinessId(requestedBusinessId)"),
      salesBrain.indexOf("authorization.createAdminClient()"),
      salesBrain.indexOf('from("customer_sales_conversations").select("*").eq("id", conversation_id)'),
      salesBrain.indexOf("authorizeConversationBusiness({"),
      salesBrain.indexOf("callAIGateway({"),
    ];
    expect(order.every((position) => position >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });
});
