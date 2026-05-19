import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

export const SAFETY_FLAGS = {
  no_ad_platform_api: true,
  no_meta_ads_api: true,
  no_google_ads_api: true,
  no_tiktok_ads_api: true,
  no_linkedin_ads_api: true,
  no_x_ads_api: true,
  no_pinterest_ads_api: true,
  no_reddit_ads_api: true,
  no_campaigns_launched: true,
  no_ads_created_externally: true,
  no_money_spent: true,
  no_payment_methods_created: true,
  no_pixels_created: true,
  no_tracking_tags_created_externally: true,
  no_social_publish: true,
  no_social_schedule: true,
  no_email_send: true,
  no_dm_send: true,
  no_comment_send: true,
  no_apollo: true,
  no_smartlead_post: true,
  no_auto_send: true,
  no_cron: true,
  no_scraping: true,
  no_fake_metrics: true,
  no_fake_cac_roas_roi: true,
  no_invented_testimonials: true,
  no_real_data_deletion: true,
  no_secrets_exposed: true,
  external_api_calls: 0,
  campaigns_launched: 0,
  ads_created_externally: 0,
  money_spent: 0,
  payment_methods_created: 0,
  pixels_created: 0,
  fake_metrics_created: 0,
};

export async function requireFounder(req: Request) {
  const URL = Deno.env.get("SUPABASE_URL")!;
  const SVC = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return { error: json({ ok: false, error: "auth_missing" }, 401) } as const;
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return { error: json({ ok: false, error: "auth_invalid" }, 401) } as const;
  const admin = createClient(URL, SVC, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const rs = new Set((roles ?? []).map((r: any) => r.role));
  if (!rs.has("founder") && !rs.has("admin")) return { error: json({ ok: false, error: "forbidden" }, 403) } as const;
  return { admin, user: u.user } as const;
}

export async function logAudit(admin: any, row: Record<string, unknown>) {
  try {
    await admin.from("paid_media_audit").insert({
      external_api_calls: 0, campaigns_launched: 0, ads_created_externally: 0,
      money_spent: 0, payment_methods_created: 0, pixels_created: 0, fake_metrics_created: 0,
      ...row,
    });
  } catch (_) { /* noop */ }
}

export function requirePhrase(body: any, phrase: string) {
  if (body?.dry_run === false && body?.confirmation_phrase !== phrase) {
    return json({ ok: false, blocked: true, reason: "confirmation_phrase_required", required_phrase: phrase }, 400);
  }
  return null;
}

export function detectUnsupportedClaims(text: string | null | undefined): string[] {
  if (!text) return [];
  const out: string[] = [];
  const patterns = [
    /\bguarantee/i, /\b(best|#1|number one)\b/i, /\bcure/i, /\bproven\b/i,
    /\b\d+%\s+(roi|return|increase|growth|conversion)/i, /\brisk[- ]free\b/i,
    /\bdouble your\b/i, /\b10x\b/i, /\bunlimited\b/i,
  ];
  for (const p of patterns) if (p.test(text)) out.push(p.source);
  return out;
}