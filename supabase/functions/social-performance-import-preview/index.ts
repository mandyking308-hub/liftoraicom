import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";
import { SAFETY_FLAGS, normalizeMetricRow } from "../_shared/socialAnalyticsLogic.ts";

function parsePasted(text: string): any[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const sep = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((l) => {
    const cells = l.split(sep);
    const o: any = {};
    headers.forEach((h, i) => { o[h] = cells[i]?.trim(); });
    return o;
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const body = await req.json().catch(() => ({} as any));
  const business_id = body.business_id;
  if (!business_id) return json({ ok: false, error: "business_id_required" }, 400);
  let rows: any[] = Array.isArray(body.rows) ? body.rows : [];
  if ((!rows || rows.length === 0) && body.pasted_text) rows = parsePasted(body.pasted_text);
  const normalised = rows.map((r) => normalizeMetricRow({ ...r, platform: r.platform ?? body.platform }));
  const blocked = normalised.filter((n) => n.errors.length > 0);
  const ok = normalised.filter((n) => n.errors.length === 0);
  // duplicates: same external_post_id+platform within batch
  const seen = new Set<string>();
  let dup = 0;
  for (const n of ok) {
    const k = `${n.row.platform}::${n.row.external_post_id ?? ""}::${n.row.metric_date ?? ""}`;
    if (n.row.external_post_id && seen.has(k)) dup++;
    seen.add(k);
  }
  return json({
    ok: true,
    business_id,
    import_name: body.import_name ?? null,
    import_type: body.import_type ?? "manual",
    parsed_count: rows.length,
    valid_count: ok.length,
    blocked_count: blocked.length,
    duplicate_count: dup,
    sample: ok.slice(0, 10).map((n) => n.row),
    blocked_samples: blocked.slice(0, 5),
    warnings: ok.flatMap((n) => n.warnings).slice(0, 20),
    no_records_mutated: true,
    ...SAFETY_FLAGS,
  });
});