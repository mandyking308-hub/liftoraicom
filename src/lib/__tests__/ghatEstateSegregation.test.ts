import { describe, expect, it } from "vitest";
import {
  classifyDomainEstate,
  classifySenderEstate,
  estateFromWinnrTags,
  GHAT_DOMAINS,
  GHAT_EXPECTED_EMAILS,
  GHAT_TARGET_MAILBOXES,
  isGhatEstateEmail,
  isGsmEstateEmail,
  resolveEstate,
} from "../../../supabase/functions/_shared/senderEstates";
import {
  buildEstateSnapshot,
  classifyEstate,
  domainEstate,
  evaluateSenderInfrastructureReadiness,
  GSM_LAUNCH_POOL_KEY,
  GSM_TARGET_TOTAL_MAILBOXES,
  isGsmEstateMailbox,
  mailboxEstate,
  pinnedSenderStillUsable,
  selectGsmMailboxes,
  type GsmDomainSignals,
  type GsmMailboxSignals,
} from "../../../supabase/functions/_shared/gsmSenderEstate";

const readyDomain = (over: Partial<GsmDomainSignals> = {}): GsmDomainSignals => ({
  id: "dom-1",
  domain: "getgsm.net",
  provisioning_status: "provisioned",
  dns_status: "verified",
  spf_ok: true,
  dkim_ok: true,
  dmarc_ok: true,
  estate_classification: "gsm",
  ...over,
});

const readyMailbox = (over: Partial<GsmMailboxSignals> = {}): GsmMailboxSignals => ({
  id: "mb-1",
  email: "sender@getgsm.net",
  sending_domain_id: "dom-1",
  provider: "winnr",
  provider_mailbox_id: "p1",
  smartlead_email_account_id: "s1",
  smtp_status: "ok",
  imap_status: "ok",
  smartlead_status: "connected",
  warmup_status: "completed",
  provider_health: "healthy",
  configured_daily_limit: 50,
  health_score: 90,
  retired: false,
  active: true,
  estate_classification: "gsm",
  ...over,
});

describe("GHAT / GSM estate segregation", () => {
  it("classifies the GHAT domain as ghat and never as gsm", () => {
    for (const email of GHAT_EXPECTED_EMAILS) {
      expect(classifySenderEstate(email)).toBe("ghat");
      expect(isGhatEstateEmail(email)).toBe(true);
      expect(isGsmEstateEmail(email)).toBe(false);
    }
    expect(classifyDomainEstate(GHAT_DOMAINS[0])).toBe("ghat");
    expect(GHAT_EXPECTED_EMAILS).toHaveLength(GHAT_TARGET_MAILBOXES);
  });

  it("classifies GSM addresses as gsm and never as ghat", () => {
    for (const email of ["a@getgsm.net", "b@joingsm.com", "c@usegsm.com"]) {
      expect(classifyEstate(email)).toBe("gsm");
      expect(isGhatEstateEmail(email)).toBe(false);
    }
  });

  it("keeps legacy Neon Candy outside every managed estate", () => {
    expect(classifySenderEstate("hello@neoncandy.online")).toBe("external_non_gsm");
    expect(classifyDomainEstate("neoncandy.online")).toBe("external_non_gsm");
    expect(isGsmEstateEmail("hello@neoncandy.online")).toBe(false);
    expect(isGhatEstateEmail("hello@neoncandy.online")).toBe(false);
  });

  it("lets the dedicated domain win over a mis-stamped column or provider tag", () => {
    const row = { email: GHAT_EXPECTED_EMAILS[0], estate_classification: "gsm" };
    expect(mailboxEstate(row)).toBe("ghat");
    expect(isGsmEstateMailbox(row)).toBe(false);
    expect(resolveEstate(GHAT_EXPECTED_EMAILS[0], '["GSM-Outbound"]')).toBe("ghat");
    expect(estateFromWinnrTags('["GHAT-Outbound"]')).toBe("ghat");
    expect(estateFromWinnrTags('["GSM-Outbound"]')).toBe("gsm");
    expect(domainEstate({ domain: GHAT_DOMAINS[0], estate_classification: "gsm" })).toBe("ghat");
  });

  it("never selects a GHAT mailbox for a GSM allocation", () => {
    const ghat = readyMailbox({
      id: "mb-ghat",
      email: GHAT_EXPECTED_EMAILS[0],
      sending_domain_id: "dom-ghat",
      estate_classification: "ghat",
    });
    const ghatDomain = readyDomain({ id: "dom-ghat", domain: GHAT_DOMAINS[0], estate_classification: "ghat" });
    const result = selectGsmMailboxes([ghat], [ghatDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 1,
    });
    expect(result.selected).toHaveLength(0);
    expect(result.rejected[0].codes).toContain("excluded_non_gsm_estate:ghat");
    expect(pinnedSenderStillUsable("mb-ghat", [ghat], [ghatDomain])).toBe(false);
  });

  it("excludes GHAT from GSM capacity counts and sender readiness", () => {
    const gsm = readyMailbox();
    const ghat = readyMailbox({
      id: "mb-ghat",
      email: GHAT_EXPECTED_EMAILS[1],
      sending_domain_id: "dom-ghat",
      estate_classification: "ghat",
    });
    const domains = [readyDomain(), readyDomain({ id: "dom-ghat", domain: GHAT_DOMAINS[0], estate_classification: "ghat" })];
    const snapshot = buildEstateSnapshot([gsm, ghat], domains, []);
    expect(snapshot.mailbox_count).toBe(1);
    expect(snapshot.domain_count).toBe(1);
    expect(snapshot.target_total_mailboxes).toBe(GSM_TARGET_TOTAL_MAILBOXES);
    expect(GSM_TARGET_TOTAL_MAILBOXES).toBe(50);
    expect(GHAT_TARGET_MAILBOXES).toBe(10);

    const readiness = evaluateSenderInfrastructureReadiness({ mailboxes: [ghat], domains, allocations: [] });
    expect(readiness.ready_mailbox_count).toBe(0);
    expect(readiness.sender_infrastructure_ready).toBe(false);
  });
});
