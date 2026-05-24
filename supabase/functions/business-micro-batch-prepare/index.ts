import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRM = "PREPARE CONTROLLED MICRO BATCH";

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

type ChannelDef = {
  channel_key: string;
  channel_name: string;
  candidate_type: string;
  source_module: string;
  max_batch: number;
  exec_phrase: string;
  gate_hint: string | null;
  draft_match?: string[];
  compliance_required?: boolean;
  unsub_required?: boolean;
  crm_required?: boolean;
};

const CHANNELS: Record<string, ChannelDef> = {
  smartlead_cold_outreach: { channel_key: "smartlead_cold_outreach", channel_name: "Smartlead — Cold outreach", candidate_type: "smartlead_lead_candidate", source_module: "smartlead", max_batch: 5, exec_phrase: "EXECUTE SMARTLEAD MICRO BATCH", gate_hint: "smartlead", draft_match: ["email","outreach","follow"], compliance_required: true, unsub_required: true, crm_required: true },
  native_email: { channel_key: "native_email", channel_name: "Native email (SMTP)", candidate_type: "native_email_candidate", source_module: "native_email", max_batch: 1, exec_phrase: "EXECUTE NATIVE EMAIL MICRO PROOF", gate_hint: "email", draft_match: ["email","outreach","reply","proposal","support","customer_success"], compliance_required: true, unsub_required: true },
  apollo_candidate_pull: { channel_key: "apollo_candidate_pull", channel_name: "Apollo — Candidate pull", candidate_type: "apollo_candidate_pull", source_module: "apollo", max_batch: 1, exec_phrase: "EXECUTE APOLLO CANDIDATE PULL", gate_hint: "apollo", crm_required: true },
  apollo_reveal: { channel_key: "apollo_reveal", channel_name: "Apollo — Email reveal", candidate_type: "apollo_reveal_candidate", source_module: "apollo", max_batch: 3, exec_phrase: "EXECUTE APOLLO MICRO REVEAL", gate_hint: "apollo", crm_required: true },
  metricool_social_schedule: { channel_key: "metricool_social_schedule", channel_name: "Metricool — Social schedule", candidate_type: "social_schedule_candidate", source_module: "metricool", max_batch: 3, exec_phrase: "SCHEDULE METRICOOL MICRO BATCH", gate_hint: "metricool", draft_match: ["social","content"] },
  manychat_dm: { channel_key: "manychat_dm", channel_name: "ManyChat — DM flow", candidate_type: "manychat_dm_candidate", source_module: "manychat", max_batch: 1, exec_phrase: "SEND MANYCHAT MICRO DM", gate_hint: "manychat", draft_match: ["social","dm"] },
  proposal_send: { channel_key: "proposal_send", channel_name: "Proposal send", candidate_type: "proposal_send_candidate", source_module: "proposal", max_batch: 1, exec_phrase: "EXECUTE PROPOSAL SEND", gate_hint: "proposal", draft_match: ["proposal"] },
  invoice_send: { channel_key: "invoice_send", channel_name: "Invoice send", candidate_type: "invoice_send_candidate", source_module: "invoice", max_batch: 1, exec_phrase: "EXECUTE INVOICE SEND", gate_hint: "invoice" },
  customer_onboarding_share: { channel_key: "customer_onboarding_share", channel_name: "Customer onboarding share", candidate_type: "onboarding_share_candidate", source_module: "customer_success", max_batch: 1, exec_phrase: "SHARE CUSTOMER ONBOARDING", gate_hint: "onboarding", draft_match: ["onboarding","welcome","customer_success"] },
  customer_report_share: { channel_key: "customer_report_share", channel_name: "Customer report share", candidate_type: "customer_report_candidate", source_module: "customer_success", max_batch: 1, exec_phrase: "SHARE CUSTOMER QUARTERLY REPORT", gate_hint: "report" },
  survey_send: { channel_key: "survey_send", channel_name: "Survey send", candidate_type: "survey_send_candidate", source_module: "survey", max_batch: 1, exec_phrase: "SEND CUSTOMER SURVEY", gate_hint: "survey" },
  portal_invite: { channel_key: "portal_invite", channel_name: "Portal invite", candidate_type: "portal_invite_candidate", source_module: "portal", max_batch: 1, exec_phrase: "SEND PORTAL INVITE", gate_hint: "portal" },
  support_reply_send: { channel_key: "support_reply_send", channel_name: "Support reply send", candidate_type: "support_reply_candidate", source_module: "support", max_batch: 1, exec_phrase: "SEND SUPPORT REPLY", gate_hint: "support", draft_match: ["support","faq"] },
  winback_message_send: { channel_key: "winback_message_send", channel_name: "Winback message send", candidate_type: "winback_message_candidate", source_module: "winback", max_batch: 1, exec_phrase: "SEND WIN-BACK MESSAGE", gate_hint: "winback" },
};

