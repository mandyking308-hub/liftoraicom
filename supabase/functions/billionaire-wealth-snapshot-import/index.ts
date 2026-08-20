// Imports an external billionaire wealth snapshot (Forbes 2026 derivative CSV) into
// billionaire_wealth_snapshots. Validation-first: refuses to write unless the row count and
// the official Forbes top-10 figures reconcile. No outreach, no contact details, read-only source.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CSV_URL =
  "https://raw.githubusercontent.com/AhoyLemon/kinda.fun/main/src/views/guillotine/csv/forbes-2026.csv";
const OFFICIAL_URL = "https://www.forbes.com/billionaires/";
const SOURCE_NAME = "forbes_world_billionaires_2026";
const SNAPSHOT_DATE = "2026-03-01"; // Forbes: prices/FX as of 1 Mar 2026 (published 10 Mar 2026)
const EXPECTED_ROWS = 3428;
const EXPECTED_TOP10: [string, number][] = [
  ["Elon Musk", 839], ["Larry Page", 257], ["Sergey Brin", 237], ["Jeff Bezos", 224],
  ["Mark Zuckerberg", 222], ["Larry Ellison", 190], ["Bernard Arnault & family", 171],
  ["Jensen Huang", 154], ["Warren Buffett", 149], ["Amancio Ortega", 148],
];

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (c !== "\r") cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

function normalizeName(n: string): string {
  return n
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[đ]/g, "d").replace(/[ł]/g, "l").replace(/[ø]/g, "o").replace(/[ß]/g, "s")
    .replace(/\s*(&|and)\s+family\b/g, "")
    .replace(/\b(jr|sr|ii|iii|iv)\b/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const dryRun = new URL(req.url).searchParams.get("dry_run") === "true";
    const res = await fetch(CSV_URL);
    if (!res.ok) return json({ ok: false, stage: "fetch", status: res.status }, 502);
    const rows = parseCsv(await res.text());
    const header = rows[0].map((h) => h.trim());
    const body = rows.slice(1);
    const idx = (name: string) => header.indexOf(name);

    // ---- validation gate -------------------------------------------------
    const problems: string[] = [];
    if (body.length !== EXPECTED_ROWS) problems.push(`row_count=${body.length} expected ${EXPECTED_ROWS}`);
    EXPECTED_TOP10.forEach(([name, worth], i) => {
      const r = body[i];
      if (!r) { problems.push(`missing row ${i + 1}`); return; }
      if (r[idx("Name")].trim() !== name) problems.push(`rank ${i + 1} name "${r[idx("Name")]}" != "${name}"`);
      if (Number(r[idx("Net Worth")]) !== worth) problems.push(`rank ${i + 1} value ${r[idx("Net Worth")]} != ${worth}`);
    });
    const total = body.reduce((a, r) => a + (Number(r[idx("Net Worth")]) || 0), 0);
    if (total < 19000 || total > 21000) problems.push(`combined wealth $${total}B outside expected ~$20.1T`);
    if (problems.length) return json({ ok: false, stage: "validation", problems, rows: body.length }, 422);
    if (dryRun) return json({ ok: true, dry_run: true, rows: body.length, combined_wealth_usd_b: total });

    // ---- ingest ----------------------------------------------------------
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const payload = body.map((r) => {
      const raw: Record<string, string> = {};
      header.forEach((h, i) => (raw[h] = (r[i] ?? "").trim()));
      return {
        source_name: SOURCE_NAME,
        source_type: "third_party_derivative",
        source_url: CSV_URL,
        official_source_url: OFFICIAL_URL,
        source_metadata: {
          publisher: "Forbes",
          list: "World's Billionaires 2026",
          published_on: "2026-03-10",
          valuation_basis: "stock prices and exchange rates as of 1 March 2026",
          official_totals: { billionaires: 3428, combined_wealth_usd_t: 20.1 },
          ingestion_note:
            "Machine-readable third-party scrape/derivative of the Forbes list, NOT an official Forbes-hosted file.",
        },
        snapshot_date: SNAPSHOT_DATE,
        source_rank: Number(raw["Rank"]) || null,
        source_name_raw: raw["Name"],
        normalized_name: normalizeName(raw["Name"]),
        networth_usd_m: (Number(raw["Net Worth"]) || 0) * 1000,
        country: raw["Country"] || null,
        citizenship: raw["Citizenship"] || raw["Country"] || null,
        source_of_wealth: raw["Source of Wealth"] || null,
        industry: raw["Industry"] || null,
        raw_record: raw,
      };
    });

    let written = 0;
    for (let i = 0; i < payload.length; i += 500) {
      const chunk = payload.slice(i, i + 500);
      const { error } = await sb
        .from("billionaire_wealth_snapshots")
        .upsert(chunk, { onConflict: "source_name,snapshot_date,source_rank,normalized_name", ignoreDuplicates: false });
      if (error) return json({ ok: false, stage: "insert", offset: i, error: error.message }, 500);
      written += chunk.length;
    }

    const { count } = await sb
      .from("billionaire_wealth_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("source_name", SOURCE_NAME);

    return json({ ok: true, validated_rows: body.length, written, stored_rows: count, combined_wealth_usd_b: total });
  } catch (e) {
    return json({ ok: false, stage: "exception", error: String(e) }, 500);
  }
});
