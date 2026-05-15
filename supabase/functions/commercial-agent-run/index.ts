import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Commercial Agent — internal handoff review creation only.
// Inspects qualified/approved opportunities and proposes proposal_ready /
// demo_ready / deal_ready / founder_review handoff rows + founder approval items.
// NEVER creates deals/invoices. NEVER sends. NEVER calls Apollo / Smartlead.

const CONFIRMATION_PHRASE = "RUN COMMERCIAL AGENT";
const SETTING_KEY = "commercial_agent_run_enabled";
const SOURCE_FUNCTION = "commercial-agent-run";

async function authPriv(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
  const { data, error } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
  if (error || !data?.claims) {
    return { error: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const userId = data.claims.sub as string;
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
    return { error: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }) };
  }
  return { admin, userId };
}

async function logAudit(admin: any, userId: string, status: string, blocked: string | null, dryRun: boolean, phrase: string, targetId: string | null, metadata: any = {}) {
  await admin.from("agent_action_audit_log").insert({
    agent_key: "commercial_agent",
    action_type: SETTING_KEY,
    source_function: SOURCE_FUNCTION,
    target_table: "commercial_handoff_reviews",
    target_id: targetId,
    founder_user_id: userId,
    confirmation_phrase: phrase,
    dry_run: dryRun,
    action_status: status,
    blocked_reason: blocked,
    external_provider_called: false,
    email_sent: false,
    apollo_called: false,
    smartlead_post_called: false,
    metadata,
  });
}

const safe = async (q: any, fb: any = []) => { try { const { data } = await q; return data ?? fb; } catch { return fb; } };

type HandoffType = "proposal_ready" | "demo_ready" | "deal_ready" | "founder_review";

