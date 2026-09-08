import { useEffect,useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SmartleadReplySyncPanel(){
 const [campaigns,setCampaigns]=useState<any[]>([]);const [mapping,setMapping]=useState("");
 const [after,setAfter]=useState<string|null>(null);const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
 useEffect(()=>{supabase.from("outbound_provider_campaign_mappings").select("id,provider_campaign_name,provider_campaign_id")
  .eq("provider_type","smartlead").eq("is_active",true).eq("mapping_status","mapped").order("id")
  .then(({data,error})=>{if(error)setMessage("Could not load campaign mappings.");else setCampaigns(data??[]);});},[]);
 const sync=async()=>{
  setBusy(true);try{
   const {data,error}=await supabase.functions.invoke("smartlead-message-sync",{body:{campaign_mapping_id:mapping,after_id:after,dry_run:false}});
   if(error||!data?.ok)throw new Error();
   setAfter(data.next_after_id);
   setMessage(`${data.results.reduce((n:number,r:any)=>n+(r.messages??0),0)} messages checked. ${data.next_after_id?"Continue with the next batch.":"This cycle is complete."}`);
  }catch{setMessage("Message sync did not finish. Check the connection and reply-processing setup, then retry this batch.");}finally{setBusy(false);}
 };
 return <Card className="p-5 space-y-3"><h3 className="text-lg font-semibold">Bring campaign replies into Liftor</h3>
  <p className="text-sm text-muted-foreground">Read the message history for imported contacts. Replies are saved under the correct business in Communications; no automatic response is sent.</p>
  <select aria-label="Reply sync campaign" className="w-full p-2 border rounded bg-background" value={mapping} disabled={busy} onChange={e=>{setMapping(e.target.value);setAfter(null);setMessage("");}}>
   <option value="">Choose a mapped campaign</option>{campaigns.map(c=><option key={c.id} value={c.id}>{c.provider_campaign_name??c.provider_campaign_id}</option>)}
  </select>
  <Button onClick={sync} disabled={!mapping||busy}>{busy?"Syncing…":after?"Sync next batch":"Sync messages"}</Button>
  <a href="/founder/communications/received" className="ml-3 text-sm underline">View received messages</a>
  {message&&<p role="status" className="text-sm">{message}</p>}
 </Card>;
}
