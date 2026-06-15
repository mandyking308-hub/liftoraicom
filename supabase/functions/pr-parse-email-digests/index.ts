// Rules-based parser for PR-digest email sources:
//   - Source of Sources (peter@sourceofsources.com)
//   - HARO              (noreply@helpareporter.com)
//   - PressPlugs        (enquiries@pressplugs.co.uk)
//
// Founder/admin only. No AI. No sending. No drafting. No Gmail writes.
// Splits captured pr_inbound_messages into individual media_opportunities
// rows using deterministic, source-specific block boundaries.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

type SourceName = "Source of Sources" | "HARO" | "PressPlugs";
const ALL_SOURCES: SourceName[] = ["Source of Sources", "HARO", "PressPlugs"];

// ----------------- Shared helpers (mirror Editorielle parser) -----------------

const MONTHS: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  october: 9, oct: 9, november: 10, nov: 10, december: 11, dec: 11,
};

const TOP_TIER_OUTLETS = [
  "bbc", "daily mail", "mail online", "metro", "guardian", "telegraph",
  "the times", "sunday times", "forbes", "ft.com", "financial times",
  "the sun", "mirror", "express", "independent", "huffpost", "huffington",
  "evening standard", "yahoo", "reuters", "bloomberg", "cnn", "cnbc",
  "wsj", "wall street journal", "new york times", "ny times", "vogue",
  "elle", "cosmopolitan", "harper", "glamour", "grazia", "stylist",
  "tatler", "hello!", "ok!", "good housekeeping", "woman & home",
  "today show", "good morning america", "associated press", "ap news",
];
const MID_TIER_HINTS = [
  "magazine", "weekly", "review", "today", "world", "uk", "global",
  "house", "homes", "garden", "kitchen", "parents", "mum", "mums",
  "living", "wellness", "fit", "fitness", "money", "wealth", "investor",
];

const RISK_KEYWORDS: Array<[RegExp, number]> = [
  [/\b(child|children|kids|teen|teenager|school|under[- ]?16|toddler|baby|babies)\b/i, 4],
  [/\b(politic|brexit|trump|election|gender|woke|abortion|immigration|war|gaza|israel|ukraine|race|racial)\b/i, 5],
  [/\b(medical|medicine|cure|cures|treatment|diagnos|therapy|symptom|illness|disease|cancer)\b/i, 4],
  [/\b(tax|hmrc|legal|lawyer|solicitor|investment advice|financial advice|regulated)\b/i, 4],
  [/\b(weight loss|diet|fasting|supplement|fertility|menopause|mental health|suicide)\b/i, 3],
  [/\b(crypto|nft|gambling|casino|betting|alcohol|cbd|cannabis|vape)\b/i, 3],
  [/\b(celeb|celebrity|royal|royals|endorsement)\b/i, 2],
  [/\b(tabloid|expose|exclusive|scandal|controversy)\b/i, 2],
];

