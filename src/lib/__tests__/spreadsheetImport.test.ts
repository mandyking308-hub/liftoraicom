import { describe, it, expect } from "vitest";
import { autoMap, prepareRows, CRM_FIELDS, PR_FIELDS } from "../spreadsheetImport";

describe("spreadsheet import", () => {
  it("maps Apollo-style headers to CRM fields", () => {
    const m = autoMap(["First Name", "Last Name", "Title", "Company", "Email", "Email Status", "Country"], CRM_FIELDS);
    expect(m).toMatchObject({ first_name: 0, last_name: 1, role: 2, company: 3, email: 4, email_status: 5, country: 6 });
  });

  it("drops duplicate emails in the same file (case-insensitive) and bad emails for CRM", () => {
    const p = prepareRows([["Email"], ["A@x.com"], ["a@x.com"], ["not-an-email"], [""], ["b@x.com"]], { email: 0 }, { requireEmail: true });
    expect(p.rows.map((r) => r.email)).toEqual(["a@x.com", "b@x.com"]);
    expect(p.duplicateInFile).toBe(1);
    expect(p.invalidEmail).toBe(1);
    expect(p.total).toBe(4);
  });

  it("flags catch-all addresses instead of dropping them", () => {
    const p = prepareRows([["Email", "Status"], ["a@x.com", "Catch-all"], ["b@x.com", "Verified"]], { email: 0, email_status: 1 }, { requireEmail: true });
    expect(p.rows).toHaveLength(2);
    expect(p.catchAll).toBe(1);
  });

  it("keeps PR contacts without an email", () => {
    const m = autoMap(["Journalist", "Outlet", "Country", "Continent"], PR_FIELDS);
    const p = prepareRows([["Journalist", "Outlet", "Country", "Continent"], ["Jane Doe", "The Times", "UK", "Europe"]], m, { requireEmail: false });
    expect(p.rows[0]).toMatchObject({ name: "Jane Doe", organisation: "The Times", country: "UK", continent: "Europe" });
  });
});
