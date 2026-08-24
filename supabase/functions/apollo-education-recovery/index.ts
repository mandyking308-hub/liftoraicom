// Apollo Education sync/recovery.
//
// Rebuilds the Global Education buyer universe in Relationship Intelligence
// using Apollo FREE People Search only (POST /mixed_people/api_search).
// It never calls people/match, people/bulk_match or phone reveal, so it
// consumes ZERO Apollo lead/enrichment credits.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { loadRelationshipCache, upsertApolloPeople } from "../_shared/apolloRelationshipUpsert.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const SOURCE_PACK = "apollo_global_education_recovery_2026-08-24";
const RECOVERED_ON = "2026-08-24";

const BASE_TAGS = [
  "education_customer_universe",
  "apollo_recovery_candidate",
  "founder_only",
  "portfolio_relationship_lock",
];

export const DEFAULT_TITLES = [
  "CEO", "Chief Executive Officer", "COO", "Chief Operating Officer", "CFO", "Chief Financial Officer",
  "Chief Education Officer", "Chief Learning Officer", "Chief Academic Officer",
  "CIO", "Chief Information Officer", "CTO", "Chief Technology Officer", "Chief Digital Officer",
  "Managing Director", "Regional Director", "Group Director", "Principal", "Head of School", "Headteacher",
  "Director of Education", "Education Director", "Director of Learning", "Director of Teaching and Learning",
  "Director of Technology", "Head of IT", "Director of Digital Learning", "Head of Innovation", "EdTech Director",
  "Finance Director", "Head of Finance", "Procurement Manager", "Head of Procurement", "Operations Director",
  "Director of Admissions", "Head of Admissions", "Admissions Manager", "Director of Enrollment", "Head of Retention",
  "Marketing Director", "Head of Marketing", "Communications Director", "Head of Communications",
  "Director of Partnerships", "Head of Partnerships", "Head of Community", "Alumni Relations Manager",
  "Parent Experience Manager", "Head of Wellbeing", "Head of Pastoral Care", "Designated Safeguarding Lead",
];

export const DEFAULT_ORGS = [
  "Nord Anglia Education", "Inspired Education Group", "Cognita Schools",
  "International Schools Partnership", "GEMS Education", "Globeducate", "Dukes Education",
  "Taaleem", "SABIS", "Aldar Education", "AISL Harrow Schools", "XCL Education",
  "Beaconhouse School System", "Taylor's Education Group", "BASIS International Schools",
  "Education in Motion", "Dulwich College International", "Fortes Education",
  "Innoventures Education", "ESOL Education", "ACS International Schools",
  "YCYW Education Network", "Orbital Education", "Bloom Education", "Gulf British Academy",
  "Repton Family of Schools", "Harrow International Schools", "Wellington College International",
  "Brighton College International", "Kings Education", "Malvern College International",
  "Shrewsbury International School", "Marlborough College Malaysia", "Epsom College",
  "North London Collegiate School", "Sherborne International", "The British Schools Foundation",
  "Nova Pioneer", "Maple Bear Global Schools", "Yew Chung International School",
  "Canadian International School", "United World Colleges", "International School of Geneva",
  "Ecolint", "Le Rosey", "Aiglon College", "Institut auf dem Rosenberg", "TASIS",
  "American School of Dubai", "Dubai American Academy", "Jumeirah English Speaking School",
  "Kings' Education Dubai", "Swiss International Scientific School", "Doha College",
  "Qatar Academy", "American Community School", "Singapore American School",
  "Tanglin Trust School", "Dover Court International School", "Stamford American International School",
  "Shanghai American School", "Western Academy of Beijing", "Hong Kong International School",
  "English Schools Foundation", "Kellett School", "Chinese International School",
  "Avenues The World School", "Green School International", "Mount Kelly International",
  "Haileybury", "Regents International School", "Bangkok Patana School", "NIST International School",
  "Jerudong International School", "The British School of Barcelona", "St George's International School",
  "International School of Amsterdam", "Frankfurt International School", "Munich International School",
  "American School of Paris", "British School of Milan", "St Andrew's International School",
  "Alpha Plus Group", "Bellevue Education", "Randal Charitable Foundation Schools",
  "Girls' Day School Trust", "Woodard Schools", "United Learning", "Star Academies",
  "Harrodian School", "Wetherby Schools", "Knightsbridge Schools International",
];

const ROLE_TAG_RULES: Array<[RegExp, string]> = [
  [/chief executive|\bceo\b|managing director/i, "role-ceo"],
  [/\bcoo\b|chief operating|operations/i, "role-operations"],
  [/\bcfo\b|chief financial|finance|procurement/i, "role-finance"],
  [/\bcio\b|\bcto\b|chief digital|technology|\bit\b|edtech|digital learning|innovation/i, "role-technology"],
  [/education|learning|academic|teaching|curriculum|principal|head of school|headteacher/i, "role-education"],
  [/admission|enrol|enroll|retention/i, "role-admissions"],
  [/marketing|communication|brand/i, "role-marketing"],
  [/partnership|alumni|community|parent/i, "role-partnerships"],
  [/wellbeing|well-being|pastoral|safeguard|inclusion|senco/i, "role-wellbeing"],
  [/regional|group/i, "group-or-regional-decision-maker"],
];

