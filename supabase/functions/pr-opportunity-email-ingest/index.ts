// Gmail PR opportunity intake worker.
// Founder/admin only. Reads ONLY the "Liftor/PR Opportunities" Gmail labels
// and a narrow allow-list of known PR-source senders. Does NOT scan the whole
// inbox, does NOT call AI, does NOT extract opportunities, does NOT send mail.
//
// Future scheduling (NOT enabled in this phase):
//   - Main sweep:   13:15 UK weekdays
//   - Urgent scan:  17:30 UK weekdays
// When the project enables Supabase scheduled functions safely, wire those
// schedules to invoke this function with { mode: "scheduled", lookback_days: 1 }.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

const PR_GMAIL_ACCOUNT = Deno.env.get("PR_GMAIL_ACCOUNT") ?? "mandyking308@gmail.com";
const GMAIL_CLIENT_ID = Deno.env.get("GMAIL_CLIENT_ID") ?? "";
const GMAIL_CLIENT_SECRET = Deno.env.get("GMAIL_CLIENT_SECRET") ?? "";
const GMAIL_REFRESH_TOKEN = Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "";

const ROOT_LABEL = "Liftor/PR Opportunities";
const SUB_LABELS = [
  "Liftor/PR Opportunities/Editorielle",
  "Liftor/PR Opportunities/Source of Sources",
  "Liftor/PR Opportunities/HARO",
  "Liftor/PR Opportunities/Qwoted",
  "Liftor/PR Opportunities/PressPlugs",
  "Liftor/PR Opportunities/ResponseSource",
];

// Known sender / domain → source_name mapping. Used for label-less fallback.
const SENDER_MAP: { match: (email: string) => boolean; source: string; label: string }[] = [
  { match: (e) => e === "hello@editorielle.com", source: "Editorielle", label: "Editorielle" },
  { match: (e) => e === "peter@sourceofsources.com", source: "Source of Sources", label: "Source of Sources" },
  { match: (e) => e === "noreply@helpareporter.com", source: "HARO", label: "HARO" },
  { match: (e) => e === "no-reply@qwoted.com" || e === "amy.ord@qwoted.com" || e === "ify@qwoted.intercom-mail.com" || e.endsWith("@qwoted.com"), source: "Qwoted", label: "Qwoted" },
  { match: (e) => e === "enquiries@pressplugs.co.uk", source: "PressPlugs", label: "PressPlugs" },
];

function mapSenderToSource(email: string): { source: string; label: string } | null {
  const e = email.trim().toLowerCase();
  if (!e) return null;
  for (const r of SENDER_MAP) if (r.match(e)) return { source: r.source, label: r.label };
  return null;
}

function labelToSourceName(label: string): string | null {
  const tail = label.split("/").pop()?.trim() ?? "";
  if (!tail) return null;
  // Allow only known sub-labels.
  const known = ["Editorielle", "Source of Sources", "HARO", "Qwoted", "PressPlugs", "ResponseSource"];
  return known.includes(tail) ? tail : null;
}

function parseSender(from: string): { name: string | null; email: string | null } {
  if (!from) return { name: null, email: null };
  const m = from.match(/^\s*(?:"?([^"<]*)"?\s*)?<?([^<>\s]+@[^<>\s]+)>?\s*$/);
  if (!m) return { name: null, email: null };
  return { name: (m[1] || "").trim() || null, email: (m[2] || "").trim().toLowerCase() || null };
}

function b64urlDecode(s: string): string {
  try {
    const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
    const b64 = (s.replace(/-/g, "+").replace(/_/g, "/")) + pad;
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch { return ""; }
}

function extractPlainText(payload: any): string {
  // Walk MIME tree, prefer text/plain. Cap at 20k chars.
  const out: string[] = [];
  const walk = (p: any) => {
    if (!p) return;
    if (p.mimeType === "text/plain" && p.body?.data) out.push(b64urlDecode(p.body.data));
    if (Array.isArray(p.parts)) for (const sub of p.parts) walk(sub);
  };
  walk(payload);
  const joined = out.join("\n").trim();
  return joined.length > 20000 ? joined.slice(0, 20000) : joined;
}

async function getAccessToken(): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`gmail_token_failed:${res.status}`);
  const j = await res.json();
  return j.access_token as string;
}

