import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "MATERIALISE BUSINESS STARTER PACK";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return String(h);
}

type Plan = {
  destination_module: string;
  item_type: string;
  source_section: string;
  title: string;
  subject?: string;
  body?: string;
  structured_payload?: any;
  risk_warnings?: string[];
  missing_context?: string[];
};

function buildPlans(pack: any): Plan[] {
  const out: Plan[] = [];

  for (const t of (pack.email_templates ?? []) as any[]) {
    out.push({
      destination_module: "outreach",
      item_type: t?.key && /follow/i.test(String(t.key)) ? "follow_up_template" : "email_template",
      source_section: "email_templates",
      title: t?.key ?? t?.subject ?? "Email template",
      subject: t?.subject ?? null,
      body: t?.body ?? t?.body_outline ?? null,
      structured_payload: t,
    });
  }

  for (const w of (pack.social_content_plan ?? []) as any[]) {
    for (const p of (w?.posts ?? [])) {
      out.push({
        destination_module: "social",
        item_type: "social_post_draft",
        source_section: "social_content_plan",
        title: typeof p === "string" ? p : (p?.title ?? "Social post draft"),
        body: typeof p === "string" ? null : (p?.body ?? null),
        structured_payload: { week: w?.week ?? null, post: p },
      });
    }
  }

  for (const a of (pack.marketing_assets_needed ?? []) as any[]) {
    out.push({
      destination_module: "social",
      item_type: "content_calendar_item",
      source_section: "marketing_assets_needed",
      title: typeof a === "string" ? a : (a?.name ?? "Marketing asset"),
      structured_payload: { asset: a },
    });
  }

  for (const f of (pack.support_faqs ?? []) as any[]) {
    out.push({
      destination_module: "support",
      item_type: "support_faq",
      source_section: "support_faqs",
      title: f?.q ?? "Support FAQ",
      body: f?.a ?? null,
      structured_payload: f,
    });
  }

  for (const step of (pack.onboarding_flow ?? []) as any[]) {
    out.push({
      destination_module: "customer_success",
      item_type: step?.step === 1 ? "welcome_message" : "onboarding_plan",
      source_section: "onboarding_flow",
      title: step?.name ?? `Onboarding step ${step?.step ?? ""}`.trim(),
      structured_payload: step,
    });
  }

  if (pack.proposal_outline) {
    out.push({
      destination_module: "proposal",
      item_type: "proposal_outline",
      source_section: "proposal_outline",
      title: "Internal proposal outline",
      body: String(pack.proposal_outline),
      structured_payload: { outline: pack.proposal_outline },
    });
  }

  for (const auto of (pack.automation_recommendations ?? []) as any[]) {
    out.push({
      destination_module: "demo",
      item_type: "demo_note",
      source_section: "automation_recommendations",
      title: typeof auto === "string" ? auto : (auto?.name ?? "Automation note"),
      structured_payload: { recommendation: auto },
    });
  }

  for (const tgt of (pack.prospecting_targets ?? []) as any[]) {
    out.push({
      destination_module: "revenue",
      item_type: "revenue_activity",
      source_section: "prospecting_targets",
      title: `Prospect segment: ${tgt?.segment ?? "ICP"}`,
      structured_payload: tgt,
    });
  }

  for (const blk of (pack.go_live_blockers ?? []) as any[]) {
    out.push({
      destination_module: "supplier",
      item_type: "supplier_requirement",
      source_section: "go_live_blockers",
      title: typeof blk === "string" ? blk : (blk?.name ?? "Supplier/delivery need"),
      structured_payload: { blocker: blk },
    });
  }

  return out;
}

