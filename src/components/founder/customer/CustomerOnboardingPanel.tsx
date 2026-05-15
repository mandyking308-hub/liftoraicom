import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function CustomerOnboardingPanel({ businessId }: { businessId?: string | null }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [contactInput, setContactInput] = useState("");

  const { data } = useQuery({
    queryKey: ['customer-onboarding-panel', businessId ?? null],
    queryFn: async () => {
      let pQ = supabase.from('customer_onboarding_plans').select('id,contact_id,business_id,onboarding_status,onboarding_type,customer_share_allowed,approved_at,risks,onboarding_token,created_at').order('created_at', { ascending: false }).limit(100);
      let tQ = supabase.from('customer_onboarding_tasks').select('id,onboarding_plan_id,task_owner,task_title,task_status,due_at,customer_visible,priority_level,business_id').order('due_at', { ascending: true }).limit(300);
      let eQ = supabase.from('onboarding_email_drafts').select('id,onboarding_plan_id,draft_type,approval_status,send_allowed,customer_facing,business_id').order('created_at', { ascending: false }).limit(200);
      const gQ = supabase.from('external_action_gates').select('gate_key,enabled,confirmation_phrase,max_batch_size').eq('gate_key', 'customer_onboarding_share_gate').maybeSingle();
      if (businessId) { pQ = pQ.eq('business_id', businessId); tQ = tQ.eq('business_id', businessId); eQ = eQ.eq('business_id', businessId); }
      const [p, t, e, g] = await Promise.all([pQ, tQ, eQ, gQ]);
      return { plans: p.data ?? [], tasks: t.data ?? [], emails: e.data ?? [], gate: g.data ?? null };
    },
    staleTime: 30_000,
  });

  const plans = data?.plans ?? [];
  const tasks = data?.tasks ?? [];
  const emails = data?.emails ?? [];
  const gate = data?.gate ?? null;

  const drafts = plans.filter((p: any) => p.onboarding_status === 'draft');
  const approved = plans.filter((p: any) => p.onboarding_status === 'approved');
  const shared = approved.filter((p: any) => p.customer_share_allowed);
  const now = Date.now();
  const overdue = tasks.filter((t: any) => t.due_at && new Date(t.due_at).getTime() < now && t.task_status !== 'done');
  const overdueCustomer = overdue.filter((t: any) => t.task_owner === 'customer').length;
  const overdueCompany = overdue.filter((t: any) => t.task_owner === 'company').length;
  const welcomeDraftsPending = emails.filter((e: any) => e.draft_type === 'welcome_email' && e.approval_status === 'draft').length;
  const beddingPending = emails.filter((e: any) => e.draft_type === 'bedding_in_email' && e.approval_status === 'draft').length;
  const risksCount = plans.reduce((n: number, p: any) => n + (Array.isArray(p.risks) ? p.risks.length : 0), 0);
  const healthScore = plans.length ? Math.round(100 * (1 - Math.min(1, (overdue.length + risksCount) / Math.max(1, plans.length * 4)))) : null;

  const generate = useMutation({
    mutationFn: async (contact_id: string) => {
      setBusy(true);
      const { data, error } = await supabase.functions.invoke('customer-onboarding-plan-generate', {
        body: { contact_id, business_id: businessId ?? undefined, dry_run: false, confirmation: 'CREATE CUSTOMER ONBOARDING PLAN' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Onboarding plan drafted (founder review required)'); qc.invalidateQueries({ queryKey: ['customer-onboarding-panel'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const approve = useMutation({
    mutationFn: async (vars: { plan_id: string; allow_share: boolean }) => {
      const { data, error } = await supabase.functions.invoke('customer-onboarding-approval', {
        body: { plan_id: vars.plan_id, decision: 'approve', allow_customer_share: vars.allow_share, confirmation: 'APPROVE CUSTOMER ONBOARDING' },
      });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success('Onboarding approved'); qc.invalidateQueries({ queryKey: ['customer-onboarding-panel'] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
  });

  const Tile = ({ label, value, tone }: any) => (
    <div className={`rounded-md border border-border/60 bg-background/50 p-3`}>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-semibold ${tone === 'warn' ? 'text-yellow-400' : tone === 'danger' ? 'text-red-400' : tone === 'good' ? 'text-green-400' : ''}`}>{value}</div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2"><Sparkles size={14} /> Customer Onboarding & Bedding-in</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          <Badge variant="outline" className="border-yellow-500/40 text-yellow-300">No external send · Founder approval required</Badge>
          <Badge variant="outline" className={gate?.enabled ? 'border-green-500/40 text-green-400' : 'border-border/60 text-muted-foreground'}>
            <ShieldCheck size={10} className="mr-1" /> Share gate: {gate?.enabled ? 'enabled' : 'disabled'}
          </Badge>
          {healthScore != null && <Badge variant="outline">Onboarding health: {healthScore}%</Badge>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Tile label="Draft plans" value={drafts.length} tone={drafts.length ? 'warn' : 'default'} />
          <Tile label="Approved" value={approved.length} tone="good" />
          <Tile label="Shared with customer" value={shared.length} />
          <Tile label="Overdue (customer)" value={overdueCustomer} tone={overdueCustomer ? 'danger' : 'default'} />
          <Tile label="Overdue (company)" value={overdueCompany} tone={overdueCompany ? 'warn' : 'default'} />
          <Tile label="Risks flagged" value={risksCount} tone={risksCount ? 'warn' : 'default'} />
          <Tile label="Welcome emails pending" value={welcomeDraftsPending} />
          <Tile label="Bedding-in pending" value={beddingPending} />
          <Tile label="Customers in bedding-in" value={shared.length} />
        </div>

        <div className="rounded-md border border-border/60 p-3 space-y-2">
          <div className="text-xs font-medium">Draft new onboarding plan</div>
          <div className="flex gap-2">
            <Input placeholder="Contact UUID" value={contactInput} onChange={(e) => setContactInput(e.target.value)} className="h-8 text-xs" />
            <Button size="sm" disabled={busy || !contactInput} onClick={() => generate.mutate(contactInput.trim())}>Draft plan</Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Customer Success Agent owns this. No emails are sent.</p>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">Pending plans</div>
          {drafts.length === 0 ? <p className="text-[11px] text-muted-foreground">No drafts.</p> : drafts.slice(0, 6).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs border border-border/60 rounded p-2">
              <div className="truncate"><AlertTriangle size={10} className="inline mr-1 text-yellow-400" />{p.id.slice(0, 8)} · contact {String(p.contact_id).slice(0, 8)} · {p.onboarding_type ?? 'standard'}</div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7" onClick={() => approve.mutate({ plan_id: p.id, allow_share: false })}>Approve</Button>
                <Button size="sm" className="h-7" onClick={() => approve.mutate({ plan_id: p.id, allow_share: true })}>Approve + share</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <div className="text-xs font-medium">Recently approved</div>
          {approved.length === 0 ? <p className="text-[11px] text-muted-foreground">None yet.</p> : approved.slice(0, 4).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between gap-2 text-xs border border-border/60 rounded p-2">
              <div className="truncate"><CheckCircle2 size={10} className="inline mr-1 text-green-400" />{p.id.slice(0, 8)} · {p.customer_share_allowed ? 'shared' : 'internal-only'}</div>
              {p.customer_share_allowed && <a className="text-[11px] underline" href={`/onboarding/${p.onboarding_token}`} target="_blank" rel="noreferrer">Preview link</a>}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}