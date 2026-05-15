import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CONFIRMATION_PHRASE = "RUN LIFTOR INTERNAL AGENTS";
const SOURCE_FUNCTION = "liftor-business-live-run";

const SCOPES = [
  "crm_capture",
  "engagement_agent",
  "approval_queue",
  "proposal_agent",
  "commercial_agent",
  "revenue_agent",
  "all_internal",
] as const;

type Scope = typeof SCOPES[number];

// Internal, safe-only edge functions. None of these send externally,
// none call Apollo, none POST to Smartlead.
const STEP_BY_SCOPE: Record<Exclude<Scope, "all_internal">, { fn: string; phrase?: string; bodyExtra?: Record<string, unknown> }[]> = {
  crm_capture: [
    { fn: "crm-interaction-capture-apply" },
  ],
  engagement_agent: [
    { fn: "ai-engagement-agent-run", phrase: "RUN AI ENGAGEMENT AGENT" },
  ],
  approval_queue: [
    { fn: "founder-approval-preview" },
  ],
  proposal_agent: [
    { fn: "proposal-agent-run", phrase: "RUN PROPOSAL AGENT" },
  ],
  commercial_agent: [
    { fn: "commercial-agent-run", phrase: "RUN COMMERCIAL AGENT" },
  ],
  revenue_agent: [
    { fn: "revenue-operations-apply" },
  ],
};

const ALL_ORDER: Exclude<Scope, "all_internal">[] = [
  "crm_capture",
  "engagement_agent",
  "approval_queue",
  "proposal_agent",
  "commercial_agent",
  "revenue_agent",
];

function pickCounts(payload: any) {
  if (!payload || typeof payload !== "object") return {};
  const keys = [
    "candidates_found",
    "tasks_created",
    "drafts_created",
    "approvals_created",
    "next_actions_created",
    "handoffs_created",
    "reviews_created",
    "captured",
    "matched",
    "applied",
    "queued",
  ];
  const out: Record<string, number> = {};
  for (const k of keys) if (typeof payload[k] === "number") out[k] = payload[k];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
    if (!(roles ?? []).some((r: any) => r.role === "admin" || r.role === "founder")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json().catch(() => ({} as any));
    const businessId: string | null = body?.business_id ?? null;
    const dryRun: boolean = body?.dry_run !== false;
    const maxItems: number = Math.min(50, Math.max(1, Number(body?.max_items ?? 10)));
    const phrase: string = String(body?.confirmation_phrase ?? "");
    const scopeIn: Scope = (SCOPES as readonly string[]).includes(body?.run_scope) ? body.run_scope : "all_internal";

    const audit = async (status: string, blockedReason: string | null, metadata: any = {}) => {
      await admin.from("agent_action_audit_log").insert({
        business_id: businessId, agent_key: "liftor_business_live_runner",
        action_type: "business_live_run", source_function: SOURCE_FUNCTION,
        target_table: null, target_id: null,
        founder_user_id: userId, confirmation_phrase: phrase,
        dry_run: dryRun, action_status: status, blocked_reason: blockedReason, metadata,
      });
    };

    if (!dryRun && phrase !== CONFIRMATION_PHRASE) {
      await audit("blocked", "missing_confirmation_phrase", { scope: scopeIn });
      return new Response(JSON.stringify({
        ok: true, blocked: true, reason: "missing_confirmation_phrase",
        required_phrase: CONFIRMATION_PHRASE, scope: scopeIn,
        emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const scopes: Exclude<Scope, "all_internal">[] =
      scopeIn === "all_internal" ? ALL_ORDER : [scopeIn as Exclude<Scope, "all_internal">];

    const steps: any[] = [];
    const totals = {
      candidates_found: 0,
      tasks_created: 0,
      drafts_created: 0,
      approvals_created: 0,
      next_actions_created: 0,
      handoffs_created: 0,
      reviews_created: 0,
      captured: 0,
      matched: 0,
    };

    for (const s of scopes) {
      for (const step of STEP_BY_SCOPE[s]) {
        const url = `${supabaseUrl}/functions/v1/${step.fn}`;
        const payload: Record<string, unknown> = {
          business_id: businessId,
          dry_run: dryRun,
          max_items: maxItems,
          ...(step.bodyExtra ?? {}),
        };
        if (!dryRun && step.phrase) payload.confirmation_phrase = step.phrase;
        let stepResult: any = { ok: false };
        try {
          const r = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: authHeader },
            body: JSON.stringify(payload),
          });
          const text = await r.text();
          let json: any = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
          stepResult = { ok: r.ok, status: r.status, payload: json };
        } catch (e: any) {
          stepResult = { ok: false, error: e?.message ?? String(e) };
        }
        const counts = pickCounts(stepResult.payload);
        for (const [k, v] of Object.entries(counts)) {
          if (k in totals) (totals as any)[k] += v;
        }
        steps.push({ scope: s, function: step.fn, ok: stepResult.ok, status: stepResult.status, blocked: stepResult.payload?.blocked ?? false, reason: stepResult.payload?.reason ?? null, counts });
      }
    }

    await audit(dryRun ? "preview" : "applied", null, { scope: scopeIn, totals, step_count: steps.length });

    return new Response(JSON.stringify({
      ok: true, blocked: false, dry_run: dryRun, scope: scopeIn,
      steps, totals,
      emails_sent: 0, apollo_called: false, smartlead_post_called: false,
      external_sends_locked: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});