function stripOrdinal(s: string): string {
  return s.replace(/(\d+)(st|nd|rd|th)/gi, "$1");
}
function normaliseLine(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+$/g, "").trim();
}
function clean(s: string | null | undefined): string {
  return (s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** Parse a wide range of UK / US deadline strings into ISO. Returns null when ambiguous. */
function parseDeadline(raw: string | null): string | null {
  if (!raw) return null;
  let s = stripOrdinal(raw.replace(/\s+/g, " ").trim());
  const low = s.toLowerCase();
  const now = new Date();

  // today / tomorrow / EOD / COB heuristics → end-of-day local UK time
  const tzOffsetMin =
    /\b(pst|pdt|pt)\b/.test(low) ? -8 * 60 :
    /\b(est|edt|et)\b/.test(low) ? -5 * 60 :
    /\b(gmt|utc)\b/.test(low) ? 0 :
    /\b(bst)\b/.test(low) ? 60 :
    60; // default BST/UK

  function buildIso(y: number, mo: number, d: number, hh: number, mm: number): string | null {
    const utc = Date.UTC(y, mo, d, hh, mm, 0) - tzOffsetMin * 60 * 1000;
    const dt = new Date(utc);
    return isNaN(dt.getTime()) ? null : dt.toISOString();
  }

  if (/\btoday\b/i.test(low) || /\b(eod|cob|end of day|close of business)\b/i.test(low)) {
    return buildIso(now.getFullYear(), now.getMonth(), now.getDate(), 17, 0);
  }
  if (/\btomorrow\b/i.test(low)) {
    const t = new Date(now.getTime() + 86400_000);
    return buildIso(t.getFullYear(), t.getMonth(), t.getDate(), 17, 0);
  }

  // Day-Month-Year with optional time:  "15 June 2026 17:00"
  let m = s.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[, ]+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i);
  if (m) {
    const day = +m[1]; const mo = MONTHS[m[2].toLowerCase()];
    if (mo === undefined) return null;
    const year = +m[3];
    let hh = m[4] ? +m[4] : 17; const mm = m[5] ? +m[5] : 0;
    const ampm = (m[6] || "").toLowerCase();
    if (ampm === "pm" && hh < 12) hh += 12;
    if (ampm === "am" && hh === 12) hh = 0;
    return buildIso(year, mo, day, hh, mm);
  }
  // Month Day, Year (US):  "June 15, 2026 5:00 pm ET"
  m = s.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})(?:[, ]+(\d{1,2}):(\d{2})\s*(am|pm)?)?/i);
  if (m) {
    const mo = MONTHS[m[1].toLowerCase()]; if (mo === undefined) return null;
    const day = +m[2]; const year = +m[3];
    let hh = m[4] ? +m[4] : 17; const mm = m[5] ? +m[5] : 0;
    const ampm = (m[6] || "").toLowerCase();
    if (ampm === "pm" && hh < 12) hh += 12;
    if (ampm === "am" && hh === 12) hh = 0;
    return buildIso(year, mo, day, hh, mm);
  }
  // ISO-ish "2026-06-15" or "15/06/2026"
  m = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/);
  if (m) return buildIso(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 17, m[5] ? +m[5] : 0);
  m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return buildIso(+m[3], +m[2] - 1, +m[1], 17, 0); // UK-leaning
  return null;
}

function urgencyFromDeadline(iso: string | null): number {
  if (!iso) return 2;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 2;
  const hours = ms / 3_600_000;
  if (hours <= 6) return 10;
  if (hours <= 24) return 8;
  if (hours <= 72) return 5;
  return 2;
}
function publicationValue(pub: string | null): number {
  if (!pub) return 4;
  const p = pub.toLowerCase();
  if (TOP_TIER_OUTLETS.some((o) => p.includes(o))) return 10;
  if (MID_TIER_HINTS.some((o) => p.includes(o))) return 7;
  return 5;
}
function globalRelevance(text: string, category: string | null): number {
  const t = (text + " " + (category || "")).toLowerCase();
  let s = 4;
  if (/\b(us|usa|america|global|international|worldwide|national)\b/.test(t)) s += 3;
  if (/\b(business|tech|technology|health|beauty|charity|finance)\b/.test(t)) s += 2;
  return Math.min(10, s);
}
function seoValue(text: string): number {
  const t = text.toLowerCase(); let s = 3;
  if (/\b(gift guide|gift|round[- ]?up|product feature|review|best of|backlink|online feature)\b/.test(t)) s += 5;
  if (/\b(expert|comment|quote|insight)\b/.test(t)) s += 2;
  return Math.min(10, s);
}
function salesValue(text: string): number {
  const t = text.toLowerCase(); let s = 2;
  if (/\b(product|brand|service|business|founder|entrepreneur|company)\b/.test(t)) s += 4;
  if (/\b(gift guide|featured product|recommend|review|launch)\b/.test(t)) s += 3;
  return Math.min(10, s);
}
function riskScore(text: string): number {
  let s = 1;
  for (const [re, w] of RISK_KEYWORDS) if (re.test(text)) s += w;
  return Math.min(10, s);
}
function classifyOpportunityType(text: string): string {
  const t = text.toLowerCase();
  if (/\b(gift guide)\b/.test(t)) return "gift_guide";
  if (/\b(product feature|product round|review|launch|product)\b/.test(t)) return "product_feature";
  if (/\b(podcast|interview show|guest on)\b/.test(t)) return "podcast_request";
  if (/\b(data|statistics|stats|survey|research|study)\b/.test(t)) return "data_request";
  if (/\b(charity|nonprofit|non-profit|impact|fundraise)\b/.test(t)) return "charity_story";
  if (/\b(founder|personal profile|my story|entrepreneur journey|career)\b/.test(t)) return "founder_comment";
  if (/\b(expert|comment|quote|insight|tip|advice|opinion|spokesperson|source)\b/.test(t)) return "expert_comment";
  return "journalist_request";
}
function inferCountry(text: string, fallback: string | null): string | null {
  const t = text.toLowerCase();
  if (/\b(usa|united states|america|us-based|new york|nyc|los angeles|washington)\b/.test(t)) return "US";
  if (/\b(uk|britain|british|england|london|wales|scotland)\b/.test(t)) return "UK";
  if (/\b(global|international|worldwide)\b/.test(t)) return "Global";
  return fallback;
}
function findEmail(s: string): string | null {
  const m = s.match(/[\w.+\-]+@[\w.-]+\.[A-Za-z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}
function findUrl(s: string): string | null {
  const m = s.match(/https?:\/\/[^\s)>\]]+/);
  return m ? m[0] : null;
}

