import { corsHeaders, json, founderContext, objectBody, RequestError, errorResponse } from "../_shared/smartleadEdge.ts";

// Replays persisted events into business-scoped communication records. No AI
// invocation, automated reply, campaign start or other provider write.
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { db } = await founderContext(req);
    const body = await objectBody(req);
    const dryRun = body.dry_run !== false;
    const enabled = Deno.env.get("SMARTLEAD_EVENT_APPLY_ENABLED") === "true";
    if (!dryRun && (!enabled || body.confirmation !== "BUILD INTAKE ONLY"))
      return json({ ok: true, blocked: true, reason: "event_apply_not_enabled_or_confirmed", emails_sent: 0 });
    let q = db.from("outbound_provider_events").select("id,provider_event_type,provider_campaign_id,processing_status")
      .eq("provider_type","smartlead").eq("operational_mutation_applied",false)
      .in("processing_status",["received","error"]).order("received_at").order("id").limit(50);
    if (typeof body.provider_campaign_id === "string") q=q.eq("provider_campaign_id",body.provider_campaign_id);
    const events=await q;
    if (events.error) throw new RequestError("event_lookup_failed",500);
    if (dryRun) return json({ ok:true,dry_run:true,events:events.data,apply_enabled:enabled,emails_sent:0 });
    const results=[];
    for (const event of events.data ?? []) {
      const r=await db.rpc("smartlead_apply_provider_event",{p_event:event.id});
      results.push({event_id:event.id,ok:!r.error,...(r.error?{error:"event_application_failed_check_mapping_and_payload"}:r.data)});
    }
    return json({ok:results.every(r=>r.ok),results,emails_sent:0,ai_drafts_created:0});
  } catch(error) {return errorResponse(error);}
});
