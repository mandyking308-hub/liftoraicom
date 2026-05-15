import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface EvalInput {
  business_id?: string | null;
  agent_key?: string | null;
  action_type: string;
  channel_key?: string | null;
  jurisdiction_code?: string | null;
  language_code?: string | null;
  risk_level?: string | null;
  batch_size?: number | null;
}

function score(p: any, input: EvalInput): number {
  let s = 0;
  if (p.business_id && p.business_id === input.business_id) s += 8;
  if (p.agent_key && p.agent_key === input.agent_key) s += 4;
  if (p.channel_key && p.channel_key === input.channel_key) s += 2;
  if (p.jurisdiction_code && p.jurisdiction_code === input.jurisdiction_code) s += 1;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const input = (await req.json()) as EvalInput;
    if (!input?.action_type) {
      return new Response(JSON.stringify({ error: "action_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: policies } = await admin
      .from("autonomy_policies")
      .select("*")
      .eq("action_type", input.action_type)
      .eq("enabled", true);

    const candidates = (policies ?? []).filter((p: any) =>
      (!p.business_id || p.business_id === input.business_id) &&
      (!p.agent_key || p.agent_key === input.agent_key) &&
      (!p.channel_key || p.channel_key === input.channel_key) &&
      (!p.jurisdiction_code || p.jurisdiction_code === input.jurisdiction_code)
    );
    candidates.sort((a: any, b: any) => score(b, input) - score(a, input));
    const matched = candidates[0] ?? null;

    const { data: levels } = await admin
      .from("autonomy_levels").select("*").order("level_number");

    const blockers: string[] = [];
    let allowed = true;
    let level = matched?.autonomy_level ?? 1;
    const levelRow = (levels ?? []).find((l: any) => l.level_number === level);

    if (!matched) {
      blockers.push("No matching policy — defaulting to Draft Only (level 1).");
      allowed = false;
    } else {
      if (!matched.enabled) { blockers.push("Policy disabled."); allowed = false; }
      const batch = input.batch_size ?? 1;
      if (matched.max_batch_size && batch > matched.max_batch_size) {
        blockers.push(`Batch size ${batch} exceeds policy max ${matched.max_batch_size}.`);
        allowed = false;
      }
      const reqRisk = (input.risk_level ?? "medium").toLowerCase();
      const rank: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
      if (levelRow && rank[reqRisk] > rank[levelRow.max_risk_level ?? "low"]) {
        blockers.push(`Risk ${reqRisk} exceeds level ${level} max risk ${levelRow.max_risk_level}.`);
        allowed = false;
      }
      if (input.language_code) {
        const blocked = (matched.blocked_languages ?? []) as string[];
        const allowedL = (matched.allowed_languages ?? []) as string[];
        if (blocked.includes(input.language_code)) {
          blockers.push(`Language ${input.language_code} blocked.`); allowed = false;
        }
        if (allowedL.length > 0 && !allowedL.includes(input.language_code)) {
          blockers.push(`Language ${input.language_code} not in allow-list.`); allowed = false;
        }
      }
      if (input.jurisdiction_code) {
        const blockedC = (matched.blocked_countries ?? []) as string[];
        const allowedC = (matched.allowed_countries ?? []) as string[];
        if (blockedC.includes(input.jurisdiction_code)) {
          blockers.push(`Country ${input.jurisdiction_code} blocked.`); allowed = false;
        }
        if (allowedC.length > 0 && !allowedC.includes(input.jurisdiction_code)) {
          blockers.push(`Country ${input.jurisdiction_code} not in allow-list.`); allowed = false;
        }
      }
    }

    const externalAction = !!(levelRow && (
      levelRow.external_send_allowed ||
      levelRow.provider_mutation_allowed ||
      levelRow.credit_spend_allowed ||
      levelRow.money_movement_allowed
    ) && level >= 3);
    const safeInternal = !externalAction && allowed && level >= 2;
    const founderApprovalRequired = matched
      ? (matched.requires_founder_approval || (levelRow?.founder_approval_required ?? true))
      : true;

    // Audit
    await admin.from("autonomy_action_audit").insert({
      business_id: input.business_id ?? null,
      agent_key: input.agent_key ?? null,
      action_type: input.action_type,
      channel_key: input.channel_key ?? null,
      jurisdiction_code: input.jurisdiction_code ?? null,
      language_code: input.language_code ?? null,
      requested_autonomy_level: matched?.autonomy_level ?? null,
      resolved_autonomy_level: level,
      allowed,
      founder_approval_required: founderApprovalRequired,
      blocked_reason: blockers.length ? blockers.join(" | ") : null,
      policy_id: matched?.id ?? null,
      external_action: externalAction,
      email_sent: false,
      provider_mutation: false,
      credit_spend: false,
      metadata: { evaluator: "autonomy-policy-evaluate", evaluated_by: userId },
    });

    return new Response(JSON.stringify({
      allowed,
      autonomy_level: level,
      autonomy_level_label: levelRow?.level_label ?? null,
      founder_approval_required: founderApprovalRequired,
      blockers,
      policy_matched: matched,
      safe_internal_action: safeInternal,
      external_action: externalAction,
      audit_required: true,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});