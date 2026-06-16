// Liftor Searchable Video Library — Ask-this-video Q&A
// Retrieves top transcript segments for a given video (semantic + keyword),
// then asks the LLM to answer USING ONLY those snippets. Returns answer + citations
// with timestamp jump links. Founder/admin only.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const CHAT_MODEL = "google/gemini-2.5-flash";
const GATEWAY_EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";
const GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    const question = String(body.question ?? "").trim();
    if (!videoId) return json({ error: "missing_video_id" }, 400);
    if (!question) return json({ error: "missing_question" }, 400);
    if (question.length > 2000) return json({ error: "question_too_long" }, 400);

    // embed question
    const eRes = await fetch(GATEWAY_EMBED_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE}` },
      body: JSON.stringify({ model: EMBED_MODEL, input: question, dimensions: EMBED_DIMS }),
    });
    if (!eRes.ok) return json({ error: "embedding_failed", status: eRes.status }, 502);
    const embedding = (await eRes.json())?.data?.[0]?.embedding;

    const { data: matches, error: mErr } = await admin.rpc("match_video_segments", {
      query_text: question,
      query_embedding: embedding as any,
      match_count: 8,
      video_filter: videoId,
      business_filter: null,
      semantic_weight: 0.7,
    });
    if (mErr) return json({ error: "retrieval_failed", detail: mErr.message }, 500);
    if (!matches?.length) return json({
      ok: true, video_id: videoId, question,
      answer: "I could not find any relevant transcript segments for that question.",
      citations: [], model_used: CHAT_MODEL,
    });

    const ctx = matches.map((m: any, i: number) =>
      `[${i + 1}] (${Number(m.start_seconds).toFixed(1)}s–${Number(m.end_seconds).toFixed(1)}s) ${m.text}`
    ).join("\n");

    const cRes = await fetch(GATEWAY_CHAT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE}` },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages: [
          { role: "system", content: "You answer questions strictly using the supplied video transcript snippets. Quote inline citations like [1], [2]. If the snippets do not contain the answer, say so. Do not invent facts." },
          { role: "user", content: `Question: ${question}\n\nTranscript snippets:\n${ctx}` },
        ],
        temperature: 0.2,
      }),
    });
    if (!cRes.ok) {
      const txt = await cRes.text();
      if (cRes.status === 402) return json({ error: "ai_credits_exhausted" }, 402);
      if (cRes.status === 429) return json({ error: "ai_rate_limited" }, 429);
      return json({ error: "ai_call_failed", status: cRes.status, detail: txt.slice(0, 200) }, 502);
    }
    const cj = await cRes.json();
    const answer = cj?.choices?.[0]?.message?.content ?? "";
    const tokens = cj?.usage?.total_tokens ?? null;

    const citations = matches.map((m: any, i: number) => ({
      n: i + 1,
      segment_id: m.segment_id,
      start_seconds: Number(m.start_seconds),
      end_seconds: Number(m.end_seconds),
      text: m.text,
    }));

    await admin.from("video_library_qa_log").insert({
      video_id: videoId, asked_by: user.id, question, answer,
      citations, model_used: CHAT_MODEL, tokens_used: tokens,
    });

    return json({ ok: true, video_id: videoId, question, answer, citations, model_used: CHAT_MODEL, tokens_used: tokens });
  } catch (e: any) {
    return json({ error: "ask_error", detail: String(e?.message ?? e) }, 500);
  }
});