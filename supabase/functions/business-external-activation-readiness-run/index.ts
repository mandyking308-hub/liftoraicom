import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "RUN EXTERNAL ACTIVATION READINESS CHECK";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ChannelSpec = {
  channel_key: string;
  channel_name: string;
  provider_key: string | null;
  gate_key_hint: string | null; // substring matched against external_action_gates.gate_key
  secret_required: boolean;
  secret_env_names: string[]; // checked by presence only
  draft_signal?: (ctx: any) => boolean;
  compliance_required?: boolean;
  unsubscribe_required?: boolean;
  webhook_required?: boolean;
  crm_required?: boolean;
  max_batch: number;
  recommended_first_batch: number;
  confirmation_phrase: string;
};

const CHANNELS: ChannelSpec[] = [
  { channel_key: "smartlead_cold_outreach", channel_name: "Smartlead — Cold outreach", provider_key: "smartlead", gate_key_hint: "smartlead", secret_required: true, secret_env_names: ["SMARTLEAD_API_KEY"], draft_signal: (c) => c.hasOutreachDraft, compliance_required: true, unsubscribe_required: true, webhook_required: true, crm_required: true, max_batch: 10, recommended_first_batch: 5, confirmation_phrase: "ACTIVATE SMARTLEAD COLD OUTREACH" },
  { channel_key: "native_email", channel_name: "Native email (SMTP)", provider_key: "smtp", gate_key_hint: "email", secret_required: true, secret_env_names: ["SMTP_HOST","SMTP_USER","SMTP_PASS","RESEND_API_KEY"], draft_signal: (c) => c.hasOutreachDraft, compliance_required: true, unsubscribe_required: true, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE NATIVE EMAIL SEND" },
  { channel_key: "apollo_candidate_pull", channel_name: "Apollo — Candidate pull", provider_key: "apollo", gate_key_hint: "apollo", secret_required: true, secret_env_names: ["APOLLO_API_KEY"], crm_required: true, max_batch: 25, recommended_first_batch: 5, confirmation_phrase: "ACTIVATE APOLLO CANDIDATE PULL" },
  { channel_key: "apollo_reveal", channel_name: "Apollo — Email reveal", provider_key: "apollo", gate_key_hint: "apollo", secret_required: true, secret_env_names: ["APOLLO_API_KEY"], crm_required: true, max_batch: 10, recommended_first_batch: 5, confirmation_phrase: "ACTIVATE APOLLO EMAIL REVEAL" },
  { channel_key: "metricool_social_schedule", channel_name: "Metricool — Social schedule", provider_key: "metricool", gate_key_hint: "metricool", secret_required: true, secret_env_names: ["METRICOOL_API_KEY"], draft_signal: (c) => c.hasSocialDraft, max_batch: 5, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE METRICOOL SCHEDULE" },
  { channel_key: "manychat_dm", channel_name: "ManyChat — DM flow", provider_key: "manychat", gate_key_hint: "manychat", secret_required: true, secret_env_names: ["MANYCHAT_API_KEY"], draft_signal: (c) => c.hasSocialDraft, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE MANYCHAT DM" },
  { channel_key: "proposal_send", channel_name: "Proposal — Send", provider_key: null, gate_key_hint: "proposal", secret_required: false, secret_env_names: [], draft_signal: (c) => c.hasProposalDraft, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE PROPOSAL SEND" },
  { channel_key: "invoice_send", channel_name: "Invoice — Send", provider_key: null, gate_key_hint: "invoice", secret_required: false, secret_env_names: [], max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE INVOICE SEND" },
  { channel_key: "payment_link", channel_name: "Payment link", provider_key: "stripe", gate_key_hint: "payment", secret_required: true, secret_env_names: ["STRIPE_SECRET_KEY"], compliance_required: true, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE PAYMENT LINK" },
  { channel_key: "customer_onboarding_share", channel_name: "Customer onboarding share", provider_key: null, gate_key_hint: "onboarding", secret_required: false, secret_env_names: [], draft_signal: (c) => c.hasCustomerSuccessDraft, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE CUSTOMER ONBOARDING SHARE" },
  { channel_key: "customer_report_share", channel_name: "Customer report share", provider_key: null, gate_key_hint: "report", secret_required: false, secret_env_names: [], max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE CUSTOMER REPORT SHARE" },
  { channel_key: "support_reply_send", channel_name: "Support reply send", provider_key: null, gate_key_hint: "support", secret_required: false, secret_env_names: [], draft_signal: (c) => c.hasSupportDraft, max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE SUPPORT REPLY SEND" },
  { channel_key: "winback_message_send", channel_name: "Winback message send", provider_key: null, gate_key_hint: "winback", secret_required: false, secret_env_names: [], max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE WINBACK SEND" },
  { channel_key: "portal_invite", channel_name: "Customer portal invite", provider_key: null, gate_key_hint: "portal", secret_required: false, secret_env_names: [], max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE PORTAL INVITE" },
  { channel_key: "survey_send", channel_name: "Survey send", provider_key: null, gate_key_hint: "survey", secret_required: false, secret_env_names: [], max_batch: 1, recommended_first_batch: 1, confirmation_phrase: "ACTIVATE SURVEY SEND" },
];

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
      activation_record_id,
      include_channels,
      create_readiness_plan = true,
      create_founder_review = true,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id_required" }, 400);
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    const provider_status = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("LOVABLE_API_KEY") ? "configured" : "not_configured";

    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    // Load context
    let activation: any = null;
    if (activation_record_id) {
      const { data } = await svc.from("business_internal_activation_records").select("*").eq("id", activation_record_id).maybeSingle();
      activation = data;
    }
    if (!activation) {
      const { data } = await svc.from("business_internal_activation_records").select("*")
        .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      activation = data;
    }
    const { data: weekly } = await svc.from("business_weekly_review_runs").select("*")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: daily } = await svc.from("business_daily_operating_runs").select("id,run_date,run_status")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: profile } = await svc.from("business_understanding_profiles").select("id")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: pack } = await svc.from("business_execution_starter_packs").select("id")
      .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const { data: matRows } = await svc.from("starter_pack_materialised_items")
      .select("id,item_type,external_send_allowed").eq("business_id", business_id).limit(1000);
    const mat = matRows ?? [];
    const matCount = mat.length;
    const sendableLeaks = mat.filter((m: any) => m.external_send_allowed === true).length;

    const matByType = (subs: string[]) => mat.some((m: any) => subs.some((s) => (m.item_type ?? "").toLowerCase().includes(s)));
    const ctx = {
      hasOutreachDraft: matByType(["email", "outreach", "follow"]),
      hasSocialDraft: matByType(["social", "content"]),
      hasSupportDraft: matByType(["support", "faq"]),
      hasCustomerSuccessDraft: matByType(["customer_success", "onboarding", "welcome"]),
      hasProposalDraft: matByType(["proposal", "demo"]),
      hasRevenueDraft: matByType(["revenue", "pricing"]),
    };

    // External gates snapshot
    const { data: gatesRaw } = await svc.from("external_action_gates")
      .select("gate_key,gate_label,enabled,confirmation_phrase,max_batch_size,provider_type");
    const gates = gatesRaw ?? [];
    const anyEnabled = gates.filter((g: any) => g.enabled === true);
    const all_external_gates_locked = anyEnabled.length === 0;

    const blocker_reasons: string[] = [];
    const warnings: string[] = [];
    if (!activation) blocker_reasons.push("no_internal_activation");
    if (!weekly) warnings.push("no_weekly_review");
    if (!daily) warnings.push("no_daily_run");
    if (!profile) blocker_reasons.push("no_understanding_profile");
    if (!pack) blocker_reasons.push("no_starter_pack");
    if (matCount === 0) blocker_reasons.push("no_materialised_drafts");
    if (sendableLeaks > 0) blocker_reasons.push(`sendable_materialised_items:${sendableLeaks}`);
    if (!all_external_gates_locked) warnings.push(`external_gates_enabled:${anyEnabled.map((g: any) => g.gate_key).join(",")}`);

    // Compliance/CRM heuristic from existing readiness if tables present
    let compliance_ready = true;
    let crm_ready = false;
    try {
      const { count: complianceFlagged } = await svc.from("founder_approval_items")
        .select("id", { count: "exact", head: true })
        .eq("approval_type", "compliance_review");
      if ((complianceFlagged ?? 0) > 0) warnings.push("open_compliance_reviews");
    } catch {}
    try {
      const { count: crmCount } = await svc.from("crm_contacts" as any)
        .select("id", { count: "exact", head: true }).eq("business_id", business_id);
      crm_ready = (crmCount ?? 0) > 0;
    } catch { crm_ready = false; }
    if (!crm_ready) warnings.push("crm_or_customer_memory_empty");

    // Channel checks
    const channelList = Array.isArray(include_channels) && include_channels.length > 0
      ? CHANNELS.filter((c) => include_channels.includes(c.channel_key))
      : CHANNELS;

    const channelChecks: any[] = [];
    for (const ch of channelList) {
      const matchedGate = ch.gate_key_hint ? gates.find((g: any) => (g.gate_key ?? "").toLowerCase().includes(ch.gate_key_hint!)) : null;
      const gate_exists = !!matchedGate;
      const gate_enabled = matchedGate?.enabled === true;
      const gate_locked = !gate_enabled;
      const secret_present = ch.secret_required && ch.secret_env_names.some((n) => !!Deno.env.get(n));
      const draft_ready = ch.draft_signal ? ch.draft_signal(ctx) : true;
      const compliance_ok = ch.compliance_required ? compliance_ready : true;
      const unsub_ok = ch.unsubscribe_required ? false : true; // assume not yet proven
      const webhook_ok = ch.webhook_required ? false : true; // assume not yet proven
      const crm_ok = ch.crm_required ? crm_ready : true;

      const blockers: string[] = [];
      const wlist: string[] = [];
      if (ch.secret_required && !secret_present) blockers.push("provider_secret_missing");
      if (!gate_exists) wlist.push("gate_not_registered");
      if (gate_enabled) blockers.push("gate_already_enabled");
      if (!draft_ready) blockers.push("draft_assets_missing");
      if (!compliance_ok) blockers.push("compliance_not_ready");
      if (ch.unsubscribe_required && !unsub_ok) wlist.push("unsubscribe_not_verified");
      if (ch.webhook_required && !webhook_ok) wlist.push("webhook_not_verified");
      if (ch.crm_required && !crm_ok) wlist.push("crm_not_ready");

      let channel_status: string;
      if (!ch.secret_required && !gate_exists && !draft_ready) channel_status = "not_configured";
      else if (blockers.length === 0 && wlist.length === 0) channel_status = "ready_for_founder_review";
      else if (blockers.length === 0) channel_status = "warning";
      else channel_status = "blocked";

      channelChecks.push({
        channel_key: ch.channel_key,
        channel_name: ch.channel_name,
        channel_status,
        provider_key: ch.provider_key,
        provider_status: ch.secret_required ? (secret_present ? "secret_present" : "secret_missing") : "no_secret_required",
        gate_key: matchedGate?.gate_key ?? null,
        gate_exists, gate_enabled, gate_locked,
        secret_required: ch.secret_required,
        secret_present,
        secret_value_returned: false,
        batch_limit: matchedGate?.max_batch_size ?? ch.max_batch,
        recommended_first_batch_size: ch.recommended_first_batch,
        confirmation_phrase: matchedGate?.confirmation_phrase ?? ch.confirmation_phrase,
        compliance_ready: compliance_ok,
        draft_ready,
        crm_ready: crm_ok,
        webhook_ready: webhook_ok,
        tracking_disclosure_ready: ch.unsubscribe_required ? false : true,
        unsubscribe_ready: unsub_ok,
        founder_approval_required: true,
        founder_approval_present: false,
        blocker_reasons: blockers,
        warnings: wlist,
        next_safe_action: blockers.length > 0 ? `Resolve: ${blockers.join(", ")}` : (wlist.length > 0 ? `Confirm: ${wlist.join(", ")}` : "Request founder approval; do not enable gate"),
        external_action_blocked: true,
        is_test_data,
      });
    }

    const channels_ready = channelChecks.filter((c) => c.channel_status === "ready_for_founder_review").length;
    const channels_warning = channelChecks.filter((c) => c.channel_status === "warning").length;
    const channels_blocked = channelChecks.filter((c) => c.channel_status === "blocked").length;

    const knowledge_ready = !!profile && !!pack;
    const draft_assets_ready = matCount > 0 && sendableLeaks === 0;
    const provider_lanes_ready = channelChecks.some((c) => c.secret_present);
    const founder_approval_ready = true; // mechanism exists

    // Score
    let score = 0;
    if (activation) score += 10;
    if (weekly) score += 10;
    if (knowledge_ready) score += 10;
    if (matCount > 0) score += 10;
    if (compliance_ready) score += 10;
    if (crm_ready) score += 10;
    if (channelChecks.some((c) => c.draft_ready)) score += 10;
    if (gates.length > 0 && all_external_gates_locked) score += 10;
    score += 5; // secret presence checked safely
    score += 5; // founder approval path exists
    score += 5; // rollback/stop plan generated below
    if (blocker_reasons.length === 0 && sendableLeaks === 0) score += 5;

    let recommended_mode = "do_not_activate_yet";
    if (blocker_reasons.length > 0 || score < 60) recommended_mode = "blocked";
    else if (score < 75) recommended_mode = "internal_only";
    else if (score < 90) recommended_mode = "ready_for_founder_review";
    else if (all_external_gates_locked) recommended_mode = "ready_for_controlled_micro_batch_later";

    const internal_ready = !!activation && !!weekly && knowledge_ready && draft_assets_ready;
    const recommended_first_batch_size = recommended_mode === "ready_for_controlled_micro_batch_later"
      ? Math.max(...channelChecks.filter((c) => c.channel_status === "ready_for_founder_review").map((c) => c.recommended_first_batch_size), 0) || 1
      : 0;

    const planPreview = {
      plan_title: `Controlled external activation plan for ${biz.name}`,
      plan_summary: `Readiness ${score}/100 — ${recommended_mode}. ${channels_ready} ready / ${channels_warning} warning / ${channels_blocked} blocked. External activation NOT permitted from this prompt.`,
      recommended_sequence: [
        "Founder reviews readiness plan.",
        "Fix missing compliance/CRM/provider blockers.",
        "Confirm all external gates remain locked.",
        "Select ONE channel only.",
        "Run channel-specific dry-run preview.",
        "Prepare micro-batch only.",
        "Founder enters channel-specific confirmation phrase (future prompt).",
        "Run first controlled batch in a future prompt only.",
        "Monitor replies/errors.",
        "Stop if any risk condition triggers.",
      ],
      required_founder_decisions: [
        "Which single channel to attempt first",
        "First batch size cap",
        "Whether all compliance/CRM blockers are truly cleared",
      ],
      required_provider_setup: channelChecks.filter((c) => c.secret_required && !c.secret_present).map((c) => `${c.channel_name}: configure ${c.channel_key} provider secret`),
      required_compliance_fixes: compliance_ready ? [] : ["resolve open compliance reviews", "verify unsubscribe + footer"],
      required_crm_fixes: crm_ready ? [] : ["seed CRM/customer memory before any outreach"],
      required_draft_reviews: channelChecks.filter((c) => !c.draft_ready).map((c) => `${c.channel_name}: review materialised drafts`),
      blocked_channels: channelChecks.filter((c) => c.channel_status === "blocked").map((c) => c.channel_key),
      ready_channels: channelChecks.filter((c) => c.channel_status === "ready_for_founder_review").map((c) => c.channel_key),
      max_first_batch: recommended_first_batch_size,
      rollback_plan: [
        "Pause business",
        "Keep gates locked",
        "Disable provider lane",
        "Mark affected items parked",
        "Review audit",
        "Do not delete real data",
      ],
      stop_conditions: [
        "Bounce/spam complaint",
        "Unsubscribe signal",
        "Angry response",
        "Legal/compliance warning",
        "Provider error",
        "Unexpected send attempt",
        "Missing unsubscribe/footer",
        "Wrong contact/company",
        "Gate mismatch",
        "Founder says stop",
      ],
      success_metrics: [
        "Zero forbidden actions",
        "Successful dry-run",
        "Founder approval captured",
        "Provider readiness confirmed",
        "First batch completed later only if future gate allows",
        "Replies captured",
        "No compliance issue",
      ],
    };

    const audit = {
      emails_sent: 0, dms_sent: 0, posts_published: 0,
      apollo_calls: 0, apollo_credits_spent: 0,
      smartlead_post_calls: 0, smartlead_campaign_starts: 0,
      smtp_calls: 0, native_email_send_calls: 0, email_queue_send_rows_created: 0,
      metricool_mutations: 0, manychat_mutations: 0,
      payment_mutations: 0, portal_accounts_created: 0, portal_invites_sent: 0,
      surveys_sent: 0, reports_shared: 0,
      external_gates_enabled: 0, real_data_deleted: 0, secrets_exposed: 0,
      auto_send_changed: "no", cron_changed: "no",
    };

    const baseResp = {
      ok: true,
      business_id,
      activation_record_id: activation?.id ?? null,
      latest_weekly_review_id: weekly?.id ?? null,
      provider_status,
      readiness_score: score,
      internal_ready,
      external_ready: false,
      external_activation_allowed: false,
      all_external_gates_locked,
      compliance_ready, crm_ready, knowledge_ready, draft_assets_ready, provider_lanes_ready, founder_approval_ready,
      channel_count: channelChecks.length,
      channels_ready, channels_warning, channels_blocked,
      recommended_first_batch_size,
      recommended_mode,
      blocker_reasons, warnings,
      channel_checks: channelChecks,
      activation_plan: planPreview,
      safety_status: audit,
      no_forbidden_action_audit: audit,
      external_go_live: "LOCKED_BY_DESIGN",
    };

    if (dry_run) {
      return j({ ...baseResp, status: "previewed", readiness_run_id: null, founder_review_ids: [] });
    }

    const { data: rec, error: recErr } = await svc.from("business_external_activation_readiness_runs").insert({
      business_id,
      activation_record_id: activation?.id ?? null,
      latest_weekly_review_id: weekly?.id ?? null,
      run_status: blocker_reasons.length > 0 ? "partial" : "completed",
      readiness_mode: "controlled_external_readiness",
      provider_status,
      internal_ready,
      external_ready: false,
      external_activation_allowed: false,
      all_external_gates_locked,
      compliance_ready, crm_ready, knowledge_ready, draft_assets_ready, provider_lanes_ready, founder_approval_ready,
      readiness_score: score,
      blocker_count: blocker_reasons.length,
      warning_count: warnings.length,
      channel_count: channelChecks.length,
      channels_ready, channels_blocked, channels_warning,
      recommended_first_batch_size,
      recommended_mode,
      is_test_data,
      metadata: { sendable_leaks: sendableLeaks, gates_total: gates.length },
      no_forbidden_action_audit: audit,
    }).select("*").single();
    if (recErr || !rec) return j({ ok: false, error: recErr?.message ?? "readiness_insert_failed" }, 500);

    if (channelChecks.length > 0) {
      const rows = channelChecks.map((c) => ({ ...c, business_id, readiness_run_id: rec.id }));
      const { error: ccErr } = await svc.from("business_external_activation_channel_checks").insert(rows);
      if (ccErr) warnings.push(`channel_checks_insert_failed:${ccErr.message}`);
    }

    let plan_id: string | null = null;
    if (create_readiness_plan) {
      const { data: planRow, error: pErr } = await svc.from("business_external_activation_plans").insert({
        business_id,
        readiness_run_id: rec.id,
        plan_status: blocker_reasons.length > 0 ? "blocked" : "needs_review",
        plan_type: "controlled_micro_batch",
        plan_title: planPreview.plan_title,
        plan_summary: planPreview.plan_summary,
        recommended_sequence: planPreview.recommended_sequence,
        required_founder_decisions: planPreview.required_founder_decisions,
        required_provider_setup: planPreview.required_provider_setup,
        required_compliance_fixes: planPreview.required_compliance_fixes,
        required_crm_fixes: planPreview.required_crm_fixes,
        required_draft_reviews: planPreview.required_draft_reviews,
        blocked_channels: planPreview.blocked_channels,
        ready_channels: planPreview.ready_channels,
        max_first_batch: planPreview.max_first_batch,
        rollback_plan: planPreview.rollback_plan,
        stop_conditions: planPreview.stop_conditions,
        success_metrics: planPreview.success_metrics,
        external_activation_allowed: false,
        external_action_blocked: true,
        founder_review_required: true,
        is_test_data,
        metadata: { recommended_mode },
      }).select("id").maybeSingle();
      if (pErr) warnings.push(`plan_insert_failed:${pErr.message}`);
      plan_id = planRow?.id ?? null;
    }

    const founder_review_ids: string[] = [];
    if (create_founder_review) {
      const { data: rev, error: rErr } = await svc.from("founder_approval_items").insert({
        business_id,
        approval_type: "controlled_external_activation_readiness_review",
        source_system: "business-external-activation-readiness-run",
        source_table: "business_external_activation_readiness_runs",
        title: `Review controlled external activation readiness for ${biz.name}`,
        summary: `Score ${score}/100. Mode: ${recommended_mode}. Ready ${channels_ready} / warning ${channels_warning} / blocked ${channels_blocked}. Max first batch ${recommended_first_batch_size}. External activation NOT allowed yet — all gates locked.`,
        recommended_action: "Review channel-by-channel readiness and the controlled micro-batch plan. Do NOT enable any external gate from this approval.",
        priority_level: blocker_reasons.length > 0 ? "high" : "normal",
        risk_flags: blocker_reasons, compliance_flags: compliance_ready ? [] : ["compliance_not_ready"],
        execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        metadata: { readiness_run_id: rec.id, plan_id, recommended_mode, is_test_data },
      }).select("id").maybeSingle();
      if (!rErr && rev?.id) founder_review_ids.push(rev.id);
      else if (rErr) warnings.push(`founder_review_failed:${rErr.message}`);
    }

    return j({
      ...baseResp,
      status: "completed",
      readiness_run_id: rec.id,
      activation_plan_id: plan_id,
      founder_review_ids,
      warnings,
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});