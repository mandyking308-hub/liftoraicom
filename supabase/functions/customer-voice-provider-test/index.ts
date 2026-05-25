// Customer Voice Provider — test stub.
// Does NOT call any external provider. Records a runtime event so the founder
// can see the test was attempted, and updates last_test_at on the provider row.
import { corsHeaders, json, authenticateVoiceCaller, recordRuntimeEvent, getProviderType, isInternalTestPayload, SUPPORTED_PROVIDERS } from "../_shared/voiceProviderShared.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const a = await authenticateVoiceCaller(req);
  if (a instanceof Response) return a;
  if (!a.is_founder_or_admin) return json({ ok: false, error: "forbidden" }, 403);

  let body: any = {}; try { body = await req.json(); } catch {}
  const provider = getProviderType(body);
  const internal = isInternalTestPayload(body);

  // No external call. Record intent and report stub status.
  const result = {
    provider,
    supported: (SUPPORTED_PROVIDERS as readonly string[]).includes(provider),
    external_call_attempted: false,
    note: "Adapter layer only. Live test will run once concrete adapter and secret are wired.",
  };

  await recordRuntimeEvent({
    admin: a.admin,
    provider_type: provider,
    event_type: "provider_test",
    event_status: "stub_ok",
    external_action_attempted: false,
    internal_test: internal,
    test_label: internal ? "LIVE_INTERNAL_TEST" : null,
    payload: body,
    result,
  });

  await a.admin
    .from("customer_sales_provider_settings")
    .update({
      last_test_at: new Date().toISOString(),
      last_test_result: "stub_ok_no_external_call",
      last_error: null,
    })
    .eq("provider_type", provider);

  return json({ ok: true, ...result });
});
