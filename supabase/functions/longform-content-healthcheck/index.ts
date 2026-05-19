import { corsHeaders, json, requireFounder, SAFETY_FLAGS } from "../_shared/longformContentLogic.ts";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const url = new URL(req.url);
  const business_id = url.searchParams.get("business_id");
  const count = async (t: string, filters: Array<[string,string]> = []) => {
    let q = (a.admin as any).from(t).select("id", { count: "exact", head: true });
    if (business_id) q = q.eq("business_id", business_id);
    for (const [k,v] of filters) q = q.eq(k,v);
    const { count } = await q; return count ?? 0;
  };
  const [strategies_total, seo_briefs_total, drafts_total, drafts_needing_review, newsletter_sequences_total, repurposing_maps_total, manual_exports_total, open_gap_reviews, export_ready_count, manually_published_external_count] = await Promise.all([
    count("longform_content_strategies"),
    count("seo_content_briefs"),
    count("longform_content_drafts"),
    count("longform_content_drafts", [["draft_status","needs_review"]]),
    count("newsletter_sequence_plans"),
    count("longform_repurposing_maps"),
    count("longform_manual_export_packs"),
    count("longform_content_gap_reviews", [["status","open"]]),
    count("longform_manual_export_packs", [["export_status","ready"]]),
    count("longform_content_drafts", [["external_publish_status","manually_published_external"]]),
  ]);
  let q = a.admin.from("longform_content_drafts").select("unsupported_claims,proof_placeholders");
  if (business_id) q = q.eq("business_id", business_id);
  const { data: drafts } = await q;
  const unsupported_claims_count = (drafts ?? []).reduce((n: number, d: any) => n + (d.unsupported_claims?.length ?? 0), 0);
  const missing_proof_count = (drafts ?? []).filter((d: any) => (d.proof_placeholders?.length ?? 0) > 0).length;
  return json({
    ok: true, strategies_total, seo_briefs_total, drafts_total, drafts_needing_review,
    newsletter_sequences_total, repurposing_maps_total, manual_exports_total,
    open_gap_reviews, export_ready_count, manually_published_external_count,
    unsupported_claims_count, missing_proof_count,
    external_api_calls_total: 0, pages_published_total: 0, newsletters_sent_total: 0, emails_sent_total: 0, scraped_pages_total: 0,
    no_external_action: true, safety: SAFETY_FLAGS,
  });
});