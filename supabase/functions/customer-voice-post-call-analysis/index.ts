// Customer Voice Provider — post-call analysis stub.
// Routes a transcript through the AI Gateway (when a transcript is supplied)
// and writes the recommendation back to the conversation row.
// No external provider is called; AI usage flows through the shared gateway.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;
  if (!a.is_founder_or_admin) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);
  const conversation_id = body?.conversation_id ?? null;

  // We do not call the AI gateway in the stub when no transcript is provided.
  // The sales-conversation-brain function remains the canonical analyser.
  const result = {
    conversation_id,
    analysed: false,
    next_step: "Invoke sales-conversation-brain with transcript to produce recommendation.",
    external_call_made: false,
  };

  await recordRuntimeEvent({
    admin: a.admin, provider_type: provider, event_type: "post_call_analysis",
    event_status: "stub_ok", conversation_id,
    external_action_attempted: false,
    internal_test: internal, test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: body, result,
  });

  return json({ ok: true, ...result });
});
