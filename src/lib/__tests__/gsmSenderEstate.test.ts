import { describe, expect, it } from "vitest";
import {
  EXTERNAL_NON_GSM,
  GSM_EVERGREEN_POOL_KEY,
  GSM_EVERGREEN_TARGET_CAPACITY,
  GSM_LAUNCH_POOL_KEY,
  GSM_MIN_HEALTH_SCORE,
  GSM_LAUNCH_TARGET_CAPACITY,
  GSM_OWNER_LEGAL_ENTITY,
  GSM_TARGET_TOTAL_MAILBOXES,
  buildEstateSnapshot,
  classifyEstate,
  evaluateMailboxReadiness,
  evaluateSenderInfrastructureReadiness,
  isExcludedFromGsmEstate,
  isStickyAllocation,
  pinnedSenderStillUsable,
  releasableAllocations,
  selectGsmMailboxes,
  selectSmartleadSenderAccountIds,
  stripSecretFields,
  type GsmAllocationRecord,
  type GsmDomainSignals,
  type GsmMailboxSignals,
} from "../../../supabase/functions/_shared/gsmSenderEstate";

const readyDomain: GsmDomainSignals = {
  id: "dom-1",
  domain: "gsm-outbound-01.com",
  provisioning_status: "provisioned",
  dns_status: "verified",
  spf_ok: true,
  dkim_ok: true,
  dmarc_ok: true,
};

function mailbox(over: Partial<GsmMailboxSignals> = {}): GsmMailboxSignals {
  return {
    id: over.id ?? "mb-1",
    email: over.email ?? "growth@gsm-outbound-01.com",
    sending_domain_id: "dom-1",
    provider: "winnr",
    provider_mailbox_id: "w-1",
    smartlead_email_account_id: "sl-1",
    smtp_status: "ok",
    imap_status: "ok",
    smartlead_status: "connected",
    warmup_status: "completed",
    provider_health: "healthy",
    configured_daily_limit: 25,
    retired: false,
    active: true,
    ...over,
  };
}

describe("GSM readiness", () => {
  it("marks a fully healthy mailbox campaign ready", () => {
    const r = evaluateMailboxReadiness(mailbox(), readyDomain);
    expect(r.readiness_state).toBe("campaign_ready");
    expect(r.campaign_ready).toBe(true);
    expect(r.usable_daily_capacity).toBe(25);
  });

  it("existing is not ready: unverified domain blocks readiness", () => {
    const r = evaluateMailboxReadiness(mailbox(), { ...readyDomain, dns_status: "pending" });
    expect(r.readiness_state).toBe("dns_pending");
    expect(r.campaign_ready).toBe(false);
  });

  it("SMTP failure blocks readiness", () => {
    const r = evaluateMailboxReadiness(mailbox({ smtp_status: "failed" }), readyDomain);
    expect(r.readiness_state).toBe("smtp_failed");
    expect(r.campaign_ready).toBe(false);
  });

  it("IMAP failure blocks readiness", () => {
    const r = evaluateMailboxReadiness(mailbox({ smtp_status: "ok", imap_status: "failed" }), readyDomain);
    expect(r.readiness_state).toBe("imap_failed");
  });

  it("smartlead disconnection blocks readiness", () => {
    const r = evaluateMailboxReadiness(mailbox({ smartlead_status: "disconnected" }), readyDomain);
    expect(r.campaign_ready).toBe(false);
  });

  it("warming is never campaign ready", () => {
    const r = evaluateMailboxReadiness(mailbox({ warmup_status: "in_progress" }), readyDomain);
    expect(r.readiness_state).toBe("warming");
    expect(r.campaign_ready).toBe(false);
    expect(r.usable_daily_capacity).toBe(0);
  });

  it("quarantined and retired mailboxes are excluded", () => {
    expect(evaluateMailboxReadiness(mailbox({ quarantined_reason: "spam_complaint" }), readyDomain).readiness_state)
      .toBe("quarantined");
    expect(evaluateMailboxReadiness(mailbox({ retired: true }), readyDomain).readiness_state).toBe("retired");
    expect(evaluateMailboxReadiness(mailbox({ active: false }), readyDomain).readiness_state).toBe("retired");
  });

  it("a mailbox with no provider identifier is only pending", () => {
    const r = evaluateMailboxReadiness(
      mailbox({ provider_mailbox_id: null, smartlead_email_account_id: null }),
      readyDomain,
    );
    expect(r.campaign_ready).toBe(false);
  });

  it("zero configured daily limit blocks readiness", () => {
    expect(evaluateMailboxReadiness(mailbox({ configured_daily_limit: 0 }), readyDomain).campaign_ready).toBe(false);
  });
});

