import { describe, it, expect } from "vitest";
import {
  buildEducationSourceKey,
  normaliseDomain,
  planEducationImport,
  toTargetAccountRow,
  validateEducationAccounts,
  type RawEducationAccountRow,
} from "../../../supabase/functions/_shared/educationAccountUniverse";

const row = (over: Partial<RawEducationAccountRow> = {}): RawEducationAccountRow => ({
  group_id: "EDU-001",
  account_name: "Global Schools Group",
  account_domain: "globalschools.example",
  qualification: "International operator",
  operating_footprint: "UAE, Singapore",
  ...over,
});

describe("education universe — source keys", () => {
  it("builds stable EDU source keys", () => {
    expect(buildEducationSourceKey("edu-007")).toBe("education_152_master:EDU-007");
  });

  it("normalises domains", () => {
    expect(normaliseDomain("https://WWW.Example.com/about?x=1")).toBe("example.com");
  });
});

describe("education universe — validation", () => {
  it("accepts a well-formed row", () => {
    const out = validateEducationAccounts([row()]);
    expect(out.errors).toHaveLength(0);
    expect(out.valid[0].source_key).toBe("education_152_master:EDU-001");
  });

  it("rejects a bad group id format", () => {
    const out = validateEducationAccounts([row({ group_id: "12" })]);
    expect(out.valid).toHaveLength(0);
    expect(out.errors.some((e) => e.field === "group_id")).toBe(true);
  });

  it("rejects an unknown qualification", () => {
    const out = validateEducationAccounts([row({ qualification: "Maybe" })]);
    expect(out.errors.some((e) => e.field === "qualification")).toBe(true);
  });

  it("rejects missing name or domain", () => {
    const out = validateEducationAccounts([row({ account_name: "", account_domain: "" })]);
    expect(out.errors.some((e) => e.field === "account_name")).toBe(true);
    expect(out.errors.some((e) => e.field === "account_domain")).toBe(true);
  });

  it("detects duplicate group ids, names and domains", () => {
    const out = validateEducationAccounts([row(), row({ group_id: "EDU-002" })]);
    expect(out.errors.some((e) => e.problem.startsWith("duplicate"))).toBe(true);
  });

  it("reports control totals", () => {
    const out = validateEducationAccounts([row(), row({ group_id: "XX" })]);
    expect(out.received).toBe(2);
    expect(out.valid).toHaveLength(1);
  });
});

describe("education universe — idempotent planning", () => {
  const accounts = validateEducationAccounts([row()]).valid;

  it("plans a create when nothing exists", () => {
    expect(planEducationImport(accounts, [])[0].action).toBe("create");
  });

  it("plans unchanged on a second identical run (idempotent)", () => {
    const existing = [{
      id: "1",
      source_key: "education_152_master:EDU-001",
      account_name: "Global Schools Group",
      account_domain: "globalschools.example",
      account_type: "International operator",
      geography: "UAE, Singapore",
      source_notes: null,
      metadata: { education_group_id: "EDU-001" },
    }];
    const plan = planEducationImport(accounts, existing as any);
    expect(plan[0].action).toBe("unchanged");
    expect(plan[0].changed_fields).toHaveLength(0);
  });

  it("plans an update when a field drifts", () => {
    const existing = [{
      id: "1",
      source_key: "education_152_master:EDU-001",
      account_name: "Old Name",
      account_domain: "globalschools.example",
      account_type: "International operator",
      geography: "UAE, Singapore",
      source_notes: null,
      metadata: { education_group_id: "EDU-001" },
    }];
    const plan = planEducationImport(accounts, existing as any);
    expect(plan[0].action).toBe("update");
    expect(plan[0].changed_fields).toContain("account_name");
  });
});

describe("education universe — write payload safety", () => {
  const payload = toTargetAccountRow(validateEducationAccounts([row()]).valid[0], "list-1");

  it("stays research-only and never outreach-eligible", () => {
    expect(payload.approval_status).toBe("research_only");
    expect(payload.promoted_to_crm).toBe(false);
    expect(payload.founder_review_required).toBe(true);
    expect((payload.metadata as any).outreach_eligible).toBe(false);
  });

  it("carries no email, contact or campaign fields", () => {
    const keys = Object.keys(payload).join(",");
    expect(keys).not.toMatch(/email|contact_id|campaign|queue/);
  });
});
