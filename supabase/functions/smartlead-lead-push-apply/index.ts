import { corsHeaders, json, founderContext, objectBody, RequestError, errorResponse } from "../_shared/smartleadEdge.ts";
import { loadSmartleadMappings } from "../_shared/smartleadImportStore.ts";
import { resolveMapping } from "../_shared/smartleadLeadImport.ts";
import { smartleadRequest } from "../_shared/smartleadClient.ts";
import { transferLeads } from "../_shared/smartleadTransfer.ts";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { db, apiKey } = await founderContext(req);
    const body = await objectBody(req);
    const gates = { feature_flag_on: Deno.env.get("SMARTLEAD_LEAD_PUSH_ENABLED") === "true",
      confirmation_match: body.confirmation_phrase === "PUSH SMARTLEAD LEADS", not_dry_run: body.dry_run === false };
    if (!Object.values(gates).every(Boolean)) return json({ ok: true, blocked: true, gates, leads_pushed: 0, provider_calls: 0 });
    if (!apiKey) throw new RequestError("smartlead_api_key_missing", 424);
    if (typeof body.campaign_mapping_id !== "string") throw new RequestError("campaign_mapping_required");
    const ids = body.contact_ids;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 50 || ids.some(id => typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)))
      throw new RequestError("select_1_to_50_previewed_contacts");
    const resolution = resolveMapping(await loadSmartleadMappings(db, body), { campaign_mapping_id: body.campaign_mapping_id });
    if (!resolution.ok) throw new RequestError(resolution.error, 409);
    const m = resolution.mapping;
    const operation = crypto.randomUUID();
    const result = await transferLeads({
      readCampaign: () => smartleadRequest(apiKey, `/campaigns/${encodeURIComponent(m.provider_campaign_id!)}`),
      claim: async () => {
        const r = await db.rpc("smartlead_claim_transfer", { p_mapping: m.id, p_ids: [...new Set(ids)], p_operation: operation });
        if (r.error) throw new RequestError("transfer_claim_failed_check_business_and_action_gates", 409);
        return r.data ?? [];
      },
      addLeads: payload => smartleadRequest(apiKey, `/campaigns/${encodeURIComponent(m.provider_campaign_id!)}/leads`, "POST", payload),
      record: async (mappingIds, status, response) => {
        const r = await db.from("outbound_provider_lead_mappings").update({ push_status: status, provider_response: response,
          ...(status === "pushed" ? { pushed_at: new Date().toISOString() } : {}) })
          .in("id", mappingIds).eq("push_status", "pushing").select("id");
        if (r.error || r.data?.length !== mappingIds.length) throw new Error("transfer_record_failed");
      },
    }, m.business_id!, m.liftor_campaign_id!);
    return json({ ...result, campaign_mapping_id: m.id, operation_id: operation, campaign_started: false });
  } catch (error) {
    if (error instanceof Error && error.message === "campaign_must_be_draft_or_paused")
      return json({ ok: false, error: error.message, leads_pushed: 0 }, 409);
    return errorResponse(error);
  }
});
