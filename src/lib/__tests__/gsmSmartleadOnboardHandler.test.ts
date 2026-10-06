import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  handleGsmSmartleadOnboard,
  type GsmOnboardDeps,
} from "../../../supabase/functions/gsm-smartlead-onboard/handler";
import { GSM_ONBOARD_CONFIRMATION } from "../../../supabase/functions/_shared/gsmSmartleadOnboard";

/**
 * Behavioral harness for the real request flow. Every IO edge is stubbed and
 * the global fetch is replaced with a fail-closed trap so any un-stubbed
 * network call throws and fails the test.
 */

const REGISTRY = Array.from({ length: 12 }, (_, i) => ({
  id: `row-${i}`,
  email: `canary${i}@getgsm.net`,
  estate_classification: "gsm",
  smartlead_email_account_id: null,
  configured_daily_limit: 50,
  sender_name: "GSM",
}));

const realFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("REAL NETWORK CALL BLOCKED IN TEST");
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function harness() {
  const calls: string[] = [];
  const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/email-accounts/save")) throw new Error("MUTATION REACHED: email-accounts/save");
    if (url.startsWith("https://server.smartlead.ai/api/v1/email-accounts/?")) {
      return new Response("[]", { status: 200 });
    }
    throw new Error(`UNEXPECTED FETCH: ${url}`);
  });
  const winnrStub = vi.fn(async () => {
    throw new Error("CREDENTIAL EXPORT REACHED");
  });
  const writes: string[] = [];
  const query = (table: string) => {
    const result =
      table === "user_roles" ? { data: [{ role: "founder" }], error: null } : { data: REGISTRY, error: null };
    const q: Record<string, unknown> = {
      select: () => q,
      eq: () => q,
      update: () => { writes.push(`update:${table}`); return q; },
      insert: () => { writes.push(`insert:${table}`); return Promise.resolve({ error: null }); },
      then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
    };
    return q;
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "founder-1" } }, error: null }) },
    from: query,
  };
  const env: Record<string, string> = {
    SUPABASE_URL: "http://stub.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "stub",
    SUPABASE_ANON_KEY: "stub",
    WINNR_API_TOKEN: "stub-token",
    SMARTLEAD_API_KEY: "stub-key",
  };
  const deps: GsmOnboardDeps = {
    env: (k) => env[k],
    createClient: () => client,
    fetch: fetchStub as unknown as typeof fetch,
    winnrCall: winnrStub as unknown as GsmOnboardDeps["winnrCall"],
  };
  return { deps, calls, fetchStub, winnrStub, writes };
}

const applyReq = (emails: unknown) =>
  new Request("http://local/gsm-smartlead-onboard", {
    method: "POST",
    headers: { Authorization: "Bearer stub", "Content-Type": "application/json" },
    body: JSON.stringify({ apply: true, external_action_confirmation: GSM_ONBOARD_CONFIRMATION, emails }),
  });

async function expectBlocked(emails: unknown, blocker: string) {
  const h = harness();
  const res = await handleGsmSmartleadOnboard(applyReq(emails), h.deps);
  const body = await res.json();
  expect(res.status).toBe(400);
  expect(body.blocker).toBe(blocker);
  expect(body.executed).toBe(false);
  expect(h.winnrStub).not.toHaveBeenCalled();
  expect(h.calls.some((u) => u.includes("email-accounts/save"))).toBe(false);
  expect(h.writes).toEqual([]);
  return h;
}

describe("gsm-smartlead-onboard handler — apply whitelist (behavioral)", () => {
  it("fail-closed trap: un-stubbed global fetch throws", () => {
    expect(() => fetch("https://example.com")).toThrow(/BLOCKED/);
  });

  it("blocks apply with blank whitelist (absent and empty) before export or save", async () => {
    await expectBlocked(undefined, "requested_emails_required");
    await expectBlocked([], "requested_emails_required");
    await expectBlocked("  ,\n ", "requested_emails_required");
  });

  it("blocks apply with more than 10 mailboxes before export or save", async () => {
    await expectBlocked(REGISTRY.slice(0, 11).map((r) => r.email), "requested_email_limit_exceeded");
  });

  it("blocks apply with an out-of-registry mailbox before export or save", async () => {
    await expectBlocked(["canary0@getgsm.net", "stranger@getgsm.net"], "invalid_requested_email");
    await expectBlocked(["x@globalhealthaccesstrust.org"], "invalid_requested_email");
    await expectBlocked(["hello@neoncandy.online"], "invalid_requested_email");
  });

  it("control: a valid in-registry list does reach the credential export gate", async () => {
    const h = harness();
    await expect(handleGsmSmartleadOnboard(applyReq(["canary0@getgsm.net"]), h.deps)).rejects.toThrow(
      "CREDENTIAL EXPORT REACHED",
    );
    expect(h.winnrStub).toHaveBeenCalledTimes(1);
    expect(h.calls.some((u) => u.includes("email-accounts/save"))).toBe(false);
  });
});
