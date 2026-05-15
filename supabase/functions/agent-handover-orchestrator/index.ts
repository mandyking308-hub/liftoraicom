import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CONFIRM_PHRASE = "RUN AGENT HANDOVER ORCHESTRATOR";
const IDEMPOTENCY_WINDOW_HOURS = 24;

async function safeSelect(admin: any, table: string, builder: (q: any) => any) {
  try { const { data } = await builder(admin.from(table)); return data || []; } catch { return []; }
}

function inferOwnerAgent(ctx: any): { owner: string; stage: string; trigger: string; priority: string; from: string } {
  if (ctx.compliance_flag) return { owner: "compliance_agent", stage: "compliance_review", trigger: "compliance_flag_detected", priority: "high", from: "ai_engagement_agent" };
  if (ctx.payment_issue) return { owner: "founder_co_pilot", stage: "finance_supplier", trigger: "payment_issue", priority: "high", from: "finance_agent" };
  if (ctx.high_value) return { owner: "founder_co_pilot", stage: "deal_ready", trigger: "high_value_handover", priority: "high", from: "ai_engagement_agent" };
  if (ctx.invoice_open) return { owner: "finance_agent", stage: "finance_supplier", trigger: "commercial_deal_ready", priority: "normal", from: "commercial_agent" };
  if (ctx.delivery_needed) return { owner: "supplier_agent", stage: "finance_supplier", trigger: "deal_delivery_needed", priority: "normal", from: "commercial_agent" };
  if (ctx.deal_open) return { owner: "commercial_agent", stage: "deal_ready", trigger: "proposal_ready", priority: "normal", from: "proposal_agent" };
  if (ctx.proposal_active) return { owner: "proposal_agent", stage: "proposal_ready", trigger: "engagement_interested", priority: "normal", from: "ai_engagement_agent" };
  if (ctx.draft_pending) return { owner: "ai_engagement_agent", stage: "ai_draft_ready", trigger: "inbox_reply", priority: "normal", from: "inbox_agent" };
  if (ctx.inbound_reply) return { owner: "inbox_agent", stage: "new_reply", trigger: "outreach_reply", priority: "normal", from: "outreach_agent" };
  return { owner: "outreach_agent", stage: "waiting_on_customer", trigger: "no_op", priority: "low", from: "outreach_agent" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const auth = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const allowed = (roles || []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!allowed) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const dry_run = body?.dry_run !== false; // default true
    const max_items = Math.max(1, Math.min(200, Number(body?.max_items ?? 25)));
    const business_id: string | undefined = body?.business_id;
    const confirmation: string = body?.confirmation_phrase ?? "";

    if (!dry_run && confirmation.trim() !== CONFIRM_PHRASE) {
      return new Response(JSON.stringify({ error: "confirmation_required", expected: CONFIRM_PHRASE }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Pull live signal sources
    let convQ = (q: any) => q.select("id,contact_id,business_id,status,updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(max_items * 4);
    if (business_id) { const bid = business_id; convQ = (q: any) => q.select("id,contact_id,business_id,status,updated_at").eq("status", "active").eq("business_id", bid).order("updated_at", { ascending: false }).limit(max_items * 4); }
    const conversations = await safeSelect(admin, "conversations", convQ);
    const contactIds = Array.from(new Set(conversations.map((c: any) => c.contact_id).filter(Boolean)));
    const contacts = contactIds.length ? await safeSelect(admin, "contacts", (q: any) => q.select("id,email,name,assigned_business,intent_score,last_replied_at,founder_review_requested_at,is_globally_suppressed,hard_bounced").in("id", contactIds)) : [];
    const cMap = new Map(contacts.map((c: any) => [c.id, c]));
    const drafts = await safeSelect(admin, "ai_drafts", (q: any) => q.select("id,contact_id,status").eq("status", "pending_review").limit(500));
    const draftMap = new Map(drafts.map((d: any) => [d.contact_id, d]));
    const proposals = await safeSelect(admin, "internal_proposals", (q: any) => q.select("id,contact_id,deal_id,status").in("status", ["draft", "review", "sent"]).limit(500));
    const propMap = new Map(proposals.map((p: any) => [p.contact_id, p]));
    const deals = await safeSelect(admin, "deals", (q: any) => q.select("id,contact_id,status,value").not("status", "in", "(won,lost)").limit(500));
    const dealMap = new Map(deals.map((d: any) => [d.contact_id, d]));
    const invoices = await safeSelect(admin, "invoices", (q: any) => q.select("id,contact_id,status").not("status", "in", "(paid,void)").limit(500));
    const invMap = new Map(invoices.map((i: any) => [i.contact_id, i]));

    // Recent handovers (idempotency)
    const sinceIso = new Date(Date.now() - IDEMPOTENCY_WINDOW_HOURS * 3600 * 1000).toISOString();
    const recent = await safeSelect(admin, "agent_handover_log", (q: any) => q.select("id,contact_id,conversation_id,from_agent_key,to_agent_key,trigger_event,created_at").gte("created_at", sinceIso).limit(2000));
    const seen = new Set(recent.map((r: any) => `${r.contact_id}|${r.conversation_id}|${r.from_agent_key}|${r.to_agent_key}|${r.trigger_event}`));

    const proposed: any[] = [];
    const created: any[] = [];
    const skipped: any[] = [];

    for (const conv of conversations) {
      if (proposed.length >= max_items) break;
      const contact = cMap.get(conv.contact_id);
      if (!contact) continue;
      const inv = invMap.get(contact.id);
      const deal = dealMap.get(contact.id);
      const prop = propMap.get(contact.id);
      const draft = draftMap.get(contact.id);
      const ctx = {
        compliance_flag: !!contact.founder_review_requested_at || !!contact.is_globally_suppressed || !!contact.hard_bounced,
        payment_issue: inv && /(overdue|failed|disputed)/i.test(inv.status || ""),
        invoice_open: !!inv,
        delivery_needed: !!deal && /(delivery|fulfil)/i.test(deal.status || ""),
        deal_open: !!deal,
        proposal_active: !!prop && prop.status !== "sent",
        high_value: !!deal && Number(deal.value || 0) >= 5000,
        draft_pending: !!draft,
        inbound_reply: !!contact.last_replied_at,
      };
      const decision = inferOwnerAgent(ctx);
      if (decision.trigger === "no_op") continue;

      const dedupKey = `${contact.id}|${conv.id}|${decision.from}|${decision.owner}|${decision.trigger}`;
      if (seen.has(dedupKey)) { skipped.push({ contact_id: contact.id, reason: "duplicate_within_window", dedupKey }); continue; }

      const summary = `${decision.from} → ${decision.owner} (${decision.trigger}) for ${contact.email ?? contact.id?.slice(0, 8)}`;
      const founder_review_required =
        decision.owner === "founder_co_pilot" ||
        decision.owner === "compliance_agent" ||
        ctx.high_value;

      const item = {
        business_id: conv.business_id ?? contact.assigned_business ?? null,
        contact_id: contact.id,
        conversation_id: conv.id,
        from_agent_key: decision.from,
        to_agent_key: decision.owner,
        trigger_event: decision.trigger,
        from_customer_stage: null as string | null,
        to_customer_stage: decision.stage,
        source_table: "conversations",
        source_id: conv.id,
        summary,
        context_payload: { ctx, contact_email: contact.email },
        priority_level: decision.priority,
        status: "created",
        founder_review_required,
        rule_key: null as string | null,
      };
      proposed.push(item);
    }

    let summary = { proposed: proposed.length, created: 0, stewardships_upserted: 0, tasks_created: 0, approvals_created: 0, skipped: skipped.length };

    if (!dry_run) {
      for (const p of proposed) {
        try {
          const { data: handover, error: hErr } = await admin.from("agent_handover_log").insert(p).select("id").single();
          if (hErr || !handover) continue;
          summary.created++;

          // Update / create stewardship
          try {
            await admin.from("customer_stewardship_assignments").update({ stewardship_status: "superseded" })
              .eq("contact_id", p.contact_id).eq("stewardship_status", "active");
            await admin.from("customer_stewardship_assignments").insert({
              business_id: p.business_id,
              contact_id: p.contact_id,
              conversation_id: p.conversation_id,
              current_owner_agent_key: p.to_agent_key,
              previous_owner_agent_key: p.from_agent_key,
              stewardship_status: "active",
              customer_stage: p.to_customer_stage,
              detected_intent: null,
              current_priority: p.priority_level,
              next_best_action: `Owner ${p.to_agent_key} to act on ${p.trigger_event}`,
              founder_review_required: p.founder_review_required,
              last_agent_handover_id: handover.id,
              last_interaction_at: new Date().toISOString(),
              risk_flags: p.to_agent_key === "compliance_agent" ? ["compliance"] : [],
              handover_summary: p.summary,
            });
            summary.stewardships_upserted++;
          } catch { /* no-op */ }

          // Create internal task (no external action)
          try {
            const { data: task } = await admin.from("ai_agent_task_queue").insert({
              business_id: p.business_id,
              agent_key: p.to_agent_key,
              task_type: "handover_followup",
              task_title: `Handover: ${p.from_agent_key} → ${p.to_agent_key}`,
              task_summary: p.summary,
              source_system: "agent_handover_orchestrator",
              source_table: "agent_handover_log",
              source_id: handover.id,
              contact_id: p.contact_id,
              conversation_id: p.conversation_id,
              priority_level: p.priority_level,
              status: "pending",
              founder_approval_required: p.founder_review_required,
              auto_execute_allowed: false,
              execution_enabled: false,
              dry_run_only: true,
              recommended_action: "Internal review only — no external send.",
            }).select("id").single();
            if (task?.id) {
              summary.tasks_created++;
              await admin.from("agent_handover_log").update({ task_id: task.id, status: "open" }).eq("id", handover.id);
            }
          } catch { /* no-op */ }

          // Founder approval for high-risk
          if (p.founder_review_required) {
            try {
              await admin.from("founder_approval_items").insert({
                approval_kind: "agent_handover",
                title: `Approve handover ${p.from_agent_key} → ${p.to_agent_key}`,
                summary: p.summary,
                payload: { handover_id: handover.id, ...p },
                priority: p.priority_level,
                status: "pending",
                external_action: false,
              });
              summary.approvals_created++;
            } catch { /* table shape may differ — best-effort */ }
          }
        } catch { /* no-op */ }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      dry_run,
      generated_at: new Date().toISOString(),
      confirmation_phrase_required: CONFIRM_PHRASE,
      summary,
      proposed: dry_run ? proposed : proposed.slice(0, 50),
      skipped,
      no_external_action: true,
      no_send_audit: { emails_sent: 0, smartlead_posts: 0, apollo_credits_spent: 0, providers_called: 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});