import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NO_FORBIDDEN_AUDIT = {
  emails_sent: 0, dms_sent: 0, posts_published: 0,
  apollo_calls: 0, apollo_credits_spent: 0,
  smartlead_posts: 0, smartlead_campaign_starts: 0,
  smtp_calls: 0, native_email_send_calls: 0, email_queue_send_rows_created: 0,
  metricool_mutations: 0, manychat_mutations: 0,
  ad_platform_mutations: 0, payment_mutations: 0,
  portal_accounts_created: 0, portal_invites_sent: 0,
  surveys_sent: 0, reports_shared: 0,
  auto_send_changed: false, cron_changed: false,
  real_data_deleted: 0, secrets_exposed: 0,
};

const CONFIRMATION_PHRASE = "CREATE INBOUND EMAIL REPLY DRAFT";

const HIGH_RISK_RX = /\b(refund|charge|chargeback|dispute|legal|lawyer|sue|gdpr|dsar|privacy|cancel|cancellation|unsubscribe|complaint|angry|disappointed|medical|health|child|donor|investment|invoice|payment|contract|license|licens|ip\b|trademark|attorney|regulator|fraud)\b/i;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function classifyRisk(text: string): { level: "low"|"medium"|"high"|"critical"; warnings: string[] } {
  const warnings: string[] = [];
  const t = (text || "").toLowerCase();
  if (/\b(sue|lawyer|attorney|chargeback|fraud|regulator|gdpr|dsar)\b/i.test(t)) {
    warnings.push("Legal/regulatory language detected — founder review required.");
    return { level: "critical", warnings };
  }
  if (HIGH_RISK_RX.test(t)) {
    warnings.push("High-risk topic (finance/legal/privacy/cancellation) — founder must review.");
    return { level: "high", warnings };
  }
  if (/\b(angry|upset|unhappy|frustrated|disappointed|terrible|awful)\b/i.test(t)) {
    warnings.push("Negative sentiment detected — handle with care.");
    return { level: "medium", warnings };
  }
  return { level: "low", warnings };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } }, auth: { persistSession: false },
  });
  const { data: u } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (!u?.user) return json({ ok: false, error: "auth_invalid" }, 401);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {};
  try { body = await req.json(); } catch {}

  const business_id: string | null = body.business_id ?? null;
  const session_id_in: string | null = body.session_id ?? null;
  const inbound_message_id: string | null = body.inbound_message_id ?? null;
  const conversation_id_in: string | null = body.conversation_id ?? null;
  const crm_contact_id_in: string | null = body.crm_contact_id ?? null;
  const email_event_id: string | null = body.email_event_id ?? null;
  const provider_event_id: string | null = body.provider_event_id ?? null;
  const manual_sender_email: string | null = body.manual_sender_email ?? null;
  const manual_sender_name: string | null = body.manual_sender_name ?? null;
  const manual_subject: string | null = body.manual_subject ?? null;
  const manual_body: string | null = body.manual_body ?? null;
  const requested_tone: string = (body.requested_tone ?? "warm, confident, concise").toString().slice(0, 200);
  const reply_goal: string = (body.reply_goal ?? "").toString().slice(0, 500);
  const include_thread_history: boolean = body.include_thread_history !== false;
  const save_draft: boolean = !!body.save_draft;
  const create_founder_approval: boolean = body.create_founder_approval !== false;
  const dry_run: boolean = body.dry_run !== false; // default true
  const confirmation_phrase: string = (body.confirmation_phrase ?? "").toString();

  if (!inbound_message_id && !conversation_id_in && !email_event_id && !provider_event_id && !manual_body) {
    return json({ ok: false, error: "source_required", message: "Provide one of: inbound_message_id, conversation_id, email_event_id, provider_event_id, or manual_body." }, 400);
  }

  const missing_context: string[] = [];
  const risk_warnings: string[] = [];

  // --- Load source ---
  let inbound: any = null;
  let conversation: any = null;
  let contact: any = null;
  let thread: any[] = [];
  let source_object_type = "manual_paste";
  let source_object_id: string | null = null;
  let resolved_business_id = business_id;

  try {
    if (inbound_message_id) {
      const { data } = await admin.from("inbound_messages").select("*").eq("id", inbound_message_id).maybeSingle();
      if (data) {
        inbound = data; source_object_type = "inbound_message"; source_object_id = data.id;
      } else missing_context.push("inbound_message_not_found");
    }
    const convId = conversation_id_in ?? inbound?.conversation_id ?? null;
    if (convId) {
      const { data } = await admin.from("conversations").select("*").eq("id", convId).maybeSingle();
      if (data) {
        conversation = data;
        if (!source_object_id) { source_object_type = "conversation"; source_object_id = data.id; }
      } else missing_context.push("conversation_not_found");
    }
    const contactId = crm_contact_id_in ?? inbound?.contact_id ?? conversation?.contact_id ?? null;
    if (contactId) {
      const { data } = await admin.from("contacts").select("id,email,name,company,role,status,assigned_business,industry,seniority,country").eq("id", contactId).maybeSingle();
      if (data) contact = data; else missing_context.push("contact_not_found");
    }
    if (conversation?.id && include_thread_history) {
      const { data } = await admin.from("messages")
        .select("direction,content,channel,ai_generated,created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true }).limit(20);
      thread = data ?? [];
    }
    if (email_event_id) missing_context.push("email_event_lookup_not_implemented_safe_fallback");
    if (provider_event_id) missing_context.push("provider_event_lookup_not_implemented_safe_fallback");
  } catch (e) {
    missing_context.push(`source_load_error:${(e as Error).message}`);
  }

  // --- Resolve business from conversation/contact if not provided ---
  if (!resolved_business_id) {
    const bizName = conversation?.business_name || contact?.assigned_business || null;
    if (bizName) {
      const { data: biz } = await admin.from("businesses").select("id,name").eq("name", bizName).maybeSingle();
      if (biz?.id) resolved_business_id = biz.id;
    }
  }

  // --- Build effective source ---
  const source_subject = manual_subject ?? inbound?.subject ?? (conversation ? `Re: conversation ${conversation.id.slice(0,8)}` : "(no subject)");
  const source_body = manual_body ?? inbound?.body_text ?? inbound?.body_html ?? (thread.filter(m => m.direction === "inbound").slice(-1)[0]?.content ?? "");
  const source_from = manual_sender_email ?? inbound?.from_email ?? contact?.email ?? "(unknown sender)";
  const source_name = manual_sender_name ?? contact?.name ?? "";

  if (!source_body || !source_body.trim()) {
    missing_context.push("source_body_empty");
  }

  // --- Risk classification ---
  const risk = classifyRisk(`${source_subject}\n${source_body}`);
  risk_warnings.push(...risk.warnings);

  // --- Build context pack (inbox_reply) ---
  let contextPack: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-context-builder`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        business_id: resolved_business_id,
        context_type: "inbox_reply",
        source_object_type, source_object_id,
        session_id: session_id_in,
      }),
    });
    contextPack = await r.json();
  } catch (e) {
    missing_context.push(`context_builder_failed:${(e as Error).message}`);
  }
  const context_pack_id = contextPack?.context_pack_id ?? null;
  for (const m of (contextPack?.missing_context ?? [])) missing_context.push(m);
  for (const w of (contextPack?.risk_warnings ?? [])) risk_warnings.push(w);

  // --- Provider check ---
  let providerCheck: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-provider-check`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ provider_key: "openai", write_audit: false }),
    });
    providerCheck = await r.json();
  } catch { providerCheck = { provider_status: "error", can_call_ai: false }; }
  const provider_status = providerCheck?.provider_status ?? "not_configured";
  const can_call_ai = !!providerCheck?.can_call_ai;

  const safety_status = {
    send_allowed: false, external_action_blocked: true,
    approval_required: true, native_email_gate_required: true,
    publish_allowed: false, spend_allowed: false, provider_mutation_allowed: false,
  };

  const baseReturn = {
    business_id: resolved_business_id,
    contact_id: contact?.id ?? null,
    conversation_id: conversation?.id ?? null,
    source_loaded: !!(inbound || conversation || manual_body),
    source_object_type, source_object_id,
    context_pack_id,
    missing_context, risk_warnings,
    risk_level: risk.level,
    provider_status,
    safety_status,
    no_forbidden_action_audit: { ...NO_FORBIDDEN_AUDIT, openai_model_call: can_call_ai ? "allowed_in_chat_only" : "not_possible" },
  };

  // --- Provider missing: fail-closed ---
  if (!can_call_ai) {
    await admin.from("liftor_brain_audit").insert({
      business_id: resolved_business_id,
      action: "provider_missing", action_status: "blocked",
      details: { fn: "draft-inbound-reply", provider_status },
    });
    return json({
      status: "PARTIAL_PROVIDER_NOT_CONFIGURED",
      ...baseReturn,
      draft_preview: null, saved_draft_id: null, founder_approval_id: null,
      message: "OpenAI provider not configured. Add OPENAI_API_KEY as a Supabase Edge Function secret to enable inbound reply drafting. No model call was made.",
    });
  }

  // --- Call Brain chat server-side for drafting ---
  const draftingInstruction = [
    `Draft a reply to an inbound message on behalf of ${conversation?.business_name || contact?.assigned_business || "the selected business"}.`,
    `From: ${source_name ? `${source_name} <${source_from}>` : source_from}`,
    `Subject: ${source_subject}`,
    `Inbound body:\n${source_body}`,
    thread.length ? `\nPrior thread (most recent ${thread.length} messages):\n${thread.map((m: any) => `[${m.direction}] ${m.content}`).join("\n---\n").slice(0, 4000)}` : "",
    `\nReply goal: ${reply_goal || "answer the inbound message clearly."}`,
    `Tone: ${requested_tone}.`,
    `Risk level detected: ${risk.level}.`,
    `Rules: never claim the email was sent, never include tracking, never reveal API keys, no guarantees, no legal/financial/medical advice unless reviewed, escalate to founder if uncertain.`,
    `Return strict JSON with draft.should_create=true, draft.draft_type="inbound_email_reply", draft.subject, draft.body, draft.rationale. The reply must be concise, human, and end with a clear next step or question.`,
  ].filter(Boolean).join("\n");

  let chatResp: any = null;
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-chat`, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: session_id_in,
        business_id: resolved_business_id,
        user_message: draftingInstruction,
        requested_mode: "draft_support_reply",
        context_type: "inbox_reply",
        source_object_type, source_object_id,
        allow_internal_tools: false,
        save_draft: false,
        dry_run: false,
      }),
    });
    chatResp = await r.json();
  } catch (e) {
    return json({
      status: "AI_ERROR",
      ...baseReturn,
      draft_preview: null, saved_draft_id: null, founder_approval_id: null,
      error: (e as Error).message,
    });
  }

  const draftFromAI = chatResp?.draft_preview ?? chatResp?.draft ?? null;
  const draft_preview = draftFromAI ? {
    draft_type: "inbound_email_reply",
    subject: draftFromAI.subject ?? (source_subject?.toLowerCase().startsWith("re:") ? source_subject : `Re: ${source_subject}`),
    body: draftFromAI.body ?? chatResp?.answer ?? "",
    rationale: draftFromAI.rationale ?? null,
    risk_level: risk.level,
  } : (chatResp?.answer ? {
    draft_type: "inbound_email_reply",
    subject: source_subject?.toLowerCase().startsWith("re:") ? source_subject : `Re: ${source_subject}`,
    body: chatResp.answer,
    rationale: null,
    risk_level: risk.level,
  } : null);

  await admin.from("liftor_brain_audit").insert({
    business_id: resolved_business_id, session_id: chatResp?.session_id ?? null,
    action: "inbound_reply_draft_preview_generated", action_status: "recorded",
    details: { source_object_type, source_object_id, risk_level: risk.level, has_preview: !!draft_preview },
  });

  // --- Dry-run: return preview ---
  if (dry_run || !save_draft) {
    return json({
      status: provider_status === "configured" ? "PASS" : "PARTIAL_PROVIDER_NOT_CONFIGURED",
      ...baseReturn,
      session_id: chatResp?.session_id ?? null,
      draft_preview, saved_draft_id: null, founder_approval_id: null,
    });
  }

  // --- Save: require confirmation phrase ---
  if (confirmation_phrase !== CONFIRMATION_PHRASE) {
    await admin.from("liftor_brain_audit").insert({
      business_id: resolved_business_id,
      action: "inbound_reply_draft_save_blocked", action_status: "blocked",
      details: { reason: "confirmation_phrase_missing_or_mismatch" },
    });
    return json({
      status: "BLOCKED_CONFIRMATION_REQUIRED",
      ...baseReturn,
      draft_preview, saved_draft_id: null, founder_approval_id: null,
      message: `To save the draft, send confirmation_phrase exactly equal to: ${CONFIRMATION_PHRASE}`,
    });
  }

  if (!draft_preview?.body) {
    return json({
      status: "AI_ERROR",
      ...baseReturn,
      draft_preview, saved_draft_id: null, founder_approval_id: null,
      error: "no_draft_body_to_save",
    });
  }

  // --- Insert draft ---
  const { data: savedDraft, error: saveErr } = await admin.from("liftor_brain_drafts").insert({
    business_id: resolved_business_id,
    session_id: chatResp?.session_id ?? null,
    source_message_id: inbound?.id ?? null,
    draft_type: "inbound_email_reply",
    draft_status: "needs_review",
    title: `Inbound reply · ${source_from}`,
    subject: draft_preview.subject,
    body: draft_preview.body,
    rationale: draft_preview.rationale,
    source_object_type, source_object_id,
    crm_contact_id: contact?.id ?? null,
    conversation_id: conversation?.id ?? null,
    approval_status: "needs_review",
    external_send_allowed: false,
    external_action_blocked: true,
    risk_warnings,
    missing_context,
    metadata: {
      source_from, source_name, source_subject,
      risk_level: risk.level, requested_tone, reply_goal,
      provider_status,
    },
  }).select("*").maybeSingle();

  if (saveErr) {
    return json({
      status: "SAVE_ERROR",
      ...baseReturn,
      draft_preview, saved_draft_id: null, founder_approval_id: null,
      error: saveErr.message,
    });
  }

  await admin.from("liftor_brain_audit").insert({
    business_id: resolved_business_id,
    action: "inbound_reply_draft_created", action_status: "recorded",
    details: { draft_id: savedDraft?.id, risk_level: risk.level, source_object_type, source_object_id },
  });

  // --- Founder approval handoff (safe, internal) ---
  let founder_approval_id: string | null = null;
  let approval_warning: string | null = null;
  if (create_founder_approval) {
    try {
      const r = await fetch(`${SUPABASE_URL}/functions/v1/liftor-brain-tool-router`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          tool_key: "create_founder_approval_item",
          payload: {
            business_id: resolved_business_id,
            title: "Review Liftor Brain reply draft",
            approval_type: "inbound_reply_draft_review",
            priority: risk.level === "critical" ? "critical" : risk.level === "high" ? "high" : "medium",
            source_object_type, source_object_id,
            draft_id: savedDraft?.id,
            summary: (draft_preview.body || "").slice(0, 280),
            risk_warnings, missing_context,
            recommended_decision: "review_edit_send_via_external_gate",
          },
          dry_run: false,
          confirmation_phrase: "CREATE FOUNDER APPROVAL ITEM",
        }),
      });
      const ar = await r.json();
      founder_approval_id = ar?.result?.approval_id ?? ar?.approval_id ?? null;
      if (!founder_approval_id) {
        approval_warning = "Founder approval handoff not created (router returned no approval id); draft is saved internally for review.";
      } else {
        await admin.from("liftor_brain_drafts").update({
          founder_approval_review_id: founder_approval_id,
          draft_status: "sent_to_founder_approval",
        }).eq("id", savedDraft!.id);
        await admin.from("liftor_brain_audit").insert({
          business_id: resolved_business_id,
          action: "founder_approval_created", action_status: "recorded",
          details: { approval_id: founder_approval_id, draft_id: savedDraft?.id },
        });
      }
    } catch (e) {
      approval_warning = `Founder approval handoff failed safely: ${(e as Error).message}. Draft saved internally for review.`;
    }
  }

  return json({
    status: "PASS",
    ...baseReturn,
    session_id: chatResp?.session_id ?? null,
    draft_preview,
    saved_draft_id: savedDraft?.id ?? null,
    founder_approval_id,
    approval_warning,
  });
});