function sliceItem(s: string | null | undefined, n: number) { return (s ?? "").slice(0, n); }

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
    if (!(roles ?? []).some((r: any) => ["admin","founder"].includes(r.role))) {
      return j({ ok: false, error: "forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      channel_key,
      readiness_run_id,
      activation_plan_id,
      max_candidates = 10,
      create_approval_packet = true,
      create_founder_review = true,
      dry_run = true,
      confirmation_phrase,
      is_test_data = false,
    } = body ?? {};

    if (!business_id) return j({ ok: false, error: "business_id_required" }, 400);
    if (!channel_key) return j({ ok: false, error: "channel_key_required" }, 400);
    const ch = CHANNELS[channel_key];
    if (!ch) return j({ ok: false, error: "unsupported_channel", channel_key }, 400);
    if (!dry_run && confirmation_phrase !== CONFIRM) {
      return j({ ok: false, error: "confirmation_phrase_required", expected: CONFIRM }, 400);
    }

    const { data: biz } = await svc.from("businesses").select("id,name").eq("id", business_id).maybeSingle();
    if (!biz) return j({ ok: false, error: "business_not_found" }, 404);

    const blockers: string[] = [];
    const warnings: string[] = [];

    // Load latest readiness run + plan if not given
    let readiness: any = null;
    if (readiness_run_id) {
      const { data } = await svc.from("business_external_activation_readiness_runs").select("*").eq("id", readiness_run_id).maybeSingle();
      readiness = data;
    }
    if (!readiness) {
      const { data } = await svc.from("business_external_activation_readiness_runs").select("*")
        .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      readiness = data;
    }
    if (!readiness) warnings.push("no_readiness_run");

    let plan: any = null;
    if (activation_plan_id) {
      const { data } = await svc.from("business_external_activation_plans").select("*").eq("id", activation_plan_id).maybeSingle();
      plan = data;
    }
    if (!plan) {
      const { data } = await svc.from("business_external_activation_plans").select("*")
        .eq("business_id", business_id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      plan = data;
    }
    if (!plan) warnings.push("no_activation_plan");

    // Channel readiness check
    let channelCheck: any = null;
    if (readiness?.id) {
      const { data } = await svc.from("business_external_activation_channel_checks").select("*")
        .eq("readiness_run_id", readiness.id).eq("channel_key", channel_key).maybeSingle();
      channelCheck = data;
    }
    if (!channelCheck) warnings.push("no_channel_readiness_check");

    // External gate
    let gate: any = null;
    try {
      const { data: gates } = await svc.from("external_action_gates").select("gate_key,enabled,confirmation_phrase,max_batch_size");
      gate = (gates ?? []).find((g: any) => ch.gate_hint && (g.gate_key ?? "").toLowerCase().includes(ch.gate_hint));
    } catch { /* table may not exist */ }
    const gate_exists = !!gate;
    const gate_enabled = gate?.enabled === true;
    const gate_locked = !gate_enabled;
    if (gate_enabled) blockers.push("gate_already_enabled");
    if (!gate_exists) warnings.push("gate_not_registered");

    const provider_status = (() => {
      const map: Record<string, string[]> = {
        smartlead_cold_outreach: ["SMARTLEAD_API_KEY"],
        native_email: ["SMTP_HOST","SMTP_USER","SMTP_PASS","RESEND_API_KEY"],
        apollo_candidate_pull: ["APOLLO_API_KEY"],
        apollo_reveal: ["APOLLO_API_KEY"],
        metricool_social_schedule: ["METRICOOL_API_KEY"],
        manychat_dm: ["MANYCHAT_API_KEY"],
      };
      const envs = map[channel_key] ?? [];
      if (envs.length === 0) return "no_secret_required";
      return envs.some((e) => !!Deno.env.get(e)) ? "secret_present" : "secret_missing";
    })();

    // Channel eligibility from readiness check
    const channel_status_raw = channelCheck?.channel_status ?? "unknown";
    if (channelCheck && channelCheck.channel_status === "blocked") blockers.push("channel_blocked_in_readiness");

    // Cap batch size
    const requested = Math.max(1, Math.min(Number(max_candidates) || 1, 100));
    const cap = ch.max_batch;
    const max_allowed_batch_size = cap;
    if (requested > cap) warnings.push("Requested size reduced to controlled micro-batch limit.");
    const target_size = Math.min(requested, cap);

    // Load source candidates from materialised items
    const candidates: any[] = [];
    try {
      const { data: mat } = await svc.from("starter_pack_materialised_items")
        .select("id,item_type,title,body,structured_payload,external_send_allowed,metadata")
        .eq("business_id", business_id).limit(500);
      const matchTypes = ch.draft_match ?? [];
      const matFiltered = (mat ?? []).filter((m: any) => {
        const t = (m.item_type ?? "").toLowerCase();
        if (matchTypes.length === 0) return false;
        return matchTypes.some((s) => t.includes(s));
      });
      for (const m of matFiltered.slice(0, target_size * 2)) {
        const cBlock: string[] = [];
        const cWarn: string[] = [];
        if (m.external_send_allowed === true) cBlock.push("materialised_marked_sendable_violation");
        if (ch.compliance_required && !((m.metadata as any)?.unsubscribe_ready)) cWarn.push("unsubscribe_not_verified");
        if (ch.crm_required) cWarn.push("crm_link_not_verified");
        if (gate_enabled) cBlock.push("gate_enabled");
        if (provider_status === "secret_missing") cBlock.push("provider_secret_missing");
        const status = cBlock.length > 0 ? "blocked" : (cWarn.length > 0 ? "warning" : "eligible_for_founder_review");
        candidates.push({
          channel_key,
          source_module: ch.source_module,
          source_record_id: m.id,
          candidate_type: ch.candidate_type,
          candidate_status: status,
          recipient_or_target: null,
          subject_or_title: sliceItem(m.title, 240),
          preview_body: sliceItem(m.body, 1200),
          structured_payload: m.structured_payload ?? {},
          compliance_status: ch.compliance_required ? "needs_review" : "n_a",
          crm_status: ch.crm_required ? "needs_link" : "n_a",
          provider_status,
          gate_status: gate_locked ? "locked" : "enabled_unsafe",
          unsubscribe_ready: false,
          tracking_disclosure_ready: false,
          consent_or_lawful_basis_ready: false,
          founder_review_required: true,
          external_action_blocked: true,
          execution_allowed: false,
          blocker_reasons: cBlock,
          warnings: cWarn,
          evidence: { source_materialised_item_id: m.id, item_type: m.item_type },
          is_test_data,
          metadata: { generated_at: new Date().toISOString() },
        });
      }
    } catch { /* table absence handled below */ }

    if (candidates.length === 0) warnings.push("no_candidates_found_in_materialised_drafts");

    // Cap to target_size for "prepared" batch (eligible first)
    candidates.sort((a, b) => (a.candidate_status === "eligible_for_founder_review" ? -1 : 1));
    const preparedSlice = candidates.slice(0, target_size);

    const eligible_count = candidates.filter((c) => c.candidate_status === "eligible_for_founder_review").length;
    const blocked_count = candidates.filter((c) => c.candidate_status === "blocked").length;
    const warning_count = candidates.filter((c) => c.candidate_status === "warning").length;
    const proposed_batch_size = Math.min(eligible_count, target_size);

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

    const packetPreview = {
      packet_title: `Controlled micro-batch packet — ${biz.name} — ${ch.channel_name}`,
      packet_summary: `Channel ${ch.channel_name}. Proposed batch ${proposed_batch_size}/${cap}. Eligible ${eligible_count}, blocked ${blocked_count}, warnings ${warning_count}. Execution NOT allowed from this prompt.`,
      required_confirmation_phrase: ch.exec_phrase,
      required_gate_key: gate?.gate_key ?? null,
      required_founder_decisions: [
        "Confirm channel is the correct first attempt",
        "Confirm batch size cap",
        "Confirm every eligible candidate is safe to attempt later",
      ],
      required_fixes_before_execution: [
        ...(provider_status === "secret_missing" ? ["Configure provider secret"] : []),
        ...(!gate_exists ? ["Register external action gate"] : []),
        ...(ch.compliance_required ? ["Verify unsubscribe + footer for every item"] : []),
        ...(ch.crm_required ? ["Link every candidate to CRM/customer memory"] : []),
      ],
      stop_conditions: [
        "Bounce/spam complaint","Unsubscribe signal","Angry response",
        "Provider error","Compliance warning","Gate mismatch","Founder says stop",
      ],
      rollback_plan: [
        "Pause business","Keep gate locked","Disable provider lane",
        "Park affected items","Audit log","Do not delete real data",
      ],
      success_metrics: [
        "Zero forbidden actions","Founder approval captured","Provider/gate verified safe",
        "First micro-batch attempted later only","No compliance issue",
      ],
    };

    const baseResp = {
      ok: true,
      business_id,
      channel_key,
      provider_status,
      channel_status: channel_status_raw,
      gate_key: gate?.gate_key ?? null,
      gate_exists, gate_enabled, gate_locked,
      candidate_count: candidates.length,
      eligible_count, blocked_count, warning_count,
      proposed_batch_size,
      max_batch_size: cap,
      candidates_preview: preparedSlice.map((c) => ({
        candidate_type: c.candidate_type, candidate_status: c.candidate_status,
        subject_or_title: c.subject_or_title, blocker_reasons: c.blocker_reasons, warnings: c.warnings,
      })),
      approval_packet_preview: packetPreview,
      blocker_reasons: blockers,
      warnings,
      safety_status: audit,
      no_forbidden_action_audit: audit,
      execution_allowed: false,
      external_action_blocked: true,
      external_go_live: "LOCKED_BY_DESIGN",
    };

    if (dry_run) {
      return j({ ...baseResp, status: "previewed", preparation_run_id: null, approval_packet_id: null, founder_approval_ids: [] });
    }

    const run_status = blockers.length > 0 ? "blocked" : (candidates.length === 0 ? "partial" : "prepared");
    const { data: run, error: runErr } = await svc.from("business_micro_batch_preparation_runs").insert({
      business_id,
      readiness_run_id: readiness?.id ?? null,
      activation_plan_id: plan?.id ?? null,
      channel_key,
      run_status,
      preparation_mode: create_approval_packet ? "founder_review_packet" : "dry_run_only",
      provider_status,
      channel_status: channel_status_raw,
      gate_key: gate?.gate_key ?? null,
      gate_exists, gate_enabled: false, gate_locked: true,
      candidate_count: candidates.length,
      eligible_count, blocked_count, warning_count,
      prepared_batch_size: proposed_batch_size,
      max_allowed_batch_size: cap,
      founder_approval_packet_created: false,
      execution_allowed: false,
      external_action_blocked: true,
      recommended_next_step: blockers.length > 0 ? "Resolve blockers; do not enable gate." : "Founder reviews packet; future execution requires separate prompt and channel phrase.",
      is_test_data,
      metadata: { requested_size: requested, capped: requested > cap },
      no_forbidden_action_audit: audit,
    }).select("*").single();
    if (runErr || !run) return j({ ok: false, error: runErr?.message ?? "run_insert_failed" }, 500);

    const candidate_ids: string[] = [];
    if (candidates.length > 0) {
      const rows = candidates.map((c) => ({ ...c, business_id, preparation_run_id: run.id }));
      const { data: insCs, error: cErr } = await svc.from("business_micro_batch_candidates").insert(rows).select("id");
      if (cErr) warnings.push(`candidates_insert_failed:${cErr.message}`);
      else (insCs ?? []).forEach((r: any) => candidate_ids.push(r.id));
    }

    let approval_packet_id: string | null = null;
    if (create_approval_packet) {
      const { data: pkt, error: pErr } = await svc.from("business_micro_batch_approval_packets").insert({
        business_id,
        preparation_run_id: run.id,
        channel_key,
        packet_status: blockers.length > 0 ? "blocked" : "needs_founder_review",
        packet_title: packetPreview.packet_title,
        packet_summary: packetPreview.packet_summary,
        candidate_ids,
        eligible_candidate_count: eligible_count,
        blocked_candidate_count: blocked_count,
        warning_count,
        proposed_batch_size,
        max_batch_size: cap,
        required_confirmation_phrase: packetPreview.required_confirmation_phrase,
        required_gate_key: packetPreview.required_gate_key,
        required_founder_decisions: packetPreview.required_founder_decisions,
        required_fixes_before_execution: packetPreview.required_fixes_before_execution,
        stop_conditions: packetPreview.stop_conditions,
        rollback_plan: packetPreview.rollback_plan,
        success_metrics: packetPreview.success_metrics,
        execution_allowed: false,
        external_action_blocked: true,
        founder_review_required: true,
        is_test_data,
        metadata: { run_id: run.id },
      }).select("id").maybeSingle();
      if (pErr) warnings.push(`packet_insert_failed:${pErr.message}`);
      approval_packet_id = pkt?.id ?? null;
      if (approval_packet_id) {
        await svc.from("business_micro_batch_preparation_runs").update({ founder_approval_packet_created: true }).eq("id", run.id);
      }
    }

    const founder_approval_ids: string[] = [];
    if (create_founder_review) {
      try {
        const { data: rev, error: rErr } = await svc.from("founder_approval_items").insert({
          business_id,
          approval_type: "controlled_micro_batch_packet_review",
          source_system: "business-micro-batch-prepare",
          source_table: "business_micro_batch_approval_packets",
          source_record_id: approval_packet_id,
          title: `Review controlled micro-batch packet for ${biz.name} — ${ch.channel_name}`,
          summary: `Channel ${ch.channel_name}. Proposed batch ${proposed_batch_size}/${cap}. Eligible ${eligible_count}, blocked ${blocked_count}, warnings ${warning_count}. Future execution requires "${ch.exec_phrase}". execution_allowed=false. All gates remain locked.`,
          recommended_action: "Review packet only. Do NOT enable any external gate or execute the batch from this approval.",
          priority_level: blockers.length > 0 ? "high" : "normal",
          risk_flags: blockers, compliance_flags: ch.compliance_required ? ["unsubscribe_review_required"] : [],
          execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
          metadata: { preparation_run_id: run.id, approval_packet_id, channel_key, required_phrase_for_future_execution: ch.exec_phrase, is_test_data },
        }).select("id").maybeSingle();
        if (!rErr && rev?.id) founder_approval_ids.push(rev.id);
        else if (rErr) warnings.push(`founder_review_failed:${rErr.message}`);
      } catch (e) {
        warnings.push(`founder_review_exception:${String((e as Error).message ?? e)}`);
      }
    }

    if (approval_packet_id && founder_approval_ids[0]) {
      await svc.from("business_micro_batch_approval_packets").update({ founder_approval_id: founder_approval_ids[0] }).eq("id", approval_packet_id);
      await svc.from("business_micro_batch_preparation_runs").update({ founder_approval_id: founder_approval_ids[0] }).eq("id", run.id);
    }

    return j({
      ...baseResp,
      status: run_status === "blocked" ? "blocked" : "prepared",
      preparation_run_id: run.id,
      approval_packet_id,
      founder_approval_ids,
      warnings,
    });
  } catch (e) {
    return j({ ok: false, status: "failed", error: String((e as Error)?.message ?? e) }, 500);
  }
});