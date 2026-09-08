import { corsHeaders, json, founderContext, objectBody, RequestError, errorResponse } from "../_shared/smartleadEdge.ts";
import { loadSmartleadMappings } from "../_shared/smartleadImportStore.ts";
import { resolveMapping } from "../_shared/smartleadLeadImport.ts";
import { leadPayload } from "../_shared/smartleadTransfer.ts";

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { db } = await founderContext(req);
    const body = await objectBody(req);
    const resolution = resolveMapping(await loadSmartleadMappings(db, body), { campaign_mapping_id: body.campaign_mapping_id as string });
    if (!resolution.ok) throw new RequestError(resolution.error, 409);
    const m = resolution.mapping;
    const r = await db.rpc("smartlead_transfer_candidates", { p_mapping: m.id, p_ids: null, p_limit: 50 });
    if (r.error) throw new RequestError("candidate_lookup_failed", 500);
    const gate = await db.from("external_action_gates").select("enabled").eq("gate_key", "smartlead_lead_push_gate").maybeSingle();
    const business = await db.from("business_operating_profiles").select("external_provider_mutation_allowed").eq("business_id", m.business_id).maybeSingle();
    if (gate.error || business.error) throw new RequestError("transfer_gate_lookup_failed", 500);
    const enabled = Deno.env.get("SMARTLEAD_LEAD_PUSH_ENABLED") === "true" && gate.data?.enabled === true && business.data?.external_provider_mutation_allowed === true;
    return json({ ok: true, dry_run: true, campaign_mapping_id: m.id, provider_campaign_id: m.provider_campaign_id,
      provider_campaign_name: m.provider_campaign_name, business_id: m.business_id, liftor_campaign_id: m.liftor_campaign_id,
      eligible_count: r.data?.length ?? 0, lead_push_ready: !!r.data?.length,
      contact_ids: (r.data ?? []).map((c: any) => c.id),
      preview: (r.data ?? []).map((c: any) => leadPayload(c, m.business_id!, m.liftor_campaign_id!)),
      apply_disabled: !enabled,
      notes: "Up to 50 eligible contacts. Transfers require a draft or paused Smartlead campaign. No emails sent by this preview." });
  } catch (error) { return errorResponse(error); }
});
