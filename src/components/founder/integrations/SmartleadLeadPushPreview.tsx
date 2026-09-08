import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SmartleadLeadPushPreview() {
  const [mappings,setMappings]=useState<any[]>([]);
  const [mappingId,setMappingId]=useState("");
  const [preview,setPreview]=useState<any>(null);
  const [result,setResult]=useState<any>(null);
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  useEffect(()=>{
    supabase.from("outbound_provider_campaign_mappings").select("id,provider_campaign_name,provider_campaign_id")
      .eq("provider_type","smartlead").eq("is_active",true).eq("mapping_status","mapped").order("id").then(({data,error})=>{
        if(error)setError("Could not load campaign mappings.");else setMappings(data??[]);
      });
  },[]);
  const run=async(apply=false)=>{
    setBusy(true);setError("");
    try {
      const {data,error}=await supabase.functions.invoke(apply?"smartlead-lead-push-apply":"smartlead-lead-push-preview",{
        body:apply?{campaign_mapping_id:mappingId,contact_ids:preview.contact_ids,dry_run:false,confirmation_phrase:confirmation}
          :{campaign_mapping_id:mappingId},
      });
      if(error)throw error;
      if(apply){setResult(data);setPreview(null);setConfirmation("");}else setPreview(data);
      if(data?.ok===false)setError(data.error??data.action??"The operation could not complete.");
    }catch{setError("The transfer service could not complete the request. Check the connection and deployment; preview again before retrying.");}
    finally{setBusy(false);}
  };
  return <Card className="p-5 space-y-4">
    <h3 className="text-lg font-semibold">Transfer Liftor contacts to a Smartlead campaign</h3>
    <p className="text-sm text-muted-foreground">Transfer up to 50 eligible contacts at a time into a draft or paused campaign. Launch and daily sending are managed in Smartlead.</p>
    <label className="block text-sm">Campaign
      <select className="block w-full mt-1 p-2 border rounded bg-background" value={mappingId} disabled={busy} onChange={e=>{setMappingId(e.target.value);setPreview(null);setResult(null);setConfirmation("");}}>
        <option value="">Choose a mapped campaign</option>
        {mappings.map(m=><option key={m.id} value={m.id}>{m.provider_campaign_name??m.provider_campaign_id}</option>)}
      </select>
    </label>
    <Button variant="outline" disabled={!mappingId||busy} onClick={()=>run()}>Preview eligible contacts</Button>
    {error&&<p className="text-sm text-destructive" role="alert">{error}</p>}
    {preview?.ok&&<>
      <p className="text-sm">{preview.eligible_count} eligible contacts in this batch. Existing campaign members and suppressed contacts are excluded.</p>
      <div className="max-h-60 overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Contact</th><th className="text-left">Company</th><th className="text-left">Email</th></tr></thead>
        <tbody>{preview.preview?.map((p:any)=><tr key={p.email}><td>{p.first_name} {p.last_name}</td><td>{p.company_name}</td><td>{p.email}</td></tr>)}</tbody></table></div>
      {preview.apply_disabled?<p className="text-sm">Contact transfer is not enabled for this business. Complete the connection and business activation setup first.</p>:preview.eligible_count>0&&<>
        <label className="block text-sm">To transfer this batch, enter PUSH SMARTLEAD LEADS<Input value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label>
        <Button disabled={busy||confirmation!=="PUSH SMARTLEAD LEADS"} onClick={()=>run(true)}>Transfer reviewed batch</Button>
      </>}
    </>}
    {result&&<p className="text-sm" role="status">{result.blocked?"Transfer remains disabled.":result.reconciliation_required?
      "The provider result needs reconciliation. Import this campaign into Liftor to check its members; these contacts remain reserved to prevent another upload."
      :`${result.leads_pushed??0} contacts transferred. The campaign has not been started.`}</p>}
  </Card>;
}
