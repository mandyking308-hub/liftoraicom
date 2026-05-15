import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED_INTERNAL_KEYS = new Set([
  "ai_engagement_agent",
  "proposal_agent",
  "commercial_agent",
  "ai_draft_agent",
  "founder_approval_agent",
  "internal_runner",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const internalKey = req.headers.get("x-internal-key") ?? "";

    let isAuthed = false;
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Service role token equality means internal call
      if (token === serviceKey) {
        isAuthed = ALLOWED_INTERNAL_KEYS.has(internalKey);
      } else {
        const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        const userId = claimsData?.claims?.sub as string | undefined;
        if (userId) {
          const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
          if ((roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) isAuthed = true;
        }
      }
    }
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const business_id = body?.business_id as string | undefined;
    const agent_key = (body?.agent_key ?? "") as string;
    const query = ((body?.query ?? body?.context ?? "") as string).toLowerCase();
    const limit = Math.min(Number(body?.limit ?? 12), 50);

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle();
    const { data: assetsAll } = await admin.from("business_knowledge_assets").select("*").eq("business_id", business_id).eq("status", "active").eq("agent_visible", true).order("updated_at", { ascending: false }).limit(200);

    let assets = assetsAll ?? [];
    if (query) {
      const q = query;
      assets = assets
        .map((a: any) => {
          const hay = `${a.asset_title ?? ""}\n${a.asset_content ?? ""}\n${a.asset_type}`.toLowerCase();
          let score = 0;
          for (const term of q.split(/\s+/).filter(Boolean)) {
            if (hay.includes(term)) score += term.length;
          }
          return { a, score };
        })
        .filter((x) => x.score > 0)
        .sort((x, y) => y.score - x.score)
        .slice(0, limit)
        .map((x) => x.a);
      if (assets.length === 0) assets = (assetsAll ?? []).slice(0, limit);
    } else {
      assets = assets.slice(0, limit);
    }

    return new Response(JSON.stringify({
      ok: true,
      agent_key,
      profile: profile ?? null,
      assets,
      tone_rules: {
        approved_tone: profile?.approved_tone ?? null,
        forbidden_claims: profile?.forbidden_claims ?? [],
        required_disclaimers: profile?.required_disclaimers ?? [],
      },
      proposal_rules: profile?.proposal_rules ?? {},
      outreach_rules: profile?.outreach_rules ?? {},
      escalation_rules: profile?.escalation_rules ?? [],
      external_actions: { emails_sent: 0, apollo_calls: 0, smartlead_posts: 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});