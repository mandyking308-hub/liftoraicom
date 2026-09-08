import { corsHeaders, json, founderContext, objectBody, RequestError, errorResponse } from "../_shared/smartleadEdge.ts";
import { loadSmartleadMappings } from "../_shared/smartleadImportStore.ts";
import { resolveMapping } from "../_shared/smartleadLeadImport.ts";
import { smartleadRequest } from "../_shared/smartleadClient.ts";
import { historyEvents } from "../_shared/smartleadHistory.ts";
import { receiveSmartleadEvent, normaliseSmartleadEvent } from "../_shared/smartleadEvents.ts";

/** Read provider message history directly when configuring/reconciling webhooks.
 * Uses keyset pagination over already imported campaign members. Nothing is sent.
 * A failed member prevents continuation; retry is idempotent. */
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 try {
  const {db,apiKey}=await founderContext(req);const body=await objectBody(req);
  if(!apiKey)throw new RequestError("smartlead_api_key_missing",424);
  const dryRun=body.dry_run!==false;
  if(!dryRun&&Deno.env.get("SMARTLEAD_EVENT_APPLY_ENABLED")!=="true")throw new RequestError("event_apply_disabled",409);
  const resolved=resolveMapping(await loadSmartleadMappings(db,body),{campaign_mapping_id:body.campaign_mapping_id as string});
  if(!resolved.ok)throw new RequestError(resolved.error,409);
  const m=resolved.mapping;
  let q=db.from("outbound_provider_lead_mappings").select("id,provider_lead_id,contact_email")
    .eq("provider_type","smartlead").eq("campaign_mapping_id",m.id).not("provider_lead_id","is",null).order("id").limit(6);
  if(typeof body.after_id==="string")q=q.gt("id",body.after_id);
  const rows=await q;if(rows.error)throw new RequestError("lead_lookup_failed",500);
  const batch=(rows.data??[]).slice(0,5);const results=[];
  let complete=true;
  for(const lead of batch){
   const result=await smartleadRequest(apiKey,`/campaigns/${encodeURIComponent(m.provider_campaign_id!)}/leads/${encodeURIComponent(lead.provider_lead_id!)}/message-history?show_plain_text_response=true`);
   try {
    if(result.status<200||result.status>=300)throw new Error("provider_history_read_failed");
    const events=historyEvents(result.body,m.provider_campaign_id!,lead.provider_lead_id!,lead.contact_email);
    for(const event of events) {
      if(dryRun)await normaliseSmartleadEvent(event);
      else await receiveSmartleadEvent(db,event,true);
    }
    results.push({lead_mapping_id:lead.id,ok:true,messages:events.length});
   } catch {complete=false;results.push({lead_mapping_id:lead.id,ok:false,error:"history_sync_failed_check_provider_payload_and_mapping"});break;}
  }
  return json({ok:complete,dry_run:dryRun,results,page_complete:complete,
    next_after_id:complete&&(rows.data?.length??0)>5?batch[batch.length-1].id:null,
    resume_after_id:complete?null:body.after_id??null,emails_sent:0,
    note:"Reconcile a full cycle from the start to collect new replies. A schedule has not been installed."});
 }catch(error){return errorResponse(error);}
});
