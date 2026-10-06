import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  GSM_ONBOARD_CONFIRMATION,
  chunk,
  isOnboardApplyAuthorized,
  partitionAgainstSmartlead,
  selectGsmRegistry,
} from "../../../supabase/functions/_shared/gsmSmartleadOnboard";

const rows = [
  { email: "a@getgsm.net", estate_classification: "gsm" },
  { email: "b@getgsm.net", estate_classification: "gsm" },
  { email: "x@globalhealthaccesstrust.org", estate_classification: "ghat" },
  { email: "hello@neoncandy.online", estate_classification: "external_non_gsm" },
  // misclassified registry rows must still be excluded by the address check
  { email: "y@globalhealthaccesstrust.org", estate_classification: "gsm" },
  { email: "hello@neoncandy.online", estate_classification: "gsm" },
];

describe("GSM Smartlead onboarding scope", () => {
  it("never selects GHAT emails", () => {
    const sel = selectGsmRegistry(rows).map((r) => r.email);
    expect(sel.some((e) => e.endsWith("globalhealthaccesstrust.org"))).toBe(false);
  });
  it("never selects external_non_gsm / Neon Candy", () => {
    const sel = selectGsmRegistry(rows).map((r) => r.email);
    expect(sel.some((e) => e.includes("neoncandy"))).toBe(false);
    expect(sel).toEqual(["a@getgsm.net", "b@getgsm.net"]);
  });
  it("partitions idempotently against existing Smartlead accounts", () => {
    const gsm = selectGsmRegistry(rows);
    const { alreadyConnected, missing } = partitionAgainstSmartlead(gsm, new Set(["a@getgsm.net"]));
    expect(alreadyConnected).toHaveLength(1);
    expect(missing.map((r) => r.email)).toEqual(["b@getgsm.net"]);
  });
  it("chunks domains", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 5)).toEqual([[1, 2, 3, 4, 5], [6, 7]]);
  });
});

describe("GSM onboarding apply gate", () => {
  it("requires apply:true AND the exact confirmation", () => {
    expect(GSM_ONBOARD_CONFIRMATION).toBe("CONNECT GSM MAILBOXES TO SMARTLEAD");
    expect(isOnboardApplyAuthorized(true, GSM_ONBOARD_CONFIRMATION)).toBe(true);
    expect(isOnboardApplyAuthorized(true, "")).toBe(false);
    expect(isOnboardApplyAuthorized(true, "CONNECT GHAT MAILBOXES TO SMARTLEAD")).toBe(false);
    expect(isOnboardApplyAuthorized(true, GSM_ONBOARD_CONFIRMATION.toLowerCase())).toBe(false);
    expect(isOnboardApplyAuthorized("true", GSM_ONBOARD_CONFIRMATION)).toBe(false);
    expect(isOnboardApplyAuthorized(false, GSM_ONBOARD_CONFIRMATION)).toBe(false);
  });
});

describe("gsm-smartlead-onboard function source", () => {
  const src = readFileSync("supabase/functions/gsm-smartlead-onboard/index.ts", "utf8");
  it("preview path returns before any create or credential export", () => {
    const gate = src.indexOf("isOnboardApplyAuthorized(apply, confirmation)");
    expect(gate).toBeGreaterThan(0);
    expect(src.indexOf("email-accounts/save")).toBeGreaterThan(gate);
    expect(src.indexOf('"exportCredentials"')).toBeGreaterThan(gate);
  });
  it("is founder/admin gated, GSM only, never returns credentials or touches campaigns", () => {
    expect(src).toContain('roleSet.has("founder")');
    expect(src).toContain("isGsmEstateEmail");
    expect(src).toContain("warmup_enabled: false");
    expect(src).not.toMatch(/GHAT_/);
    expect(src).not.toMatch(/console\.log/);
    expect(src).not.toMatch(/campaigns|leads\/|webhook/i);
    expect(src).not.toContain("created_emails");
  });
});

import { GSM_ONBOARD_MAX_APPLY_EMAILS, resolveOnboardWhitelist } from "../../../supabase/functions/_shared/gsmSmartleadOnboard";

describe("GSM onboarding canary whitelist", () => {
  const safe = selectGsmRegistry(rows);
  it("blocks apply without emails", () => {
    expect(resolveOnboardWhitelist(undefined, safe, true)).toEqual({ ok: false, blocker: "emails_required_for_apply" });
    expect(resolveOnboardWhitelist([], safe, true)).toEqual({ ok: false, blocker: "emails_required_for_apply" });
  });
  it("preview without emails covers the whole estate", () => {
    const r = resolveOnboardWhitelist(undefined, safe, false);
    expect(r.ok && r.scoped).toBe(null);
  });
  it("blocks more than 10 emails on apply", () => {
    const many = Array.from({ length: GSM_ONBOARD_MAX_APPLY_EMAILS + 1 }, (_, i) => `m${i}@getgsm.net`);
    expect(resolveOnboardWhitelist(many, safe, true)).toEqual({ ok: false, blocker: "too_many_emails_for_apply" });
  });
  it("GHAT or Neon Candy requested emails block apply entirely", () => {
    for (const bad of ["x@globalhealthaccesstrust.org", "y@globalhealthaccesstrust.org", "hello@neoncandy.online", "zz@getgsm.net"]) {
      const r = resolveOnboardWhitelist(["a@getgsm.net", bad], safe, true);
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.blocker).toBe("invalid_requested_email");
    }
  });
  it("whitelist limits selection and normalizes", () => {
    const r = resolveOnboardWhitelist(["  A@GetGSM.net ", "a@getgsm.net"], safe, true);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.scoped!.map((x) => x.email)).toEqual(["a@getgsm.net"]);
  });
  it("exact confirmation is still required alongside a valid whitelist", () => {
    expect(resolveOnboardWhitelist(["a@getgsm.net"], safe, true).ok).toBe(true);
    expect(isOnboardApplyAuthorized(true, "connect gsm mailboxes to smartlead")).toBe(false);
  });
  it("function source resolves the whitelist before any create call", () => {
    const src = readFileSync("supabase/functions/gsm-smartlead-onboard/index.ts", "utf8");
    const wl = src.indexOf("resolveOnboardWhitelist(body.emails");
    expect(wl).toBeGreaterThan(0);
    expect(src.indexOf("email-accounts/save")).toBeGreaterThan(wl);
  });
});
