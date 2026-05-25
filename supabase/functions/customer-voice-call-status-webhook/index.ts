// Customer Voice Provider — call status webhook stub.
// Receives `ringing/answered/completed/failed/busy/no_answer` events from a
// provider and updates the matching call_log. Never calls the provider back.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);
  const external_call_id = body?.call_id ?? body?.id ?? null;
  const status = String(body?.status ?? body?.event ?? "unknown").toLowerCase();

  let call_log_id: string | null = null;
  if (external_call_id) {
    const { data: existing } = await a.admin
      .from("customer_sales_call_logs").select("id").eq("external_call_id", external_call_id).maybeSingle();
    if (existing?.id) {
      call_log_id = existing.id;
      await a.admin.from("customer_sales_call_logs").update({
        outcome: status,
        ended_at: ["completed","failed","busy","no_answer","cancelled"].includes(status) ? new Date().toISOString() : null,
      }).eq("id", existing.id);
    }
  }

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "call_status",
    event_status: status, call_log_id,
    external_action_attempted: false,
    internal_test: internal, test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: body, result: { status, external_call_id, call_log_id },
  });

  return json({ ok: true, status, call_log_id, external_call_made: false });
});