describe("Neon Candy exclusion", () => {
  it("classifies the legacy mailbox as external", () => {
    expect(isExcludedFromGsmEstate("hello@neoncandy.online")).toBe(true);
    expect(isExcludedFromGsmEstate("HELLO@NeonCandy.Online")).toBe(true);
    expect(classifyEstate("hello@neoncandy.online")).toBe(EXTERNAL_NON_GSM);
    expect(classifyEstate("growth@gsm-outbound-01.com")).toBe("gsm");
  });

  it("never selects the legacy mailbox even when otherwise healthy", () => {
    const neon = mailbox({ id: "mb-neon", email: "hello@neoncandy.online" });
    const res = selectGsmMailboxes([neon], [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 1,
      founder_override: true,
    });
    expect(res.selected).toHaveLength(0);
    expect(res.rejected[0].codes).toContain("excluded_non_gsm_neon_candy");
  });

  it("keeps the legacy mailbox out of estate counts", () => {
    const snap = buildEstateSnapshot(
      [mailbox(), mailbox({ id: "mb-neon", email: "hello@neoncandy.online" })],
      [readyDomain],
      [],
    );
    expect(snap.mailbox_count).toBe(1);
    expect(snap.neon_candy_excluded).toBe(true);
  });
});

describe("Pool selection", () => {
  const a = mailbox({ id: "mb-a", email: "a@gsm-outbound-01.com", configured_daily_limit: 30 });
  const b = mailbox({ id: "mb-b", email: "b@gsm-outbound-01.com", configured_daily_limit: 20 });
  const warming = mailbox({ id: "mb-c", email: "c@gsm-outbound-01.com", warmup_status: "warming" });

  it("selects for the Launch Lane by highest usable capacity", () => {
    const res = selectGsmMailboxes([b, a, warming], [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 2,
    });
    expect(res.decision).toBe("selected");
    expect(res.selected.map((s) => s.mailbox_id)).toEqual(["mb-a", "mb-b"]);
    expect(res.total_daily_capacity).toBe(50);
  });

  it("selects for an Evergreen allocation and reports shortfall truthfully", () => {
    const res = selectGsmMailboxes([a], [readyDomain], [], {
      pool_key: GSM_EVERGREEN_POOL_KEY,
      requested_count: 5,
      business_id: "biz-billy",
    });
    expect(res.decision).toBe("partial");
    expect(res.shortfall).toBe(4);
    expect(res.ok).toBe(false);
  });

  it("never moves a sticky in-flight sender to another business", () => {
    const alloc: GsmAllocationRecord = {
      id: "al-1",
      mailbox_id: "mb-a",
      pool_key: GSM_LAUNCH_POOL_KEY,
      business_id: "biz-one",
      allocation_status: "active",
      in_flight: true,
    };
    expect(isStickyAllocation(alloc)).toBe(true);
    const res = selectGsmMailboxes([a], [readyDomain], [alloc], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 1,
      business_id: "biz-two",
      founder_override: true,
    });
    expect(res.selected).toHaveLength(0);
    expect(res.rejected[0].codes).toContain("sticky_in_flight_allocation");
  });

  it("releases only non-sticky allocations when a launch finishes", () => {
    const out = releasableAllocations([
      { id: "al-1", mailbox_id: "mb-a", allocation_status: "active", in_flight: true },
      { id: "al-2", mailbox_id: "mb-b", allocation_status: "active", in_flight: false },
      { id: "al-3", mailbox_id: "mb-c", allocation_status: "released" },
    ]);
    expect(out.releasable).toEqual(["al-2"]);
    expect(out.retained_sticky).toEqual(["al-1"]);
  });

  it("a founder override still cannot select an unsafe mailbox", () => {
    const res = selectGsmMailboxes([warming], [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 1,
      founder_override: true,
    });
    expect(res.decision).toBe("blocked_no_ready_mailbox");
  });
});

describe("Sender infrastructure readiness gate", () => {
  it("is false today because zero GSM mailboxes exist", () => {
    const r = evaluateSenderInfrastructureReadiness({ mailboxes: [], domains: [], allocations: [] });
    expect(r.sender_infrastructure_ready).toBe(false);
    expect(r.blockers).toContain("no_gsm_mailboxes_registered");
  });

  it("is false when capacity exists but nothing is allocated to the business", () => {
    const r = evaluateSenderInfrastructureReadiness({
      mailboxes: [mailbox()],
      domains: [readyDomain],
      allocations: [],
      business_id: "biz-billy",
    });
    expect(r.ready_mailbox_count).toBe(1);
    expect(r.sender_infrastructure_ready).toBe(false);
    expect(r.blockers).toContain("insufficient_allocated_ready_capacity");
  });

  it("is true when allocated healthy capacity meets the minimum", () => {
    const r = evaluateSenderInfrastructureReadiness({
      mailboxes: [mailbox()],
      domains: [readyDomain],
      allocations: [
        {
          id: "al-1",
          mailbox_id: "mb-1",
          pool_key: GSM_LAUNCH_POOL_KEY,
          business_id: "biz-billy",
          allocation_status: "active",
        },
      ],
      business_id: "biz-billy",
      pool_key: GSM_LAUNCH_POOL_KEY,
    });
    expect(r.sender_infrastructure_ready).toBe(true);
    expect(r.total_daily_capacity).toBe(25);
  });
});

