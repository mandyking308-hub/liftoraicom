import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function inferOwnerAgent(ctx: { has_proposal: boolean; has_deal: boolean; has_invoice: boolean; has_supplier_need: boolean; has_compliance_flag: boolean; has_draft: boolean; has_reply: boolean; high_value: boolean; }): string {
  if (ctx.has_compliance_flag) return "compliance_agent";
  if (ctx.high_value) return "founder_co_pilot";
  if (ctx.has_invoice) return "finance_agent";
  if (ctx.has_supplier_need) return "supplier_agent";
  if (ctx.has_deal) return "commercial_agent";
  if (ctx.has_proposal) return "proposal_agent";
  if (ctx.has_draft) return "ai_engagement_agent";
  if (ctx.has_reply) return "inbox_agent";
  return "outreach_agent";
}

async function safeSelect(admin: any, table: string, builder: (q: any) => any) {
  try { const { data } = await builder(admin.from(table)); return data || []; } catch { return []; }
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
    const persist = body?.persist === true;

    const conversations = await safeSelect(admin, "conversations", (q: any) => q.select("id,contact_id,business_id,status,updated_at").eq("status", "active").order("updated_at", { ascending: false }).limit(200));
    const contactIds = Array.from(new Set(conversations.map((c: any) => c.contact_id).filter(Boolean)));
    const contacts = contactIds.length ? await safeSelect(admin, "contacts", (q: any) => q.select("id,email,name,assigned_business,status,intent_score,last_replied_at,last_contacted_at,founder_review_requested_at").in("id", contactIds)) : [];
    const contactMap = new Map(contacts.map((c: any) => [c.id, c]));

    const drafts = await safeSelect(admin, "ai_drafts", (q: any) => q.select("id,conversation_id,contact_id,status,created_at").eq("status", "pending_review").limit(500));
    const draftByContact = new Map(drafts.map((d: any) => [d.contact_id, d]));

    const proposals = await safeSelect(admin, "internal_proposals", (q: any) => q.select("id,contact_id,deal_id,status,created_at").in("status", ["draft", "review", "sent"]).limit(500));
    const propByContact = new Map(proposals.map((p: any) => [p.contact_id, p]));

    const deals = await safeSelect(admin, "deals", (q: any) => q.select("id,contact_id,status,value").not("status", "in", "(won,lost)").limit(500));
    const dealByContact = new Map(deals.map((d: any) => [d.contact_id, d]));

    const invoices = await safeSelect(admin, "invoices", (q: any) => q.select("id,contact_id,status").not("status", "in", "(paid,void)").limit(500));
    const invByContact = new Map(invoices.map((i: any) => [i.contact_id, i]));

    const handovers = await safeSelect(admin, "agent_handover_log", (q: any) => q.select("id,contact_id,from_agent_key,to_agent_key,status,created_at,task_id").order("created_at", { ascending: false }).limit(500));
    const lastHandover = new Map<string, any>();
    for (const h of handovers) if (h.contact_id && !lastHandover.has(h.contact_id)) lastHandover.set(h.contact_id, h);

    const tasks = await safeSelect(admin, "ai_agent_task_queue", (q: any) => q.select("id,contact_id,agent_key,status,due_at").in("status", ["pending", "queued", "in_progress"]).limit(500));
    const taskByContact = new Map(tasks.map((t: any) => [t.contact_id, t]));

    const journey: Record<string, any[]> = {
      new_reply: [], needs_classification: [], ai_draft_ready: [], founder_approval_needed: [],
      proposal_ready: [], demo_ready: [], deal_ready: [], finance_supplier: [],
      compliance_review: [], waiting_on_customer: [], stuck_overdue: [],
    };

    const stuck_customers: any[] = [];
    const missing_handovers: any[] = [];
    const customers: any[] = [];

    const now = Date.now();
    for (const conv of conversations) {
      const contact = contactMap.get(conv.contact_id);
      if (!contact) continue;
      const draft = draftByContact.get(contact.id);
      const prop = propByContact.get(contact.id);
      const deal = dealByContact.get(contact.id);
      const inv = invByContact.get(contact.id);
      const handover = lastHandover.get(contact.id);
      const task = taskByContact.get(contact.id);
      const lastInteractionAt = contact.last_replied_at || contact.last_contacted_at || conv.updated_at;
      const stale = lastInteractionAt && (now - new Date(lastInteractionAt).getTime() > 7 * 24 * 3600 * 1000);
      const ctx = {
        has_proposal: !!prop && prop.status !== "sent",
        has_deal: !!deal,
        has_invoice: !!inv,
        has_supplier_need: false,
        has_compliance_flag: !!contact.founder_review_requested_at,
        has_draft: !!draft,
        has_reply: !!contact.last_replied_at,
        high_value: !!deal && Number(deal.value || 0) >= 5000,
      };
      const owner = inferOwnerAgent(ctx);
      const previous = handover?.to_agent_key ?? null;

      let bucket = "needs_classification";
      if (ctx.has_compliance_flag) bucket = "compliance_review";
      else if (ctx.has_invoice) bucket = "finance_supplier";
      else if (ctx.has_deal) bucket = "deal_ready";
      else if (ctx.has_proposal) bucket = "proposal_ready";
      else if (draft && draft.status === "pending_review") bucket = "founder_approval_needed";
      else if (draft) bucket = "ai_draft_ready";
      else if (contact.last_replied_at) bucket = "new_reply";
      else if (stale) bucket = "stuck_overdue";
      else bucket = "waiting_on_customer";

      if (stale) stuck_customers.push({ contact_id: contact.id, email: contact.email, last_interaction_at: lastInteractionAt });
      if (handover && handover.to_agent_key && !task) missing_handovers.push({ handover_id: handover.id, contact_id: contact.id, expected_agent: handover.to_agent_key });

      const next_best_action =
        bucket === "founder_approval_needed" ? "Approve or edit AI draft" :
        bucket === "proposal_ready" ? "Review proposal draft" :
        bucket === "deal_ready" ? "Move deal forward" :
        bucket === "finance_supplier" ? "Resolve invoice/supplier" :
        bucket === "compliance_review" ? "Compliance review" :
        bucket === "stuck_overdue" ? "Re-engage or close" :
        bucket === "ai_draft_ready" ? "Generate / refine draft" :
        "Monitor inbox";

      const row = {
        contact_id: contact.id,
        conversation_id: conv.id,
        business_id: conv.business_id ?? contact.assigned_business,
        contact_email: contact.email,
        contact_name: contact.name,
        current_owner_agent_key: owner,
        previous_owner_agent_key: previous,
        customer_stage: bucket,
        detected_intent: contact.intent_score ? (contact.intent_score >= 60 ? "warm" : "cool") : null,
        current_priority: ctx.high_value ? "high" : ctx.has_compliance_flag ? "high" : "normal",
        next_best_action,
        founder_review_required: ctx.has_compliance_flag || bucket === "founder_approval_needed" || ctx.high_value,
        last_agent_handover_id: handover?.id ?? null,
        last_interaction_at: lastInteractionAt,
        risk_flags: ctx.has_compliance_flag ? ["compliance"] : [],
        handover_summary: handover ? `${handover.from_agent_key} → ${handover.to_agent_key}` : null,
      };
      journey[bucket].push(row);
      customers.push(row);
    }

    let persisted = 0;
    if (persist && customers.length) {
      // Upsert by (business_id, contact_id, conversation_id)
      for (const c of customers.slice(0, 200)) {
        try {
          // Simple insert; mark prior active for this contact as superseded
          await admin.from("customer_stewardship_assignments").update({ stewardship_status: "superseded" })
            .eq("contact_id", c.contact_id).eq("stewardship_status", "active");
          await admin.from("customer_stewardship_assignments").insert({ ...c, stewardship_status: "active" });
          persisted++;
        } catch { /* no-op */ }
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      generated_at: new Date().toISOString(),
      counts: {
        active_conversations: conversations.length,
        customers: customers.length,
        stuck_customers: stuck_customers.length,
        missing_handovers: missing_handovers.length,
        persisted,
      },
      journey,
      stuck_customers,
      missing_handovers,
      no_external_action: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "internal" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});