function stripFooter(body: string): string {
  const idx = body.search(
    /\n\s*(?:unsubscribe|manage preferences|view in browser|update preferences|copyright|©|all rights reserved|privacy policy|peter shankman|sourceofsources\.com\s+is|to stop receiving|email preferences|sent to you by)/i,
  );
  return idx > 200 ? body.slice(0, idx) : body;
}

// ----------------- Parser primitive: split by repeated section markers -----------------

interface RawBlock { lines: string[]; text: string; }

/**
 * Split body into blocks using anchor regexes. An anchor line starts a new block.
 * Returns blocks that contain at least one anchor.
 */
function splitByAnchors(body: string, anchors: RegExp[]): RawBlock[] {
  const lines = stripFooter(body).split(/\r?\n/).map(normaliseLine);
  const blocks: RawBlock[] = [];
  let cur: string[] = [];
  let curHasAnchor = false;
  const isAnchor = (l: string) => anchors.some((re) => re.test(l));
  for (const l of lines) {
    if (isAnchor(l) && cur.length && curHasAnchor) {
      blocks.push({ lines: cur, text: cur.join("\n") });
      cur = [];
      curHasAnchor = false;
    }
    cur.push(l);
    if (isAnchor(l)) curHasAnchor = true;
  }
  if (cur.length && curHasAnchor) blocks.push({ lines: cur, text: cur.join("\n") });
  return blocks;
}

function fieldFromBlock(block: RawBlock, label: RegExp): string | null {
  for (let i = 0; i < block.lines.length; i++) {
    const l = block.lines[i];
    const m = l.match(label);
    if (!m) continue;
    // inline "Label: value"
    const inline = l.replace(m[0], "").trim().replace(/^[:\-–—]+\s*/, "");
    if (inline) return clean(inline);
    // next non-empty line
    for (let j = i + 1; j < Math.min(block.lines.length, i + 5); j++) {
      const v = block.lines[j].trim();
      if (v) return clean(v);
    }
  }
  return null;
}

// ----------------- Source-specific parsers -----------------

interface ParsedOpportunity {
  title: string;
  category: string | null;
  publication_name: string | null;
  journalist_name: string | null;
  journalist_email: string | null;
  deadline_at: string | null;
  pitch_email: string | null;
  pitch_url: string | null;
  request_summary: string;
  exact_ask: string;
  contact_route: string;
  platform_contact_only: boolean;
  weak: boolean;
}

