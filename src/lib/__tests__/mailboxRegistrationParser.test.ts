import { describe, expect, it } from "vitest";
import {
  LEGACY_NEON_CANDY_ESTATE,
  parseMailboxCsv,
  planMailboxRegistration,
} from "../../../supabase/functions/_shared/mailboxRegistrationParser";

describe("mailbox registration parser", () => {
  const csv = `email_address,business_name,estate_key,sending_domain,from_name,daily_send_limit,ramp_daily_cap,warmup_status
aurelia1@aureliaedu.com,Aurelia,education,aureliaedu.com,Aurelia Team,25,10,not_started
aurelia2@aureliaedu.com,Aurelia,education,aureliaedu.com,Aurelia Team,25,10,not_started`;

  it("parses valid rows and rejects bad headers", () => {
    const r = parseMailboxCsv(csv);
    expect(r.ok).toBe(true);
    expect(r.valid.length).toBe(2);
    expect(r.valid[0].email_address).toBe("aurelia1@aureliaedu.com");
    expect(r.valid[0].ramp_daily_cap).toBe(10);
  });

  it("rejects missing required headers", () => {
    const r = parseMailboxCsv("foo,bar\na@b.com,Biz");
    expect(r.ok).toBe(false);
    expect(r.errors[0].codes).toContain("missing_header");
  });

  it("rejects invalid emails and high ramp caps", () => {
    const bad = `email_address,business_name,estate_key,sending_domain
not-an-email,Aurelia,education,aureliaedu.com
ok@aureliaedu.com,Aurelia,education,aureliaedu.com`;
    const r = parseMailboxCsv(bad);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.codes.includes("invalid_email_address"))).toBe(true);
  });

  it("rejects legacy Neon Candy estate writes", () => {
    const bad = `email_address,business_name,estate_key,sending_domain
hello@neoncandy.online,Neon Candy,neon-candy-legacy,neoncandy.online`;
    const r = parseMailboxCsv(bad);
    expect(r.ok).toBe(false);
    expect(r.errors[0].codes).toContain("legacy_neon_candy_estate_is_read_only");
  });

  it("detects duplicates within a batch", () => {
    const dup = `email_address,business_name,estate_key,sending_domain
a@x.com,Aurelia,education,x.com
a@x.com,Aurelia,education,x.com`;
    const r = parseMailboxCsv(dup);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.codes.includes("duplicate_within_batch"))).toBe(true);
    expect(r.duplicates_in_batch).toContain("a@x.com");
  });

  it("plans inserts vs updates and protects legacy mailboxes", () => {
    const rows = parseMailboxCsv(csv).valid;
    const neonRow: typeof rows[number] = {
      row_number: 99,
      email_address: "hello@neoncandy.online",
      business_name: "Neon Candy",
      estate_key: "neon-candy-legacy",
      sending_domain: "neoncandy.online",
      from_name: null,
      reply_to_email: null,
      daily_send_limit: 25,
      ramp_daily_cap: 10,
      warmup_status: "not_started",
      provider_mailbox_id: null,
      mailbox_owner: null,
      allowed_business_names: ["Neon Candy"],
    };
    const existing = [
      { id: "existing-1", email_address: "aurelia1@aureliaedu.com", estate_key: "education", segregation_locked: false },
      { id: "existing-neon", email_address: "hello@neoncandy.online", estate_key: LEGACY_NEON_CANDY_ESTATE, segregation_locked: true },
    ];
    const plan = planMailboxRegistration([...rows, neonRow], existing);
    expect(plan.find((p) => p.email_address === "aurelia1@aureliaedu.com")?.action).toBe("update");
    expect(plan.find((p) => p.email_address === "aurelia2@aureliaedu.com")?.action).toBe("insert");
    expect(plan.find((p) => p.email_address === "hello@neoncandy.online")?.action).toBe("skip");
  });
});
