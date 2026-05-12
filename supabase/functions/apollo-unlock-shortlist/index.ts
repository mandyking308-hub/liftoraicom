import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Cheap, deterministic ranking of `needs_verification` Apollo leads for the
// NeonCandy unlock shortlist. NO AI, NO Apollo calls, NO sends — purely a
// title/company/seniority/geography scorer over data we already have.

const POSITIVE_KEYWORDS: Array<{ tag: string; weight: number; pattern: RegExp }> = [
  { tag: "playlist_curator", weight: 6, pattern: /\b(playlist|curator|a\s*&\s*r|a\s*and\s*r|editorial)\b/i },
  { tag: "dj",               weight: 5, pattern: /\b(dj|selector|turntab|residen(t|cy))\b/i },
  { tag: "music_blog",       weight: 5, pattern: /\b(music\s*(blog|journal|critic|writer|editor|reporter)|press\b)\b/i },
  { tag: "radio",            weight: 5, pattern: /\b(radio|broadcast|presenter|host\b|program(me)?\s*director)\b/i },
  { tag: "event_promoter",   weight: 4, pattern: /\b(promoter|booker|booking|festival|venue|club\b|nightlife)\b/i },
  { tag: "creator_influencer", weight: 4, pattern: /\b(influencer|creator|youtub|tiktok|streamer|content\s*creator)\b/i },
  { tag: "music_supervisor", weight: 3, pattern: /\b(music\s*supervisor|sync\s*licens|music\s*editor|music\s*licens)\b/i },
];

const NEGATIVE_KEYWORDS: Array<{ tag: string; weight: number; pattern: RegExp }> = [
  { tag: "hospitality_unrelated", weight: -5, pattern: /\b(housekeep|concierge|front\s*desk|waiter|waitress|chef|sous|barista)\b/i },
  { tag: "generic_corporate",     weight: -3, pattern: /\b(general\s*manager|operations\s*manager|customs|purchas|procurement|hr\b|human\s*resources|finance|accounting)\b/i },
  { tag: "engineering_unrelated", weight: -2, pattern: /\b(software\s*engineer|developer|qa\s*engineer|backend|frontend)\b/i },
];

function scoreOne(row: any) {
  const text = `${row.title ?? ""} ${row.company ?? ""}`.toLowerCase();
  const reasons: string[] = [];
  let score = 0;
  let bestFit: string | null = null;
  let bestWeight = 0;

  if (!row.title) { score -= 4; reasons.push("missing_title"); }

  for (const k of POSITIVE_KEYWORDS) {
    if (k.pattern.test(text)) {
      score += k.weight;
      reasons.push(`+${k.tag}`);
      if (k.weight > bestWeight) { bestWeight = k.weight; bestFit = k.tag; }
    }
  }
  for (const k of NEGATIVE_KEYWORDS) {
    if (k.pattern.test(text)) { score += k.weight; reasons.push(`-${k.tag}`); }
  }

  return { score, reasons, fit: bestFit ?? "poor_fit" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: role } = await admin.from("user_roles")
    .select("role").eq("user_id", u.user.id).eq("role", "founder").maybeSingle();
  if (!role) return json({ error: "Founder role required" }, 403);

  let body: { batch_size?: number; min_score?: number } = {};
  try { body = await req.json(); } catch { /* allow empty */ }
  const batchSize = Math.min(Math.max(body.batch_size ?? 25, 1), 200);
  const minScore = body.min_score ?? 4;

  // Pull all needs_verification rows
  const { data: rows, error } = await admin
    .from("apollo_raw_leads")
    .select("apollo_lead_id,title,company,first_name,last_name,country,email_domain,quality_status")
    .eq("quality_status", "needs_verification")
    .limit(2000);
  if (error) return json({ error: error.message }, 500);

  // Pull apollo_person_id for dedup (the view exposes lead identity, not the
  // join key Apollo uses for the same person across runs/segments).
  const ids = (rows ?? []).map((r: any) => r.apollo_lead_id);
  let personMap = new Map<string, string>();
  if (ids.length) {
    const { data: persons } = await admin
      .from("apollo_leads").select("id,apollo_person_id").in("id", ids);
    for (const p of persons ?? []) personMap.set(p.id as string, (p as any).apollo_person_id ?? p.id);
  }

  // Dedup by apollo_person_id (fall back to lead id) — keep the first row.
  const seenPersons = new Set<string>();
  const uniqueRows: any[] = [];
  let duplicateRows = 0;
  for (const r of rows ?? []) {
    const pid = personMap.get(r.apollo_lead_id) ?? r.apollo_lead_id;
    if (seenPersons.has(pid)) { duplicateRows++; continue; }
    seenPersons.add(pid);
    uniqueRows.push({ ...r, apollo_person_id: pid });
  }

  // Domain de-dup signal: any domain already represented in promoted contacts
  const { data: contactRows } = await admin
    .from("contacts").select("email").not("email","is",null).limit(2000);
  const usedDomains = new Set(
    (contactRows ?? [])
      .map((c: any) => (c.email ?? "").toLowerCase().split("@")[1])
      .filter(Boolean),
  );

  const ranked = uniqueRows
    .map((r) => {
      const s = scoreOne(r);
      let score = s.score;
      const reasons = [...s.reasons];
      if (r.email_domain && usedDomains.has(r.email_domain)) {
        score -= 3; reasons.push("-domain_already_contacted");
      }
      return {
        apollo_lead_id: r.apollo_lead_id,
        apollo_person_id: r.apollo_person_id,
        name: `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim(),
        title: r.title,
        company: r.company,
        country: r.country,
        email_domain: r.email_domain,
        score,
        fit: s.fit,
        reasons,
      };
    })
    .sort((a, b) => b.score - a.score);

  const shortlist = ranked.filter((r) => r.score >= minScore).slice(0, batchSize);
  const deprioritised = ranked.filter((r) => r.score < minScore);
  const fitBreakdown = ranked.reduce<Record<string, number>>((acc, r) => {
    acc[r.fit] = (acc[r.fit] ?? 0) + 1; return acc;
  }, {});

  return json({
    ok: true,
    total_needs_verification: rows?.length ?? 0,
    unique_persons: uniqueRows.length,
    duplicate_rows_collapsed: duplicateRows,
    batch_size: batchSize,
    min_score: minScore,
    shortlist_count: shortlist.length,
    deprioritised_count: deprioritised.length,
    fit_breakdown: fitBreakdown,
    shortlist,
    deprioritised_sample: deprioritised.slice(0, 10),
    note: "Unique persons only (deduped by apollo_person_id). No Apollo unlock or enrichment performed. Founder approval required for any unlock spend.",
  });
});