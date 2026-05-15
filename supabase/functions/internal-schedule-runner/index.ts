import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Maps run_scope -> internal-only edge functions to invoke (in order).
// All listed functions are internal: they create tasks/drafts/approvals/snapshots,
// never send email, never call Apollo, never POST to Smartlead.
const SCOPE_FUNCTIONS: Record<string, string[]> = {
  portfolio_summary: ["portfolio-command-summary"],
  portfolio_snapshot: ["portfolio-command-summary"],
  crm_capture: ["crm-interaction-capture-apply"],
  inbox_triage: ["ai-engagement-agent-run"],
  ai_engagement_agent: ["ai-engagement-agent-run"],
  proposal_agent: ["proposal-agent-run"],
  finance_review: ["revenue-operations-apply"],
  supplier_review: ["business-operating-readiness"],
  system_health: ["business-operating-readiness"],
};

const SAFE_BODY: Record<string, any> = {
  "portfolio-command-summary": { persist: true },
  "crm-interaction-capture-apply": { dry_run: true },
  "ai-engagement-agent-run": { dry_run: true },
  "proposal-agent-run": { dry_run: true },
  "revenue-operations-apply": { dry_run: true },
  "business-operating-readiness": {},
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, serviceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const internalKey = req.headers.get("x-internal-schedule-key") ?? "";
    let actorUserId: string | null = null;
    let isAuthed = false;
    let isService = false;

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      if (token === serviceKey && internalKey === "internal_schedule_runner") {
        isAuthed = true;
        isService = true;
      } else {
        const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: claimsData } = await userClient.auth.getClaims(token);
        const userId = claimsData?.claims?.sub as string | undefined;
        if (userId) {
          const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
          if ((roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
            isAuthed = true; actorUserId = userId;
          }
        }
      }
    }
    if (!isAuthed) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const schedule_key = body?.schedule_key as string | undefined;
    const run_all_enabled = body?.run_all_enabled === true;
    const force = body?.force === true;

    let schedules: any[] = [];
    if (schedule_key) {
      const { data } = await admin.from("internal_operating_schedules").select("*").eq("schedule_key", schedule_key).limit(1);
      schedules = data ?? [];
    } else if (run_all_enabled) {
      const { data } = await admin.from("internal_operating_schedules").select("*").eq("enabled", true);
      schedules = data ?? [];
    } else {
      return new Response(JSON.stringify({ error: "schedule_key or run_all_enabled required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: any[] = [];
    const aggregate = { tasks_created: 0, drafts_created: 0, approvals_created: 0, handoffs_created: 0, snapshots_created: 0, errors: 0 };

    for (const s of schedules) {
      // Hard safety guard
      if (!s.safe_internal_only || s.external_actions_allowed) {
        results.push({ schedule_key: s.schedule_key, skipped: true, reason: "external_actions_allowed must be false and safe_internal_only must be true" });
        continue;
      }
      if (!force && !s.enabled && !schedule_key) {
        results.push({ schedule_key: s.schedule_key, skipped: true, reason: "disabled" });
        continue;
      }
      const fns = SCOPE_FUNCTIONS[s.run_scope] ?? [];
      if (fns.length === 0) {
        results.push({ schedule_key: s.schedule_key, skipped: true, reason: `no functions for scope ${s.run_scope}` });
        continue;
      }

      const stepResults: any[] = [];
      for (const fn of fns) {
        try {
          const fbody = { ...(SAFE_BODY[fn] ?? {}), business_id: s.business_id ?? undefined };
          const resp = await fetch(`${url}/functions/v1/${fn}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
              "x-internal-key": "internal_runner",
            },
            body: JSON.stringify(fbody),
          });
          const json: any = await resp.json().catch(() => ({}));
          const ok = resp.ok && json && json.error == null;
          if (!ok) aggregate.errors++;
          aggregate.tasks_created += Number(json?.tasks_created ?? 0);
          aggregate.drafts_created += Number(json?.drafts_created ?? 0);
          aggregate.approvals_created += Number(json?.approvals_created ?? 0);
          aggregate.handoffs_created += Number(json?.handoffs_created ?? json?.handoffsCreated ?? 0);
          if (json?.snapshot_id) aggregate.snapshots_created++;
          stepResults.push({ fn, ok, status: resp.status, summary: { tasks: json?.tasks_created, drafts: json?.drafts_created, approvals: json?.approvals_created, snapshot_id: json?.snapshot_id, dry_run: json?.dry_run, error: json?.error } });
        } catch (e: any) {
          aggregate.errors++;
          stepResults.push({ fn, ok: false, error: e?.message ?? String(e) });
        }
      }

      const now = new Date().toISOString();
      await admin.from("internal_operating_schedules").update({
        last_run_at: now,
        status: stepResults.every((r) => r.ok) ? "ok" : "warning",
      }).eq("id", s.id);

      await admin.from("agent_action_audit_log").insert({
        actor_user_id: actorUserId,
        action_key: "internal_schedule_runner",
        payload: { schedule_key: s.schedule_key, run_scope: s.run_scope, stepResults, service_role: isService },
      }).then(() => {}).catch(() => {});

      results.push({ schedule_key: s.schedule_key, run_scope: s.run_scope, steps: stepResults });
    }

    return new Response(JSON.stringify({
      ok: true,
      ran_count: results.length,
      aggregate,
      results,
      external_actions: { emails_sent: 0, apollo_calls: 0, smartlead_posts: 0, credits_spent: 0 },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});