import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFETY = {
  publish_allowed: false,
  external_upload: false,
  external_api_called: false,
  delete_allowed: false,
  notes: "Read-only asset search. No publish, no external upload, no delete.",
};

const APPROVAL_FIELD: Record<string, string> = {
  social: "approved_for_social",
  ads: "approved_for_ads",
  proposals: "approved_for_proposals",
  website: "approved_for_website",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized", safety: SAFETY }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden", safety: SAFETY }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const business_id: string | undefined = body?.business_id;
    const asset_types: string[] = Array.isArray(body?.asset_types) ? body.asset_types : [];
    const tags: string[] = Array.isArray(body?.tags) ? body.tags : [];
    const approved_for: string | undefined = body?.approved_for; // social|ads|proposals|website
    const status: string | undefined = body?.status;
    const search: string = String(body?.search ?? "").trim();
    const limit: number = Math.min(Number(body?.limit ?? 100), 500);

    let q = admin.from("creative_asset_library").select("*").limit(limit).order("created_at", { ascending: false });
    if (business_id) q = q.eq("business_id", business_id);
    if (asset_types.length) q = q.in("asset_type", asset_types);
    if (status) q = q.eq("asset_status", status);
    if (approved_for && APPROVAL_FIELD[approved_for]) q = q.eq(APPROVAL_FIELD[approved_for], true);
    if (tags.length) q = q.contains("tags", tags);
    if (search) q = q.or(`asset_name.ilike.%${search}%,description.ilike.%${search}%`);

    const { data: assets, error: aErr } = await q;
    if (aErr) throw aErr;

    const list = (assets ?? []) as any[];
    const counts = {
      total: list.length,
      approved_social: list.filter((a) => a.approved_for_social).length,
      approved_ads: list.filter((a) => a.approved_for_ads).length,
      approved_proposals: list.filter((a) => a.approved_for_proposals).length,
      approved_website: list.filter((a) => a.approved_for_website).length,
      missing_rights: list.filter((a) => !a.usage_rights).length,
      expired: list.filter((a) => a.expires_at && new Date(a.expires_at) < new Date()).length,
    };

    return new Response(JSON.stringify({ ok: true, assets: list, counts, safety: SAFETY }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e), safety: SAFETY }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});