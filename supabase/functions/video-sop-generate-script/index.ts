// Founder-only Script Studio generator for Video SOP Factory.
// Routes through the central Liftor AI Gateway when available, otherwise
// returns a deterministic structured template. Always preserves prior
// approved scripts by inserting a new version row.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { callAIGateway } from "../_shared/aiGateway.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SENSITIVE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "email", re: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i },
  { label: "phone", re: /\b(?:\+?\d[\s-]?){9,15}\b/ },
  { label: "card_number", re: /\b\d{13,19}\b/ },
  { label: "ssn_like", re: /\b\d{3}-\d{2}-\d{4}\b/ },
  { label: "api_key", re: /\b(sk|pk|rk|whsec|xox[abp])_[A-Za-z0-9_-]{16,}\b/ },
  { label: "iban", re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/ },
];

function detectPrivacyFlags(text: string) {
  if (!text) return { has_sensitive: false, flags: [] as string[] };
  const flags: string[] = [];
  for (const p of SENSITIVE_PATTERNS) if (p.re.test(text)) flags.push(p.label);
  return { has_sensitive: flags.length > 0, flags };
}

function lines(src: string, n = 12) {
  return (src ?? "")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, n);
}

function templateScript(asset: any) {
  const src = asset.source_text ?? "";
  const steps = lines(src);
  const audience = asset.audience_type ?? "operator";
  const title = asset.asset_title ?? "Untitled SOP";

  const scenes = [
    { scene_number: 1, scene_title: "Title + business intro", viewer_sees: "Brand name, asset title", narrator_says: `Welcome. In this short training we cover "${title}".`, on_screen_text: title, screen_action: "Title card", estimated_duration_seconds: 8 },
    { scene_number: 2, scene_title: "Why this matters", viewer_sees: "One-line context", narrator_says: `This SOP keeps the ${audience} role consistent and auditable.`, on_screen_text: "Why it matters", screen_action: "Static slide", estimated_duration_seconds: 12 },
    ...steps.map((s, i) => ({
      scene_number: i + 3, scene_title: `Step ${i + 1}`,
      viewer_sees: "Screen recording of the step",
      narrator_says: s, on_screen_text: `Step ${i + 1}`,
      screen_action: "Demonstrate the step on screen",
      estimated_duration_seconds: 25,
    })),
    { scene_number: steps.length + 3, scene_title: "Recap + next action", viewer_sees: "Summary slide", narrator_says: "Recap of the steps and what to do next.", on_screen_text: "Recap", screen_action: "Static slide", estimated_duration_seconds: 15 },
  ];

  const screen_recording_checklist = [
    { step: 1, action: "Open the relevant tool/page", avoid: "Other tabs with personal info", privacy_warning: "Hide browser bookmarks and notifications" },
    ...steps.map((s, i) => ({ step: i + 2, action: s, avoid: "Real customer PII", privacy_warning: "Use demo data if real data would appear" })),
    { step: steps.length + 2, action: "Show the success state", avoid: "Skipping confirmation", privacy_warning: "Mask account IDs" },
  ];

  const quiz = [
    { q: `What is the primary outcome of "${title}"?`, options: ["Cosmetic change", "Required SOP outcome", "Optional task"], answer_index: 1 },
    { q: "Where must the result be logged?", options: ["Anywhere", "Liftor record for the business", "Personal notes"], answer_index: 1 },
    { q: "When should you escalate to founder/admin?", options: ["Never", "If any approval gate is unclear", "Only at end of month"], answer_index: 1 },
    { q: "Are real customer details allowed in the recording?", options: ["Yes", "Only with explicit approval and need", "Always"], answer_index: 1 },
    { q: "Who can approve this video for customer use?", options: ["Anyone", "Founder/admin only", "Operator"], answer_index: 1 },
  ];

  return {
    script_title: `${title} — ${audience} training`,
    short_description: `Internal ${audience} training video derived from ${asset.source_type ?? "source"}.`,
    target_audience: audience,
    learning_objective: `By the end, the ${audience} can perform "${title}" without supervision.`,
    recommended_video_length: "3–6 minutes",
    difficulty_level: "standard",
    use_case: asset.asset_type ?? "operator_training",
    voiceover_script:
      `Welcome. In this short training we cover "${title}".\n\n` +
      (steps.length ? `Key steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n` : "") +
      `[pause]\nWhen you're done, mark the assignment complete in Liftor.`,
    scene_outline: scenes.map((s) => `Scene ${s.scene_number} — ${s.scene_title}: ${s.narrator_says}`).join("\n"),
    screen_recording_steps: screen_recording_checklist.map((c: any) => `${c.step}. ${c.action}`).join("\n"),
    on_screen_text: "Brand name + step numbers + key terms.",
    callouts: "Highlight buttons, fields and confirmations as they appear.",
    warnings: "Do not share customer data. Do not skip approval gates.",
    customer_friendly_version:
      `Hello, and welcome.\n\nThis short walkthrough explains "${title}" in plain language.\n` +
      `You don't need to do anything technical. If you get stuck, contact your account manager.\n` +
      `Next step: confirm you've watched this so we know to support you from here.`,
    operator_version:
      `SOP: ${title}\n\nChecklist:\n${steps.map((s, i) => `- [ ] ${i + 1}. ${s}`).join("\n")}\n\n` +
      `Escalation: any unclear step → founder/admin in Liftor.\nLog: record outcome on the business record.\n` +
      `Quality check: confirm success state matches the recording.`,
    buyer_handover_version:
      `Operational overview of "${title}".\n\nWhat this proves: a repeatable, audited SOP exists for the ${audience} role.\n` +
      `Evidence: linked script + recording + assignments in Liftor Video SOP Factory.\n` +
      `Dependencies: business_id-linked records, founder/admin approval gate.\n` +
      `Gaps to confirm: real recording captured, no PII exposure, assignment completion logged.`,
    founder_notes: "Review for accuracy, brand voice and compliance before approval.",
    scenes_json: scenes,
    screen_recording_checklist_json: screen_recording_checklist,
    quiz_json: quiz,
  };
}

