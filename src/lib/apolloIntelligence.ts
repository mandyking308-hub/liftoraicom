import Papa from 'papaparse';

/** Exact Apollo October 2026 export headers (founder-supplied list). Raw rows keep these keys verbatim. */
export const APOLLO_EXPORT_HEADERS = [
  'First Name', 'Last Name', 'Title', 'Company Name', 'Company Name for Emails', 'Email', 'Email Status',
  'Primary Email Source', 'Primary Email Verification Source', 'Email Confidence', 'Primary Email Catch-all Status',
  'Primary Email Last Verified At', 'Seniority', 'Departments', 'Sub Departments', 'Contact Owner',
  'Work Direct Phone', 'Home Phone', 'Mobile Phone', 'Corporate Phone', 'Other Phone', 'Do Not Call', 'Stage',
  'Lists', 'Last Contacted', 'Account Owner', '# Employees', 'Industry', 'Keywords', 'Person Linkedin Url',
  'Website', 'Company Linkedin Url', 'Facebook Url', 'Twitter Url', 'Address', 'City', 'State', 'Country',
  'Company Address', 'Company City', 'Company State', 'Company Country', 'Company Phone', 'Technologies',
  'Annual Revenue', 'Total Funding', 'Latest Funding', 'Latest Funding Amount', 'Last Raised At',
  'Parent company (Apollo data)', 'Parent company (Apollo data - Organization ID)', 'Email Sent', 'Email Open',
  'Email Bounced', 'Replied', 'Demoed', 'Number of Retail Locations', 'SIC Codes', 'NAICS Codes',
  'Apollo Contact Id', 'Apollo Account Id', 'Secondary Email', 'Secondary Email Source', 'Secondary Email Status',
  'Secondary Email Verification Source', 'Tertiary Email', 'Tertiary Email Source', 'Tertiary Email Status',
  'Tertiary Email Verification Source', 'Primary Intent Topic', 'Primary Intent Score', 'Secondary Intent Topic',
  'Secondary Intent Score', 'Music Distribution Fit 4678 0430110109', 'Qualify Contact',
] as const;

export const CHUNK_SIZE = 200;
export type IntelRow = { row_number: number; raw: Record<string, string> };
export type IntelParse = {
  header: string[]; rows: IntelRow[]; missingHeaders: string[]; extraHeaders: string[];
  blankPrimary: number; withPrimary: number; missingContactId: number; duplicateContactIds: number; neonCandyLists: number;
};

/** Lossless parse: every header and value is kept exactly as exported (no trimming, no renaming). */
export function parseApolloIntelligenceCsv(text: string): IntelParse {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), { header: false, skipEmptyLines: 'greedy' });
  if (parsed.errors.length) throw new Error(`Invalid CSV structure at row ${(parsed.errors[0].row ?? 0) + 1}. Nothing imported.`);
  const [header, ...body] = parsed.data;
  if (!header?.length) throw new Error('CSV has no header row.');
  if (new Set(header).size !== header.length) throw new Error('Duplicate column headers; each column must be unique.');
  if (!header.includes('Apollo Contact Id')) throw new Error('"Apollo Contact Id" column is required; names are never used to match.');
  if (!body.length || body.length > 10000) throw new Error('Select a CSV containing 1–10,000 rows.');
  const bad = body.findIndex(r => r.length !== header.length);
  if (bad >= 0) throw new Error(`Row ${bad + 1} has ${body[bad].length} values but the header has ${header.length}. Nothing imported.`);
  const rows = body.map((cells, i) => ({ row_number: i + 1, raw: Object.fromEntries(header.map((h, j) => [h, cells[j]])) }));
  const ids = rows.map(r => r.raw['Apollo Contact Id']?.trim()).filter(Boolean);
  return {
    header, rows,
    missingHeaders: APOLLO_EXPORT_HEADERS.filter(h => !header.includes(h)),
    extraHeaders: header.filter(h => !(APOLLO_EXPORT_HEADERS as readonly string[]).includes(h)),
    blankPrimary: rows.filter(r => !r.raw['Email']?.trim()).length,
    withPrimary: rows.filter(r => r.raw['Email']?.trim()).length,
    missingContactId: rows.length - ids.length,
    duplicateContactIds: ids.length - new Set(ids).size,
    neonCandyLists: rows.filter(r => /neon/i.test(r.raw['Lists'] ?? '')).length,
  };
}

export function chunkRows<T>(rows: T[], size = CHUNK_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}