describe("Estate model and secret safety", () => {
  it("keeps the documented capacity model", () => {
    expect(GSM_TARGET_TOTAL_MAILBOXES).toBe(50);
    expect(GSM_LAUNCH_TARGET_CAPACITY).toBe(30);
    expect(GSM_EVERGREEN_TARGET_CAPACITY).toBe(20);
    expect(GSM_OWNER_LEGAL_ENTITY).toBe("Global Solutions Management LLC");
  });

  it("never persists credentials from a provider payload", () => {
    const cleaned = stripSecretFields({
      email: "a@gsm-outbound-01.com",
      smtp_password: "hunter2",
      imap_password: "hunter2",
      api_key: "sk-live",
      winnr_api_token: "tok",
      client_secret: "s",
      credential_blob: "x",
      configured_daily_limit: 25,
    });
    expect(cleaned).toEqual({ email: "a@gsm-outbound-01.com", configured_daily_limit: 25 });
  });

  it("treats duplicate provider ids as one mailbox in a snapshot by id", () => {
    const dup = [mailbox({ id: "mb-a", email: "a@gsm-outbound-01.com" })];
    const snap = buildEstateSnapshot(dup, [readyDomain], []);
    expect(snap.mailbox_count).toBe(1);
    expect(snap.campaign_ready_count).toBe(1);
    expect(snap.launch_allocated).toBe(0);
    expect(snap.evergreen_allocated).toBe(0);
  });
});

describe("Health score gate and Smartlead sender selection", () => {
  it("excludes a mailbox with a low health score", () => {
    const r = evaluateMailboxReadiness(mailbox({ health_score: 40 }), readyDomain);
    expect(r.campaign_ready).toBe(false);
    expect(r.readiness_state).toBe("quarantined");
  });

  it("keeps a healthy scored mailbox campaign ready", () => {
    const r = evaluateMailboxReadiness(mailbox({ health_score: 95 }), readyDomain);
    expect(r.campaign_ready).toBe(true);
  });

  it("returns only Smartlead account ids of ready mailboxes", () => {
    const boxes = [
      mailbox({ id: "mb-ok", email: "a@gsm-outbound-01.com", smartlead_email_account_id: "sl-ok", health_score: 90 }),
      mailbox({ id: "mb-warm", email: "b@gsm-outbound-01.com", smartlead_email_account_id: "sl-warm", warmup_status: "warming" }),
      mailbox({ id: "mb-q", email: "c@gsm-outbound-01.com", smartlead_email_account_id: "sl-q", quarantined_reason: "spam_complaint" }),
      mailbox({ id: "mb-retired", email: "d@gsm-outbound-01.com", smartlead_email_account_id: "sl-r", retired: true }),
      mailbox({ id: "mb-nosl", email: "e@gsm-outbound-01.com", smartlead_email_account_id: null }),
      mailbox({ id: "mb-neon", email: "hello@neoncandy.online", smartlead_email_account_id: "sl-neon" }),
      mailbox({ id: "mb-low", email: "f@gsm-outbound-01.com", smartlead_email_account_id: "sl-low", health_score: 10 }),
    ];
    const sel = selectSmartleadSenderAccountIds(boxes, [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 5,
      business_id: "biz-billy",
    });
    expect(sel.smartlead_email_account_ids).toEqual(["sl-ok"]);
    expect(sel.shortfall).toBe(4);
    expect(sel.pinned_sender_retained).toBeNull();
  });

  it("keeps a usable pinned thread sender pinned", () => {
    const boxes = [
      mailbox({ id: "mb-pin", email: "pin@gsm-outbound-01.com", smartlead_email_account_id: "sl-pin", health_score: 90 }),
      mailbox({ id: "mb-new", email: "new@gsm-outbound-01.com", smartlead_email_account_id: "sl-new", health_score: 90 }),
    ];
    const sel = selectSmartleadSenderAccountIds(boxes, [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 2,
      business_id: "biz-billy",
      pinned_mailbox_id: "mb-pin",
    });
    expect(sel.pinned_sender_retained).toBe("mb-pin");
    expect(sel.smartlead_email_account_ids[0]).toBe("sl-pin");
    expect(new Set(sel.smartlead_email_account_ids).size).toBe(sel.smartlead_email_account_ids.length);
  });

  it("drops a pinned sender that is no longer usable", () => {
    const boxes = [mailbox({ id: "mb-pin", email: "pin@gsm-outbound-01.com", quarantined_reason: "bounced" })];
    expect(pinnedSenderStillUsable("mb-pin", boxes, [readyDomain])).toBe(false);
    const sel = selectSmartleadSenderAccountIds(boxes, [readyDomain], [], {
      pool_key: GSM_LAUNCH_POOL_KEY,
      requested_count: 1,
      pinned_mailbox_id: "mb-pin",
    });
    expect(sel.smartlead_email_account_ids).toEqual([]);
    expect(sel.pinned_sender_retained).toBeNull();
  });

  it("keeps the health threshold at the documented value", () => {
    expect(GSM_MIN_HEALTH_SCORE).toBe(70);
  });
});
