import { corsHeaders,json,founderContext,RequestError,errorResponse } from "../_shared/smartleadEdge.ts";
import { smartleadRequest } from "../_shared/smartleadClient.ts";
import { collectSmartleadAccounts } from "../_shared/smartleadAccounts.ts";

Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 try{
  const {db,apiKey}=await founderContext(req);
  const provider=await db.from("outbound_providers").select("id").eq("provider_type","smartlead").maybeSingle();
  if(provider.error)throw new RequestError("provider_lookup_failed",500);
  if(!provider.data)throw new RequestError("smartlead_provider_row_missing",404);
  if(!apiKey)return json({ok:false,tested:false,reason:"credentials_missing",credentials_present:false});
  const cr=await smartleadRequest(apiKey,"/campaigns/?include_tags=true");
  const campaigns=Array.isArray(cr.body)?cr.body:Array.isArray(cr.body?.data)?cr.body.data:null;
  const campaignsOk=cr.status>=200&&cr.status<300&&campaigns!==null;
  const ar=await collectSmartleadAccounts(offset=>smartleadRequest(apiKey,`/email-accounts/?offset=${offset}&limit=100`));
  const ok=campaignsOk&&ar.ok;
  const error=ok?null:`campaigns_http_${cr.status}; ${ar.error??"accounts_ok"}${ar.ok?"":`_http_${ar.status}`}`;
  const at=new Date().toISOString();
  const metadata=await db.from("outbound_providers").update({status:ok?"connected":"error",provider_health:ok?"ok":"error",
    credentials_present:true,last_test_at:at,last_error:error,updated_at:at}).eq("id",provider.data.id).select("id").single();
  return json({ok,tested:true,provider_id:provider.data.id,credentials_present:true,tested_at:at,
    metadata_saved:!metadata.error,http_status:{campaigns:cr.status,email_accounts:ar.status},
    campaign_count:campaignsOk?campaigns.length:null,
    active_campaign_count:campaignsOk?campaigns.filter((c:any)=>["ACTIVE","STARTED"].includes(String(c.status).toUpperCase())).length:null,
    drafted_campaign_count:campaignsOk?campaigns.filter((c:any)=>["DRAFT","DRAFTED"].includes(String(c.status).toUpperCase())).length:null,
    campaigns:campaignsOk?campaigns.map((c:any)=>({id:c.id,name:c.name??c.campaign_name,status:c.status})):[],
    email_account_count:ar.accounts?.length??null,
    warmup_account_count:ar.accounts?.filter((a:any)=>a.warmup_enabled===true||String(a.warmup_details?.status??a.warmup_status).toUpperCase()==="ACTIVE").length??null,
    sending_accounts_present:ar.ok?!!ar.accounts?.length:null,
    webhook_configured:null,webhook_count:null,analytics_overview_ok:null,
    blockers:[...(!campaignsOk?["campaign_access_not_verified"]:[]),...(!ar.ok?[ar.error]:[]),...(ar.ok&&!ar.accounts?.length?["mailboxes_not_connected"]:[])],
    error,notes:"Mailbox inventory was paginated. Warmup enabled is not proof of sending readiness. Webhook delivery and campaign readiness need separate checks. No contacts revealed or emails sent."});
 }catch(error){return errorResponse(error);}
});
