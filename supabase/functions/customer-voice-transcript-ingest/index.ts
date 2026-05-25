// Customer Voice Provider — transcript ingest stub.
// Persists transcript segments into the conversation/call_log records. Does
// NOT call any provider. Redaction hook is a placeholder for later policy.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);
  const conversation_id = body?.conversation_id ?? null;
  const call_log_id = body?.call_log_id ?? null;
  const transcript: string = typeof body?.transcript === "string" ? body.transcript : "";
  const segments = Array.isArray(body?.segments) ? body.segments.length : (transcript ? 1 : 0);

  if (call_log_id && transcript) {
    await a.admin.from("customer_sales_call_logs").update({
      transcript, transcript_ready_at: new Date().toISOString(),
    }).eq("id", call_log_id);
  }

  const result = {
    conversation_id, call_log_id, transcript_segments: segments,
    characters: transcript.length, redacted: false, external_call_made: false,
  };

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "transcript_ingest",
    event_status: transcript ? "stored" : "empty",
    conversation_id, call_log_id,
    external_action_attempted: false,
    internal_test: internal, test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: { has_transcript: !!transcript, segments },
    result,
  });

  return json({ ok: true, ...result });
});