async function gmailGet(path: string, token: string): Promise<any> {
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`gmail_api_failed:${res.status}:${t.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const gate = await requireFounder(req);
  if ("error" in gate) return gate.error;
  const { admin, user } = gate;

  let body: any = {};
  try { body = req.method === "POST" ? await req.json() : {}; } catch { body = {}; }
  const mode: "manual" | "scheduled" = body.mode === "scheduled" ? "scheduled" : "manual";
  const lookbackRaw = Number(body.lookback_days ?? 7);
  const lookback_days = Math.max(1, Math.min(30, Number.isFinite(lookbackRaw) ? lookbackRaw : 7));
  const source_filter: string | null = typeof body.source_filter === "string" ? body.source_filter : null;
  const dry_run: boolean = body.dry_run === true;

  // Check Gmail config.
  const missing: string[] = [];
  if (!GMAIL_CLIENT_ID) missing.push("GMAIL_CLIENT_ID");
  if (!GMAIL_CLIENT_SECRET) missing.push("GMAIL_CLIENT_SECRET");
  if (!GMAIL_REFRESH_TOKEN) missing.push("GMAIL_REFRESH_TOKEN");
  if (missing.length > 0) {
    return json({
      ok: false,
      reason: "gmail_not_configured",
      missing,
      gmail_account: PR_GMAIL_ACCOUNT,
      message: "Gmail OAuth credentials are not configured. Add the missing secrets, then retry.",
    });
  }

  // Load pr_sources lookup.
  const { data: sourcesRows } = await admin.from("pr_sources").select("id,source_name");
  const sourceByName = new Map<string, string>();
  for (const r of sourcesRows ?? []) sourceByName.set(String(r.source_name), String(r.id));

  let labels_resolved: { name: string; id: string }[] = [];
  let emails_seen = 0;
  let inserted = 0;
  let skipped_duplicates = 0;
  let skipped_unknown_source = 0;
  let skipped_out_of_scope = 0;
  const sources_seen = new Set<string>();

  try {
    const token = await getAccessToken();

    // Resolve labels.
    const labelList = await gmailGet("/labels", token);
    const wanted = new Set<string>([ROOT_LABEL, ...SUB_LABELS]);
    for (const l of labelList.labels ?? []) {
      if (wanted.has(l.name)) labels_resolved.push({ name: l.name, id: l.id });
    }
    const labelIdByName = new Map(labels_resolved.map((l) => [l.name, l.id] as const));

    // Build search candidates: label-scoped + sender allow-list (date-bounded).
    const dateQ = `newer_than:${lookback_days}d`;
    const queries: { q: string; labelIds?: string[]; sourceHint?: string }[] = [];

    // Per sub-label search.
    for (const lname of [ROOT_LABEL, ...SUB_LABELS]) {
      const id = labelIdByName.get(lname);
      if (!id) continue;
      const sourceHint = labelToSourceName(lname) ?? undefined;
      if (source_filter && sourceHint && sourceHint !== source_filter) continue;
      queries.push({ q: dateQ, labelIds: [id], sourceHint });
    }

    // Sender fallback (only known PR senders, date-bounded).
    const senderClauses = [
      "from:hello@editorielle.com",
      "from:peter@sourceofsources.com",
      "from:noreply@helpareporter.com",
      "from:no-reply@qwoted.com",
      "from:amy.ord@qwoted.com",
      "from:ify@qwoted.intercom-mail.com",
      "from:enquiries@pressplugs.co.uk",
    ];
    queries.push({ q: `${dateQ} (${senderClauses.join(" OR ")})` });

    // Collect message IDs (de-dup in-memory).
    const seenIds = new Set<string>();
    const messageRefs: { id: string; sourceHint?: string; labelName?: string }[] = [];
    for (const q of queries) {
      const params = new URLSearchParams({ q: q.q, maxResults: "50" });
      if (q.labelIds) for (const lid of q.labelIds) params.append("labelIds", lid);
      const list = await gmailGet(`/messages?${params.toString()}`, token);
      for (const m of list.messages ?? []) {
        if (seenIds.has(m.id)) continue;
        seenIds.add(m.id);
        const labelName = q.labelIds ? [...labelIdByName.entries()].find(([_, id]) => id === q.labelIds![0])?.[0] : undefined;
        messageRefs.push({ id: m.id, sourceHint: q.sourceHint, labelName });
      }
    }
    emails_seen = messageRefs.length;

    for (const ref of messageRefs) {
      // Duplicate check first to avoid extra API calls.
      const { data: existing } = await admin
        .from("pr_inbound_messages")
        .select("id")
        .eq("gmail_message_id", ref.id)
        .maybeSingle();
      if (existing) { skipped_duplicates++; continue; }

      const msg = await gmailGet(`/messages/${ref.id}?format=full`, token);
      const headers: { name: string; value: string }[] = msg.payload?.headers ?? [];
      const hget = (n: string) => headers.find((h) => h.name?.toLowerCase() === n.toLowerCase())?.value ?? "";
      const fromHeader = hget("From");
      const subject = hget("Subject") || null;
      const dateHeader = hget("Date");
      const internalDate = msg.internalDate ? new Date(Number(msg.internalDate)) : (dateHeader ? new Date(dateHeader) : new Date());
      const { name: sender_name, email: sender_email } = parseSender(fromHeader);
      const snippet = (msg.snippet as string | undefined) || null;

      // Source resolution: label first, then sender.
      const labelSourceNames = (msg.labelIds as string[] | undefined ?? [])
        .map((id) => [...labelIdByName.entries()].find(([_, lid]) => lid === id)?.[0])
        .filter(Boolean) as string[];
      let sourceName: string | null = null;
      let source_label: string | null = null;
      for (const ln of labelSourceNames) {
        const s = labelToSourceName(ln);
        if (s) { sourceName = s; source_label = ln; break; }
      }
      if (!sourceName && sender_email) {
        const sm = mapSenderToSource(sender_email);
        if (sm) { sourceName = sm.source; source_label = `sender:${sm.label}`; }
      }

      // Source filter (post-resolution).
      if (source_filter && sourceName !== source_filter) { skipped_out_of_scope++; continue; }

      // Require: either resolved source, or master PR root label (needs review).
      const hasRootLabel = labelSourceNames.includes(ROOT_LABEL);
      let source_id: string | null = null;
      let raw_status = "captured";
      if (sourceName) {
        source_id = sourceByName.get(sourceName) ?? null;
        if (source_id) sources_seen.add(sourceName);
      } else if (hasRootLabel) {
        raw_status = "needs_source_review";
      } else {
        skipped_unknown_source++;
        continue;
      }

      if (dry_run) { inserted++; continue; }

      const body_text = extractPlainText(msg.payload);
      const { error: insErr } = await admin.from("pr_inbound_messages").insert({
        gmail_message_id: ref.id,
        gmail_thread_id: msg.threadId ?? null,
        sender_name,
        sender_email,
        subject,
        snippet,
        received_at: internalDate.toISOString(),
        source_id,
        source_label,
        body_text: body_text ? body_text : null,
        raw_status,
        processed_status: "unprocessed",
        is_likely_opportunity: false,
        ai_processed: false,
      });
      if (insErr) {
        // Treat unique-conflict (race) as a duplicate.
        if (String(insErr.message || "").toLowerCase().includes("duplicate")) skipped_duplicates++;
        else throw insErr;
      } else {
        inserted++;
      }
    }
  } catch (e: any) {
    return json({
      ok: false,
      reason: "gmail_api_error",
      message: String(e?.message || e).slice(0, 300),
      gmail_config_ok: true,
      labels_resolved: labels_resolved.map((l) => l.name),
      emails_seen,
      inserted,
      skipped_duplicates,
      skipped_unknown_source,
      skipped_out_of_scope,
    }, 500);
  }

  const summary = {
    ok: true,
    mode,
    dry_run,
    lookback_days,
    source_filter,
    gmail_config_ok: true,
    gmail_account: PR_GMAIL_ACCOUNT,
    labels_resolved: labels_resolved.map((l) => l.name),
    emails_seen,
    inserted,
    skipped_duplicates,
    skipped_unknown_source,
    skipped_out_of_scope,
    sources_seen: [...sources_seen],
  };

  // Audit (best-effort, never leak secrets/bodies).
  if (!dry_run) {
    try {
      await admin.from("pr_audit_events").insert({
        event_type: "gmail_intake_run",
        event_summary: `inserted=${inserted} dup=${skipped_duplicates} unknown=${skipped_unknown_source} oos=${skipped_out_of_scope} seen=${emails_seen}`,
        actor_id: user.id,
        metadata: summary as any,
      });
    } catch { /* swallow */ }
  }

  return json(summary);
});