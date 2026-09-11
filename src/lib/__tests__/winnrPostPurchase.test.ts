import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  WINNR_BASE_URL,
  WINNR_ENDPOINTS,
  WINNR_MUTATION_ENDPOINTS,
  normaliseWinnrMailbox,
  winnrCall,
  winnrTokenConfigured,
} from "../../../supabase/functions/_shared/winnrClient";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const winnrFn = read("supabase/functions/gsm-winnr-sync/index.ts");
const smartleadFn = read("supabase/functions/gsm-smartlead-mailbox-sync/index.ts");
const webhookStatusFn = read("supabase/functions/smartlead-webhook-status/index.ts");
const poolFn = read("supabase/functions/gsm-pool-allocate/index.ts");
const founderPage = read("src/pages/founder/GSMOutbound.tsx");

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

  it("normalises mailbox identity without retaining credentials", () => {
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
    expect(winnrFn).toContain('Deno.env.get("WINNR_API_TOKEN")');
    expect(winnrFn).not.toMatch(/WINNR_API_TOKEN\s*=\s*["'][^"']+wnr_/);
  });

  it("states the account is purchased when the token is missing", () => {
    expect(winnrFn).toContain("account and mailbox estate have been purchased");
    expect(winnrFn).not.toContain("Create the GSM Winnr account");
  });

  it("requires separate exact founder confirmations for registry sync and warmup", () => {
    expect(winnrFn).toContain('const SYNC_CONFIRMATION = "SYNC GSM WINNR REGISTRY"');
    expect(winnrFn).toContain('const WARMUP_CONFIRMATION = "START GSM WINNR WARMUP"');
    expect(winnrFn).toContain("external_action_confirmation_required");
    expect(winnrFn).toContain('winnrCall<unknown>("startWarmingAsync"');
  });

  it("warms only already-synced GSM registry rows and excludes non-GSM mailboxes", () => {
    expect(winnrFn).toContain('eq("estate_classification", "gsm")');
    expect(winnrFn).toContain("isExcludedFromGsmEstate");
    expect(winnrFn).toContain("no_synced_gsm_mailboxes");
  });

  it("uses a conservative new-domain warmup profile", () => {
    expect(winnrFn).toContain('emails_per_day: 15');
    expect(winnrFn).toContain('rampup_speed: "slow"');
    expect(winnrFn).toContain('warmup_status: "warming"');
  });

  it("never sends campaign email or creates a Smartlead campaign", () => {
    expect(winnrFn).not.toContain("inbox/send");
    expect(winnrFn).not.toContain("campaigns/create");
    expect(winnrFn).not.toContain("server.smartlead.ai");
  });
});

describe("GSM Smartlead reconciliation safety", () => {
  it("uses a server-side key and provider GET only", () => {
    expect(smartleadFn).toContain('Deno.env.get("SMARTLEAD_API_KEY")');
    expect(smartleadFn).toContain('method: "GET"');
    expect(smartleadFn).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
  });

  it("requires founder confirmation before registry writes", () => {
    expect(smartleadFn).toContain('const APPLY_CONFIRMATION = "SYNC GSM SMARTLEAD REGISTRY"');
    expect(smartleadFn).toContain("external_action_confirmation_required");
  });

  it("updates existing gsm_mailboxes only and never creates campaigns", () => {
    expect(smartleadFn).toContain('.from("gsm_mailboxes")');
    expect(smartleadFn).toContain(".update(");
    expect(smartleadFn).not.toMatch(/from\("gsm_mailboxes"\)[\s\S]{0,80}\.(insert|upsert)\(/);
    expect(smartleadFn).not.toContain("campaigns/create");
  });

  it("treats Smartlead warmup-enabled as warming, never campaign-ready", () => {
    expect(smartleadFn).toContain('warmup_status: a.warmup_enabled === true ? "warming" : "not_started"');
    expect(smartleadFn).not.toContain('warmup_status: "campaign_ready"');
  });
});

describe("Webhook and sender-pool controls", () => {
  it("webhook status exposes readiness booleans but never the secret", () => {
    expect(webhookStatusFn).toContain('Deno.env.get("SMARTLEAD_WEBHOOK_SECRET")');
    expect(webhookStatusFn).toContain("webhook_secret_configured");
    expect(webhookStatusFn).not.toMatch(/SMARTLEAD_WEBHOOK_SECRET.*return/i);
    expect(webhookStatusFn).not.toContain("webhook_secret:");
  });

  it("pool allocation is founder/admin gated, confirmation-gated and campaign-ready only", () => {
    expect(poolFn).toContain('const APPLY_CONFIRMATION = "ALLOCATE GSM SENDER POOLS"');
    expect(poolFn).toContain("selectGsmMailboxes");
    expect(poolFn).toContain('eq("estate_classification", "gsm")');
    expect(poolFn).toContain("thread_sticky: true");
    expect(poolFn).not.toContain("server.smartlead.ai");
    expect(poolFn).not.toContain("api.winnr.app");
  });
});

describe("Founder GSM outbound control panel", () => {
  it("describes the real post-purchase state and no longer claims Winnr does not exist", () => {
    expect(founderPage).toContain("The Winnr estate is purchased");
    expect(founderPage).toContain("has been purchased");
    expect(founderPage).not.toContain("The Winnr account has not been created");
    expect(founderPage).not.toContain("Create the GSM Winnr account");
  });

  it("wires every safe operational stage", () => {
    expect(founderPage).toContain("Winnr preview");
    expect(founderPage).toContain("SYNC GSM WINNR REGISTRY");
    expect(founderPage).toContain("START GSM WINNR WARMUP");
    expect(founderPage).toContain("SYNC GSM SMARTLEAD REGISTRY");
    expect(founderPage).toContain("smartlead-webhook-status");
    expect(founderPage).toContain("ALLOCATE GSM SENDER POOLS");
  });

  it("keeps Neon Candy exclusion and founder campaign approval explicit", () => {
    expect(founderPage).toContain("hello@neoncandy.online");
    expect(founderPage).toContain("Founder campaign approval remains a separate gate");
  });
});
