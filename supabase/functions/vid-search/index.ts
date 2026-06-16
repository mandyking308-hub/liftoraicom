// Liftor Searchable Video Library — hybrid search
// Embeds the query, then calls match_video_segments (keyword + semantic).
// Founder/admin only. Logs each search to video_library_search_audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const EMBED_MODEL = "openai/text-embedding-3-small";
const EMBED_DIMS = 1536;
const GATEWAY_EMBED_URL = "https://ai.gateway.lovable.dev/v1/embeddings";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: any, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const t0 = performance.now();
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE = Deno.env.get("LOVABLE_API_KEY");
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
    const query = String(body.query ?? "").trim();
    const mode = String(body.mode ?? "hybrid"); // keyword | semantic | hybrid
    const limit = Math.min(Math.max(parseInt(body.limit ?? 20, 10) || 20, 1), 100);
    const videoFilter = body.video_id ?? null;
    const businessFilter = body.business_id ?? null;
    const moduleFilter = body.module ? String(body.module) : null;
    const areaFilter = body.dashboard_area ? String(body.dashboard_area) : null;
    const videoTypeFilter = body.video_type ? String(body.video_type) : null;
    const audienceFilter = body.audience_type ? String(body.audience_type) : null;
    const providerFilter = body.external_provider ? String(body.external_provider) : null;
    const approvalFilter = body.approval_status ? String(body.approval_status) : null;
    const privacyFilter = body.privacy_status ? String(body.privacy_status) : null;
    if (!query) return json({ error: "missing_query" }, 400);

    let embedding: number[] | null = null;
    if (mode !== "keyword") {
      if (!LOVABLE) return json({ error: "missing_lovable_api_key" }, 500);
      const res = await fetch(GATEWAY_EMBED_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE}` },
        body: JSON.stringify({ model: EMBED_MODEL, input: query, dimensions: EMBED_DIMS }),
      });
      if (!res.ok) {
        const txt = await res.text();
        return json({ error: "embedding_failed", status: res.status, detail: txt.slice(0, 200) }, 502);
      }
      const j = await res.json();
      embedding = j?.data?.[0]?.embedding ?? null;
    }

    const semanticWeight = mode === "keyword" ? 0 : mode === "semantic" ? 1 : 0.6;
    const { data, error } = await admin.rpc("match_video_segments", {
      query_text: query,
      query_embedding: embedding as any,
      match_count: limit,
      video_filter: videoFilter,
      business_filter: businessFilter,
      semantic_weight: semanticWeight,
    });
    if (error) return json({ error: "search_failed", detail: error.message }, 500);

    // join video titles + metadata for display + post-filter
    const ids = Array.from(new Set((data ?? []).map((r: any) => r.video_id)));
    let videos: Record<string, any> = {};
    if (ids.length) {
      const { data: vrows } = await admin.from("video_library_items")
        .select("id,title,external_url,external_provider,duration_seconds,visibility,business_id,module_coverage,dashboard_area,video_type,audience_type,approval_status,privacy_status")
        .in("id", ids);
      for (const v of vrows ?? []) videos[v.id] = v;
    }

    const filtered = (data ?? []).filter((r: any) => {
      const v = videos[r.video_id];
      if (!v) return true;
      if (moduleFilter && !(v.module_coverage ?? []).includes(moduleFilter)) return false;
      if (areaFilter && v.dashboard_area !== areaFilter) return false;
      if (videoTypeFilter && v.video_type !== videoTypeFilter) return false;
      if (audienceFilter && v.audience_type !== audienceFilter) return false;
      if (providerFilter && v.external_provider !== providerFilter) return false;
      if (approvalFilter && v.approval_status !== approvalFilter) return false;
      if (privacyFilter && v.privacy_status !== privacyFilter) return false;
      return true;
    });

    const results = filtered.map((r: any) => ({
      segment_id: r.segment_id,
      video_id: r.video_id,
      segment_index: r.segment_index,
      start_seconds: Number(r.start_seconds),
      end_seconds: Number(r.end_seconds),
      speaker: r.speaker,
      text: r.text,
      semantic_score: Number(r.semantic_score),
      keyword_score: Number(r.keyword_score),
      combined_score: Number(r.combined_score),
      video: videos[r.video_id] ?? null,
    }));

    const latency = Math.round(performance.now() - t0);
    await admin.from("video_library_search_audit").insert({
      user_id: user.id,
      query,
      search_mode: mode === "keyword" || mode === "semantic" ? mode : "hybrid",
      results_count: results.length,
      video_filter: videoFilter,
      business_filter: businessFilter,
      latency_ms: latency,
    });

    return json({ ok: true, query, mode, count: results.length, latency_ms: latency, results });
  } catch (e: any) {
    return json({ error: "search_error", detail: String(e?.message ?? e) }, 500);
  }
});