function roleTagger(title: string, org: string): string[] {
  const tags: string[] = ["education"];
  const hay = `${title} ${org}`;
  for (const [re, tag] of ROLE_TAG_RULES) if (re.test(hay)) tags.push(tag);
  const slug = org.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  if (slug) tags.push(slug);
  return tags;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface Body {
  orgs?: string[];
  titles?: string[];
  per_page?: number;
  pages?: number;
  start_page?: number;
  target_total?: number;
  probe?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const enc = Deno.env.get("APOLLO_ENCRYPTION_KEY");
  if (!enc) return json({ error: "APOLLO_ENCRYPTION_KEY missing" }, 500);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const body: Body = await req.json().catch(() => ({} as Body));
  const orgs = body.orgs?.length ? body.orgs : DEFAULT_ORGS;
  const titles = body.titles?.length ? body.titles : DEFAULT_TITLES;
  const perPage = Math.min(Math.max(body.per_page ?? 100, 1), 100);
  const pages = Math.min(Math.max(body.pages ?? 1, 1), 10);
  const startPage = Math.max(body.start_page ?? 1, 1);

  const { data: conn } = await admin
    .from("apollo_connections")
    .select("*")
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!conn) return json({ error: "no_apollo_connection" }, 404);

  const { data: dec } = await admin.rpc("apollo_decrypt_key", { cipher: conn.api_key_cipher, enc_key: enc });
  const apiKey = dec as string;
  if (!apiKey) return json({ error: "decrypt_failed" }, 500);

  const totals = {
    apollo_calls: 0,
    people_seen: 0,
    inserted: 0,
    updated: 0,
    skipped_duplicate: 0,
    skipped_invalid: 0,
    verified_email_preserved: 0,
  };
  const errors: string[] = [];
  const perOrg: Array<Record<string, unknown>> = [];
  let stopReason: string | null = null;

  const countEducation = async () => {
    const { count } = await admin
      .from("relationship_intelligence_contacts")
      .select("id", { count: "exact", head: true })
      .eq("relationship_type", "school_education_contact");
    return count ?? 0;
  };

  const cache = await loadRelationshipCache(admin, "school_education_contact");
  let current = await countEducation();
  const target = body.target_total ?? 2500;

  outer:
  for (const org of orgs) {
    let orgInserted = 0;
    for (let page = startPage; page < startPage + pages; page++) {
      if (current >= target) { stopReason = "target_reached"; break outer; }

      const searchBody: Record<string, unknown> = {
        q_organization_name: org,
        person_titles: titles,
        person_seniorities: ["manager", "director", "vp", "c_suite", "head", "owner", "founder", "partner"],
        page,
        per_page: perPage,
      };

      const resp = await fetch(`${APOLLO_BASE}/mixed_people/api_search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
        body: JSON.stringify(searchBody),
      });
      totals.apollo_calls += 1;
      const data = await resp.json().catch(() => null);

      if (!resp.ok) {
        const msg = `HTTP ${resp.status} on "${org}" p${page}: ${JSON.stringify(data).slice(0, 240)}`;
        errors.push(msg);
        if (resp.status === 401 || resp.status === 403) { stopReason = `apollo_access_blocked:${resp.status}`; break outer; }
        if (resp.status === 429) { stopReason = "apollo_rate_limited"; break outer; }
        break;
      }

      const people = (data?.people ?? data?.contacts ?? []) as any[];
      totals.people_seen += people.length;

      if (body.probe) {
        return json({
          probe: true,
          org,
          page,
          returned: people.length,
          pagination: data?.pagination ?? null,
          raw_first: people[0] ?? null,
          sample: people.slice(0, 3).map((p) => ({
            id: p.id, name: p.name, title: p.title, org: p.organization?.name,
            email: p.email, email_status: p.email_status, has_email: p.has_email,
          })),
          credits_note: "mixed_people/api_search is free search; no enrichment or reveal calls were made.",
        });
      }

      if (people.length === 0) break;

      const stats = await upsertApolloPeople(admin, people, {
        relationship_type: "school_education_contact",
        base_tags: BASE_TAGS,
        source_pack: SOURCE_PACK,
        recovered_on: RECOVERED_ON,
        outreach_status: "do_not_contact_yet",
        role_tagger: roleTagger,
        cache,
      });

      totals.inserted += stats.inserted;
      totals.updated += stats.updated;
      totals.skipped_duplicate += stats.skipped_duplicate;
      totals.skipped_invalid += stats.skipped_invalid;
      totals.verified_email_preserved += stats.verified_email_preserved;
      orgInserted += stats.inserted;
      if (stats.errors.length) errors.push(...stats.errors.slice(0, 5));

      current += stats.inserted;
      if (people.length < perPage) break;
    }
    perOrg.push({ org, inserted: orgInserted });
  }

  const finalCount = await countEducation();
  return json({
    ok: true,
    source_pack: SOURCE_PACK,
    totals,
    per_org: perOrg,
    education_universe_total: finalCount,
    target,
    stop_reason: stopReason,
    errors: errors.slice(0, 20),
    credits_note: "FREE People Search only — no Apollo enrichment or phone-reveal credits consumed.",
  });
});