function buildPrompt(asset: any) {
  return [
    `You are Liftor Script Studio. Generate production-ready video SOP material from the source below.`,
    `Asset: ${asset.asset_title}`,
    `Asset type: ${asset.asset_type} | Audience: ${asset.audience_type} | Source type: ${asset.source_type}`,
    `Business: ${asset.business_name_snapshot ?? "(unspecified)"}`,
    `External visibility: ${asset.external_visibility} | Saleability evidence: ${asset.saleability_evidence}`,
    ``,
    `SOURCE TEXT (treat as the only source of truth — do not invent facts):`,
    `"""${(asset.source_text ?? "").slice(0, 12000)}"""`,
    ``,
    `Return STRICT JSON matching this shape (no markdown, no commentary):`,
    `{
  "script_title": string,
  "short_description": string,
  "target_audience": string,
  "learning_objective": string,
  "recommended_video_length": string,
  "difficulty_level": "beginner"|"standard"|"advanced",
  "use_case": string,
  "voiceover_script": string,
  "scene_outline": string,
  "screen_recording_steps": string,
  "on_screen_text": string,
  "callouts": string,
  "warnings": string,
  "customer_friendly_version": string,
  "operator_version": string,
  "buyer_handover_version": string,
  "founder_notes": string,
  "scenes_json": [{"scene_number":number,"scene_title":string,"viewer_sees":string,"narrator_says":string,"on_screen_text":string,"screen_action":string,"estimated_duration_seconds":number}],
  "screen_recording_checklist_json": [{"step":number,"action":string,"avoid":string,"privacy_warning":string}],
  "quiz_json": [{"q":string,"options":[string],"answer_index":number}]
}`,
    `Rules:`,
    `- Voiceover must be friendly, short sections, suggested pauses with [pause] markers.`,
    `- 5 to 10 quiz questions, practical not theoretical.`,
    `- Customer-friendly version must omit internal-only details and contain reassurance + next step.`,
    `- Operator version must include escalation points and logging requirements.`,
    `- Buyer/handover version must summarise operational evidence and dependencies.`,
    `- Never invent customer names, contracts, financials or compliance claims not present in source.`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const service = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Founder/admin only
    const { data: roles } = await userClient.from("user_roles").select("role").eq("user_id", user.id);
    const isFounder = (roles ?? []).some((r: any) => r.role === "founder" || r.role === "admin");
    if (!isFounder) return new Response(JSON.stringify({ error: "Forbidden — founder/admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const asset_id: string | undefined = body.asset_id;
    const mode: "ai" | "template" = body.mode === "template" ? "template" : "ai";
    if (!asset_id || typeof asset_id !== "string") {
      return new Response(JSON.stringify({ error: "asset_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: asset, error: aErr } = await service.from("video_sop_assets").select("*").eq("id", asset_id).maybeSingle();
    if (aErr || !asset) return new Response(JSON.stringify({ error: "Asset not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Latest version for this asset
    const { data: prior } = await service.from("video_sop_scripts").select("id,version_number").eq("asset_id", asset_id).order("version_number", { ascending: false }).limit(1).maybeSingle();
    const nextVersion = (prior?.version_number ?? 0) + 1;
    const parentId = prior?.id ?? null;

    const privacy = detectPrivacyFlags(asset.source_text ?? "");

    let aiUsed = false;
    let aiError: string | null = null;
    let payload: any = null;
    let aiTrace: string | null = null;

    if (mode === "ai" && Deno.env.get("LOVABLE_API_KEY")) {
      const prompt = buildPrompt(asset);
      const result = await callAIGateway({
        business_id: asset.business_id ?? null,
        user_id: user.id,
        action_type: "video_sop_script_generation",
        task_category: "training",
        model: "google/gemini-3-flash-preview",
        request_type: "video_sop_script",
        prompt_version: "script_studio_v1",
        risk_level: "low",
        idempotency_key: `vsop:${asset_id}:v${nextVersion}`,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You output strict JSON only. No markdown. No commentary." },
          { role: "user", content: prompt },
        ],
        metadata: { asset_id, asset_type: asset.asset_type, audience: asset.audience_type },
      });
      aiTrace = result.trace_id;
      if (result.status === "completed" && result.data) {
        try {
          const content: string = result.data.choices?.[0]?.message?.content ?? "";
          payload = JSON.parse(content);
          aiUsed = true;
        } catch (e: any) {
          aiError = `parse_error: ${String(e?.message ?? e)}`;
        }
      } else {
        aiError = result.error ?? `status:${result.status}`;
      }
    }

    if (!payload) payload = templateScript(asset);

    const row = {
      asset_id,
      business_id: asset.business_id,
      parent_script_id: parentId,
      version_number: nextVersion,
      status: "draft",
      generated_by_ai: aiUsed,
      ai_prompt_used: aiUsed ? "script_studio_v1" : null,
      source_text_snapshot: asset.source_text ?? null,
      privacy_flags: privacy,
      script_title: payload.script_title ?? null,
      short_description: payload.short_description ?? null,
      target_audience: payload.target_audience ?? asset.audience_type ?? null,
      learning_objective: payload.learning_objective ?? null,
      recommended_video_length: payload.recommended_video_length ?? null,
      video_length_target: payload.recommended_video_length ?? null,
      difficulty_level: payload.difficulty_level ?? "standard",
      use_case: payload.use_case ?? asset.asset_type ?? null,
      voiceover_script: payload.voiceover_script ?? null,
      scene_outline: payload.scene_outline ?? null,
      screen_recording_steps: payload.screen_recording_steps ?? null,
      on_screen_text: payload.on_screen_text ?? null,
      callouts: payload.callouts ?? null,
      warnings: payload.warnings ?? null,
      customer_friendly_version: payload.customer_friendly_version ?? null,
      operator_version: payload.operator_version ?? null,
      buyer_handover_version: payload.buyer_handover_version ?? null,
      founder_notes: payload.founder_notes ?? null,
      scenes_json: Array.isArray(payload.scenes_json) ? payload.scenes_json : [],
      screen_recording_checklist_json: Array.isArray(payload.screen_recording_checklist_json) ? payload.screen_recording_checklist_json : [],
      quiz_json: Array.isArray(payload.quiz_json) ? payload.quiz_json : [],
      metadata_json: {
        ai_trace_id: aiTrace,
        ai_error: aiError,
        source_type: asset.source_type,
        source_reference_id: asset.source_reference_id ?? null,
        generated_at: new Date().toISOString(),
        generated_by: user.id,
      },
    };

    const { data: inserted, error: insErr } = await service.from("video_sop_scripts").insert(row).select("*").single();
    if (insErr) return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Bump asset status if still draft
    if (asset.status === "draft") {
      await service.from("video_sop_assets").update({ status: "script_generated" }).eq("id", asset_id);
    }

    await service.from("video_sop_audit_events").insert({
      asset_id,
      business_id: asset.business_id ?? null,
      event_type: "script_generated",
      event_summary: `Script v${nextVersion} generated (${aiUsed ? "ai" : "template"})${aiError ? ` — fallback: ${aiError}` : ""}`,
      actor_user_id: user.id,
      actor_role: "founder",
      metadata_json: { script_id: inserted.id, mode, ai_used: aiUsed, ai_error: aiError, privacy_flags: privacy, version: nextVersion },
    });

    return new Response(JSON.stringify({
      ok: true,
      script: inserted,
      ai_used: aiUsed,
      ai_error: aiError,
      privacy_flags: privacy,
      version: nextVersion,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});