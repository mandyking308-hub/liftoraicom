import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    const userId = claimsData?.claims?.sub as string | undefined;
    if (!userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const persist = body?.persist === true;

    const [biz, profiles, modules, agents, approvals, tasks, drafts, deals, invoices, revenue, props, convs] = await Promise.all([
      admin.from("businesses").select("id,name,created_at"),
      admin.from("business_operating_profiles").select("*"),
      admin.from("business_operating_modules").select("business_id,enabled"),
      admin.from("business_agent_assignments_v2").select("business_id,enabled,can_send_external,can_call_provider_post,can_spend_credits"),
      admin.from("founder_approval_items").select("id,business_id,status,priority_level,approval_type,title,created_at").eq("status", "pending"),
      admin.from("ai_agent_task_queue").select("id,business_id,status").in("status", ["queued", "in_progress", "pending_approval"]),
      admin.from("ai_conversation_draft_reviews").select("id,business_id,approval_status").eq("approval_status", "draft"),
      admin.from("deals").select("id,business_name,status,estimated_value_min,estimated_value_max,won_at,lost_at"),
      admin.from("invoices").select("id,business_name,status,amount_min,amount_max,due_date"),
      admin.from("revenue_records").select("id,client_organisation,source_name,revenue_value,period_end,created_at,status"),
      admin.from("internal_proposals").select("id,status,created_at"),
      admin.from("conversations").select("id,status").limit(1000),
    ]);

    const businesses = (biz.data ?? []) as any[];
    const profById = new Map<string, any>((profiles.data ?? []).map((p: any) => [p.business_id, p]));
    const modsByBiz = new Map<string, any[]>();
    for (const m of (modules.data ?? [])) {
      const arr = modsByBiz.get((m as any).business_id) ?? [];
      arr.push(m); modsByBiz.set((m as any).business_id, arr);
    }
    const agentsByBiz = new Map<string, any[]>();
    for (const a of (agents.data ?? [])) {
      const arr = agentsByBiz.get((a as any).business_id) ?? [];
      arr.push(a); agentsByBiz.set((a as any).business_id, arr);
    }
    const apprByBiz = new Map<string, any[]>();
    for (const a of (approvals.data ?? [])) {
      const k = (a as any).business_id ?? "__global__";
      const arr = apprByBiz.get(k) ?? []; arr.push(a); apprByBiz.set(k, arr);
    }
    const tasksByBiz = new Map<string, number>();
    for (const t of (tasks.data ?? [])) {
      const k = (t as any).business_id ?? "__global__";
      tasksByBiz.set(k, (tasksByBiz.get(k) ?? 0) + 1);
    }
    const draftsByBiz = new Map<string, number>();
    for (const d of (drafts.data ?? [])) {
      const k = (d as any).business_id ?? "__global__";
      draftsByBiz.set(k, (draftsByBiz.get(k) ?? 0) + 1);
    }

    const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();
    const dealsByName = new Map<string, any[]>();
    for (const d of (deals.data ?? [])) {
      const k = norm((d as any).business_name);
      const arr = dealsByName.get(k) ?? []; arr.push(d); dealsByName.set(k, arr);
    }
    const invByName = new Map<string, any[]>();
    for (const i of (invoices.data ?? [])) {
      const k = norm((i as any).business_name);
      const arr = invByName.get(k) ?? []; arr.push(i); invByName.set(k, arr);
    }
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const revByName = new Map<string, number>();
    let revenueLast30 = 0;
    for (const r of (revenue.data ?? [])) {
      const created = new Date((r as any).created_at).getTime();
      const val = Number((r as any).revenue_value ?? 0);
      if (created >= cutoff && (r as any).status !== "void") revenueLast30 += val;
      const k = norm((r as any).client_organisation || (r as any).source_name);
      revByName.set(k, (revByName.get(k) ?? 0) + val);
    }

    const cards = businesses.map((b: any) => {
      const profile = profById.get(b.id);
      const mods = modsByBiz.get(b.id) ?? [];
      const ags = agentsByBiz.get(b.id) ?? [];
      const enabledAgents = ags.filter((a: any) => a.enabled);
      const appr = apprByBiz.get(b.id) ?? [];
      const dealRows = dealsByName.get(norm(b.name)) ?? [];
      const openDealRows = dealRows.filter((d: any) => !["WON", "LOST"].includes(String(d.status).toUpperCase()));
      const invRows = invByName.get(norm(b.name)) ?? [];
      const outstandingInv = invRows.filter((i: any) => !["PAID", "VOID", "CANCELLED"].includes(String(i.status).toUpperCase()));
      const outstandingAmount = outstandingInv.reduce((s: number, i: any) => s + Number(i.amount_min ?? 0), 0);
      const blockers: string[] = [];
      if (!profile) blockers.push("No operating profile");
      else {
        if (!profile.crm_enabled) blockers.push("CRM disabled");
        if (!profile.agents_enabled) blockers.push("Agents disabled");
      }
      if (mods.length === 0) blockers.push("No modules seeded");
      if (ags.length === 0) blockers.push("No agent assignments");
      const status = profile?.operating_status ?? "setup";
      const readiness = blockers.length === 0
        ? (status === "live" || status === "active_build" ? "ready" : "configurable")
        : "blocked";
      const nextAction =
        !profile ? "Create operating profile" :
        mods.length === 0 ? "Seed operating modules" :
        ags.length === 0 ? "Seed agent assignments" :
        appr.length > 0 ? `Clear ${appr.length} pending approval${appr.length > 1 ? "s" : ""}` :
        openDealRows.length > 0 ? `Progress ${openDealRows.length} open deal${openDealRows.length > 1 ? "s" : ""}` :
        readiness === "ready" ? "Run internal agents (dry-run first)" : "Move profile to active_build";

      return {
        business_id: b.id,
        business_name: b.name,
        status,
        readiness,
        agents_active: enabledAgents.length,
        agents_total: ags.length,
        modules_enabled: mods.filter((m: any) => m.enabled).length,
        modules_total: mods.length,
        approvals_pending: appr.length,
        agent_tasks_pending: tasksByBiz.get(b.id) ?? 0,
        drafts_pending: draftsByBiz.get(b.id) ?? 0,
        leads_open: openDealRows.length,
        deals_open: openDealRows.length,
        deals_total: dealRows.length,
        invoices_outstanding_count: outstandingInv.length,
        invoices_outstanding_amount: outstandingAmount,
        revenue_total: revByName.get(norm(b.name)) ?? 0,
        external_locks: profile ? {
          auto_send_allowed: profile.auto_send_allowed === true,
          external_provider_mutation_allowed: profile.external_provider_mutation_allowed === true,
          agents_with_external_send: ags.filter((a: any) => a.can_send_external).length,
          agents_with_provider_post: ags.filter((a: any) => a.can_call_provider_post).length,
          agents_with_credit_spend: ags.filter((a: any) => a.can_spend_credits).length,
        } : null,
        blockers,
        next_action: nextAction,
      };
    });

    const totals = {
      total_businesses: cards.length,
      active_businesses: cards.filter((c) => c.status === "live" || c.status === "active_build").length,
      setup_businesses: cards.filter((c) => c.status === "setup").length,
      blocked_businesses: cards.filter((c) => c.readiness === "blocked").length,
      approvals_pending: (approvals.data ?? []).length,
      agent_tasks_pending: (tasks.data ?? []).length,
      proposals_pending: (props.data ?? []).filter((p: any) => !["sent", "accepted", "rejected", "archived"].includes(String(p.status).toLowerCase())).length,
      open_deals: cards.reduce((s, c) => s + c.deals_open, 0),
      invoices_outstanding: cards.reduce((s, c) => s + c.invoices_outstanding_amount, 0),
      revenue_last_30_days: revenueLast30,
      conversations_total: (convs.data ?? []).length,
    };

    const criticalBlockers = cards
      .filter((c) => c.blockers.length > 0)
      .slice(0, 25)
      .map((c) => ({ business_id: c.business_id, business_name: c.business_name, blockers: c.blockers }));

    const topApprovals = (approvals.data ?? [])
      .sort((a: any, b: any) => (a.priority_level === "high" ? -1 : 1) - (b.priority_level === "high" ? -1 : 1))
      .slice(0, 10)
      .map((a: any) => ({ id: a.id, business_id: a.business_id, title: a.title, type: a.approval_type, priority: a.priority_level, created_at: a.created_at }));

    const launchQueue = cards
      .filter((c) => c.status === "setup" || c.readiness === "blocked")
      .slice(0, 25)
      .map((c) => ({ business_id: c.business_id, business_name: c.business_name, next_action: c.next_action, blockers: c.blockers }));

    let snapshot_id: string | null = null;
    if (persist) {
      const { data: ins } = await admin.from("portfolio_operating_snapshots").insert({
        total_businesses: totals.total_businesses,
        active_businesses: totals.active_businesses,
        setup_businesses: totals.setup_businesses,
        blocked_businesses: totals.blocked_businesses,
        approvals_pending: totals.approvals_pending,
        agent_tasks_pending: totals.agent_tasks_pending,
        proposals_pending: totals.proposals_pending,
        open_deals: totals.open_deals,
        invoices_outstanding: totals.invoices_outstanding,
        revenue_last_30_days: totals.revenue_last_30_days,
        critical_blockers: criticalBlockers,
        metadata: { generated_by: userId, conversations_total: totals.conversations_total },
      }).select("id").maybeSingle();
      snapshot_id = ins?.id ?? null;
    }

    return new Response(JSON.stringify({
      ok: true,
      totals,
      cards,
      top_approvals: topApprovals,
      critical_blockers: criticalBlockers,
      launch_queue: launchQueue,
      snapshot_id,
      external_actions: { emails_sent: 0, apollo_calls: 0, smartlead_posts: 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});