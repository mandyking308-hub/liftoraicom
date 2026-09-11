import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WINNR_BASE_URL,
  WINNR_ENDPOINTS,
  WINNR_MUTATION_ENDPOINTS,
  deriveWinnrEstateState,
  normaliseWinnrAccount,
  normaliseWinnrMailbox,
  winnrCall,
  winnrTokenConfigured,
} from "../../../supabase/functions/_shared/winnrClient";

const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/gsm-winnr-sync/index.ts"),
  "utf8",
);

describe("Winnr post-purchase API contract", () => {
  it("uses the current Winnr v1 base URL and verified resource paths", () => {
    expect(WINNR_BASE_URL).toBe("https://api.winnr.app/v1");
    expect(WINNR_ENDPOINTS.listDomains).toEqual({ method: "GET", path: "/domains" });
    expect(WINNR_ENDPOINTS.listEmailUsers).toEqual({ method: "GET", path: "/email-users" });
    expect(WINNR_ENDPOINTS.listWarmings).toEqual({ method: "GET", path: "/warming" });
    expect(WINNR_ENDPOINTS.warmingOverview).toEqual({ method: "GET", path: "/warming/overview" });
    expect(WINNR_ENDPOINTS.startWarming).toEqual({ method: "POST", path: "/warming/enable" });
    expect(WINNR_ENDPOINTS.startWarmingAsync).toEqual({ method: "POST", path: "/warming/enable-async" });
    expect(WINNR_ENDPOINTS.exportCredentials).toEqual({ method: "POST", path: "/export" });
  });

  it("keeps every external mutation behind the mutation gate", () => {
    expect(WINNR_MUTATION_ENDPOINTS).toEqual(
      expect.arrayContaining([
        "createDomain",
        "createEmailUser",
        "createEmailUsersBulk",
        "startWarming",
        "startWarmingAsync",
        "exportCredentials",
      ]),
    );
  });

  it("fails closed before fetch when a mutation is not explicitly allowed", async () => {
    let called = false;
    const result = await winnrCall("startWarmingAsync", {
      token: "wnr_test_only",
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe("forbidden");
    expect(called).toBe(false);
  });

  it("truthfully reports a missing server token without calling Winnr", async () => {
    let called = false;
    const result = await winnrCall("listEmailUsers", {
      token: null,
      fetchImpl: (async () => {
        called = true;
        return new Response("{}", { status: 200 });
      }) as typeof fetch,
    });
    expect(winnrTokenConfigured(null)).toBe(false);
    expect(result.error_code).toBe("token_missing");
    expect(called).toBe(false);
  });

  it("normalises the mailbox address without retaining credentials", () => {
    const observed = normaliseWinnrMailbox({
      id: "eu_123",
      full_address: "Mandy@Example-Outreach.com",
      display_name: "Mandy King",
      smtp_password: "must-not-survive",
      imap_password: "must-not-survive",
      password: "must-not-survive",
    });
    expect(observed.email).toBe("mandy@example-outreach.com");
    expect(observed.provider_mailbox_id).toBe("eu_123");
    expect(JSON.stringify(observed)).not.toContain("must-not-survive");
  });
});

describe("gsm-winnr-sync post-purchase safety", () => {
  it("reads WINNR_API_TOKEN only on the server and never embeds a token value", () => {
    expect(fn).toContain('Deno.env.get("WINNR_API_TOKEN")');
    expect(fn).not.toMatch(/WINNR_API_TOKEN\s*=\s*["'][^"']+wnr_/);
  });

  it("states the account is purchased when the token is missing", () => {
    expect(fn).toContain("account and mailbox estate have been purchased");
    expect(fn).not.toContain("Create the GSM Winnr account");
  });

  it("requires the exact founder confirmation before starting warmup", () => {
    expect(fn).toContain('const WARMUP_CONFIRMATION = "START GSM WINNR WARMUP"');
    expect(fn).toContain("external_action_confirmation_required");
    expect(fn).toContain('winnrCall<unknown>("startWarmingAsync"');
  });

  it("warms only already-synced GSM registry rows and excludes non-GSM mailboxes", () => {
    expect(fn).toContain('eq("estate_classification", "gsm")');
    expect(fn).toContain("isExcludedFromGsmEstate");
    expect(fn).toContain("no_synced_gsm_mailboxes");
  });

  it("never sends campaign email or creates a Smartlead campaign", () => {
    expect(fn).not.toContain("inbox/send");
    expect(fn).not.toContain("campaigns/create");
    expect(fn).not.toContain("server.smartlead.ai");
  });
});

describe("Winnr post-purchase entitlement truth", () => {
  it("exposes the verified account endpoint", () => {
    expect(WINNR_ENDPOINTS.getAccount).toEqual({ method: "GET", path: "/account" });
  });

  it("never copies the provider api token into the normalised account", () => {
    const account = normaliseWinnrAccount({
      name: "Mandy King",
      plan: "startup",
      stripe_subscription_status: "active",
      domains_limit: 10,
      domains_used: 0,
      email_users_limit: 50,
      email_users_used: 0,
      api_token: { id: "abc", name: "Liftor GSM", secret: "must-not-survive" },
    });
    expect(account.plan).toBe("startup");
    expect(account.email_users_limit).toBe(50);
    expect(JSON.stringify(account)).not.toContain("must-not-survive");
    expect(JSON.stringify(account)).not.toContain("api_token");
  });

  it("distinguishes a paid plan with no infrastructure from a built estate", () => {
    const paidEmpty = deriveWinnrEstateState(
      normaliseWinnrAccount({ stripe_subscription_status: "active", domains_limit: 10, domains_used: 0, email_users_limit: 50, email_users_used: 0 }),
    );
    expect(paidEmpty.estate_state).toBe("subscription_active_no_infrastructure");
    expect(paidEmpty.next_action).toContain("no sending domain has been bought");

    const domainsOnly = deriveWinnrEstateState(
      normaliseWinnrAccount({ stripe_subscription_status: "active", domains_used: 3, email_users_used: 0 }),
    );
    expect(domainsOnly.estate_state).toBe("domains_only_no_mailboxes");

    const built = deriveWinnrEstateState(
      normaliseWinnrAccount({ stripe_subscription_status: "active", domains_used: 10, email_users_used: 50 }),
    );
    expect(built.estate_state).toBe("infrastructure_present");

    const lapsed = deriveWinnrEstateState(normaliseWinnrAccount({ stripe_subscription_status: "canceled" }));
    expect(lapsed.estate_state).toBe("no_subscription");
  });

  it("keeps the founder surface free of stale 'account does not exist' wording", () => {
    const page = readFileSync(resolve(process.cwd(), "src/pages/founder/GSMOutbound.tsx"), "utf8");
    expect(page).not.toContain("Winnr account has not been created");
    expect(page).not.toContain("Create the GSM Winnr account");
    expect(page).toContain("SYNC GSM WINNR REGISTRY");
    expect(page).toContain("START GSM WINNR WARMUP");
    expect(page).not.toContain("campaigns/create");
  });
});
