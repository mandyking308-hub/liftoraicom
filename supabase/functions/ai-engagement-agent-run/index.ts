import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { beginGatewayLog, endGatewayLog } from "../_shared/aiGateway.ts";

const CONFIRMATION_PHRASE = "RUN AI ENGAGEMENT AGENT";
const SOURCE_FUNCTION = "ai-engagement-agent-run";

const INTENT_LABELS = [
  "interested", "send_more", "pricing_question", "partnership_opportunity",
  "creator_opportunity", "playlist_opportunity", "press_media_opportunity",
  "licensing_opportunity", "not_relevant", "wrong_person", "unsubscribe",
  "complaint", "support_question", "high_value_founder_review", "unknown",
];

const HIGH_VALUE_INTENTS = new Set([
  "interested", "pricing_question", "partnership_opportunity", "creator_opportunity",
  "playlist_opportunity", "press_media_opportunity", "licensing_opportunity",
  "high_value_founder_review",
]);
const NEGATIVE_INTENTS = new Set(["unsubscribe", "complaint", "wrong_person", "not_relevant"]);

function heuristicIntent(text: string) {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return { intent: "unknown", confidence: 0.2, rationale: "empty" };
  if (/\bunsubscribe|opt[- ]?out|remove me|stop emailing\b/.test(t)) return { intent: "unsubscribe", confidence: 0.9, rationale: "unsubscribe phrase" };
  if (/\bwrong person|not me|no longer\b/.test(t)) return { intent: "wrong_person", confidence: 0.8, rationale: "wrong person" };
  if (/\bcomplain|spam|harass\b/.test(t)) return { intent: "complaint", confidence: 0.8, rationale: "complaint" };
  if (/\bnot interested|no thanks|not relevant\b/.test(t)) return { intent: "not_relevant", confidence: 0.8, rationale: "not interested" };
  if (/\bprice|pricing|cost|how much|quote|budget\b/.test(t)) return { intent: "pricing_question", confidence: 0.75, rationale: "pricing keywords" };
  if (/\bpartner|partnership|collab\b/.test(t)) return { intent: "partnership_opportunity", confidence: 0.7, rationale: "partnership" };
  if (/\bplaylist\b/.test(t)) return { intent: "playlist_opportunity", confidence: 0.7, rationale: "playlist" };
  if (/\blicen[sc]e|licensing|sync\b/.test(t)) return { intent: "licensing_opportunity", confidence: 0.7, rationale: "licensing" };
  if (/\bpress|media|interview|feature\b/.test(t)) return { intent: "press_media_opportunity", confidence: 0.65, rationale: "press" };
  if (/\bcreator|artist|musician|producer\b/.test(t)) return { intent: "creator_opportunity", confidence: 0.6, rationale: "creator" };
  if (/\binterested|tell me more|more info|sounds good|let'?s talk\b/.test(t)) return { intent: "interested", confidence: 0.75, rationale: "interest" };
  if (/\bsend (me )?more|more details|deck|case study\b/.test(t)) return { intent: "send_more", confidence: 0.7, rationale: "send more" };
  if (/\bhelp|issue|problem|broken|error\b/.test(t)) return { intent: "support_question", confidence: 0.6, rationale: "support" };
  return { intent: "unknown", confidence: 0.3, rationale: "no signal" };
}

async function aiClassifyIntent(input: { subject?: string | null; body?: string | null; contact_name?: string | null }) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  const fallbackText = `${input.subject ?? ""}\n${input.body ?? ""}`;
  if (!apiKey) {
    const h = heuristicIntent(fallbackText);
    return { ...h, draft_subject: input.subject ? `Re: ${input.subject}` : "Quick reply", draft_body: "" } as any;
  }
  try {
    const __gwInput = {
      action_type: "ai_engagement_intent_classify",
      task_category: "engagement_classifier",
      model: "google/gemini-3-flash-preview",
      fallback_model: "google/gemini-2.5-flash",
      risk_level: "high" as const,
      request_type: "engagement_draft",
      messages: [],
      metadata: { contact_name: input.contact_name ?? null },
    };
    const __log = await beginGatewayLog(__gwInput);
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are Liftor's engagement intent classifier and draft author. Tone: warm, confident, concise, non-needy, brand-appropriate. No over-explaining AI. Never grant full video access unless contact explicitly qualifies. Return only the tool call." },
          { role: "user", content: `Classify and draft a brief reply.\n\nFROM: ${input.contact_name ?? "unknown"}\nSUBJECT: ${input.subject ?? ""}\nBODY:\n${(input.body ?? "").slice(0, 4000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_and_draft",
            description: "Classify intent and draft a brief reply.",
            parameters: {
              type: "object",
              properties: {
                intent: { type: "string", enum: INTENT_LABELS },
                confidence: { type: "number" },
                rationale: { type: "string" },
                draft_subject: { type: "string" },
                draft_body: { type: "string" },
                risk_flags: { type: "array", items: { type: "string" } },
              },
              required: ["intent", "confidence", "rationale", "draft_subject", "draft_body"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_and_draft" } },
      }),
    });
    if (!resp.ok) {
      await endGatewayLog({ ...__log, input: __gwInput }, { ok: false, error: `gateway_${resp.status}` });
      const h = heuristicIntent(fallbackText);
      return { ...h, draft_subject: input.subject ? `Re: ${input.subject}` : "", draft_body: "" } as any;
    }
    const data = await resp.json();
    await endGatewayLog({ ...__log, input: __gwInput }, {
      ok: true,
      prompt_tokens: data?.usage?.prompt_tokens ?? 0,
      completion_tokens: data?.usage?.completion_tokens ?? 0,
    });
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;
    if (parsed?.intent && INTENT_LABELS.includes(parsed.intent)) return parsed;
    const h = heuristicIntent(fallbackText);
    return { ...h, draft_subject: input.subject ? `Re: ${input.subject}` : "", draft_body: "" } as any;
  } catch {
    const h = heuristicIntent(fallbackText);
    return { ...h, draft_subject: input.subject ? `Re: ${input.subject}` : "", draft_body: "" } as any;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claimsData.claims.sub as string;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({}));
    const businessId: string | null = body?.business_id ?? null;
    const dryRun: boolean = body?.dry_run !== false;
    const maxItems: number = Math.min(50, Math.max(1, Number(body?.max_items ?? 10)));
    const phrase: string = String(body?.confirmation_phrase ?? "");

    const settingKeys = [
      "agent_task_creation_enabled",
      "ai_draft_creation_enabled",
      "founder_approval_item_creation_enabled",
      "crm_next_action_creation_enabled",
    ];
    const settingsMap: Record<string, boolean> = {};
    for (const k of settingKeys) {
      const { data } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: k });
      settingsMap[k] = data === true;
    }

    const audit = async (status: string, blockedReason: string | null, targetTable: string | null, targetId: string | null, metadata: any = {}) => {
      await admin.from("agent_action_audit_log").insert({
        business_id: businessId, agent_key: "ai_engagement_agent",
        action_type: "ai_engagement_run", source_function: SOURCE_FUNCTION,
        target_table: targetTable, target_id: targetId,
        founder_user_id: userId, confirmation_phrase: phrase,
        dry_run: dryRun, action_status: status, blocked_reason: blockedReason, metadata,
      });
    };

    if (!dryRun && phrase !== CONFIRMATION_PHRASE) {
      await audit("blocked", "missing_confirmation_phrase", null, null, {});
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "missing_confirmation_phrase",
        required_phrase: CONFIRMATION_PHRASE,
        candidates_found: 0, tasks_created: 0, drafts_created: 0, approvals_created: 0,
        next_actions_created: 0, emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let q = admin.from("crm_interaction_ledger")
      .select("id,business_id,contact_id,conversation_id,subject,body_preview,summary,direction,interaction_type,source_system,contact_email,contact_name,occurred_at,processing_status,ai_relevant")
      .eq("ai_relevant", true)
      .in("processing_status", ["captured", "pending_review"])
      .order("occurred_at", { ascending: false })
      .limit(maxItems);
    if (businessId) q = q.eq("business_id", businessId);
    const { data: interactions, error: intErr } = await q;
    if (intErr) {
      await audit("error", intErr.message, null, null, {});
      return new Response(JSON.stringify({ ok: false, error: intErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const candidates = interactions ?? [];
    // Preload per-business knowledge brain (no external calls)
    const uniqueBizIds = Array.from(new Set(candidates.map((c: any) => c.business_id).filter(Boolean)));
    const knowledgeByBiz = new Map<string, any>();
    if (uniqueBizIds.length) {
      const { data: kprofs } = await admin.from("business_knowledge_profiles").select("*").in("business_id", uniqueBizIds);
      for (const p of (kprofs ?? [])) knowledgeByBiz.set((p as any).business_id, p);
    }
    const knowledgeCtx = (bizId: string | null) => {
      const p = bizId ? knowledgeByBiz.get(bizId) : null;
      if (!p) return null;
      return {
        approved_tone: p.approved_tone,
        offer_summary: p.offer_summary,
        target_customer: p.target_customer,
        forbidden_claims: p.forbidden_claims ?? [],
        required_disclaimers: p.required_disclaimers ?? [],
        outreach_rules: p.outreach_rules ?? {},
      };
    };
    const result: any = {
      ok: true, blocked: false, dry_run: dryRun,
      candidates_found: candidates.length,
      candidates_preview: candidates.slice(0, 10).map((c: any) => ({ id: c.id, subject: c.subject, contact_email: c.contact_email, occurred_at: c.occurred_at })),
      classifications: [], tasks_created: 0, drafts_created: 0, approvals_created: 0, next_actions_created: 0,
      settings: settingsMap, emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      business_knowledge_loaded: knowledgeByBiz.size,
    };

    for (const c of candidates as any[]) {
      const cls: any = await aiClassifyIntent({ subject: c.subject, body: c.body_preview ?? c.summary, contact_name: c.contact_name });
      result.classifications.push({ interaction_id: c.id, intent: cls.intent, confidence: cls.confidence });
      if (dryRun) continue;

      if (settingsMap.agent_task_creation_enabled) {
        const { data: t } = await admin.from("ai_agent_task_queue").insert({
          business_id: c.business_id, agent_key: "ai_engagement_agent",
          task_type: "engagement_review",
          task_title: `Engagement: ${cls.intent} — ${c.contact_email ?? c.contact_name ?? "contact"}`.slice(0, 500),
          task_summary: String(cls.rationale ?? "").slice(0, 1000),
          source_system: "crm_interaction_ledger", source_table: "crm_interaction_ledger",
          source_id: c.id, contact_id: c.contact_id, conversation_id: c.conversation_id,
          priority_level: HIGH_VALUE_INTENTS.has(cls.intent) || NEGATIVE_INTENTS.has(cls.intent) ? "high" : "normal",
          status: "queued", founder_approval_required: true,
          auto_execute_allowed: false, execution_enabled: false, dry_run_only: true,
          recommended_action: cls.intent, agent_output: { classification: cls, business_knowledge: knowledgeCtx(c.business_id) },
        }).select("id").maybeSingle();
        if (t?.id) { result.tasks_created++; await audit("applied", null, "ai_agent_task_queue", t.id, { intent: cls.intent }); }
      }

      const shouldDraft = settingsMap.ai_draft_creation_enabled && !NEGATIVE_INTENTS.has(cls.intent) && cls.intent !== "unsubscribe";
      if (shouldDraft && (cls.draft_body || cls.draft_subject)) {
        const k = knowledgeCtx(c.business_id);
        const complianceFlags: string[] = [];
        if (k?.forbidden_claims?.length) complianceFlags.push("business_forbidden_claims_loaded");
        if (k?.required_disclaimers?.length) complianceFlags.push("business_required_disclaimers_loaded");
        const { data: d } = await admin.from("ai_conversation_draft_reviews").insert({
          business_id: c.business_id, contact_id: c.contact_id, conversation_id: c.conversation_id, interaction_id: c.id,
          detected_intent: cls.intent, intent_confidence: cls.confidence,
          context_summary: c.summary ?? c.body_preview ?? null,
          customer_summary: c.contact_name ?? c.contact_email ?? null,
          recommended_reply_strategy: cls.rationale,
          draft_subject: cls.draft_subject ?? (c.subject ? `Re: ${c.subject}` : null),
          draft_body: cls.draft_body ?? "",
          tone_profile: k?.approved_tone || "warm_confident_concise",
          risk_flags: cls.risk_flags ?? [], compliance_flags: complianceFlags,
          founder_review_required: true, send_allowed: false, approval_status: "draft",
          metadata: { classifier: cls, business_knowledge: k },
        }).select("id").maybeSingle();
        if (d?.id) { result.drafts_created++; await audit("applied", null, "ai_conversation_draft_reviews", d.id, { intent: cls.intent }); }
      }

      const needsApproval = settingsMap.founder_approval_item_creation_enabled && (HIGH_VALUE_INTENTS.has(cls.intent) || NEGATIVE_INTENTS.has(cls.intent) || cls.intent === "unsubscribe");
      if (needsApproval) {
        const approvalType = cls.intent === "unsubscribe" ? "suppression_recommended"
          : NEGATIVE_INTENTS.has(cls.intent) ? "negative_response_review"
          : "high_value_opportunity";
        const { data: a } = await admin.from("founder_approval_items").insert({
          business_id: c.business_id, approval_type: approvalType,
          source_system: "crm_interaction_ledger", source_table: "crm_interaction_ledger", source_id: c.id,
          agent_key: "ai_engagement_agent", contact_id: c.contact_id, conversation_id: c.conversation_id,
          title: `${cls.intent} — ${c.contact_email ?? c.contact_name ?? "contact"}`.slice(0, 500),
          summary: cls.rationale, recommended_action: cls.intent === "unsubscribe" ? "Add to suppression list" : "Review and approve reply",
          draft_subject: cls.draft_subject ?? null, draft_body: cls.draft_body ?? null,
          priority_level: HIGH_VALUE_INTENTS.has(cls.intent) ? "high" : "normal",
          risk_flags: cls.risk_flags ?? [], status: "pending",
          execution_enabled: false, auto_execute_allowed: false, send_allowed: false,
        }).select("id").maybeSingle();
        if (a?.id) { result.approvals_created++; await audit("applied", null, "founder_approval_items", a.id, { intent: cls.intent }); }
      }

      if (settingsMap.crm_next_action_creation_enabled) {
        const { data: r } = await admin.from("crm_founder_review_queue").insert({
          business_id: c.business_id, contact_id: c.contact_id, interaction_id: c.id, conversation_id: c.conversation_id,
          review_type: "engagement_next_action",
          priority_level: HIGH_VALUE_INTENTS.has(cls.intent) ? "high" : "normal",
          recommended_action: cls.intent, summary: cls.rationale,
          risk_flags: cls.risk_flags ?? [], status: "pending",
          metadata: { source: "ai_engagement_agent", confidence: cls.confidence },
        }).select("id").maybeSingle();
        if (r?.id) { result.next_actions_created++; await audit("applied", null, "crm_founder_review_queue", r.id, { intent: cls.intent }); }
      }

      await admin.from("crm_interaction_ledger").update({ processing_status: "ai_classified" }).eq("id", c.id);
    }

    if (dryRun) await audit("preview", "dry_run", null, null, { candidates: candidates.length });
    else await audit("applied", null, null, null, { candidates: candidates.length, tasks: result.tasks_created, drafts: result.drafts_created, approvals: result.approvals_created, next_actions: result.next_actions_created });

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
