import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CONFIRM_PHRASE = "CREATE METRICOOL EXPORT";
const APPROVED_STATUSES = ["approved", "founder_confirmed"];

function csvEscape(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/\r?\n/g, " ").replace(/"/g, '""');
  return /[",]/.test(s) ? `"${s}"` : s;
}

function buildCsv(rows: any[]): string {
  const headers = ["platform", "date", "time", "caption", "media_asset", "hashtags", "cta"];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push([
      csvEscape(r.platform),
      csvEscape(r.date),
      csvEscape(r.time),
      csvEscape(r.caption),
      csvEscape(r.media_asset),
      csvEscape(Array.isArray(r.hashtags) ? r.hashtags.join(" ") : r.hashtags),
      csvEscape(r.cta),
    ].join(","));
  }
  return lines.join("\n");
}

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
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const calendar_id: string | undefined = body?.calendar_id;
    const post_ids: string[] = Array.isArray(body?.post_ids) ? body.post_ids : [];
    const business_id: string | undefined = body?.business_id;
    const batch_name: string = String(body?.batch_name ?? `Metricool export ${new Date().toISOString().slice(0,10)}`);
    const dry_run: boolean = body?.dry_run !== false;
    const confirmation: string = String(body?.confirmation ?? "");

    if (!calendar_id && post_ids.length === 0) {
      return new Response(JSON.stringify({ error: "calendar_id or post_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!dry_run && confirmation !== CONFIRM_PHRASE) {
      return new Response(JSON.stringify({ error: `confirmation phrase required: "${CONFIRM_PHRASE}"` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let q = admin.from("social_post_drafts").select("*").in("approval_status", APPROVED_STATUSES);
    if (calendar_id) q = q.eq("calendar_id", calendar_id);
    if (post_ids.length > 0) q = q.in("id", post_ids);
    if (business_id) q = q.eq("business_id", business_id);
    const { data: drafts, error: draftErr } = await q;
    if (draftErr) throw draftErr;
    const approvedDrafts = drafts ?? [];

    if (approvedDrafts.length === 0) {
      return new Response(JSON.stringify({
        status: "ok",
        mode: dry_run ? "dry_run" : "live",
        message: "No approved drafts found (need approval_status in approved or founder_confirmed)",
        eligible_posts: 0,
        preview: [],
        csv: "",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const resolvedBusinessId = business_id ?? approvedDrafts[0].business_id;
    const platforms = Array.from(new Set(approvedDrafts.map((d: any) => d.platform_key)));

    const exportRows = approvedDrafts.map((d: any) => ({
      post_draft_id: d.id,
      business_id: d.business_id,
      platform: d.platform_key,
      date: d.post_date ?? null,
      time: d.suggested_time ?? null,
      caption: [d.hook, d.caption].filter(Boolean).join("\n\n"),
      media_asset: d.visual_direction ?? d.metadata?.asset_title ?? null,
      hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
      cta: d.cta ?? "",
    }));

    const csv = buildCsv(exportRows);

    let batch: any = null;
    let queueInserted = 0;
    if (!dry_run) {
      const { data: batchRow, error: batchErr } = await admin.from("metricool_export_batches").insert({
        business_id: resolvedBusinessId,
        batch_name,
        batch_status: "exported",
        post_count: exportRows.length,
        platforms,
        export_format: "csv",
        export_payload: { rows: exportRows, csv },
        exported_at: new Date().toISOString(),
        founder_review_required: true,
        metadata: { source: "social-scheduling-export" },
      }).select().single();
      if (batchErr) throw batchErr;
      batch = batchRow;

      const queueRows = approvedDrafts.map((d: any) => ({
        business_id: d.business_id,
        post_draft_id: d.id,
        platform_key: d.platform_key,
        scheduled_date: d.post_date ?? null,
        scheduled_time: d.suggested_time ?? null,
        timezone: "Europe/London",
        scheduler_provider: "metricool",
        scheduler_status: "ready_for_export",
        publish_allowed: false,
        exported_at: new Date().toISOString(),
        metadata: { batch_id: batch.id },
      }));
      const { error: qErr, count } = await admin.from("social_scheduling_queue").insert(queueRows, { count: "exact" });
      if (qErr) throw qErr;
      queueInserted = count ?? queueRows.length;
    }

    return new Response(JSON.stringify({
      status: "ok",
      mode: dry_run ? "dry_run" : "live",
      eligible_posts: approvedDrafts.length,
      platforms,
      preview: exportRows.slice(0, 12),
      csv,
      batch,
      queue_inserted: queueInserted,
      safety_audit: {
        no_external_post: true,
        no_external_dm: true,
        no_external_api_mutation: true,
        no_metricool_api_call: true,
        confirmation_required_phrase: CONFIRM_PHRASE,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});