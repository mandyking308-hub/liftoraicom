// Customer Voice Provider — outbound preparation stub.
// Prepares an outbound call DRAFT only. Does NOT dial. Evaluates eligibility
// against provider state, contact lawful basis, product knowledge completeness,
// founder approval and rate limits.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;
  if (!a.is_founder_or_admin) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);
  const { contact_id, product_id, playbook_id, contact_consent_basis, founder_approval_granted, pre_approved_campaign, external_action_gate_enabled } = body ?? {};

  const [{ data: settings }, { data: product }, { data: playbook }] = await Promise.all([
    a.admin.from("customer_sales_provider_settings").select("*").eq("provider_type", provider).maybeSingle(),
    product_id ? a.admin.from("customer_sales_products").select("*").eq("id", product_id).maybeSingle() : Promise.resolve({ data: null }),
    playbook_id ? a.admin.from("customer_sales_playbooks").select("*").eq("id", playbook_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!settings) blockers.push("provider_not_connected");
  else {
    if (settings.provider_status !== "live") blockers.push(`provider_status_${settings.provider_status}`);
    if (!settings.outbound_enabled) blockers.push("outbound_disabled");
    if (!settings.api_secret_configured) blockers.push("api_secret_missing");
  }
  if (!contact_consent_basis) warnings.push("contact_lawful_basis_unverified");
  const completeness = (product as any)?.completeness_score ?? 0;
  if (completeness < 70) blockers.push("product_knowledge_below_70");
  if (!founder_approval_granted && !pre_approved_campaign) blockers.push("founder_approval_required");
  if (!external_action_gate_enabled) blockers.push("external_action_gate_locked");

  const draft = {
    provider,
    contact_id: contact_id ?? null,
    product_id: product_id ?? null,
    playbook_id: playbook_id ?? null,
    from_number: settings?.phone_number ?? null,
    voice_id: settings?.default_voice_id ?? null,
    agent_id: settings?.default_agent_id ?? null,
    consent_notice: settings?.consent_notice_text ?? null,
    opening_script: (playbook as any)?.intro_script ?? "",
    discovery_questions: (playbook as any)?.discovery_questions ?? [],
    approved_claims: (playbook as any)?.approved_claims ?? [],
    prohibited_claims: (playbook as any)?.prohibited_claims ?? [],
    approval_required: true,
    eligibility: { eligible: blockers.length === 0, blockers, warnings },
  };

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "outbound_prepare",
    event_status: draft.eligibility.eligible ? "draft_ready" : "draft_blocked",
    external_action_attempted: false,
    internal_test: internal, test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: body, result: draft,
  });

  return json({ ok: true, external_call_made: false, draft });
});
