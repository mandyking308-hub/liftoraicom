// Manual / Qwoted Media Atlas import.
// Accepts only founder-pasted visible text or rows. Does NOT fetch URLs,
// scrape Qwoted/LinkedIn, send emails or contact anyone. Founder/admin only.
// Service role is used server-side only for DB writes.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

type ImportType = "auto_classify" | "journalists" | "sector_leaders" | "outlets" | "mixed";

const KNOWN_KEYS = [
  "name","title","company","country","region","state","city","topics","hashtags",
  "profile url","profile_url","url","email","publication","outlet","platform",
  "use case","potential use case","quote","signal","role",
];

function norm(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function clean(s?: string | null): string | null {
  const v = (s || "").replace(/\s+/g, " ").trim();
  return v || null;
}
function isEmail(s?: string | null): boolean {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
function splitList(s?: string | null): string[] {
  if (!s) return [];
  return s.split(/[,;|]/).map((x) => x.trim()).filter(Boolean);
}

function parseRawText(text: string): Record<string, string>[] {
  // CSV detection: first non-empty line has commas AND looks like headers
  const lines = text.split(/\r?\n/);
  const first = lines.find((l) => l.trim().length > 0) ?? "";
  if (first.includes(",") && /^[A-Za-z][\w \-/]*(,[A-Za-z][\w \-/]*)+\s*$/.test(first)) {
    const headers = first.split(",").map((h) => h.trim().toLowerCase());
    const out: Record<string, string>[] = [];
    let started = false;
    for (const ln of lines) {
      if (!started) { started = true; continue; }
      if (!ln.trim()) continue;
      const cells = ln.split(",").map((c) => c.trim());
      const r: Record<string, string> = {};
      headers.forEach((h, i) => { r[h] = cells[i] ?? ""; });
      out.push(r);
    }
    return out;
  }
  // Block format: blank-line separated, key: value lines
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((b) => {
    const r: Record<string, string> = {};
    const stray: string[] = [];
    for (const ln of b.split(/\r?\n/)) {
      const m = ln.match(/^([A-Za-z][\w \-/]{0,40})\s*[:\-–]\s*(.+)$/);
      if (m && KNOWN_KEYS.some((k) => norm(k) === norm(m[1]))) {
        r[m[1].trim().toLowerCase()] = m[2].trim();
      } else if (ln.trim()) stray.push(ln.trim());
    }
    if (stray.length && !r.name) r.name = stray[0];
    if (stray.length > 1 && !r.title) r.title = stray.slice(1).join(" ");
    return r;
  });
}

function pick(r: Record<string, any>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = r[k] ?? r[k.toLowerCase()];
    if (v != null && String(v).trim()) return String(v).trim();
  }
  return null;
}

function classify(r: Record<string, any>, hint: ImportType, sourcePlatform: string): string {
  if (hint !== "auto_classify" && hint !== "mixed") {
    if (hint === "journalists") return "journalist";
    if (hint === "outlets") return "media_outlet";
    if (hint === "sector_leaders") return "sector_leader";
  }
  const title = (pick(r, "title", "role") || "").toLowerCase();
  const company = (pick(r, "company", "outlet", "publication") || "").toLowerCase();
  const email = pick(r, "email");
  if (/journalist|reporter|editor|writer|correspondent|contributor|columnist/.test(title)) return "journalist";
  if (/\b(news|magazine|paper|press|times|post|gazette|tribune|bbc|guardian|forbes)\b/.test(company)) return "journalist";
  if (/\bpr\b|public relations|communications/.test(title)) return "PR_contact";
  if (/founder|ceo|cto|coo|cfo|president|owner/.test(title)) return "founder";
  if (/philanthrop|patron|donor|benefactor/.test(title)) return "philanthropist";
  if (sourcePlatform === "Qwoted") return "sector_leader";
  if (title || company) return "sector_leader";
  if (email && !pick(r, "name")) return "unknown";
  return "sector_leader";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const sourcePlatform: string = String(body.source_platform || "").trim();
    if (!sourcePlatform) return json({ ok: false, reason: "missing_source_platform" }, 400);
    const importType: ImportType = (body.import_type as ImportType) || "auto_classify";
    const dryRun = !!body.dry_run;
    const rawText: string | undefined = body.raw_text;
    const rows: any[] | undefined = Array.isArray(body.rows) ? body.rows : undefined;
    if (!rawText && !rows) return json({ ok: false, reason: "missing_input" }, 400);

    const parsedRows: Record<string, any>[] = rows && rows.length ? rows : parseRawText(rawText || "");
    if (!parsedRows.length) return json({ ok: true, parsed_rows: 0, message: "no_rows_parsed" });

    const qwotedCaution = "Qwoted platform-only record. Contact must happen inside Qwoted unless a separate lawful contact route is recorded. No endorsement implied.";

    // Pre-load existing for dedupe
    const { data: leadersAll } = await admin.from("sector_leader_profiles")
      .select("id,name,company,title,country,profile_url");
    const leaderByUrl = new Map<string, any>();
    const leaderByNameCo = new Map<string, any>();
    const leaderByNameTitle = new Map<string, any>();
    (leadersAll ?? []).forEach((l: any) => {
      if (l.profile_url) leaderByUrl.set(l.profile_url.toLowerCase(), l);
      if (l.name && l.company) leaderByNameCo.set(`${norm(l.name)}|${norm(l.company)}`, l);
      if (l.name && l.title && l.country) leaderByNameTitle.set(`${norm(l.name)}|${norm(l.title)}|${norm(l.country)}`, l);
    });
    const { data: jourAll } = await admin.from("journalist_relationships")
      .select("id,name,email,publication_name");
    const jourByEmail = new Map<string, any>();
    const jourByNamePub = new Map<string, any>();
    (jourAll ?? []).forEach((j: any) => {
      if (j.email) jourByEmail.set(j.email.toLowerCase(), j);
      if (j.name && j.publication_name) jourByNamePub.set(`${norm(j.name)}|${norm(j.publication_name)}`, j);
    });
    const { data: outletsAll } = await admin.from("media_outlets").select("id,outlet_name,website_url");
    const outletByName = new Map<string, any>();
    (outletsAll ?? []).forEach((o: any) => outletByName.set(norm(o.outlet_name), o));

    const counters = {
      parsed: parsedRows.length, sector_leaders_inserted: 0, sector_leaders_updated: 0,
      journalists_inserted: 0, journalists_updated: 0, outlets_inserted: 0, outlets_updated: 0,
      duplicates: 0, skipped_low_confidence: 0,
    };
    const preview: any[] = [];

    for (const r of parsedRows) {
      const name = clean(pick(r, "name"));
      const title = clean(pick(r, "title", "role"));
      const company = clean(pick(r, "company"));
      const publication = clean(pick(r, "publication", "outlet"));
      const country = clean(pick(r, "country"));
      const region = clean(pick(r, "region", "state"));
      const city = clean(pick(r, "city"));
      const topics = splitList(pick(r, "topics"));
      const hashtags = splitList(pick(r, "hashtags"));
      const profileUrl = clean(pick(r, "profile url", "profile_url", "url"));
      const email = isEmail(pick(r, "email")) ? pick(r, "email")!.toLowerCase() : null;
      const platform = clean(pick(r, "platform")) || sourcePlatform;
      const quote = clean(pick(r, "quote", "signal"));
      const useCase = clean(pick(r, "use case", "potential use case"));

      const klass = classify(r, importType, sourcePlatform);
      const warnings: string[] = [];
      const cautionParts: string[] = [];
      if (sourcePlatform === "Qwoted") cautionParts.push(qwotedCaution);

      let action = "skipped_low_confidence";
      let target: string | null = null;

      if (klass === "media_outlet") {
        const outletName = publication || company || name;
        if (!outletName) { counters.skipped_low_confidence++; preview.push({ row: r, classification: klass, action: "skipped_no_name" }); continue; }
        const existing = outletByName.get(norm(outletName));
        if (existing) {
          counters.duplicates++; action = "duplicate"; target = existing.id;
        } else {
          const insert: any = { outlet_name: outletName, country, region_state: region, city };
          if (!dryRun) {
            const { data } = await admin.from("media_outlets").insert(insert).select("id").single();
            if (data) { outletByName.set(norm(outletName), { id: data.id, outlet_name: outletName }); target = data.id; }
          }
          counters.outlets_inserted++; action = "outlet_insert";
        }
      } else if (klass === "journalist" || klass === "PR_contact") {
        if (!name && !email) { counters.skipped_low_confidence++; preview.push({ row: r, classification: klass, action: "skipped_no_identity" }); continue; }
        let existing: any | null = null;
        if (email) existing = jourByEmail.get(email) ?? null;
        if (!existing && name && publication) existing = jourByNamePub.get(`${norm(name)}|${norm(publication)}`) ?? null;
        if (existing) {
          counters.duplicates++; action = "duplicate"; target = existing.id;
        } else {
          if (sourcePlatform === "Qwoted") cautionParts.push("Qwoted-sourced media contact. Verify lawful contact route before any outreach.");
          const insert: any = {
            name, email, publication_name: publication || company,
            country, region_state: region, city,
            beat: title, topics: [...topics, ...hashtags],
            platform_name: sourcePlatform === "Qwoted" ? "Qwoted" : null,
            platform_profile_url: profileUrl,
            contact_route: email ? "email" : (sourcePlatform === "Qwoted" ? "platform_only" : "unknown"),
            relationship_status: "new",
            source_first_seen: sourcePlatform,
            first_seen_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
            do_not_contact: false,
            caution_notes: cautionParts.join(" "),
            priority_score: (email ? 20 : 0) + (publication ? 10 : 0),
          };
          if (!dryRun) {
            const { data } = await admin.from("journalist_relationships").insert(insert).select("id").single();
            if (data) { target = data.id; if (email) jourByEmail.set(email, { id: data.id, ...insert }); }
          }
          counters.journalists_inserted++; action = "journalist_insert";
        }
      } else if (klass === "unknown") {
        counters.skipped_low_confidence++; action = "skipped_unknown";
      } else {
        // sector_leader, founder, CEO, expert, philanthropist, supporter_target, patron_target, company → sector_leader_profiles
        if (!name) { counters.skipped_low_confidence++; preview.push({ row: r, classification: klass, action: "skipped_no_name" }); continue; }
        let existing: any | null = null;
        if (profileUrl) existing = leaderByUrl.get(profileUrl.toLowerCase()) ?? null;
        if (!existing && name && company) existing = leaderByNameCo.get(`${norm(name)}|${norm(company)}`) ?? null;
        if (!existing && name && title && country) existing = leaderByNameTitle.get(`${norm(name)}|${norm(title)}|${norm(country)}`) ?? null;

        const inferredUseCase = useCase
          ?? (klass === "philanthropist" ? "philanthropist_target"
            : klass === "founder" || klass === "CEO" ? "partner_target"
            : klass === "PR_contact" ? "future_pr_relationship"
            : "expert_quote");

        if (existing) {
          counters.duplicates++; action = "duplicate"; target = existing.id;
        } else {
          const insert: any = {
            name, title, company, country, region_state: region, city,
            topics, hashtags,
            profile_url: profileUrl,
            source_platform: sourcePlatform,
            latest_quote_or_signal: quote,
            potential_use_case: inferredUseCase,
            contact_route: sourcePlatform === "Qwoted" ? "platform_only" : (email ? "email" : "unknown"),
            relationship_status: "new",
            permission_status: "not_requested",
            priority_score: (sourcePlatform === "Qwoted" ? 20 : 10) + (topics.length ? 5 : 0),
            caution_notes: cautionParts.join(" ") || null,
          };
          if (!dryRun) {
            const { data } = await admin.from("sector_leader_profiles").insert(insert).select("id").single();
            if (data) {
              target = data.id;
              if (profileUrl) leaderByUrl.set(profileUrl.toLowerCase(), { id: data.id, ...insert });
              if (name && company) leaderByNameCo.set(`${norm(name)}|${norm(company)}`, { id: data.id, ...insert });
            }
          }
          counters.sector_leaders_inserted++; action = "sector_leader_insert";
        }
      }

      preview.push({
        row: { name, title, company, publication, country, email, profile_url: profileUrl, topics, hashtags },
        classification: klass, action, target_id: target, warnings,
      });
    }

    if (!dryRun) {
      await admin.from("pr_audit_events").insert({
        actor_id: auth.user.id,
        event_type: "media_atlas_manual_import_run",
        event_summary: `Manual import (${sourcePlatform}): ${counters.parsed} parsed · leaders +${counters.sector_leaders_inserted} · journalists +${counters.journalists_inserted} · outlets +${counters.outlets_inserted} · dup ${counters.duplicates} · skipped ${counters.skipped_low_confidence}`,
        metadata: {
          source_platform: sourcePlatform, import_type: importType,
          inserted: {
            sector_leaders: counters.sector_leaders_inserted,
            journalists: counters.journalists_inserted,
            outlets: counters.outlets_inserted,
          },
          duplicates: counters.duplicates,
          skipped_low_confidence: counters.skipped_low_confidence,
          dry_run: false,
        },
      });
    }

    return json({ ok: true, dry_run: dryRun, source_platform: sourcePlatform, ...counters, preview: preview.slice(0, 100) });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: String(e?.message || e) }, 500);
  }
});