function classify(intent: string | null, hasDraft: boolean): { type: HandoffType; offer: string; next: string; min: number; max: number } {
  switch ((intent ?? "").toLowerCase()) {
    case "interested":
    case "interested_warm":
    case "meeting_request": return { type: "demo_ready", offer: "Tailored Liftor systems demo (30 min).", next: "Founder schedules demo, captures scope.", min: 3000, max: 15000 };
    case "pricing_inquiry":
    case "pricing_question": return { type: "proposal_ready", offer: "Tailored proposal scoped to inquiry.", next: "Run proposal agent to draft.", min: 5000, max: 25000 };
    case "ready_to_buy":
    case "wants_contract": return { type: "deal_ready", offer: "Move to deal stage with founder.", next: "Founder reviews and prepares deal record.", min: 8000, max: 40000 };
    case "complaint_or_legal":
    case "unsubscribe": return { type: "founder_review", offer: "Compliance-sensitive — hold for founder.", next: "Founder responds personally.", min: 0, max: 0 };
    default: return { type: hasDraft ? "proposal_ready" : "founder_review", offer: hasDraft ? "Draft reply approved — propose tailored offer." : "Insufficient signal — founder review.", next: "Founder reviews context.", min: hasDraft ? 3000 : 0, max: hasDraft ? 15000 : 0 };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authPriv(req);
    if ("error" in auth) return auth.error;
    const { admin, userId } = auth;

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run !== false;
    const phrase = String(body?.confirmation_phrase ?? "");
    const maxItems = Math.min(Math.max(Number(body?.max_items ?? 15), 1), 30);

    // Sources: approved AI drafts, approved approval items, qualified conversations
    const drafts = (await safe(
      admin.from("ai_conversation_draft_reviews")
        .select("id, contact_id, conversation_id, detected_intent, intent_confidence, approval_status, created_at, business_id")
        .in("approval_status", ["approved", "draft"])
        .order("created_at", { ascending: false })
        .limit(maxItems),
      []
    )) as any[];

    const approvedApprovals = (await safe(
      admin.from("founder_approval_items")
        .select("id, contact_id, conversation_id, approval_type, business_id")
        .eq("status", "approved")
        .order("decided_at", { ascending: false })
        .limit(maxItems),
      []
    )) as any[];

    const conversations = (await safe(
      admin.from("conversations")
        .select("id, contact_id, business_name, status, last_message_at")
        .order("last_message_at", { ascending: false })
        .limit(50),
      []
    )) as any[];
    const convoById = new Map(conversations.map((c) => [c.id, c]));

    const existingHandoffs = (await safe(
      admin.from("commercial_handoff_reviews").select("contact_id, conversation_id, handoff_type"),
      []
    )) as any[];
    const handoffSeen = new Set(existingHandoffs.map((h) => `${h.contact_id ?? "_"}:${h.conversation_id ?? "_"}:${h.handoff_type}`));

    const candidates: any[] = [];
    const seen = new Set<string>();

    for (const d of drafts) {
      const k = `d:${d.contact_id ?? d.conversation_id ?? d.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const cls = classify(d.detected_intent, d.approval_status === "approved");
      const dupeKey = `${d.contact_id ?? "_"}:${d.conversation_id ?? "_"}:${cls.type}`;
      if (handoffSeen.has(dupeKey)) continue;
      const convo = d.conversation_id ? convoById.get(d.conversation_id) : null;
      candidates.push({
        contact_id: d.contact_id ?? null,
        conversation_id: d.conversation_id ?? null,
        business_id: d.business_id ?? null,
        business_name: convo?.business_name ?? null,
        handoff_type: cls.type,
        qualification_summary: `Intent=${d.detected_intent ?? "unknown"} · approval=${d.approval_status} · conf=${Math.round((d.intent_confidence ?? 0) * 100)}%`,
        detected_need: d.detected_intent ?? null,
        proposed_offer: cls.offer,
        proposed_next_step: cls.next,
        estimated_value_min: cls.min,
        estimated_value_max: cls.max,
        source: "ai_conversation_draft_reviews",
        source_id: d.id,
        blockers: d.approval_status === "approved" ? [] : ["awaiting_founder_decision"],
      });
    }

    for (const a of approvedApprovals) {
      const k = `a:${a.contact_id ?? a.conversation_id ?? a.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const cls = classify(null, true);
      const dupeKey = `${a.contact_id ?? "_"}:${a.conversation_id ?? "_"}:${cls.type}`;
      if (handoffSeen.has(dupeKey)) continue;
      candidates.push({
        contact_id: a.contact_id ?? null,
        conversation_id: a.conversation_id ?? null,
        business_id: a.business_id ?? null,
        business_name: null,
        handoff_type: cls.type,
        qualification_summary: `Founder-approved: ${a.approval_type}`,
        detected_need: a.approval_type,
        proposed_offer: cls.offer,
        proposed_next_step: cls.next,
        estimated_value_min: cls.min,
        estimated_value_max: cls.max,
        source: "founder_approval_items",
        source_id: a.id,
        blockers: [],
      });
    }

    for (const c of conversations) {
      const status = (c.status ?? "").toLowerCase();
      if (!["qualified", "engaged", "warm", "hot", "in_progress"].includes(status)) continue;
      const cls = classify("interested_warm", false);
      const dupeKey = `${c.contact_id ?? "_"}:${c.id}:${cls.type}`;
      if (handoffSeen.has(dupeKey)) continue;
      const k = `c:${c.contact_id ?? c.id}`;
      if (seen.has(k)) continue;
      seen.add(k);
      candidates.push({
        contact_id: c.contact_id ?? null,
        conversation_id: c.id,
        business_id: null,
        business_name: c.business_name ?? null,
        handoff_type: cls.type,
        qualification_summary: `Conversation status=${status}`,
        detected_need: "interested_warm",
        proposed_offer: cls.offer,
        proposed_next_step: cls.next,
        estimated_value_min: cls.min,
        estimated_value_max: cls.max,
        source: "conversations",
        source_id: c.id,
        blockers: c.contact_id ? [] : ["no_contact_link"],
      });
    }

    const summary = {
      total_candidates: candidates.length,
      by_type: candidates.reduce((acc: Record<string, number>, c) => { acc[c.handoff_type] = (acc[c.handoff_type] ?? 0) + 1; return acc; }, {}),
      pipeline_value_estimate: candidates.reduce((acc, c) => ({ min: acc.min + (c.estimated_value_min ?? 0), max: acc.max + (c.estimated_value_max ?? 0) }), { min: 0, max: 0 }),
    };

    const { data: enabledRaw } = await admin.rpc("is_agent_live_setting_enabled", { _setting_key: SETTING_KEY });
    const enabled = enabledRaw === true;

    if (!enabled) {
      await logAudit(admin, userId, "blocked", "setting_disabled", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "setting_disabled", setting_key: SETTING_KEY, ...summary, handoffs_created: 0, approvals_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (phrase !== CONFIRMATION_PHRASE) {
      await logAudit(admin, userId, "blocked", "missing_confirmation_phrase", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "missing_confirmation_phrase", required_phrase: CONFIRMATION_PHRASE, ...summary, handoffs_created: 0, approvals_created: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (dryRun) {
      await logAudit(admin, userId, "preview", "dry_run", dryRun, phrase, null, { summary });
      return new Response(JSON.stringify({ ok: true, blocked: true, reason: "dry_run_only", ...summary, handoffs_created: 0, approvals_created: 0, candidates: candidates.slice(0, 30) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let handoffsCreated = 0;
    let approvalsCreated = 0;
    const createdIds: string[] = [];

    for (const c of candidates.slice(0, maxItems)) {
      // Pull business knowledge brain (no external calls)
      let businessKnowledge: any = null;
      if (c.business_id) {
        const { data: kp } = await admin.from("business_knowledge_profiles").select("approved_tone,offer_summary,target_customer,forbidden_claims,required_disclaimers,proposal_rules,outreach_rules").eq("business_id", c.business_id).maybeSingle();
        if (kp) businessKnowledge = kp;
      }
      const { data: chr, error: chrErr } = await admin.from("commercial_handoff_reviews").insert({
        business_id: c.business_id,
        contact_id: c.contact_id,
        conversation_id: c.conversation_id,
        handoff_type: c.handoff_type,
        qualification_summary: c.qualification_summary,
        detected_need: c.detected_need,
        proposed_offer: c.proposed_offer,
        proposed_next_step: c.proposed_next_step,
        estimated_value_min: c.estimated_value_min,
        estimated_value_max: c.estimated_value_max,
        proposal_allowed: false,
        demo_allowed: false,
        deal_allowed: false,
        founder_review_required: true,
        apply_status: "pending_founder_review",
        blockers: c.blockers,
        metadata: { source: SOURCE_FUNCTION, source_table: c.source, source_id: c.source_id, business_knowledge: businessKnowledge },
      }).select("id").maybeSingle();
      if (chrErr) {
        await logAudit(admin, userId, "error", chrErr.message, false, phrase, null, { source: c.source, source_id: c.source_id });
        continue;
      }
      handoffsCreated++;
      createdIds.push(chr!.id);
      await logAudit(admin, userId, "applied", null, false, phrase, chr!.id, { kind: "commercial_handoff_review", handoff_type: c.handoff_type });

      const { data: fai } = await admin.from("founder_approval_items").insert({
        business_id: c.business_id,
        approval_type: `commercial_${c.handoff_type}`,
        source_system: "commercial-agent",
        source_table: "commercial_handoff_reviews",
        source_id: chr!.id,
        agent_key: "commercial_agent",
        contact_id: c.contact_id,
        conversation_id: c.conversation_id,
        title: `${c.handoff_type.replaceAll("_", " ")} · ${c.business_name ?? c.detected_need ?? "candidate"}`.slice(0, 500),
        summary: c.qualification_summary,
        recommended_action: c.proposed_next_step,
        priority_level: c.handoff_type === "deal_ready" ? "high" : "normal",
        risk_flags: [],
        compliance_flags: c.handoff_type === "founder_review" ? ["compliance_hold"] : [],
        status: "pending",
        execution_enabled: false,
        auto_execute_allowed: false,
        send_allowed: false,
        metadata: { handoff_review_id: chr!.id, source_function: SOURCE_FUNCTION, business_knowledge: businessKnowledge },
      }).select("id").maybeSingle();
      if (fai) {
        approvalsCreated++;
        await logAudit(admin, userId, "applied", null, false, phrase, fai.id, { kind: "founder_approval_item_commercial" });
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      blocked: false,
      ...summary,
      handoffs_created: handoffsCreated,
      approvals_created: approvalsCreated,
      created_handoff_ids: createdIds,
      proposals_sent: 0,
      deals_created: 0,
      invoices_created: 0,
      emails_sent: 0,
      provider_calls: 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
