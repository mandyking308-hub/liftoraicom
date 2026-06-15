// Rules-based Editorielle daily-email parser.
// Founder/admin only. No AI. No sending. No drafting. No Gmail writes.
// Reads pr_inbound_messages where source = "Editorielle" and splits each
// daily email into individual media_opportunities rows.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

// ----------------- Helpers -----------------

const CATEGORIES = [
  "Business", "Beauty", "Kids", "Travel", "Health", "Fashion",
  "Home & Garden", "Food & Drink", "Finance", "Fitness",
  "Parenting", "Lifestyle", "Tech", "Technology", "Entertainment",
  "Property", "Pets", "Education", "Charity",
];
const CATEGORY_SET = new Set(CATEGORIES.map((c) => c.toLowerCase()));

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
];
const MID_TIER_HINTS = [
  "magazine", "weekly", "review", "today", "world", "uk", "global",
  "house", "homes", "garden", "kitchen", "parents", "mum", "mums",
  "living", "wellness", "fit", "fitness", "money", "wealth", "investor",
];

const RISK_KEYWORDS: Array<[RegExp, number]> = [
  [/\b(child|children|kids|teen|teenager|school|under[- ]?16|toddler|baby|babies)\b/i, 4],
  [/\b(politic|brexit|trump|election|gender|woke|abortion|immigration|war|gaza|israel|ukraine)\b/i, 5],
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

/**
 * Parse strings like:
 *  - "15th June 2026, 17:00pm BST"
 *  - "15 June 2026 5:00pm"
 *  - "Monday 15th June 2026, 5:00 pm BST"
 * Returns ISO timestamptz string or null.
 */
function parseDeadline(raw: string): string | null {
  if (!raw) return null;
  const cleaned = stripOrdinal(raw.replace(/\s+/g, " ").trim());
  const m = cleaned.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[,\s]+)?(\d{1,2}):(\d{2})\s*(am|pm)?\s*(BST|GMT|UTC)?/i,
  );
  if (!m) return null;
  const day = parseInt(m[1], 10);
  const monthName = m[2].toLowerCase();
  const month = MONTHS[monthName];
  if (month === undefined) return null;
  const year = parseInt(m[3], 10);
  let hour = parseInt(m[4], 10);
  const minute = parseInt(m[5], 10);
  const ampm = (m[6] || "").toLowerCase();
  const tz = (m[7] || "BST").toUpperCase(); // assume BST when unspecified
  if (ampm === "pm" && hour < 12) hour += 12;
  if (ampm === "am" && hour === 12) hour = 0;
  const offset = tz === "GMT" || tz === "UTC" ? 0 : 60; // BST = +01:00
  // Convert local to UTC by subtracting the offset.
  const utc = Date.UTC(year, month, day, hour, minute, 0) - offset * 60 * 1000;
  const d = new Date(utc);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
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
  const t = text.toLowerCase();
  let s = 3;
  if (/\b(gift guide|gift|round[- ]?up|product feature|review|best of|backlink|online feature)\b/.test(t)) s += 5;
  if (/\b(expert|comment|quote|insight)\b/.test(t)) s += 2;
  return Math.min(10, s);
}

function salesValue(text: string): number {
  const t = text.toLowerCase();
  let s = 2;
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
  if (/\b(gift guide|gift)\b/.test(t)) return "gift_guide";
  if (/\b(product feature|product round|review|launch)\b/.test(t)) return "product_feature";
  if (/\b(charity|nonprofit|non-profit|impact|fundraise)\b/.test(t)) return "charity_story";
  if (/\b(founder|interview|career|personal profile|my story|entrepreneur)\b/.test(t)) return "founder_comment";
  if (/\b(expert|comment|quote|insight|tip|advice|opinion|spokesperson)\b/.test(t)) return "expert_comment";
  return "journalist_request";
}

function inferCountry(text: string): string | null {
  const t = text.toLowerCase();
  if (/\b(usa|united states|america|us-based)\b/.test(t)) return "US";
  if (/\b(uk|britain|british|england|london)\b/.test(t)) return "UK";
  if (/\b(global|international|worldwide)\b/.test(t)) return "Global";
  return "UK"; // Editorielle is UK-focused
}

function isCategoryLine(line: string): boolean {
  const l = line.trim().replace(/[:•\-–—]+$/, "").trim();
  return CATEGORY_SET.has(l.toLowerCase());
}

function isFooterLine(line: string): boolean {
  const l = line.toLowerCase();
  return /\b(unsubscribe|manage preferences|view in browser|update preferences|update your preferences|copyright|all rights reserved|©|terms of service|privacy policy|preferences)\b/.test(l);
}

function normaliseLine(s: string): string {
  return s.replace(/\u00a0/g, " ").replace(/\s+$/g, "").trim();
}

// ----------------- Parser core -----------------

