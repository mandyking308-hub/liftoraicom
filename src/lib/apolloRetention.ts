import Papa from 'papaparse';

export type RetainedApolloRow = {
  apollo_person_id: string; first_name: string; last_name: string; title: string;
  company: string; email: string; email_status: string; enriched_at: string;
};
const aliases: Record<keyof RetainedApolloRow, string[]> = {
  apollo_person_id: ['apollo_person_id', 'person id', 'apollo id', 'person_id'],
  first_name: ['first_name', 'first name'], last_name: ['last_name', 'last name'],
  title: ['title'], company: ['company', 'company name', 'organization', 'organisation'],
  email: ['email', 'work email'], email_status: ['email_status', 'email status', 'email verification status'],
  enriched_at: ['enriched_at', 'enriched at'],
};
export function parseApolloRetentionCsv(text: string): RetainedApolloRow[] {
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: 'greedy', transformHeader: h => h.replace(/^\uFEFF/, '').trim().toLowerCase() });
  if (parsed.errors.length) throw new Error('Invalid CSV structure. No rows imported.');
  const fields = parsed.meta.fields ?? [];
  if (!aliases.apollo_person_id.some(a => fields.includes(a))) throw new Error('An Apollo person ID column is required; names are never used to match.');
  if (!parsed.data.length || parsed.data.length > 10000) throw new Error('Select a CSV containing 1–10,000 rows.');
  const rows = parsed.data.map(row => Object.fromEntries(Object.entries(aliases).map(([key, names]) => [key, (names.map(n => row[n]).find(v => v?.trim()) ?? '').trim()])) as RetainedApolloRow);
  if (rows.some(r => !r.apollo_person_id || !/^[a-zA-Z0-9_-]{1,128}$/.test(r.apollo_person_id))) throw new Error('Every row needs a valid Apollo person ID.');
  if (new Set(rows.map(r => r.apollo_person_id)).size !== rows.length) throw new Error('Duplicate Apollo person IDs in CSV; reconcile these before import.');
  if (rows.some(r => r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email))) throw new Error('Invalid email in CSV. No rows imported.');
  if (rows.some(r => r.enriched_at && !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(r.enriched_at))) throw new Error('Enrichment dates must be explicit ISO timestamps.');
  return rows;
}
export function retentionCsv(rows: Record<string, unknown>[]): string {
  // Spreadsheet formula injection protection, including leading whitespace.
  const safe = rows.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => {
    const value = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v ?? '');
    return [k, /^[\s]*[=+@-]/.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value];
  })));
  return Papa.unparse(safe, { newline: '\r\n', quotes: true });
}