function filterPlans(plans: Plan[], flags: Record<string, boolean>): Plan[] {
  const map: Record<string, string> = {
    outreach: "materialise_outreach",
    social: "materialise_social",
    support: "materialise_support",
    customer_success: "materialise_customer_success",
    proposal: "materialise_proposals",
    demo: "materialise_demo",
    revenue: "materialise_revenue",
    supplier: "materialise_supplier",
  };
  return plans.filter((p) => flags[map[p.destination_module]] !== false);
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
      starter_pack_id,
      materialise_outreach = true,
      materialise_social = true,
      materialise_support = true,
      materialise_customer_success = true,
      materialise_proposals = true,
      materialise_demo = true,
      materialise_revenue = true,
      materialise_supplier = true,
      create_founder_approval_items = true,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id required" }, 400);

    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    const packQ = starter_pack_id
      ? svc.from("business_execution_starter_packs").select("*").eq("id", starter_pack_id).maybeSingle()
      : svc.from("business_execution_starter_packs").select("*").eq("business_id", business_id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: pack } = await packQ;
    if (!pack) return j({ ok: false, error: "starter_pack_not_found", business_id }, 404);

    const flags = {
      materialise_outreach, materialise_social, materialise_support,
      materialise_customer_success, materialise_proposals, materialise_demo,
      materialise_revenue, materialise_supplier,
    };

    const plans = filterPlans(buildPlans(pack), flags as any);
    const missing_context: string[] = [];
    const risk_warnings: string[] = [];
    if (plans.length === 0) missing_context.push("no_plan_items_after_filters");
    if (!pack.email_templates?.length) missing_context.push("starter_pack_missing_email_templates");
    if (!pack.social_content_plan?.length) missing_context.push("starter_pack_missing_social_plan");
    if (!pack.support_faqs?.length) missing_context.push("starter_pack_missing_support_faqs");
    risk_warnings.push("destination_module_tables_unclear_using_fallback");

    const preview_items = plans.map((p) => ({
      destination_module: p.destination_module,
      item_type: p.item_type,
      title: p.title,
      source_section: p.source_section,
    }));

    const safety_status = {
      external_action_blocked: true,
      external_send_allowed: false,
      auto_send_enabled: false,
      cron_enabled: false,
      providers_called: [],
    };

    const no_forbidden_action_audit = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0, real_data_deleted: 0, secrets_exposed: 0,
    };

    if (dry_run) {
      return j({
        ok: true, status: "previewed",
        business_id, starter_pack_id: pack.id, run_id: null,
        preview_items, created_items: 0, fallback_items: 0,
        skipped_duplicates: 0, blocked_items: 0, founder_approval_items: 0,
        missing_context, risk_warnings,
        module_status_updates: { fallback_used_for: Array.from(new Set(plans.map((p) => p.destination_module))) },
        safety_status, no_forbidden_action_audit,
        total_items: plans.length,
      });
    }

    if (confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    // Create run row
    const { data: runRow, error: runErr } = await svc.from("starter_pack_materialisation_runs")
      .insert({
        business_id, starter_pack_id: pack.id, run_status: "draft", dry_run: false,
        total_items: plans.length, is_test_data,
        metadata: { confirmation_phrase: "received", flags },
      }).select().single();
    if (runErr || !runRow) return j({ ok: false, error: runErr?.message ?? "run_create_failed" }, 500);

    let materialised = 0, fallback = 0, skipped = 0, blocked = 0;

    for (const p of plans) {
      const sig = hash(JSON.stringify({ s: p.source_section, t: p.title, b: p.body ?? null }));
      // dedup check
      const { data: existing } = await svc.from("starter_pack_materialised_items")
        .select("id").eq("starter_pack_id", pack.id)
        .eq("source_section", p.source_section).eq("source_hash", sig).maybeSingle();
      if (existing) { skipped++; continue; }

      const row = {
        business_id, starter_pack_id: pack.id,
        destination_module: p.destination_module, item_type: p.item_type,
        item_status: "needs_review",
        title: p.title, subject: p.subject ?? null, body: p.body ?? null,
        structured_payload: p.structured_payload ?? {},
        source_section: p.source_section, source_hash: sig,
        risk_level: "low", requires_founder_review: true,
        external_send_allowed: false, external_action_blocked: true,
        materialisation_status: "stored_fallback",
        missing_context: [], risk_warnings: [],
        is_test_data,
        metadata: { source: "starter_pack_materialise", starter_pack_id: pack.id, source_section: p.source_section, source_hash: sig },
      };
      const { error: insErr } = await svc.from("starter_pack_materialised_items").insert(row);
      if (insErr) { blocked++; continue; }
      fallback++; materialised++;
    }

    let approval_created = 0;
    if (create_founder_approval_items) {
      const { error: aErr } = await svc.from("founder_approval_items").insert({
        business_id, approval_type: "starter_pack_materialisation_review",
        source_system: "starter_pack_materialise",
        source_table: "starter_pack_materialisation_runs",
        source_id: runRow.id,
        title: `Review materialised starter pack for ${biz.name ?? "business"}`,
        summary: `Materialised ${materialised} items (${fallback} fallback, ${skipped} duplicates skipped, ${blocked} blocked). Nothing has been sent.`,
        recommended_action: "Review internal drafts; external send remains locked.",
        priority_level: "normal",
        risk_flags: [], compliance_flags: [],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: { run_id: runRow.id, starter_pack_id: pack.id, is_test_data },
      });
      if (!aErr) approval_created = 1;
    }

    const final_status = blocked > 0 ? (materialised > 0 ? "partial" : "blocked") : "materialised";
    await svc.from("starter_pack_materialisation_runs").update({
      run_status: final_status,
      materialised_items: materialised,
      fallback_items: fallback,
      skipped_duplicates: skipped,
      blocked_items: blocked,
      founder_approval_items: approval_created,
      missing_context_count: missing_context.length,
      risk_warning_count: risk_warnings.length,
    }).eq("id", runRow.id);

    return j({
      ok: true, status: final_status,
      business_id, starter_pack_id: pack.id, run_id: runRow.id,
      preview_items, created_items: materialised, fallback_items: fallback,
      skipped_duplicates: skipped, blocked_items: blocked,
      founder_approval_items: approval_created,
      missing_context, risk_warnings,
      module_status_updates: { fallback_used_for: Array.from(new Set(plans.map((p) => p.destination_module))) },
      safety_status, no_forbidden_action_audit,
      total_items: plans.length,
    });
  } catch (e) {
    return j({ ok: false, error: String((e as Error)?.message ?? e) }, 500);
  }
});