interface ParsedOpportunity {
  title: string;
  category: string | null;
  publication_name: string | null;
  deadline_raw: string | null;
  deadline_at: string | null;
  pitch_email: string | null;
  pitch_url: string | null;
  request_summary: string;
  exact_ask: string;
  weak: boolean;
}

function parseEditorielleBody(body: string): ParsedOpportunity[] {
  if (!body) return [];
  // Cut at common footer markers.
  const footerIdx = body.search(/\n(?:unsubscribe|manage preferences|view in browser|update preferences|copyright)/i);
  const usable = footerIdx > 200 ? body.slice(0, footerIdx) : body;

  const lines = usable.split(/\r?\n/).map(normaliseLine);
  // Drop the navigation block that lists categories sequentially.
  // Detect: 3+ category names appearing on consecutive non-empty lines.
  const filtered: string[] = [];
  let i = 0;
  while (i < lines.length) {
    let run = 0;
    let j = i;
    while (j < lines.length && (lines[j] === "" || isCategoryLine(lines[j]))) {
      if (isCategoryLine(lines[j])) run++;
      j++;
      if (run >= 4) break;
    }
    if (run >= 4) {
      // skip navigation block
      i = j;
      continue;
    }
    filtered.push(lines[i]);
    i++;
  }

  const opps: ParsedOpportunity[] = [];
  let currentCategory: string | null = null;

  // Find "Media outlet" anchors.
  for (let idx = 0; idx < filtered.length; idx++) {
    const line = filtered[idx];
    if (!line) continue;
    if (isFooterLine(line)) break;

    if (isCategoryLine(line)) {
      currentCategory = line.trim();
      continue;
    }

    if (/^media outlet\s*:?\s*$/i.test(line) || /^media outlet\s*:/i.test(line)) {
      // Title = nearest preceding non-empty, non-header, non-category line.
      let title = "";
      for (let b = idx - 1; b >= 0 && b > idx - 12; b--) {
        const cand = filtered[b];
        if (!cand) continue;
        if (isCategoryLine(cand)) break;
        if (/^(media outlet|deadline|click to pitch|or email|category)\s*:?\s*$/i.test(cand)) continue;
        title = cand;
        break;
      }
      if (!title) continue;

      // Publication = first non-empty line after Media outlet header.
      let publication: string | null = null;
      let cursor = idx + 1;
      while (cursor < filtered.length && !filtered[cursor]) cursor++;
      if (cursor < filtered.length && !/^deadline/i.test(filtered[cursor])) {
        publication = filtered[cursor];
        cursor++;
      }

      // Deadline anchor.
      let deadlineRaw: string | null = null;
      const deadlineIdx = filtered.findIndex((l, k) => k > idx && /^deadline\s*:?\s*$/i.test(l));
      if (deadlineIdx > -1 && deadlineIdx < idx + 25) {
        let dc = deadlineIdx + 1;
        while (dc < filtered.length && !filtered[dc]) dc++;
        if (dc < filtered.length) deadlineRaw = filtered[dc];
      } else {
        // Inline "Deadline: 15th June 2026..."
        for (let k = idx + 1; k < Math.min(filtered.length, idx + 20); k++) {
          const ml = filtered[k].match(/^deadline\s*:\s*(.+)$/i);
          if (ml) { deadlineRaw = ml[1]; break; }
        }
      }
      const deadlineIso = deadlineRaw ? parseDeadline(deadlineRaw) : null;

      // Pitch email / url near the block.
      const blockEnd = Math.min(filtered.length, idx + 40);
      const block = filtered.slice(idx, blockEnd).join("\n");
      const emailMatch = block.match(/[\w.+\-]+@[\w.-]+\.[A-Za-z]{2,}/);
      const pitchEmail = emailMatch ? emailMatch[0].toLowerCase() : null;
      const urlMatch = block.match(/https?:\/\/[^\s)>\]]+/);
      const pitchUrl = urlMatch ? urlMatch[0] : null;

      // Request summary = a few lines before "Media outlet" (after title).
      const summaryLines: string[] = [];
      for (let b = idx - 1; b >= 0 && b > idx - 8; b--) {
        const cand = filtered[b];
        if (!cand) { if (summaryLines.length) break; else continue; }
        if (cand === title) continue;
        if (isCategoryLine(cand)) break;
        if (/^(media outlet|deadline|click to pitch|or email|category)/i.test(cand)) continue;
        summaryLines.unshift(cand);
      }
      const requestSummary = (summaryLines.join(" ").slice(0, 1000)) || title;
      const exactAsk = block.slice(0, 1500);

      const weak = !publication || !deadlineIso;

      opps.push({
        title: title.slice(0, 280),
        category: currentCategory,
        publication_name: publication ? publication.slice(0, 200) : null,
        deadline_raw: deadlineRaw,
        deadline_at: deadlineIso,
        pitch_email: pitchEmail,
        pitch_url: pitchUrl,
        request_summary: requestSummary,
        exact_ask: exactAsk,
        weak,
      });
    }
  }
  return opps;
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

  // Resolve Editorielle source.
  const { data: srcRow, error: srcErr } = await admin
    .from("pr_sources").select("id,source_name").eq("source_name", "Editorielle").maybeSingle();
  if (srcErr || !srcRow) {
    return json({ ok: false, reason: "source_not_found", message: "pr_sources row 'Editorielle' is missing." }, 400);
  }
  const sourceId = srcRow.id as string;

  // Load candidate inbound messages.
  let query = admin
    .from("pr_inbound_messages")
    .select("id,subject,body_text,received_at,processed_status")
    .eq("source_id", sourceId)
    .not("body_text", "is", null)
    .order("received_at", { ascending: false })
    .limit(limit);
  if (inboundMessageId) {
    query = admin
      .from("pr_inbound_messages")
      .select("id,subject,body_text,received_at,processed_status")
      .eq("id", inboundMessageId)
      .limit(1);
  } else {
    query = query.in("processed_status", ["unprocessed", "needs_review", "needs_source_review"]);
  }
  const { data: inboundRows, error: inboundErr } = await query;
  if (inboundErr) {
    return json({ ok: false, reason: "inbound_query_failed", message: inboundErr.message }, 500);
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

    // Skip if already has opportunities and not forcing reparse.
    if (!forceReparse) {
      const { count: linked } = await admin
        .from("media_opportunities")
        .select("id", { count: "exact", head: true })
        .eq("inbound_message_id", inboundId);
      if ((linked ?? 0) > 0) {
        // Already parsed previously; ensure status reflects that.
        if (!dryRun) {
          await admin.from("pr_inbound_messages")
            .update({ processed_status: "parsed_editorielle", is_likely_opportunity: true })
            .eq("id", inboundId);
        }
        continue;
      }
    }

    let opps: ParsedOpportunity[] = [];
    try {
      opps = parseEditorielleBody(String(msg.body_text || ""));
    } catch (e) {
      parseErrors++;
      if (!dryRun) {
        await admin.from("pr_inbound_messages").update({ processed_status: "parse_error" }).eq("id", inboundId);
        await admin.from("pr_risk_events").insert({
          related_type: "pr_inbound_messages",
          related_id: inboundId,
          risk_category: "parser",
          risk_level: "medium",
          description: `Editorielle parser threw: ${String((e as any)?.message || e).slice(0, 200)}`,
          recommended_action: "Inspect raw email and adjust parser rules.",
        });
      }
      continue;
    }

    messagesParsed++;
    processedIds.push(inboundId);
    let insertedForMsg = 0;
    let dupForMsg = 0;
    let needsReviewForMsg = 0;

    for (const op of opps) {
      if (!op.title) continue;

      // Dedupe.
      const dupQ = admin.from("media_opportunities").select("id", { head: true, count: "exact" })
        .eq("inbound_message_id", inboundId)
        .eq("title", op.title);
      const dupQ2 = op.publication_name ? dupQ.eq("publication_name", op.publication_name) : dupQ.is("publication_name", null);
      const dupQ3 = op.deadline_at ? dupQ2.eq("deadline_at", op.deadline_at) : dupQ2.is("deadline_at", null);
      const { count: dupCount } = await dupQ3;
      if ((dupCount ?? 0) > 0) { dupForMsg++; continue; }

      const combined = `${op.title}\n${op.category || ""}\n${op.request_summary}`;
      const opp_type = classifyOpportunityType(combined);
      const urgency = urgencyFromDeadline(op.deadline_at);
      const pubVal = publicationValue(op.publication_name);
      const globalRel = globalRelevance(combined, op.category);
      const seoVal = seoValue(combined);
      const salesVal = salesValue(combined);
      const risk = riskScore(combined);
      const country = inferCountry(combined);
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
          platform_contact_only: false,
          platform_name: "Editorielle",
          country_market: country,
          topic: op.category,
          request_summary: op.request_summary,
          exact_ask: op.exact_ask,
          deadline_at: op.deadline_at,
          pitch_email: op.pitch_email,
          pitch_url: op.pitch_url,
          contact_route: "email_allowed",
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
          else { parseErrors++; }
          continue;
        }
      }
      insertedForMsg++;
    }

    opportunitiesInserted += insertedForMsg;
    skippedDuplicates += dupForMsg;
    needsReview += needsReviewForMsg;

    // Update inbound status (skip writes in dry run).
    if (!dryRun) {
      const newStatus = insertedForMsg > 0 ? "parsed_editorielle" : "no_opportunities_found";
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
    source_id: sourceId,
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
        event_type: "editorielle_parse_run",
        event_summary: `parsed=${messagesParsed} inserted=${opportunitiesInserted} dup=${skippedDuplicates} review=${needsReview} err=${parseErrors}`,
        actor_id: user.id,
        metadata: { ...summary, inbound_ids: processedIds } as any,
      });
    } catch { /* swallow */ }
  }

  return json(summary);
});