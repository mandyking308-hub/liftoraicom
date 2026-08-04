/**
 * Server-side publish-job materialisation for just-approved review items.
 *
 * Reuses the existing eligibility + idempotency logic from socialPublishLogic
 * so approval-driven autopilot can never create jobs by a different standard
 * than the manual social-publish-job-create path.
 */
import { buildJobIdempotencyKey, evaluateCalendarItem, evaluateContentItem, type EligibilityCheck } from "./socialPublishLogic.ts";
import { buildPayloadSnapshot, resolveJobPayload } from "./socialPayloadResolver.ts";
import { audit } from "./socialDistributionDb.ts";

export interface MaterialiseResult {
  jobs: any[];
  created: number;
  existing: number;
  blocked: number;
  blockers: Array<{ source_id: string; blockers: string[] }>;
}

/** Finds (or safely creates) the publish jobs for a set of approved reviews. */
export async function materialiseJobsForReviews(
  admin: any,
  business_id: string,
  reviews: any[],
): Promise<MaterialiseResult> {
  const out: MaterialiseResult = { jobs: [], created: 0, existing: 0, blocked: 0, blockers: [] };
  const reviewIds = reviews.map((r) => r.id).filter(Boolean);

  // 1. Jobs already linked to the approved reviews.
  if (reviewIds.length) {
    const { data } = await admin.from("social_publish_jobs").select("*")
      .eq("business_id", business_id).in("approval_review_id", reviewIds);
    for (const j of data ?? []) out.jobs.push(j);
  }
  out.existing = out.jobs.length;
  const covered = new Set(out.jobs.map((j: any) => j.approval_review_id));

  // 2. Materialise missing ones from the approved content / calendar items.
  for (const review of reviews) {
    if (covered.has(review.id)) continue;
    const contentId = review.content_item_id ?? null;
    const calendarId = review.calendar_item_id ?? null;
    if (!contentId && !calendarId) {
      out.blocked++; out.blockers.push({ source_id: review.id, blockers: ["review_has_no_content_source"] });
      continue;
    }

    let check: EligibilityCheck | null = null;
    if (calendarId) {
      const { data: cal } = await admin.from("social_calendar_items")
        .select("*, content_item:social_content_items(*)")
        .eq("business_id", business_id).eq("id", calendarId).maybeSingle();
      if (cal) check = evaluateCalendarItem(cal, cal.content_item ?? null);
    }
    if (!check && contentId) {
      const { data: ci } = await admin.from("social_content_items").select("*")
        .eq("business_id", business_id).eq("id", contentId).maybeSingle();
      if (ci) check = evaluateContentItem(ci);
    }
    if (!check) {
      out.blocked++; out.blockers.push({ source_id: review.id, blockers: ["source_not_found_for_business"] });
      continue;
    }
    if (!check.eligible) {
      out.blocked++; out.blockers.push({ source_id: check.source_id, blockers: check.blockers });
      continue;
    }

    const idem = buildJobIdempotencyKey(check);
    const { data: existing } = await admin.from("social_publish_jobs").select("*").eq("idempotency_key", idem).maybeSingle();
    if (existing) {
      if (!existing.approval_review_id) {
        await admin.from("social_publish_jobs").update({ approval_review_id: review.id }).eq("id", existing.id);
        existing.approval_review_id = review.id;
      }
      out.jobs.push(existing); out.existing++;
      continue;
    }

    const pseudoJob = {
      content_variant_id: check.content_variant_id ?? null,
      content_item_id: check.content_item_id ?? null,
      calendar_item_id: check.calendar_item_id ?? null,
      publish_payload: {},
    };
    const payload = await resolveJobPayload(admin, business_id, pseudoJob);

    const insert = {
      business_id,
      content_item_id: check.content_item_id, calendar_item_id: check.calendar_item_id,
      content_variant_id: check.content_variant_id, campaign_plan_id: check.campaign_plan_id,
      content_pack_id: check.content_pack_id, approval_review_id: review.id,
      provider: check.provider || "manual", platform: check.platform || "unknown",
      job_type: check.job_type, scheduled_for: check.scheduled_for, status: "provider_locked",
      execution_gate_status: "locked", execution_attempt_allowed: false, external_execution_attempted: false,
      manual_export_status: "not_exported", founder_final_approval_required: true,
      idempotency_key: idem, provider_capability_required: check.provider_capability_required,
      publish_payload: buildPayloadSnapshot({
        text: payload.text, media: payload.media, link_url: payload.link_url,
        asset_id: payload.sources.asset_id ?? null,
        source: check.source, source_id: check.source_id,
      }),
      is_test_data: false,
    };
    const { data: ins, error } = await admin.from("social_publish_jobs").insert(insert).select().maybeSingle();
    if (error || !ins) {
      out.blocked++; out.blockers.push({ source_id: check.source_id, blockers: [error?.message ?? "job_insert_failed"] });
      continue;
    }
    out.jobs.push(ins); out.created++;
    await audit(admin, {
      business_id, publish_job_id: ins.id, action: "job_created_from_approval",
      result_json: { approval_review_id: review.id, source: check.source, source_id: check.source_id },
    });
  }

  return out;
}
