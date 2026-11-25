import Papa from "papaparse";
import * as XLSX from "xlsx";

export type ImportField = { key: string; label: string; synonyms: string[]; required?: boolean };

export const MAX_IMPORT_ROWS = 50000;
export const IMPORT_CHUNK = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CRM_FIELDS: ImportField[] = [
  { key: "email", label: "Email", synonyms: ["email", "email address", "e-mail", "work email", "primary email"], required: true },
  { key: "first_name", label: "First name", synonyms: ["first name", "firstname", "given name", "first"] },
  { key: "last_name", label: "Last name", synonyms: ["last name", "lastname", "surname", "family name", "last"] },
  { key: "company", label: "Organisation", synonyms: ["company", "company name", "organisation", "organization", "school", "account name", "employer"] },
  { key: "role", label: "Job title", synonyms: ["title", "job title", "role", "position"] },
  { key: "country", label: "Country", synonyms: ["country", "person country", "company country"] },
  { key: "phone", label: "Phone", synonyms: ["phone", "mobile", "telephone", "work direct phone", "corporate phone"] },
  { key: "linkedin_url", label: "LinkedIn", synonyms: ["linkedin", "linkedin url", "person linkedin url"] },
  { key: "industry", label: "Industry", synonyms: ["industry", "sector"] },
  { key: "email_status", label: "Email check result", synonyms: ["email status", "email verification", "verification status", "status"] },
];

export const PR_FIELDS: ImportField[] = [
  { key: "name", label: "Name", synonyms: ["name", "full name", "contact name", "journalist", "contact"] },
  { key: "email", label: "Email", synonyms: ["email", "email address", "e-mail"] },
  { key: "organisation", label: "Outlet / organisation", synonyms: ["outlet", "publication", "organisation", "organization", "company", "newspaper", "media outlet", "agency"] },
  { key: "role", label: "Role", synonyms: ["role", "title", "job title", "position", "beat"] },
  { key: "category", label: "Kind", synonyms: ["category", "type", "media type", "kind"] },
  { key: "phone", label: "Phone", synonyms: ["phone", "telephone", "mobile"] },
  { key: "website", label: "Website", synonyms: ["website", "url", "web", "site"] },
  { key: "country", label: "Country", synonyms: ["country", "nation"] },
  { key: "continent", label: "Continent", synonyms: ["continent", "region"] },
];

const norm = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ");

/** Guess which spreadsheet column fills each field. Exact synonym matches win over partial ones. */
export function autoMap(header: string[], fields: ImportField[]): Record<string, number> {
  const h = header.map(norm);
  const used = new Set<number>();
  const out: Record<string, number> = {};
  for (const pass of ["exact", "partial"] as const) {
    for (const f of fields) {
      if (out[f.key] !== undefined) continue;
      const idx = h.findIndex((col, i) => !used.has(i) && col && f.synonyms.some((syn) => (pass === "exact" ? col === syn : col.includes(syn))));
      if (idx >= 0) { out[f.key] = idx; used.add(idx); }
    }
  }
  return out;
}

export async function readSpreadsheet(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    if (!ws) throw new Error("The spreadsheet has no sheets.");
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, raw: false, defval: "", blankrows: false });
    return rows.map((r) => r.map((c) => String(c ?? "")));
  }
  const text = await file.text();
  const res = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  if (res.errors.length && !res.data.length) throw new Error(res.errors[0].message);
  return res.data;
}

export type PreparedImport = {
  rows: Record<string, string>[];
  total: number;
  invalidEmail: number;
  duplicateInFile: number;
  catchAll: number;
};

/** Turns a grid (first row = header) into clean rows using the chosen columns. */
export function prepareRows(grid: string[][], mapping: Record<string, number>, opts: { requireEmail: boolean }): PreparedImport {
  const [, ...body] = grid;
  const seen = new Set<string>();
  const rows: Record<string, string>[] = [];
  let invalidEmail = 0, duplicateInFile = 0, catchAll = 0, total = 0;
  for (const cells of body) {
    if (!cells || cells.every((c) => !String(c ?? "").trim())) continue;
    total++;
    const rec: Record<string, string> = {};
    for (const [k, i] of Object.entries(mapping)) rec[k] = String(cells[i] ?? "").trim();
    const email = (rec.email ?? "").toLowerCase();
    if (email) {
      if (!EMAIL_RE.test(email)) { invalidEmail++; if (opts.requireEmail) continue; rec.email = ""; }
      else {
        if (seen.has(email)) { duplicateInFile++; continue; }
        seen.add(email); rec.email = email;
      }
    } else if (opts.requireEmail) { invalidEmail++; continue; }
    if (/catch/i.test(rec.email_status ?? "") || /accept.?all/i.test(rec.email_status ?? "")) catchAll++;
    rows.push(rec);
  }
  return { rows, total, invalidEmail, duplicateInFile, catchAll };
}
