import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Target, Sparkles, ListChecks, Database } from "lucide-react";
import { toast } from "sonner";

type Props = { businessId?: string | null };

export default function StrategicProspectingAgentPanel({ businessId = null }: Props) {
  const qc = useQueryClient();
  const [goal, setGoal] = useState("Find top strategic accounts for this business");
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["strategic-prospecting", businessId ?? null],
    queryFn: async () => {
      let jobsQ = supabase.from("prospecting_search_jobs").select("id,job_name,search_status,external_search_allowed,credit_spend_allowed,created_at").order("created_at", { ascending: false }).limit(20);
      let accQ = supabase.from("strategic_target_accounts").select("id,account_name,account_type,overall_priority_score,recommended_channel,approval_status,duplicate_risk,do_not_contact_risk,promoted_to_crm,crm_match_status").order("overall_priority_score", { ascending: false }).limit(25);
      let listQ = supabase.from("strategic_account_lists").select("id,list_name,list_type,target_count,list_status,created_at").order("created_at", { ascending: false }).limit(10);
      let srcQ = supabase.from("prospecting_source_registry").select("source_key,source_name,enabled,credit_spend_risk,external_api").order("source_key");
      if (businessId) { jobsQ = jobsQ.eq("business_id", businessId); accQ = accQ.eq("business_id", businessId); listQ = listQ.eq("business_id", businessId); }
      const [jobs, accounts, lists, sources] = await Promise.all([jobsQ, accQ, listQ, srcQ]);
      return { jobs: jobs.data ?? [], accounts: accounts.data ?? [], lists: lists.data ?? [], sources: sources.data ?? [] };
    },
    staleTime: 30_000,
  });

  const create = useMutation({
    mutationFn: async (persist: boolean) => {
      if (!businessId) throw new Error("Select a business first.");
      setBusy(true);
      const { data, error } = await supabase.functions.invoke("prospecting-job-generate", { body: { business_id: businessId, search_goal: goal, founder_brief: brief, dry_run: !persist, confirmation: persist ? "CREATE PROSPECTING JOB" : undefined } });
      if (error) throw error; return data;
    },
    onSuccess: () => { toast.success("Prospecting job ready."); qc.invalidateQueries({ queryKey: ["strategic-prospecting"] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const run = useMutation({
    mutationFn: async (persist: boolean) => {
      if (!businessId) throw new Error("Select a business first.");
      setBusy(true);
      const { data, error } = await supabase.functions.invoke("prospecting-agent-run", { body: { business_id: businessId, dry_run: !persist, confirmation: persist ? "RUN PROSPECTING AGENT" : undefined } });
      if (error) throw error; return data;
    },
    onSuccess: (d: any) => { toast.success(`Prospecting agent: ${d?.candidates ?? 0} candidates ranked.`); qc.invalidateQueries({ queryKey: ["strategic-prospecting"] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const matchPreview = useMutation({
    mutationFn: async () => { setBusy(true); const { data, error } = await supabase.functions.invoke("prospect-crm-match-preview", { body: { business_id: businessId } }); if (error) throw error; return data; },
    onSuccess: (d: any) => toast.success(`CRM match preview: ${d?.checked ?? 0} checked. No mutation.`),
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const list = useMutation({
    mutationFn: async (persist: boolean) => { if (!businessId) throw new Error("Select a business first."); setBusy(true); const { data, error } = await supabase.functions.invoke("strategic-account-list-generate", { body: { business_id: businessId, list_type: "top_25_targets", target_count: 25, dry_run: !persist, confirmation: persist ? "CREATE STRATEGIC ACCOUNT LIST" : undefined } }); if (error) throw error; return data; },
    onSuccess: (d: any) => { toast.success(`Top 25 list: ${d?.count ?? 0} accounts.`); qc.invalidateQueries({ queryKey: ["strategic-prospecting"] }); },
    onError: (e: any) => toast.error(`Failed: ${e?.message ?? e}`),
    onSettled: () => setBusy(false),
  });

  const sources = data?.sources ?? [];
  const externalUnlocked = sources.filter((s: any) => s.external_api && s.enabled).length;
  const apolloUnlocked = sources.filter((s: any) => s.credit_spend_risk && s.enabled).length;

  const Tile = ({ label, value, tone }: { label: string; value: any; tone?: string }) => (
    <div className="rounded-lg border border-border/50 bg-secondary/30 p-3">
      <div className={`text-2xl font-bold ${tone ?? ''}`}>{value ?? '—'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );

  return (
    <Card className="bg-card border-border/50" id="sec-strategic-prospecting">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><Target size={14} className="text-primary" /> Strategic Prospecting Agent · Target Account Ranking</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-yellow-500/40 text-yellow-300 text-[10px]">No Apollo spend · No Smartlead push · No send</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile label="Active prospecting jobs" value={(data?.jobs ?? []).filter((j: any) => j.search_status !== 'archived').length} />
          <Tile label="Top ranked prospects" value={data?.accounts?.length ?? 0} />
          <Tile label="Strategic lists" value={data?.lists?.length ?? 0} />
          <Tile label="Pending founder approvals" value={(data?.accounts ?? []).filter((a: any) => a.approval_status === 'pending').length} tone="text-yellow-300" />
          <Tile label="Duplicate risks" value={(data?.accounts ?? []).filter((a: any) => a.duplicate_risk).length} />
          <Tile label="Do-not-contact risks" value={(data?.accounts ?? []).filter((a: any) => a.do_not_contact_risk).length} tone="text-destructive" />
          <Tile label="External search unlocked" value={externalUnlocked} tone={externalUnlocked ? 'text-yellow-300' : 'text-emerald-300'} />
          <Tile label="Apollo credit spend unlocked" value={apolloUnlocked} tone={apolloUnlocked ? 'text-destructive' : 'text-emerald-300'} />
        </div>

        <div className="rounded-lg border border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="text-xs font-medium flex items-center gap-2"><Sparkles size={12} className="text-primary" /> Create prospecting job</div>
          <Input placeholder="Search goal" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <Textarea placeholder="Founder brief (optional)" value={brief} onChange={(e) => setBrief(e.target.value)} rows={2} />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={busy || !businessId} onClick={() => create.mutate(false)}>Preview job (dry-run)</Button>
            <Button size="sm" disabled={busy || !businessId} onClick={() => create.mutate(true)}>Create prospecting job</Button>
            <span className="text-[10px] text-muted-foreground">Confirmation phrase: CREATE PROSPECTING JOB · No external search by default.</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={busy || !businessId} onClick={() => run.mutate(false)}><Sparkles size={12} /> Rank prospects (dry-run)</Button>
          <Button size="sm" disabled={busy || !businessId} onClick={() => run.mutate(true)}>Run prospecting agent</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => matchPreview.mutate()}><Database size={12} /> CRM match preview</Button>
          <Button size="sm" variant="outline" disabled={busy || !businessId} onClick={() => list.mutate(false)}><ListChecks size={12} /> Top 25 list (dry-run)</Button>
          <Button size="sm" disabled={busy || !businessId} onClick={() => list.mutate(true)}>Generate top 25 list</Button>
        </div>

        {(data?.accounts ?? []).length > 0 && (
          <div className="rounded-lg border border-border/50 bg-secondary/10 p-3">
            <div className="text-xs font-medium mb-2">Top ranked target accounts</div>
            <div className="space-y-1 max-h-64 overflow-auto">
              {(data?.accounts ?? []).map((a: any) => (
                <div key={a.id} className="flex items-center justify-between text-[11px] border-b border-border/20 py-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.account_name}</span>
                    <Badge variant="outline" className="text-[9px]">{a.account_type ?? 'unknown'}</Badge>
                    <Badge variant="outline" className="text-[9px]">{a.recommended_channel ?? '—'}</Badge>
                    {a.duplicate_risk && <Badge variant="outline" className="text-[9px] border-yellow-500/40 text-yellow-300">duplicate</Badge>}
                    {a.do_not_contact_risk && <Badge variant="outline" className="text-[9px] border-destructive/40 text-destructive">DNC</Badge>}
                    {a.promoted_to_crm && <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300">in CRM</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">score</span>
                    <span className="font-mono">{a.overall_priority_score ?? '—'}</span>
                    <Badge variant="outline" className="text-[9px]">{a.approval_status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-[11px] text-muted-foreground">
          Owner agent: prospecting_agent. Connected to win-back agent (reactivation_targets) and CRM. Promote-to-CRM and outreach are gated separately. Apollo credit spend, Smartlead lead push and external search are locked at the External Action Gates layer.
        </div>
      </CardContent>
    </Card>
  );
}