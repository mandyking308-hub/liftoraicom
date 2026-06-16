// Liftor Searchable Video Library — transcript ingest
// Accepts a video id + transcript payload (VTT, SRT or JSON segments),
// parses into timecoded segments, embeds each segment via Lovable AI Gateway,
// and stores them in video_transcript_segments.
//
// Auth: founder/admin only. JWT validated in code.
// No external sending. No scraping. Embedding model = openai/text-embedding-3-small (1536 dims).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const GATEWAY_EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const MAX_SEGMENTS = 5000;
const MAX_TEXT_BYTES = 2_000_000;

type RawSegment = { start: number; end: number; text: string; speaker?: string };

function tcToSeconds(tc: string): number {
  // 00:00:00.000 or 00:00:00,000
  const m = tc.trim().match(/^(\d+):(\d{2}):(\d{2})[\.,](\d{1,3})$/);
  if (m) return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (+m[4]) / 1000;
  const m2 = tc.trim().match(/^(\d+):(\d{2})[\.,](\d{1,3})$/);
  if (m2) return (+m2[1]) * 60 + (+m2[2]) + (+m2[3]) / 1000;
  const n = Number(tc); return Number.isFinite(n) ? n : 0;
}

function parseVtt(src: string): RawSegment[] {
  const out: RawSegment[] = [];
  const blocks = src.replace(/\r/g, "").split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const [s, e] = tl.split("-->").map((x) => x.trim().split(" ")[0]);
    const idx = lines.indexOf(tl);
    const text = lines.slice(idx + 1).join(" ").replace(/<[^>]+>/g, "").trim();
    if (!text) continue;
    out.push({ start: tcToSeconds(s), end: tcToSeconds(e), text });
  }
  return out;
}

function parseSrt(src: string): RawSegment[] {
  const out: RawSegment[] = [];
  const blocks = src.replace(/\r/g, "").split(/\n\n+/);
  for (const block of blocks) {
    const lines = block.split("\n").filter(Boolean);
    const tl = lines.find((l) => l.includes("-->"));
    if (!tl) continue;
    const [s, e] = tl.split("-->").map((x) => x.trim());
    const idx = lines.indexOf(tl);
    const text = lines.slice(idx + 1).join(" ").trim();
    if (!text) continue;
    out.push({ start: tcToSeconds(s), end: tcToSeconds(e), text });
  }
  return out;
}

function parseJson(payload: any): RawSegment[] {
  const arr = Array.isArray(payload) ? payload : payload?.segments;
  if (!Array.isArray(arr)) return [];
  return arr.map((s: any) => ({
    start: Number(s.start ?? s.start_seconds ?? s.startTime ?? 0),
    end: Number(s.end ?? s.end_seconds ?? s.endTime ?? 0),
    text: String(s.text ?? s.content ?? "").trim(),
    speaker: s.speaker ?? s.speaker_name ?? undefined,
  })).filter((s: RawSegment) => s.text);
}

async function embedBatch(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch(GATEWAY_EMBED_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({ model: EMBED_MODEL, input: texts, dimensions: EMBED_DIMS }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`embedding_failed:${res.status}:${body.slice(0, 200)}`);
  }
  const j = await res.json();
  return (j.data ?? []).map((d: any) => d.embedding);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE) return json({ error: "missing_lovable_api_key" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: ures } = await userClient.auth.getUser();
    const user = ures?.user;
    if (!user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) return json({ error: "founder_or_admin_required" }, 403);

    const body = await req.json().catch(() => ({}));
    const videoId = body.video_id;
    const format = String(body.format ?? "vtt").toLowerCase();
    const content = body.content;
    if (!videoId || typeof videoId !== "string") return json({ error: "missing_video_id" }, 400);
    if (content == null) return json({ error: "missing_content" }, 400);
    const raw = typeof content === "string" ? content : JSON.stringify(content);
    if (raw.length > MAX_TEXT_BYTES) return json({ error: "transcript_too_large" }, 413);

    const { data: vid, error: vErr } = await admin.from("video_library_items").select("id,business_id,status").eq("id", videoId).maybeSingle();
    if (vErr || !vid) return json({ error: "video_not_found" }, 404);

    let segments: RawSegment[] = [];
    if (format === "vtt") segments = parseVtt(String(content));
    else if (format === "srt") segments = parseSrt(String(content));
    else if (format === "json") segments = parseJson(typeof content === "string" ? JSON.parse(content) : content);
    else return json({ error: "unsupported_format", allowed: ["vtt", "srt", "json"] }, 400);

    if (!segments.length) return json({ error: "no_segments_parsed" }, 400);
    if (segments.length > MAX_SEGMENTS) return json({ error: "too_many_segments", max: MAX_SEGMENTS, found: segments.length }, 413);

    await admin.from("video_library_items").update({ status: "processing" }).eq("id", videoId);
    await admin.from("video_transcript_segments").delete().eq("video_id", videoId);

    // batch embed (32 at a time)
    const BATCH = 32;
    const allEmbeddings: number[][] = [];
    for (let i = 0; i < segments.length; i += BATCH) {
      const chunk = segments.slice(i, i + BATCH).map((s) => s.text);
      const embeds = await embedBatch(chunk, LOVABLE);
      if (embeds.length !== chunk.length) throw new Error("embedding_length_mismatch");
      allEmbeddings.push(...embeds);
    }

    const rows = segments.map((s, i) => ({
      video_id: videoId,
      business_id: vid.business_id,
      segment_index: i,
      start_seconds: Number.isFinite(s.start) ? s.start : 0,
      end_seconds: Number.isFinite(s.end) ? s.end : (s.start ?? 0) + 1,
      speaker: s.speaker ?? null,
      text: s.text,
      embedding: allEmbeddings[i] as any,
      embedding_model: EMBED_MODEL,
      embedded_at: new Date().toISOString(),
    }));

    // chunked insert
    const INS = 200;
    for (let i = 0; i < rows.length; i += INS) {
      const slice = rows.slice(i, i + INS);
      const { error } = await admin.from("video_transcript_segments").insert(slice);
      if (error) throw new Error(`insert_failed:${error.message}`);
    }

    await admin.from("video_library_items").update({
      status: "ready",
      transcript_segment_count: rows.length,
      embedding_model: EMBED_MODEL,
    }).eq("id", videoId);

    return json({ ok: true, video_id: videoId, segments: rows.length, model: EMBED_MODEL });
  } catch (e: any) {
    return json({ error: "ingest_failed", detail: String(e?.message ?? e) }, 500);
  }
});