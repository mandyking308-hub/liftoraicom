// Customer Voice Provider — inbound webhook stub.
// Accepts and logs an inbound-call notification from any supported provider.
// No external call is made. No outbound message is sent. The agent stays
// gated by founder approval and consent_notice_required.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);

  const { data: settings } = await a.admin
    .from("customer_sales_provider_settings")
    .select("*").eq("provider_type", provider).maybeSingle();

  const can_answer =
    !!settings && settings.provider_status === "live" && settings.inbound_enabled === true;
  const must_announce = !!settings?.consent_notice_required;
  const escalate_reason = !can_answer
    ? (settings ? "provider_not_live_or_inbound_disabled" : "provider_not_connected")
    : null;

  // Log a call attempt to call_logs only when a real provider event arrives.
  let call_log_id: string | null = null;
  if (!internal) {
    const { data: callRow } = await a.admin.from("customer_sales_call_logs").insert({
      call_direction: "inbound",
      from_number: body?.from_number ?? body?.from ?? null,
      to_number: body?.to_number ?? body?.to ?? null,
      provider_type: provider,
      external_call_id: body?.call_id ?? body?.id ?? null,
      started_at: new Date().toISOString(),
      outcome: can_answer ? "in_progress" : "escalated_no_provider",
    }).select("id").maybeSingle();
    call_log_id = callRow?.id ?? null;
  }

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "inbound_webhook",
    event_status: can_answer ? "accepted_stub" : "escalated",
    call_log_id, external_action_attempted: false,
    internal_test: internal, test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: body,
    result: { can_answer, must_announce, escalate_reason },
  });

  return json({
    ok: true, external_call_made: false,
    can_answer, must_announce,
    consent_notice: settings?.consent_notice_text ?? null,
    escalate_reason, call_log_id,
  });
});
