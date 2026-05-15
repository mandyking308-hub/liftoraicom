import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface OrchestrateBody {
  rule_key?: string;
  trigger_event?: string;
  from_agent_key?: string;
  business_id?: string | null;
  source_table?: string | null;
  source_id?: string | null;
  contact_id?: string | null;
  conversation_id?: string | null;
  summary?: string | null;
  context_payload?: Record<string, unknown>;
  priority_level?: string;
  dry_run?: boolean;
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
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as OrchestrateBody;
    if (!body?.rule_key && !body?.trigger_event) {
      return new Response(JSON.stringify({ error: "rule_key or trigger_event required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let q = admin.from("agent_handover_rules").select("*").eq("enabled", true);
    if (body.rule_key) q = q.eq("rule_key", body.rule_key);
    else if (body.trigger_event) q = q.eq("trigger_event", body.trigger_event);
    const { data: rules } = await q;
    const candidates = (rules ?? []).filter((r: any) =>
      !body.from_agent_key || r.from_agent_key === body.from_agent_key || r.from_agent_key === "any"
    );
    if (candidates.length === 0) {
      return new Response(JSON.stringify({
        matched: 0, message: "No matching handover rule.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const dryRun = body.dry_run === true;
    const created: any[] = [];
    const skipped: any[] = [];

    for (const rule of candidates) {
      // Idempotency
      if (body.source_table && body.source_id) {
        const { data: existing } = await admin
          .from("agent_handover_log")
          .select("id")
          .eq("rule_key", rule.rule_key)
          .eq("source_table", body.source_table)
          .eq("source_id", body.source_id)
          .maybeSingle();
        if (existing) {
          skipped.push({ rule_key: rule.rule_key, handover_id: existing.id, reason: "idempotent" });
          continue;
        }
      }

      // Validate required context
      const required = (rule.required_context ?? []) as string[];
      const ctx = (body.context_payload ?? {}) as Record<string, unknown>;
      const missing = required.filter((k) => !(k in ctx) && (body as any)[k] == null);

      if (dryRun) {
        created.push({ rule_key: rule.rule_key, dry_run: true, missing_context: missing });
        continue;
      }

      const { data: handover, error: hErr } = await admin
        .from("agent_handover_log")
        .insert({
          business_id: body.business_id ?? null,
          from_agent_key: body.from_agent_key ?? rule.from_agent_key,
          to_agent_key: rule.to_agent_key,
          trigger_event: body.trigger_event ?? rule.trigger_event,
          source_table: body.source_table ?? null,
          source_id: body.source_id ?? null,
          contact_id: body.contact_id ?? null,
          conversation_id: body.conversation_id ?? null,
          summary: body.summary ?? null,
          context_payload: { ...ctx, missing_context: missing },
          priority_level: body.priority_level ?? rule.priority_level,
          status: missing.length ? "blocked" : "created",
          founder_review_required: rule.founder_review_required,
          rule_key: rule.rule_key,
        })
        .select("id")
        .single();
      if (hErr) { skipped.push({ rule_key: rule.rule_key, error: hErr.message }); continue; }

      let taskId: string | null = null;
      if (rule.auto_create_task && missing.length === 0) {
        const { data: task } = await admin
          .from("ai_agent_task_queue")
          .insert({
            business_id: body.business_id ?? null,
            agent_key: rule.to_agent_key,
            task_type: rule.handover_type,
            task_title: `Handover: ${rule.rule_key}`,
            task_summary: body.summary ?? `Handover from ${rule.from_agent_key} to ${rule.to_agent_key}`,
            source_system: "agent-handover-orchestrator",
            source_table: body.source_table ?? "agent_handover_log",
            source_id: handover?.id ?? null,
            contact_id: body.contact_id ?? null,
            conversation_id: body.conversation_id ?? null,
            priority_level: body.priority_level ?? rule.priority_level,
            status: "queued",
            founder_approval_required: rule.founder_review_required,
            auto_execute_allowed: false,
            execution_enabled: false,
            dry_run_only: true,
            recommended_action: `Review handover from ${rule.from_agent_key}`,
            agent_output: { handover_id: handover?.id, context: ctx },
          })
          .select("id")
          .single();
        taskId = task?.id ?? null;
        if (taskId) {
          await admin.from("agent_handover_log").update({ task_id: taskId }).eq("id", handover!.id);
        }
      }

      created.push({
        rule_key: rule.rule_key,
        handover_id: handover?.id,
        task_id: taskId,
        status: missing.length ? "blocked" : "created",
        missing_context: missing,
      });
    }

    return new Response(JSON.stringify({
      matched: candidates.length,
      created,
      skipped,
      dry_run: dryRun,
      external_action: false,
      provider_mutation: false,
      notes: "Handovers and tasks created internally only. No external send.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});