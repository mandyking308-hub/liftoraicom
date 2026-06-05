import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const aiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!aiKey) return new Response(JSON.stringify({ error: "AI key not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { question, taskId } = await req.json();
    if (!question?.trim()) return new Response(JSON.stringify({ error: "Question required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Resolve worker profile + assert active window
    const { data: worker } = await supabase.from("worker_profiles").select("id, role, status").eq("user_id", user.id).maybeSingle();
    if (!worker || worker.status !== "active") {
      return new Response(JSON.stringify({ error: "No active worker profile" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const nowIso = new Date().toISOString();
    const { data: win } = await supabase.from("worker_access_windows").select("id")
      .eq("worker_id", worker.id)
      .lte("start_time", nowIso)
      .gte("end_time", nowIso)
      .in("status", ["scheduled", "active"]).maybeSingle();
    if (!win) return new Response(JSON.stringify({ error: "No active access window" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Pull active manual sections for the worker's role
    const { data: manual } = await supabase.from("worker_manuals").select("id, manual_title, manual_version")
      .eq("role", worker.role).eq("status", "active").maybeSingle();
    let sections: any[] = [];
    if (manual) {
      const { data: s } = await supabase.from("worker_manual_sections").select("id, section_title, section_body, section_key, applies_to_task_types").eq("manual_id", manual.id).order("display_order");
      sections = s ?? [];
    }
    let task: any = null;
    if (taskId) {
      const { data: t } = await supabase.from("worker_tasks").select("id, title, description, task_type, step_by_step_instructions, assigned_to").eq("id", taskId).maybeSingle();
      if (t && t.assigned_to === worker.id) task = t;
    }

    const relevant = task ? sections.filter((s) => {
      const arr = Array.isArray(s.applies_to_task_types) ? s.applies_to_task_types : [];
      return arr.length === 0 || arr.includes(task.task_type);
    }) : sections;

    const contextBlock = relevant.map((s, i) => `## ${i + 1}. ${s.section_title}\n${s.section_body ?? ""}`).join("\n\n");
    const taskBlock = task ? `## Current Task\nTitle: ${task.title}\nType: ${task.task_type}\nDescription: ${task.description ?? ""}\nInstructions: ${task.step_by_step_instructions ?? ""}` : "(no task selected)";

    const system = `You are Liftor Help, a strict in-portal assistant for an external worker.
RULES:
- Answer ONLY from the manual sections and the current task below.
- Never reveal secrets, API keys, founder financials, bank or legal data.
- Never instruct the worker to send emails, publish posts, launch campaigns, export, delete, or change any system setting.
- Never reference data outside the worker's role scope.
- If the answer is not in the provided context, reply: "I don't have a confirmed answer. Escalate to Mandy." and nothing else.
- Keep answers short and step-by-step.`;

    const userMsg = `MANUAL SECTIONS (role: ${worker.role}):\n${contextBlock || "(no active manual)"}\n\n${taskBlock}\n\nWORKER QUESTION:\n${question}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${aiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: system }, { role: "user", content: userMsg }],
      }),
    });
    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted - contact founder" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) return new Response(JSON.stringify({ error: "AI request failed" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const aiJson = await aiResp.json();
    const answer: string = aiJson.choices?.[0]?.message?.content ?? "I don't have a confirmed answer. Escalate to Mandy.";
    const uncertain = /escalate to mandy/i.test(answer);

    await supabase.from("worker_help_requests").insert({
      worker_id: worker.id,
      task_id: task?.id ?? null,
      question,
      answer,
      source_manual_sections: relevant.map((r) => ({ id: r.id, key: r.section_key })),
      escalated_to_founder: false,
      status: uncertain ? "unresolved" : "answered",
    });
    await supabase.from("worker_audit_events").insert({
      worker_id: worker.id,
      event_type: "help_chat_used",
      portal_type: "operator",
      related_task_id: task?.id ?? null,
      metadata: { uncertain },
    });
    if (task?.id) {
      await supabase.from("worker_task_logs").insert({
        task_id: task.id, worker_id: worker.id, log_text: `HELP USED: ${question}`, help_used: true,
      });
    }
    return new Response(JSON.stringify({ answer, uncertain, manual_version: manual?.manual_version ?? null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});