function buildOpp(b: RawBlock, opts: {
  titleFallback?: string;
  category?: string | null;
  platformOnlyDefault?: boolean;
}): ParsedOpportunity | null {
  const text = b.text;

  const title =
    fieldFromBlock(b, /^(?:query|subject|title|topic|opportunity|request)\s*[:\-]/i) ||
    fieldFromBlock(b, /^summary\s*[:\-]/i) ||
    opts.titleFallback ||
    (b.lines.find((l) => l.length > 8 && !/^[A-Za-z ]+:/.test(l)) || "");
  if (!title) return null;

  const publication =
    fieldFromBlock(b, /^(?:media outlet|outlet|publication|publisher|publication name|media)\s*[:\-]/i) ||
    null;
  const journalistName =
    fieldFromBlock(b, /^(?:name|reporter|journalist|writer|byline|from)\s*[:\-]/i) || null;
  const category =
    opts.category ??
    fieldFromBlock(b, /^(?:category|beat|topic|industry|vertical)\s*[:\-]/i);
  const deadlineRaw =
    fieldFromBlock(b, /^(?:deadline|due|respond by|reply by|closes)\s*[:\-]/i);
  const deadlineIso = parseDeadline(deadlineRaw);
  const requirements =
    fieldFromBlock(b, /^(?:requirements|looking for|brief|details|the ask|what we need)\s*[:\-]/i) || "";

  const journalistEmail = findEmail(text);
  const pitchUrl = findUrl(text);

  let contactRoute = "unknown";
  let platformOnly = !!opts.platformOnlyDefault;
  if (journalistEmail) { contactRoute = "email_allowed"; platformOnly = false; }
  else if (pitchUrl && /(?:qwoted|featured|helpareporter|pressplugs|prnewswire|muckrack|gorkana)/i.test(pitchUrl)) {
    contactRoute = "platform_or_email_unknown";
    platformOnly = true;
  } else if (opts.platformOnlyDefault) {
    contactRoute = "platform_or_email_unknown";
  }

  const summary = (requirements || title).slice(0, 1000);
  const exact = text.slice(0, 1500);
  const weak = !publication || !deadlineIso;

  return {
    title: clean(title).slice(0, 280),
    category: category ? clean(category).slice(0, 120) : null,
    publication_name: publication ? clean(publication).slice(0, 200) : null,
    journalist_name: journalistName ? clean(journalistName).slice(0, 200) : null,
    journalist_email: journalistEmail,
    deadline_at: deadlineIso,
    pitch_email: journalistEmail,
    pitch_url: pitchUrl,
    request_summary: summary,
    exact_ask: exact,
    contact_route: contactRoute,
    platform_contact_only: platformOnly,
    weak,
  };
}

function parseSourceOfSources(body: string): ParsedOpportunity[] {
  if (!body) return [];
  const anchors = [
    /^(?:query|summary|subject|topic|request)\s*[:\-]/i,
    /^(?:\d+\)|\d+\.)\s+\S/,
    /^(?:media outlet|outlet|publication|deadline|name|reporter|requirements)\s*[:\-]/i,
  ];
  const blocks = splitByAnchors(body, anchors);
  const opps: ParsedOpportunity[] = [];
  for (const b of blocks) {
    // skip Peter Shankman promo blocks
    if (/peter shankman|sponsored|advertisement/i.test(b.text) && b.text.length < 400) continue;
    const o = buildOpp(b, {});
    if (o) opps.push(o);
  }
  return opps;
}

function parseHaro(body: string): ParsedOpportunity[] {
  if (!body) return [];
  // HARO/Featured digest sections: numbered or "Query:" / "Summary:" blocks
  const anchors = [
    /^(?:query|summary|subject)\s*[:\-]/i,
    /^\d+\)\s+\S/,
    /^(?:media outlet|name|category|deadline|requirements)\s*[:\-]/i,
  ];
  const blocks = splitByAnchors(body, anchors);
  const opps: ParsedOpportunity[] = [];
  for (const b of blocks) {
    // HARO often hides reporter email behind platform → platform_only default true
    const o = buildOpp(b, { platformOnlyDefault: true });
    if (!o) continue;
    opps.push(o);
  }
  return opps;
}

function parsePressPlugs(body: string): ParsedOpportunity[] {
  if (!body) return [];
  const anchors = [
    /^(?:request|opportunity|query|journalist request|brief)\s*[:\-]/i,
    /^(?:publication|outlet|media|deadline|category|looking for|email|contact)\s*[:\-]/i,
    /^\d+\)\s+\S/,
  ];
  const blocks = splitByAnchors(body, anchors);
  const opps: ParsedOpportunity[] = [];
  for (const b of blocks) {
    const o = buildOpp(b, {});
    if (o) opps.push(o);
  }
  return opps;
}

function parseBySource(name: SourceName, body: string): ParsedOpportunity[] {
  switch (name) {
    case "Source of Sources": return parseSourceOfSources(body);
    case "HARO":              return parseHaro(body);
    case "PressPlugs":        return parsePressPlugs(body);
  }
}

