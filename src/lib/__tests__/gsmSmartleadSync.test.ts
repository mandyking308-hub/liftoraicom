import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  buildMailboxUpdate,
  extractSmartleadAccounts,
  mapSmartleadAccount,
  reconcileSmartleadAccounts,
} from "../../../supabase/functions/_shared/gsmSmartleadSync";

const fn = readFileSync(
  resolve(process.cwd(), "supabase/functions/gsm-smartlead-mailbox-sync/index.ts"),
  "utf8",
);

const acct = (over: Record<string, unknown> = {}) => ({
  id: 101,
  email: "growth@gsm-outbound-01.com",
  from_name: "Growth",
  is_smtp_success: true,
  is_imap_success: true,
  warmup_enabled: true,
  daily_limit: 25,
  ...over,
});

describe("gsm smartlead sync mapping", () => {
  it("extracts accounts from array and {data} payloads", () => {
    expect(extractSmartleadAccounts([acct()])).toHaveLength(1);
    expect(extractSmartleadAccounts({ data: [acct(), acct()] })).toHaveLength(2);
    expect(extractSmartleadAccounts(null)).toHaveLength(0);
  });

  it("preserves smtp, imap, status, daily limit, sender name and warmup signal", () => {
    const o = mapSmartleadAccount(acct());
    expect(o).toMatchObject({
      smartlead_email_account_id: "101",
      sender_name: "Growth",
      smtp_status: "ok",
      imap_status: "ok",
      smartlead_status: "connected",
      configured_daily_limit: 25,
      warmup_signal: "enabled",
      warmup_status: "warming",
    });
    expect(buildMailboxUpdate(o).last_provider_check_at).toBeTruthy();
  });

  it("never reports warmed or campaign ready from a warmup enabled flag", () => {
    const on = mapSmartleadAccount(acct({ warmup_enabled: true }));
    const off = mapSmartleadAccount(acct({ warmup_enabled: false }));
    expect(on.warmup_status).toBe("warming");
    expect(off.warmup_status).toBe("not_started");
    expect([on.warmup_status, off.warmup_status]).not.toContain("campaign_ready");
    expect([on.warmup_status, off.warmup_status]).not.toContain("warmed");
  });
});

describe("reconciliation of observed accounts against the GSM registry", () => {
  it("excludes Neon Candy from candidates entirely", () => {
    const r = reconcileSmartleadAccounts(
      [mapSmartleadAccount(acct({ id: 9, email: "hello@neoncandy.online" }))],
      [],
    );
    expect(r.excluded.map((e) => e.email)).toEqual(["hello@neoncandy.online"]);
    expect(r.gsm_candidates).toHaveLength(0);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(0);
  });

  it("distinguishes matched existing rows from genuinely unmatched accounts", () => {
    const observed = [
      mapSmartleadAccount(acct({ id: 1, email: "a@gsm-outbound-01.com" })),
      mapSmartleadAccount(acct({ id: 2, email: "b@gsm-outbound-01.com" })),
      mapSmartleadAccount(acct({ id: 3, email: "c@gsm-outbound-02.com" })),
    ];
    const r = reconcileSmartleadAccounts(observed, [
      { id: "row-a", email: "A@GSM-OUTBOUND-01.com" },
      { id: "row-b", email: "other@x.com", smartlead_email_account_id: "2" },
    ]);
    expect(r.matched.map((m) => m.registry_id).sort()).toEqual(["row-a", "row-b"]);
    expect(r.unmatched.map((u) => u.email)).toEqual(["c@gsm-outbound-02.com"]);
  });

  it("labels everything unmatched only when the registry is empty", () => {
    const r = reconcileSmartleadAccounts([mapSmartleadAccount(acct())], []);
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(1);
  });
});

describe("gsm smartlead sync edge function safety", () => {
  it("reads the canonical server secret and no provider table columns", () => {
    expect(fn).toContain('Deno.env.get("SMARTLEAD_API_KEY")');
    expect(fn).toContain("smartlead_api_key_missing");
    expect(fn).not.toContain("outbound_providers");
    expect(fn).not.toContain("api_key_encrypted");
  });

  it("never returns or stores the key", () => {
    expect(fn).not.toMatch(/api_key:\s*apiKey/);
    expect(fn).not.toMatch(/console\.log\([^)]*apiKey/);
  });

  it("stays founder/admin gated and read-only against Smartlead", () => {
    expect(fn).toContain('roleSet.has("founder")');
    expect(fn).toContain('method: "GET"');
    expect(fn).not.toMatch(/method:\s*["'](POST|PUT|PATCH|DELETE)["']/);
    expect(fn).not.toContain("campaigns/create");
  });

  it("can only update existing GSM mailboxes, never insert one", () => {
    expect(fn).toContain('from("gsm_mailboxes")\n        .update(');
    expect(fn).not.toMatch(/from\("gsm_mailboxes"\)\s*\.\s*(insert|upsert)/);
  });
});

describe("smartlead field shape", () => {
  it("reads the sending address from from_email as Smartlead returns it", () => {
    const o = mapSmartleadAccount({ id: 7, from_email: "Ops@GSM-Outbound-03.com" });
    expect(o.email).toBe("ops@gsm-outbound-03.com");
    expect(o.estate_classification).toBe("gsm");
  });

  it("reports an address-less account as unidentified, not as Neon Candy", () => {
    const r = reconcileSmartleadAccounts([mapSmartleadAccount({ id: 8 })], []);
    expect(r.unidentified).toHaveLength(1);
    expect(r.excluded).toHaveLength(0);
    expect(r.gsm_candidates).toHaveLength(0);
  });
});
