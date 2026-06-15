// Record that a platform-only pitch (Qwoted/HARO platform/etc.) was manually submitted by founder.
// Founder/admin only. Does not contact, scrape or send anything.

import { corsHeaders, json, requireFounder } from "../_shared/socialAuth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await requireFounder(req);
    if ("error" in auth) return auth.error;
    const admin = auth.admin;
    const user = auth.user;

    const body = await req.json().catch(() => ({}));
    const draftId: string | undefined = body.pitch_draft_id;
    const platformName: string | null = body.platform_name ?? null;
    const note: string | null = body.submission_note ?? null;
    const submittedAt: string = body.submitted_at || new Date().toISOString();
    const dryRun = !!body.dry_run;
    if (!draftId) return json({ ok: false, reason: "pitch_draft_id_required" }, 400);

    const { data: draft, error: dErr } = await admin.from("media_pitch_drafts").select("*").eq("id", draftId).maybeSingle();
    if (dErr) return json({ ok: false, reason: "draft_query_failed", message: dErr.message }, 500);
    if (!draft) return json({ ok: false, reason: "draft_not_found" }, 404);

    const allowed = ["platform_copy_paste", "manual_review_only"];
    if (!allowed.includes(draft.send_method) && !platformName) {
      return json({ ok: false, reason: "send_method_not_platform", send_method: draft.send_method }, 422);
    }
    if (!["founder_approved", "needs_review", "draft"].includes(draft.approval_status)) {
      // still allow if already approved variants, but block if explicitly rejected
      if (draft.approval_status === "rejected") return json({ ok: false, reason: "draft_rejected" }, 422);
    }

    if (dryRun) {
      return json({ ok: true, dry_run: true, would_record: true, send_method: draft.send_method, platform_name: platformName });
    }

    const { data: sub, error: sErr } = await admin.from("media_pitch_submissions").insert({
      pitch_draft_id: draft.id,
      opportunity_id: draft.opportunity_id,
      business_id: draft.business_id,
      submitted_via: "platform_manual",
      submitted_at: submittedAt,
      submitted_by: user.id,
      platform_name: platformName,
      reply_status: "submitted_manual",
      outcome_status: "pending",
      notes: note,
    }).select("id").maybeSingle();
    if (sErr) return json({ ok: false, reason: "insert_failed", message: sErr.message }, 500);

    await admin.from("media_pitch_drafts").update({ approval_status: "submitted_manual", updated_at: new Date().toISOString() }).eq("id", draft.id);

    await admin.from("pr_audit_events").insert({
      event_type: "pr_platform_submission_marked",
      actor_user_id: user.id,
      summary: `Platform submission recorded${platformName ? ` (${platformName})` : ""}`,
      metadata: { draft_id: draft.id, submission_id: sub?.id ?? null, platform_name: platformName },
    });

    return json({ ok: true, submission_id: sub?.id ?? null });
  } catch (e: any) {
    return json({ ok: false, reason: "exception", message: e?.message || String(e) }, 500);
  }
});