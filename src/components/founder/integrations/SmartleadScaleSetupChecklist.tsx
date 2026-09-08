import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { ExternalLink, RefreshCcw } from "lucide-react";
import { mailboxCapacity, validateMailboxPlan, type MailboxPlan } from "@/lib/smartleadMailboxPlan";

type Business = { id: string; name: string };
export default function SmartleadScaleSetupChecklist() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [plans, setPlans] = useState<MailboxPlan[]>([]);
  const [error, setError] = useState("");
  const [test, setTest] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("businesses").select("id,name").order("name"),
      (supabase as any).from("smartlead_business_setup").select("*").order("business_id"),
    ]).then(([b,p]) => {
      if (!active) return;
      setBusinesses(b.data ?? []);
      if (b.error || p.error) setError("The outreach setup could not be loaded. Check database access and deploy the Smartlead setup migration before saving.");
      else setPlans(p.data ?? []);
      setLoading(false);
    }).catch(() => { if (active) { setError("The outreach setup could not be loaded."); setLoading(false); } });
    return () => { active = false; };
  }, []);
  const update = (id: string, patch: Partial<MailboxPlan>) => setPlans(rows => rows.map(r => r.business_id === id ? { ...r, ...patch } : r));
  const add = (id: string) => {
    if (!id || plans.some(p => p.business_id === id)) return;
    setPlans([...plans, { business_id:id,website:"",sender_name:"",reply_owner_email:"",proposed_domains:[],mailbox_target:50,daily_per_mailbox:20 }]);
  };
  const save = async () => {
    const problem = validateMailboxPlan(plans);
    if (problem) { toast({title:problem,variant:"destructive"}); return; }
    setBusy(true);
    try {
      const result = await (supabase as any).from("smartlead_business_setup").upsert(plans.map(p=>({...p,proposed_domains:p.proposed_domains.map(d=>d.trim().toLowerCase()).filter(Boolean),updated_at:new Date().toISOString()})),{onConflict:"business_id"});
      if(result.error) throw result.error;
      toast({title:"Mailbox plan saved",description:"Ready to use when ordering and assigning the sending accounts."});
    } catch { toast({title:"Could not save mailbox plan",variant:"destructive"}); }
    finally { setBusy(false); }
  };
  const check = async () => {
    setBusy(true);
    try {
      const result = await supabase.functions.invoke("smartlead-test-connection",{body:{}});
      if(result.error) throw result.error;
      setTest(result.data);
    } catch { setTest({ok:false,error:"Connection check failed. No account state verified."}); }
    finally { setBusy(false); }
  };
  const capacity = mailboxCapacity(plans);
  return <Card id="smartlead-scale-setup-checklist" data-testid="smartlead-scale-setup-checklist" className="p-5 space-y-5 scroll-mt-24">
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div><h3 className="text-lg font-semibold">Set up outreach for your businesses</h3>
        <p className="text-sm text-muted-foreground">Plan the mailboxes, connect Smartlead, then prepare each business’s campaign.</p></div>
      <Button variant="outline" onClick={check} disabled={busy} data-testid="smartlead-rerun-readiness-btn"><RefreshCcw className="mr-2 h-4 w-4"/>Check Smartlead connection</Button>
    </div>
    <div className="grid sm:grid-cols-3 gap-3 text-sm">
      <div className="border rounded-lg p-3"><strong>Smartlead Unlimited Smart · $174/month</strong><p>150,000 campaign sends and 50,000 verified prospect emails monthly.</p><a className="underline" href="https://www.smartlead.ai/pricing" target="_blank" rel="noreferrer">View Smartlead plan</a></div>
      <div className="border rounded-lg p-3"><strong>Winnr Enterprise · $189/month</strong><p>200 mailboxes with space for 40 sending domains.</p><a className="underline" href="https://winnr.app/" target="_blank" rel="noreferrer">Open Winnr <ExternalLink className="inline h-3 w-3"/></a></div>
      <div className="border rounded-lg p-3"><strong>$363/month combined</strong><p>Before domains, taxes and optional extras. Published prices checked 8 September 2026.</p><p className="mt-1">Saving a plan does not purchase or connect accounts.</p></div>
    </div>
    <div className="rounded-lg bg-muted/40 p-3 text-sm" role="status">
      {test ? test.ok ? <>Connection verified. {test.email_account_count} mailboxes found; {test.warmup_account_count} have warmup enabled. Sending readiness still needs checking for each campaign.</>
        : <>Connection not verified: {test.error ?? test.reason ?? "Check account credentials."}</>
        : <>Connection has not been checked in this session. Mailbox purchases and warmup are separate from the Smartlead subscription.</>}
    </div>
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
    {!loading && !error && <>
      <label className="block text-sm font-medium">Add a business from Liftor
        <select aria-label="Add a business from Liftor" className="block mt-2 w-full rounded border bg-background p-2" value="" onChange={e=>add(e.target.value)}>
          <option value="">Choose a business</option>
          {businesses.filter(b=>!plans.some(p=>p.business_id===b.id)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
      </label>
      {plans.map(p=><fieldset key={p.business_id} className="border rounded-lg p-4 space-y-3">
        <legend className="px-2 font-semibold">{businesses.find(b=>b.id===p.business_id)?.name ?? "Business"}</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="text-sm">Business website<Input value={p.website} onChange={e=>update(p.business_id,{website:e.target.value})} placeholder="https://yourbusiness.com"/></label>
          <label className="text-sm">Sender display name<Input value={p.sender_name} onChange={e=>update(p.business_id,{sender_name:e.target.value})}/></label>
          <label className="text-sm">Person managing replies · email<Input type="email" value={p.reply_owner_email} onChange={e=>update(p.business_id,{reply_owner_email:e.target.value})}/></label>
          <label className="text-sm">Proposed sending domains · comma separated<Input value={p.proposed_domains.join(",")} onChange={e=>update(p.business_id,{proposed_domains:e.target.value.split(",")})}/></label>
          <label className="text-sm">Mailbox target<Input type="number" min={1} max={200} value={p.mailbox_target} onChange={e=>update(p.business_id,{mailbox_target:Number(e.target.value)})}/></label>
          <label className="text-sm">Campaign emails per mailbox daily after warmup<Input type="number" min={1} max={50} value={p.daily_per_mailbox} onChange={e=>update(p.business_id,{daily_per_mailbox:Number(e.target.value)})}/></label>
        </div>
      </fieldset>)}
      <p className="text-sm"><strong>{capacity.mailboxes} planned mailboxes · {capacity.daily.toLocaleString()} emails/day · {capacity.monthly.toLocaleString()} over 22 working days.</strong> Initial emails and follow-ups share this capacity. Actual volume depends on account health; new domains need warmup.</p>
      <Button onClick={save} disabled={busy || plans.length===0}>Save mailbox plan</Button>
    </>}
    <ol className="list-decimal pl-5 text-sm space-y-2">
      <li>Order the agreed mailboxes and business-specific sending domains in Winnr.</li>
      <li>Export Winnr’s Smartlead mailbox file, import it in Smartlead and enable warmup.</li>
      <li>Use SmartProspect to select contacts, add them to a draft campaign and map that campaign to its Liftor business below.</li>
      <li>Import contacts into Liftor. Review the sequence, sender assignments and schedule in Smartlead before launch.</li>
    </ol>
  </Card>;
}
