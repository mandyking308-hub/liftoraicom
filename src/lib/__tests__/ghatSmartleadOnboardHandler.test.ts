import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPLY_CONFIRMATION,
  handleGhatSmartleadOnboard,
  type GhatOnboardDeps,
} from "../../../supabase/functions/ghat-smartlead-onboard/handler";

/**
 * Behavioral harness for the GHAT onboarding flow. Every IO edge is stubbed and
 * global fetch is a fail-closed trap. All addresses/credentials are synthetic.
 */

const ORG = "globalhealthaccesstrust.org";
const NET = "globalhealthaccesstrust.net";
const CO = "globalhealthaccesstrust.co";

const REGISTRY = [
  ...Array.from({ length: 10 }, (_, i) => ({ email: `org${i}@${ORG}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ email: `net${i}@${NET}` })),
  ...Array.from({ length: 5 }, (_, i) => ({ email: `co${i}@${CO}` })),
].map((r, i) => ({ ...r, id: `row-${i}`, estate_classification: "ghat", configured_daily_limit: 50, sender_name: "GHAT" }));

// 181 non-GHAT accounts first, then the 10 connected .org GHAT accounts (191 total, beyond page 1).
const FILLER = Array.from({ length: 181 }, (_, i) => ({ id: 1000 + i, from_email: `gsm${i}@getgsm.net` }));
const CONNECTED_ORG = REGISTRY.slice(0, 10).map((r, i) => ({
  id: 5000 + i,
  from_email: r.email,
  is_smtp_success: true,
  is_imap_success: true,
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
  const accounts: Record<string, unknown>[] = [...FILLER, ...CONNECTED_ORG];
  const calls: string[] = [];
  const saves: Record<string, unknown>[] = [];
  const fetchStub = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push(url);
    if (url.includes("/email-accounts/save")) {
      const b = JSON.parse(String(init?.body));
      saves.push(b);
      accounts.push({ id: 9000 + saves.length, from_email: b.from_email, is_smtp_success: true, is_imap_success: true });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    const m = url.match(/^https:\/\/server\.smartlead\.ai\/api\/v1\/email-accounts\/\?.*offset=(\d+)&limit=(\d+)/);
    if (m) {
      const off = Number(m[1]);
      const lim = Number(m[2]);
      return new Response(JSON.stringify(accounts.slice(off, off + lim)), { status: 200 });
    }
    if (url === "https://export.stub.invalid/creds.csv") {
      const header = "from_email,from_name,user_name,password,smtp_host,smtp_port,imap_host,imap_port";
      const rows = REGISTRY.map((r) => `${r.email},GHAT,${r.email},synthetic-pw,smtp.stub,465,imap.stub,993`);
      // a stray non-GHAT row must be ignored
      rows.push("intruder@getgsm.net,X,intruder,synthetic-pw,smtp.stub,465,imap.stub,993");
      return new Response([header, ...rows].join("\n"), { status: 200 });
    }
    throw new Error(`UNEXPECTED FETCH: ${url}`);
  });
  const winnrStub = vi.fn(async () => ({ ok: true, data: { data: { download_url: "https://export.stub.invalid/creds.csv" } } }));
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
  const deps: GhatOnboardDeps = {
    env: (k) => env[k],
    createClient: () => client,
    fetch: fetchStub as unknown as typeof fetch,
    winnrCall: winnrStub as unknown as GhatOnboardDeps["winnrCall"],
  };
  return { deps, calls, saves, winnrStub, writes };
}

const req = (body: Record<string, unknown>) =>
  new Request("http://local/ghat-smartlead-onboard", {
    method: "POST",
    headers: { Authorization: "Bearer stub", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
const apply = (emails: unknown) => req({ apply: true, external_action_confirmation: APPLY_CONFIRMATION, emails });
const missingNine = [...REGISTRY.slice(10, 15), ...REGISTRY.slice(15, 19)].map((r) => r.email);

describe("ghat-smartlead-onboard handler (behavioral)", () => {
  it("fail-closed trap: un-stubbed global fetch throws", () => {
    expect(() => fetch("https://example.com")).toThrow(/BLOCKED/);
  });

  it("preview paginates beyond 100 and detects the 10 already-connected GHAT accounts", async () => {
    const h = harness();
    const res = await handleGhatSmartleadOnboard(req({ apply: false }), h.deps);
    const b = await res.json();
    expect(b.mode).toBe("preview");
    expect(b.smartlead_accounts_seen).toBe(191);
    expect(b.smartlead_ghat_accounts).toBe(10);
    expect(b.ghat_registry_mailboxes).toBe(20);
    expect(b.already_connected).toBe(10);
    expect(b.missing_from_smartlead).toBe(10);
    expect(b.missing_by_domain).toEqual({ [ORG]: 0, [NET]: 5, [CO]: 5 });
    expect(h.calls.filter((u) => u.includes("offset=")).length).toBe(2);
    expect(h.winnrStub).not.toHaveBeenCalled();
    expect(h.saves).toEqual([]);
    expect(h.writes).toEqual([]);
    expect(JSON.stringify(b)).not.toContain("synthetic-pw");
  });

  it.each([
    [undefined, "requested_emails_required"],
    [[], "requested_emails_required"],
    [REGISTRY.slice(0, 11).map((r) => r.email), "requested_email_limit_exceeded"],
    [[`net0@${NET}`, "stranger@getgsm.net"], "invalid_requested_email"],
    [["hello@neoncandy.online"], "invalid_requested_email"],
    [[`ghost@${NET}`], "invalid_requested_email"],
  ])("blocks apply scope %j before export or save", async (emails, blocker) => {
    const h = harness();
    const res = await handleGhatSmartleadOnboard(apply(emails), h.deps);
    const b = await res.json();
    expect(res.status).toBe(400);
    expect(b.blocker).toBe(blocker);
    expect(h.winnrStub).not.toHaveBeenCalled();
    expect(h.saves).toEqual([]);
    expect(h.writes).toEqual([]);
  });

  it("requires the exact confirmation phrase", async () => {
    const h = harness();
    const res = await handleGhatSmartleadOnboard(
      req({ apply: true, external_action_confirmation: "connect ghat", emails: missingNine }),
      h.deps,
    );
    const b = await res.json();
    expect(b.blocker).toBe("external_action_confirmation_required");
    expect(h.winnrStub).not.toHaveBeenCalled();
    expect(h.saves).toEqual([]);
  });

  it("exports credentials across only the needed registered GHAT domains and creates warm-up-off accounts", async () => {
    const h = harness();
    const res = await handleGhatSmartleadOnboard(apply(missingNine), h.deps);
    const b = await res.json();
    expect(b.executed).toBe(true);
    expect(h.winnrStub).toHaveBeenCalledTimes(1);
    const winnrArgs = h.winnrStub.mock.calls[0] as unknown[];
    expect((winnrArgs[1] as { body: { domains: string[] } }).body.domains).toEqual([CO, NET]);
    expect(b.smartlead_accounts_created).toBe(9);
    expect(b.failed_count).toBe(0);
    expect(h.saves.map((s) => s.from_email).sort()).toEqual([...missingNine].sort());
    for (const s of h.saves) {
      expect(s.warmup_enabled).toBe(false);
      expect(s.total_warmup_per_day).toBe(0);
    }
    expect(h.calls.some((u) => /campaign|sequence|lead|webhook|apollo/i.test(u))).toBe(false);
    expect(JSON.stringify(b)).not.toContain("synthetic-pw");
  });

  it("never re-creates already-connected accounts (mixed scope and rerun)", async () => {
    const h = harness();
    const mixed = [REGISTRY[0].email, REGISTRY[10].email];
    const first = await (await handleGhatSmartleadOnboard(apply(mixed), h.deps)).json();
    expect(first.already_connected).toBe(1);
    expect(first.smartlead_accounts_created).toBe(1);
    expect(h.saves.map((s) => s.from_email)).toEqual([REGISTRY[10].email]);

    const rerun = await (await handleGhatSmartleadOnboard(apply(mixed), h.deps)).json();
    expect(rerun.already_connected).toBe(2);
    expect(rerun.smartlead_accounts_created).toBe(0);
    expect(h.saves.length).toBe(1);
    expect(h.winnrStub).toHaveBeenCalledTimes(1);
  });
});
