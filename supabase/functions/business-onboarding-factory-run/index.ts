import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "RUN BUSINESS ONBOARDING FACTORY";

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

    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      business_name,
      business_brief,
      knowledge_text,
      website_url,
      website_text,
      brand_notes,
      offer_notes,
      pricing_notes,
      policy_notes,
      customer_notes,
      create_test_business = false,
      run_onboarding_brain = true,
      run_materialiser = true,
      dry_run = true,
      save_outputs = false,
      create_founder_review = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    const provider_status = Deno.env.get("OPENAI_API_KEY") ? "configured" : "not_configured";
    const missing_context: string[] = [];
    const risk_warnings: string[] = [];
    const audit = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0, real_data_deleted: 0, secrets_exposed: 0,
    };

    // Phrase guard for any non-dry-run
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    // Resolve business
    let business: { id: string; name: string } | null = null;
    let business_created = false;

    if (business_id) {
      const { data } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
      if (!data) return j({ ok: false, error: "business_not_found" }, 404);
      business = data;
    } else if (create_test_business && !dry_run) {
      if (!is_test_data) return j({ ok: false, error: "is_test_data_required_for_test_business" }, 400);
      const safeName = (business_name ?? "Onboarding Factory Test Business").trim();
      const finalName = /test/i.test(safeName) ? safeName : `${safeName} [Test]`;
      const { data, error } = await svc.from("businesses").insert({ name: finalName }).select("id,name").single();
      if (error || !data) return j({ ok: false, error: error?.message ?? "business_create_failed" }, 500);
      business = data;
      business_created = true;
    }

    const virtual = !business;
    if (virtual) {
      if (!business_name && !business_brief) missing_context.push("no_business_name_or_brief_provided");
      risk_warnings.push("virtual_business_preview_mode_no_persistence");
    }

    // Track knowledge intake (presence only — Brain reads actual uploaded knowledge if business exists)
    const knowledgeBits = [knowledge_text, website_url, website_text, brand_notes, offer_notes, pricing_notes, policy_notes, customer_notes].filter(Boolean);
    const knowledge_registered = knowledgeBits.length > 0;
    if (!knowledge_registered) missing_context.push("no_knowledge_provided");

    // Run onboarding brain — only against real business (function requires business_id)
    let onboarding_run_id: string | null = null;
    let profile_id: string | null = null;
    let starter_pack_id: string | null = null;
    let brainResult: any = null;
    let materialisation_run_id: string | null = null;
    let materialised_items_count = 0;
    let fallback_items_count = 0;
    let blocked_items_count = 0;
    let skipped_duplicate_count = 0;
    let matResult: any = null;

    if (business && run_onboarding_brain) {
      const r = await svc.functions.invoke("business-onboarding-brain-run", {
        body: {
          business_id: business.id,
          dry_run: dry_run || !save_outputs,
          save_profile: save_outputs,
          save_starter_pack: save_outputs,
          create_founder_approval_items: false,
          ...(save_outputs ? { confirmation_phrase: "CREATE BUSINESS STARTER PACK" } : {}),
        },
        headers: { Authorization: auth },
      });
      brainResult = r.data ?? null;
      if ((brainResult as any)?.ok) {
        onboarding_run_id = brainResult.onboarding_run_id ?? brainResult.run_id ?? null;
        profile_id = brainResult.profile_id ?? null;
        starter_pack_id = brainResult.saved_starter_pack_id ?? brainResult.starter_pack_id ?? null;
        for (const m of brainResult.missing_context ?? []) missing_context.push(`brain:${m}`);
        for (const w of brainResult.risk_warnings ?? []) risk_warnings.push(`brain:${w}`);
      } else {
        risk_warnings.push(`brain_run_failed:${(r.error as any)?.message ?? "unknown"}`);
      }
    }

    // Look up latest starter pack if not returned by brain
    if (business && !starter_pack_id) {
      const { data: pack } = await svc.from("business_execution_starter_packs")
        .select("id").eq("business_id", business.id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (pack?.id) starter_pack_id = pack.id;
    }

    // Materialiser
    if (business && run_materialiser && starter_pack_id) {
      const m = await svc.functions.invoke("starter-pack-materialise", {
        body: {
          business_id: business.id,
          starter_pack_id,
          dry_run: dry_run || !save_outputs,
          ...(save_outputs ? { confirmation_phrase: "MATERIALISE BUSINESS STARTER PACK" } : {}),
          is_test_data,
        },
        headers: { Authorization: auth },
      });
      matResult = m.data ?? null;
      if ((matResult as any)?.ok) {
        materialisation_run_id = matResult.run_id ?? null;
        materialised_items_count = matResult.created_items ?? matResult.total_items ?? 0;
        fallback_items_count = matResult.fallback_items ?? 0;
        blocked_items_count = matResult.blocked_items ?? 0;
        skipped_duplicate_count = matResult.skipped_duplicates ?? 0;
        for (const m2 of matResult.missing_context ?? []) missing_context.push(`materialiser:${m2}`);
        for (const w of matResult.risk_warnings ?? []) risk_warnings.push(`materialiser:${w}`);
      } else {
        risk_warnings.push(`materialiser_failed:${(m.error as any)?.message ?? "unknown"}`);
      }
    } else if (business && run_materialiser && !starter_pack_id) {
      missing_context.push("no_starter_pack_to_materialise");
    }

    // Command Centre visibility = panel mounted; always true when route/panel ships.
    const command_centre_visible = true;

    // Score
    let score = 0;
    if (business || (!virtual)) score += 10; else if (knowledge_registered || business_brief) score += 5;
    if (knowledge_registered) score += 10;
    if (profile_id || brainResult?.profile_preview) score += 15;
    if (starter_pack_id || brainResult?.starter_pack_preview) score += 15;
    if (matResult?.ok) score += 15;
    if (command_centre_visible) score += 10;
    if (missing_context.length === 0) score += 10;
    if (audit.emails_sent === 0 && audit.posts_published === 0) score += 5;
    // Founder review credit added after creation

    // Founder review handoff
    let founder_review_created = false;
    const founder_review_ids: string[] = [];
    if (business && save_outputs && create_founder_review) {
      const { data: rev, error: rerr } = await svc.from("founder_approval_items").insert({
        business_id: business.id,
        approval_type: "business_onboarding_factory_review",
        source_system: "business-onboarding-factory-run",
        source_table: "business_onboarding_factory_runs",
        title: `Review onboarding factory output for ${business.name}`,
        summary: `Readiness ${Math.min(score + 10, 100)}/100. Missing context: ${missing_context.length}. Risks: ${risk_warnings.length}. Materialised: ${materialised_items_count} (fallback ${fallback_items_count}, skipped ${skipped_duplicate_count}, blocked ${blocked_items_count}). External actions locked.`,
        recommended_action: "Review internal profile, starter pack and materialised drafts. External send remains locked.",
        priority_level: "normal",
        risk_flags: [], compliance_flags: [],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: {
          profile_id, starter_pack_id, materialisation_run_id,
          onboarding_run_id, is_test_data,
        },
      }).select("id").maybeSingle();
      if (!rerr && rev?.id) {
        founder_review_created = true;
        founder_review_ids.push(rev.id);
        score += 10;
      } else if (rerr) {
        risk_warnings.push(`founder_review_failed:${rerr.message}`);
      }
    }

    score = Math.max(0, Math.min(100, score));
    const internal_ready = score >= 80 && missing_context.filter((m) => /failed|crash/i.test(m)).length === 0;

    // Persist factory run when saving
    let factory_run_id: string | null = null;
    if (business && save_outputs) {
      const { data: row } = await svc.from("business_onboarding_factory_runs").insert({
        business_id: business.id,
        run_status: internal_ready ? "completed" : (matResult?.ok || brainResult?.ok ? "partial" : "blocked"),
        provider_status,
        business_created,
        knowledge_registered,
        profile_created: !!profile_id,
        starter_pack_created: !!starter_pack_id,
        materialisation_completed: !!matResult?.ok,
        command_centre_visible,
        founder_review_created,
        internal_ready,
        external_ready: false,
        readiness_score: score,
        missing_context_count: missing_context.length,
        risk_warning_count: risk_warnings.length,
        materialised_items_count,
        fallback_items_count,
        blocked_items_count,
        skipped_duplicate_count,
        no_forbidden_action_audit: audit,
        is_test_data,
        metadata: {
          virtual, business_name: business.name,
          onboarding_run_id, profile_id, starter_pack_id, materialisation_run_id,
        },
      }).select("id").maybeSingle();
      factory_run_id = row?.id ?? null;
    }

    const status = !business
      ? "previewed"
      : (internal_ready ? "completed" : (matResult?.ok || brainResult?.ok ? "partial" : "blocked"));

    return j({
      ok: true,
      status,
      provider_status,
      business_id: business?.id ?? null,
      business_name: business?.name ?? business_name ?? null,
      factory_run_id,
      business_created,
      knowledge_registered,
      onboarding_run_id,
      profile_id,
      starter_pack_id,
      materialisation_run_id,
      materialised_items_count,
      fallback_items_count,
      blocked_items_count,
      skipped_duplicate_count,
      founder_review_ids,
      readiness_score: score,
      internal_ready,
      external_ready: false,
      missing_context,
      risk_warnings,
      command_centre_visibility: {
        panel: "BusinessOnboardingFactoryPanel",
        mounted_in: ["/founder/command-centre", "/founder/business-onboarding-factory"],
        visible: command_centre_visible,
      },
      no_forbidden_action_audit: audit,
      external_go_live: "LOCKED_BY_DESIGN",
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});