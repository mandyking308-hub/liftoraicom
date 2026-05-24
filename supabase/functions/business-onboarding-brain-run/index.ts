import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "CREATE BUSINESS STARTER PACK";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return j({ ok: false, error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return j({ ok: false, error: "unauthorized" }, 401);
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await svc.from("user_roles").select("role").eq("user_id", u.user.id);
    if (!(roles ?? []).some((r: any) => ["admin", "founder"].includes(r.role))) {
      return j({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({} as any));
    const {
      business_id,
      dry_run = true,
      save_profile = false,
      save_starter_pack = false,
      create_founder_approval_items = true,
      confirmation_phrase = "",
    } = body ?? {};
    if (!business_id) return j({ ok: false, error: "business_id required" }, 400);

    // Provider status (server-side only)
    const providerKey = Deno.env.get("OPENAI_API_KEY");
    const provider_status = providerKey ? "configured" : "not_configured";

    // Business
    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    // Read existing knowledge sources
    const [{ data: profile }, { data: latestPack }, { data: uploads }, { data: assets }, { data: trainingRun }] = await Promise.all([
      svc.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle(),
      svc.from("business_execution_starter_packs").select("*").eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      svc.from("business_knowledge_uploads").select("id,upload_type,upload_title,processing_status").eq("business_id", business_id).limit(50),
      svc.from("business_knowledge_assets").select("id,asset_type,asset_title").eq("business_id", business_id).limit(50),
      svc.from("business_training_runs").select("id,business_summary,brand_voice_summary,created_at").eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const source_count =
      (uploads?.length ?? 0) + (assets?.length ?? 0) + (profile ? 1 : 0) + (trainingRun ? 1 : 0);

    // Deterministic missing-context analysis
    const missing_context: string[] = [];
    if (!profile?.business_summary) missing_context.push("business_summary");
    if (!profile?.offer_summary) missing_context.push("offer_summary");
    if (!profile?.target_customer && !profile?.ideal_customer_profile) missing_context.push("ideal_customer_profile");
    if (!profile?.approved_tone) missing_context.push("approved_tone_brand_voice");
    if (!profile || !Array.isArray(profile?.forbidden_claims) || profile.forbidden_claims.length === 0) missing_context.push("forbidden_claims");
    if (!profile || !Array.isArray(profile?.required_disclaimers) || profile.required_disclaimers.length === 0) missing_context.push("required_disclaimers");
    if (!latestPack) missing_context.push("starter_pack_not_generated");
    if (source_count === 0) missing_context.push("no_knowledge_uploaded");

    const risk_warnings: string[] = [];
    if (provider_status === "not_configured") risk_warnings.push("OPENAI_API_KEY missing — Brain runs in deterministic shell mode");
    if (latestPack && latestPack.pack_status === "draft" && !latestPack.approved_at)
      risk_warnings.push("latest starter pack is unapproved draft — founder review required");

    // Deterministic readiness score (0–100)
    let score = 0;
    if (profile?.business_summary) score += 10;
    if (profile?.offer_summary) score += 10;
    if (profile?.target_customer || profile?.ideal_customer_profile) score += 10;
    if (profile?.approved_tone) score += 10;
    if (Array.isArray(profile?.forbidden_claims) && profile!.forbidden_claims.length > 0) score += 5;
    if (Array.isArray(profile?.required_disclaimers) && profile!.required_disclaimers.length > 0) score += 5;
    if (Array.isArray(profile?.value_propositions) && profile!.value_propositions.length > 0) score += 5;
    if (Array.isArray(profile?.common_objections) && profile!.common_objections.length > 0) score += 5;
    if (latestPack) {
      if (Array.isArray(latestPack.email_templates) && latestPack.email_templates.length) score += 10;
      if (Array.isArray(latestPack.social_content_plan) && latestPack.social_content_plan.length) score += 10;
      if (Array.isArray(latestPack.support_faqs) && latestPack.support_faqs.length) score += 10;
      if (latestPack.proposal_outline) score += 5;
      if (Array.isArray(latestPack.onboarding_flow) && latestPack.onboarding_flow.length) score += 5;
    }
    score = Math.min(100, score);

    const internal_ready = score >= 75 && missing_context.length === 0;
    const external_ready = false;

    const profile_preview = profile
      ? {
          id: profile.id,
          business_summary: profile.business_summary,
          offer_summary: profile.offer_summary,
          ideal_customer_profile: profile.ideal_customer_profile ?? profile.target_customer,
          approved_tone: profile.approved_tone,
          value_propositions: profile.value_propositions,
          pain_points: profile.pain_points,
          objections: profile.common_objections,
          proof_points: profile.proof_points,
          forbidden_claims: profile.forbidden_claims,
          required_disclaimers: profile.required_disclaimers,
          profile_status: profile.profile_status,
        }
      : null;

    const starter_pack_preview = latestPack
      ? {
          id: latestPack.id,
          pack_status: latestPack.pack_status,
          business_summary: latestPack.business_summary,
          icp_summary: latestPack.icp_summary,
          offers: latestPack.offers,
          email_templates: latestPack.email_templates,
          social_content_plan: latestPack.social_content_plan,
          support_faqs: latestPack.support_faqs,
          onboarding_flow: latestPack.onboarding_flow,
          proposal_outline: latestPack.proposal_outline,
          go_live_blockers: latestPack.go_live_blockers,
          founder_review_required: latestPack.founder_review_required,
          external_send_allowed: false,
          external_action_blocked: true,
          approved_at: latestPack.approved_at,
        }
      : null;

    let saved_profile_id: string | null = null;
    let saved_starter_pack_id: string | null = null;
    const founder_approval_ids: string[] = [];
    const action_log: string[] = [];

    // Save paths require confirmation phrase, and delegate to existing generators
    const wantsSave = !dry_run && (save_profile || save_starter_pack);
    if (wantsSave && confirmation_phrase !== CONFIRM) {
      return j({
        ok: false,
        status: "BLOCKED_CONFIRMATION_REQUIRED",
        error: `confirmation_phrase must equal "${CONFIRM}"`,
        provider_status,
        external_action_blocked: true,
      }, 400);
    }

    if (wantsSave && save_starter_pack) {
      const r = await svc.functions.invoke("business-execution-starter-pack-generate", {
        body: { business_id, confirm: CONFIRM, dry_run: false },
        headers: { Authorization: auth },
      });
      const pack = (r.data as any)?.pack;
      if (pack?.id) {
        saved_starter_pack_id = pack.id;
        action_log.push("starter_pack_saved");
      } else {
        action_log.push(`starter_pack_save_skipped:${(r.error as any)?.message ?? "no_pack"}`);
      }
    }

    if (wantsSave && saved_starter_pack_id && create_founder_approval_items) {
      const { data: approval } = await svc
        .from("founder_approval_items")
        .insert({
          business_id,
          approval_type: "business_starter_pack_review",
          source_system: "business-onboarding-brain-run",
          source_table: "business_execution_starter_packs",
          source_id: saved_starter_pack_id,
          title: `Review starter pack for ${biz.name}`,
          summary: `Internal starter pack generated by Liftor Brain for ${biz.name}. External actions remain locked.`,
          recommended_action: "Review drafts, fill missing context, decide whether to advance to controlled external gates.",
          priority_level: "normal",
          risk_flags: risk_warnings,
          status: "pending",
        })
        .select("id")
        .maybeSingle();
      if (approval?.id) founder_approval_ids.push(approval.id);
    }

    // Audit row (best-effort; uses liftor_brain_audit if present)
    try {
      await svc.from("liftor_brain_audit").insert({
        actor_user_id: u.user.id,
        action_type: "business_onboarding_brain_run",
        action_label: `Business onboarding Brain run for ${biz.name}`,
        tool_key: "business_onboarding_brain_run",
        risk_level: "low",
        external_action_blocked: true,
        external_send_allowed: false,
        success: true,
        result_summary: `score=${score} missing=${missing_context.length} warnings=${risk_warnings.length} save=${wantsSave}`,
        metadata: { business_id, dry_run, save_profile, save_starter_pack, action_log },
      });
    } catch (_e) {
      // audit table optional
    }

    return j({
      ok: true,
      status: provider_status === "configured" ? "READY" : "PARTIAL_PROVIDER_NOT_CONFIGURED",
      business_id,
      business_name: biz.name,
      provider_status,
      source_count,
      profile_preview,
      starter_pack_preview,
      missing_context,
      risk_warnings,
      readiness_score: score,
      internal_ready,
      external_ready,
      saved_profile_id,
      saved_starter_pack_id,
      founder_approval_ids,
      safety_status: {
        external_send_allowed: false,
        external_action_blocked: true,
        no_emails_sent: true,
        no_smartlead_post: true,
        no_apollo_calls: true,
        no_payments: true,
        no_portal_invites: true,
        no_publish: true,
        no_auto_send_changed: true,
        no_cron_changed: true,
        secret_exposed: false,
      },
      no_forbidden_action_audit: "all_zero",
    });
  } catch (e) {
    return j({ ok: false, error: String(e) }, 500);
  }
});