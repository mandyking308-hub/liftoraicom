// Rules-based Media Atlas enrichment.
// Reads parsed media_opportunities and upserts media_outlets +
// journalist_relationships. Founder/admin only. No AI, no sending,
// no scraping, no Gmail writes. Service role used server-side only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const TOP_TIER = [
  "bbc","daily mail","mail online","metro","guardian","telegraph","the times",
  "sunday times","forbes","ft.com","financial times","the sun","mirror","express",
  "independent","huffpost","huffington","evening standard","yahoo","reuters",
  "bloomberg","cnn","cnbc","wsj","wall street journal","new york times","ny times",
  "vogue","elle","cosmopolitan","harper","glamour","grazia","stylist","tatler",
  "hello!","ok!","good housekeeping","woman & home","today show",
  "good morning america","associated press","ap news",
];
const RELEVANT_CATEGORIES = new Set([
  "business","tech","technology","beauty","charity","health","finance",
  "kids","education","travel","parenting","wellness","money",
]);

function norm(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function clean(s?: string | null): string | null {
  const v = (s || "").replace(/\s+/g, " ").trim();
  return v || null;
}
function tier(pub?: string | null): number {
  const n = norm(pub);
  if (!n) return 0;
  return TOP_TIER.some((t) => n.includes(t)) ? 2 : 1;
}
function isEmail(s?: string | null): boolean {
  return !!s && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;

    const body = await req.json().catch(() => ({}));
    const opportunityId: string | undefined = body.opportunity_id;
    const sourceName: string | undefined = body.source_name;
    const limit = Math.max(1, Math.min(200, Number(body.limit) || 50));
    const dryRun = !!body.dry_run;
    const forceUpdate = !!body.force_update;

    let q = admin.from("media_opportunities")
      .select("id,source_id,category,title,publication_name,journalist_name,journalist_email,pitch_email,platform_contact_only,platform_name,country_market,region_state,beat,topic,contact_route,urgency_score,status,deadline_at,created_at")
      .in("status", ["new", "needs_review"])
      .order("created_at", { ascending: false })
      .limit(limit);
    if (opportunityId) q = q.eq("id", opportunityId);
    if (sourceName) {
      const { data: src } = await admin.from("pr_sources").select("id").eq("source_name", sourceName).maybeSingle();
      if (src?.id) q = q.eq("source_id", src.id); else return json({ ok: true, opportunities_seen: 0, message: "source_not_found" });
    }
    const { data: opps, error: oppsErr } = await q;
    if (oppsErr) return json({ ok: false, reason: "query_failed", message: oppsErr.message }, 500);
    const rows = opps ?? [];

    // Pre-load existing outlets/journalists for dedupe.
    const { data: outletsAll } = await admin.from("media_outlets").select("id,outlet_name,country,beats,backlink_value_score");
    const outletByName = new Map<string, any>();
    (outletsAll ?? []).forEach((o: any) => outletByName.set(norm(o.outlet_name), o));

    const { data: jourAll } = await admin.from("journalist_relationships").select("id,name,email,publication_name,outlet_id,topics,priority_score,contact_route");
    const jourByEmail = new Map<string, any>();
    const jourByNamePub = new Map<string, any>();
    (jourAll ?? []).forEach((j: any) => {
      if (j.email) jourByEmail.set(j.email.toLowerCase(), j);
      if (j.name && j.publication_name) jourByNamePub.set(`${norm(j.name)}|${norm(j.publication_name)}`, j);
    });

    let outletsInserted = 0, outletsUpdated = 0;
    let journalistsInserted = 0, journalistsUpdated = 0;
    let duplicates = 0, skippedLowConfidence = 0;
    const proposed: any[] = [];

    for (const opp of rows) {
      const pub = clean(opp.publication_name);
      let outletId: string | null = null;
      const oppCountry = clean(opp.country_market);
      const oppBeat = clean(opp.beat) || clean(opp.topic);

      // ---- Outlet upsert ----
      if (pub) {
        const existing = outletByName.get(norm(pub));
        if (existing) {
          outletId = existing.id;
          const patch: Record<string, any> = {};
          if (!existing.country && oppCountry) patch.country = oppCountry;
          if (oppBeat) {
            const beats: string[] = Array.isArray(existing.beats) ? existing.beats : [];
            if (!beats.map(norm).includes(norm(oppBeat))) patch.beats = [...beats, oppBeat];
          }
          if (Object.keys(patch).length && (forceUpdate || true)) {
            proposed.push({ kind: "outlet_update", id: existing.id, patch });
            if (!dryRun) {
              const { error } = await admin.from("media_outlets").update(patch).eq("id", existing.id);
              if (!error) outletsUpdated++;
            } else outletsUpdated++;
          }
        } else {
          const insert: any = {
            outlet_name: pub,
            country: oppCountry,
            beats: oppBeat ? [oppBeat] : [],
            quality_score: tier(pub) * 25,
          };
          proposed.push({ kind: "outlet_insert", row: insert });
          if (!dryRun) {
            const { data, error } = await admin.from("media_outlets").insert(insert).select("id").single();
            if (!error && data) { outletId = data.id; outletByName.set(norm(pub), { id: data.id, ...insert }); outletsInserted++; }
          } else { outletsInserted++; }
        }
      }

      // ---- Journalist upsert ----
      const jName = clean(opp.journalist_name);
      const jEmail = isEmail(opp.journalist_email) ? opp.journalist_email!.toLowerCase()
        : (isEmail(opp.pitch_email) && jName ? opp.pitch_email!.toLowerCase() : null);
      const platformOnly = !!opp.platform_contact_only;
      const hasJourSignal = !!(jName || jEmail);
      if (!hasJourSignal) { skippedLowConfidence++; continue; }
      if (!jName && jEmail) {
        // email-only: only safe if not a generic newsroom alias
        if (/^(info|hello|press|news|editor|enquiries|contact|admin)@/i.test(jEmail)) { skippedLowConfidence++; continue; }
      }

      let existing: any | null = null;
      if (jEmail) existing = jourByEmail.get(jEmail) ?? null;
      if (!existing && jName && pub) existing = jourByNamePub.get(`${norm(jName)}|${norm(pub)}`) ?? null;

      const baseTopics: string[] = [];
      if (oppBeat) baseTopics.push(oppBeat);
      if (opp.category) baseTopics.push(opp.category);

      const priority = (tier(pub) * 20)
        + (jEmail ? 15 : 0)
        + (opp.category && RELEVANT_CATEGORIES.has(String(opp.category).toLowerCase()) ? 10 : 0)
        + Math.min(20, Number(opp.urgency_score) || 0);

      if (existing) {
        const patch: Record<string, any> = { last_seen_at: new Date().toISOString() };
        if (!existing.email && jEmail) patch.email = jEmail;
        if (!existing.outlet_id && outletId) patch.outlet_id = outletId;
        if (!existing.publication_name && pub) patch.publication_name = pub;
        if (baseTopics.length) {
          const t: string[] = Array.isArray(existing.topics) ? existing.topics : [];
          const merged = Array.from(new Set([...t, ...baseTopics]));
          if (merged.length !== t.length) patch.topics = merged;
        }
        if ((existing.priority_score ?? 0) < priority) patch.priority_score = priority;
        if (!existing.contact_route) patch.contact_route = platformOnly ? "platform_only" : (opp.contact_route || (jEmail ? "email" : "unknown"));
        proposed.push({ kind: "journalist_update", id: existing.id, patch });
        if (Object.keys(patch).length > 1 || forceUpdate) {
          if (!dryRun) {
            const { error } = await admin.from("journalist_relationships").update(patch).eq("id", existing.id);
            if (!error) journalistsUpdated++;
          } else journalistsUpdated++;
        } else {
          duplicates++;
        }
      } else {
        const insert: any = {
          name: jName,
          email: jEmail,
          publication_name: pub,
          outlet_id: outletId,
          country: oppCountry,
          beat: oppBeat,
          topics: baseTopics,
          source_first_seen: opp.source_id ?? null,
          first_seen_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          contact_route: platformOnly ? "platform_only" : (opp.contact_route || (jEmail ? "email" : "unknown")),
          relationship_status: "new",
          priority_score: priority,
          do_not_contact: false,
          caution_notes: (!jEmail && !platformOnly) ? "Created from opportunity without confirmed email. Verify contact route before any outreach." : null,
        };
        proposed.push({ kind: "journalist_insert", row: insert });
        if (!dryRun) {
          const { data, error } = await admin.from("journalist_relationships").insert(insert).select("id").single();
          if (!error && data) {
            journalistsInserted++;
            if (jEmail) jourByEmail.set(jEmail, { id: data.id, ...insert });
            if (jName && pub) jourByNamePub.set(`${norm(jName)}|${norm(pub)}`, { id: data.id, ...insert });
          }
        } else { journalistsInserted++; }
      }
    }

    if (!dryRun) {
      await admin.from("pr_audit_events").insert({
        actor_id: auth.user.id,
        event_type: "media_atlas_enrich_run",
        event_summary: `Enrichment: ${rows.length} opps · outlets +${outletsInserted}/~${outletsUpdated} · journalists +${journalistsInserted}/~${journalistsUpdated}`,
        metadata: {
          opportunities_seen: rows.length,
          outlets_inserted: outletsInserted, outlets_updated: outletsUpdated,
          journalists_inserted: journalistsInserted, journalists_updated: journalistsUpdated,
          duplicates, skipped_low_confidence: skippedLowConfidence,
          source_name: sourceName ?? null, dry_run: false,
        },
      });
    }

    return json({
      ok: true,
      dry_run: dryRun,
      opportunities_seen: rows.length,
      outlets_inserted: outletsInserted,
      outlets_updated: outletsUpdated,
      journalists_inserted: journalistsInserted,
      journalists_updated: journalistsUpdated,
      duplicates,
      skipped_low_confidence: skippedLowConfidence,
      proposed: dryRun ? proposed.slice(0, 50) : undefined,
    });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: String(e?.message || e) }, 500);
  }
});