function statusForParsed(name: SourceName): string {
  if (name === "Source of Sources") return "parsed_source_of_sources";
  if (name === "HARO") return "parsed_haro";
  return "parsed_pressplugs";
}
function countryDefault(name: SourceName): string {
  if (name === "PressPlugs") return "UK";
  if (name === "HARO") return "US";
  return "Global";
}

// ----------------- Handler -----------------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const gate = await requireFounder(req);
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  let body: any = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { body = {}; }
  const inboundMessageId: string | null = typeof body.inbound_message_id === "string" ? body.inbound_message_id : null;
  const limit = Math.max(1, Math.min(50, Number(body.limit ?? 10) || 10));
  const dryRun: boolean = body.dry_run === true;
  const forceReparse: boolean = body.force_reparse === true;
  const requestedSource: SourceName | null =
    typeof body.source_name === "string" && (ALL_SOURCES as string[]).includes(body.source_name)
      ? (body.source_name as SourceName) : null;
  const sourceNames: SourceName[] = requestedSource ? [requestedSource] : ALL_SOURCES;

  // Resolve pr_sources rows.
  const { data: srcRows, error: srcErr } = await admin
    .from("pr_sources").select("id,source_name").in("source_name", sourceNames);
  if (srcErr) return json({ ok: false, reason: "source_lookup_failed", message: srcErr.message }, 500);
  const sourceMap = new Map<string, SourceName>();
  const nameToId = new Map<SourceName, string>();
  for (const r of srcRows ?? []) {
    sourceMap.set(r.id, r.source_name as SourceName);
    nameToId.set(r.source_name as SourceName, r.id);
  }
  if (sourceMap.size === 0) {
    return json({ ok: false, reason: "source_not_found", message: `pr_sources missing for: ${sourceNames.join(", ")}` }, 400);
  }

  // Load inbound messages.
  let inboundRows: any[] | null = null;
  if (inboundMessageId) {
    const { data, error } = await admin
      .from("pr_inbound_messages")
      .select("id,subject,body_text,received_at,processed_status,source_id")
      .eq("id", inboundMessageId).limit(1);
    if (error) return json({ ok: false, reason: "inbound_query_failed", message: error.message }, 500);
    inboundRows = data ?? [];
  } else {
    const ids = Array.from(sourceMap.keys());
    const { data, error } = await admin
      .from("pr_inbound_messages")
      .select("id,subject,body_text,received_at,processed_status,source_id")
      .in("source_id", ids)
      .in("processed_status", ["unprocessed", "needs_review", "needs_source_review"])
      .not("body_text", "is", null)
      .order("received_at", { ascending: false })
      .limit(limit);
    if (error) return json({ ok: false, reason: "inbound_query_failed", message: error.message }, 500);
    inboundRows = data ?? [];
  }

  const messagesSeen = inboundRows?.length ?? 0;
  let messagesParsed = 0;
  let opportunitiesInserted = 0;
  let skippedDuplicates = 0;
  let needsReview = 0;
  let parseErrors = 0;
  const processedIds: string[] = [];

  for (const msg of inboundRows ?? []) {
    const inboundId = msg.id as string;
    const sourceId = msg.source_id as string | null;
    if (!sourceId) continue;
    const sourceName = sourceMap.get(sourceId);
    if (!sourceName) continue;

    // Skip already-parsed (linked opportunities exist) unless forced.
    if (!forceReparse) {
      const { count: linked } = await admin
        .from("media_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("inbound_message_id", inboundId);
      if ((linked ?? 0) > 0) {
        if (!dryRun) {
          await admin.from("pr_inbound_messages")
            .update({ processed_status: statusForParsed(sourceName), is_likely_opportunity: true })
            .eq("id", inboundId);
        }
        continue;
      }
    }

    let opps: ParsedOpportunity[] = [];
    try {
      opps = parseBySource(sourceName, String(msg.body_text || ""));
    } catch (e) {
      parseErrors++;
      if (!dryRun) {
        await admin.from("pr_inbound_messages")
          .update({ processed_status: "parse_error" }).eq("id", inboundId);
        await admin.from("pr_risk_events").insert({
          related_type: "pr_inbound_messages",
          related_id: inboundId,
          risk_category: "parser",
          risk_level: "medium",
          description: `${sourceName} parser threw: ${String((e as any)?.message || e).slice(0, 200)}`,
          recommended_action: "Inspect raw email and adjust parser rules.",
        });
      }
      continue;
    }

    messagesParsed++;
    processedIds.push(inboundId);
    let insertedForMsg = 0, dupForMsg = 0, needsReviewForMsg = 0;

    for (const op of opps) {
      if (!op.title || op.title.length < 4) continue;

      // Dedupe by inbound + title + publication + deadline
      let dq = admin.from("media_opportunities").select("id", { head: true, count: "exact" })
        .eq("inbound_message_id", inboundId).eq("title", op.title);
      dq = op.publication_name ? dq.eq("publication_name", op.publication_name) : dq.is("publication_name", null);
      dq = op.deadline_at ? dq.eq("deadline_at", op.deadline_at) : dq.is("deadline_at", null);
      const { count: dupCount } = await dq;
      if ((dupCount ?? 0) > 0) { dupForMsg++; continue; }

      const combined = `${op.title}\n${op.category || ""}\n${op.request_summary}`;
      const opp_type = classifyOpportunityType(combined);
      const urgency = urgencyFromDeadline(op.deadline_at);
      const pubVal = publicationValue(op.publication_name);
      const globalRel = globalRelevance(combined, op.category);
      const seoVal = seoValue(combined);
      const salesVal = salesValue(combined);
      const risk = riskScore(combined);
      const country = inferCountry(combined, countryDefault(sourceName));
      const status = op.weak ? "needs_review" : "new";
      if (op.weak) needsReviewForMsg++;

      if (!dryRun) {
        const { error: insErr } = await admin.from("media_opportunities").insert({
          inbound_message_id: inboundId,
          source_id: sourceId,
          opportunity_type: opp_type,
          category: op.category,
          title: op.title,
          publication_name: op.publication_name,
          journalist_name: op.journalist_name,
          journalist_email: op.journalist_email,
          platform_contact_only: op.platform_contact_only,
          platform_name: sourceName,
          country_market: country,
          beat: op.category,
          topic: op.category,
          request_summary: op.request_summary,
          exact_ask: op.exact_ask,
          deadline_at: op.deadline_at,
          pitch_email: op.pitch_email,
          pitch_url: op.pitch_url,
          contact_route: op.contact_route,
          urgency_score: urgency,
          publication_value_score: pubVal,
          global_relevance_score: globalRel,
          seo_value_score: seoVal,
          sales_value_score: salesVal,
          relationship_value_score: 0,
          risk_score: risk,
          status,
        });
        if (insErr) {
          if (String(insErr.message || "").toLowerCase().includes("duplicate")) dupForMsg++;
          else parseErrors++;
          continue;
        }
      }
      insertedForMsg++;
    }

    opportunitiesInserted += insertedForMsg;
    skippedDuplicates += dupForMsg;
    needsReview += needsReviewForMsg;

    if (!dryRun) {
      const newStatus = insertedForMsg > 0
        ? statusForParsed(sourceName)
        : (opps.length > 0 ? "needs_review" : "no_opportunities_found");
      await admin.from("pr_inbound_messages")
        .update({
          processed_status: newStatus,
          raw_status: "captured",
          is_likely_opportunity: insertedForMsg > 0,
        })
        .eq("id", inboundId);
    }
  }

  const summary = {
    ok: true,
    dry_run: dryRun,
    source_names: sourceNames,
    messages_seen: messagesSeen,
    messages_parsed: messagesParsed,
    opportunities_inserted: opportunitiesInserted,
    skipped_duplicates: skippedDuplicates,
    needs_review: needsReview,
    parse_errors: parseErrors,
  };

  if (!dryRun) {
    try {
      await admin.from("pr_audit_events").insert({
        event_type: "email_digest_parse_run",
        event_summary: `sources=${sourceNames.join("|")} parsed=${messagesParsed} inserted=${opportunitiesInserted} dup=${skippedDuplicates} review=${needsReview} err=${parseErrors}`,
        actor_id: user.id,
        metadata: { ...summary, inbound_ids: processedIds } as any,
      });
    } catch { /* swallow */ }
  }

  return json(summary);
});