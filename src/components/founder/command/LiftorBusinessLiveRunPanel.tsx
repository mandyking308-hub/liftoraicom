import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Rocket, Play, RefreshCw, ShieldAlert, ShieldCheck, Lock } from "lucide-react";

const PHRASE = "RUN LIFTOR INTERNAL AGENTS";

const SCOPES = [
  { value: "all_internal", label: "All internal agents" },
  { value: "crm_capture", label: "CRM interaction capture" },
  { value: "engagement_agent", label: "AI Engagement Agent" },
  { value: "approval_queue", label: "Founder approval refresh" },
  { value: "proposal_agent", label: "Proposal Agent" },
  { value: "commercial_agent", label: "Commercial Agent" },
  { value: "revenue_agent", label: "Revenue / Supplier review" },
] as const;

type AuditRow = {
  id: string; agent_key: string | null; action_type: string; source_function: string | null;
  action_status: string; blocked_reason: string | null; dry_run: boolean; created_at: string;
  metadata: any;
};

export function LiftorBusinessLiveRunPanel() {
  const [scope, setScope] = useState<string>("all_internal");
  const [dryRun, setDryRun] = useState(true);
  const [maxItems, setMaxItems] = useState(10);
  const [phrase, setPhrase] = useState("");
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const { toast } = useToast();

  const loadAudit = async () => {
    const { data } = await supabase
      .from("agent_action_audit_log")
      .select("id,agent_key,action_type,source_function,action_status,blocked_reason,dry_run,created_at,metadata")
      .eq("agent_key", "liftor_business_live_runner")
      .order("created_at", { ascending: false })
      .limit(15);
    setAudit((data as AuditRow[]) ?? []);
  };

  useEffect(() => { loadAudit(); }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("liftor-business-live-run", {
        body: { run_scope: scope, dry_run: dryRun, max_items: maxItems, confirmation_phrase: dryRun ? undefined : phrase },
      });
      if (error) throw error;
      setLastResult(data);
      const blocked = (data as any)?.blocked;
      const t = (data as any)?.totals ?? {};
      toast({
        title: blocked ? "Run blocked" : dryRun ? "Dry-run complete" : "Internal agents ran",
        description: blocked
          ? `Reason: ${(data as any)?.reason}`
          : `Tasks ${t.tasks_created ?? 0} • Drafts ${t.drafts_created ?? 0} • Approvals ${t.approvals_created ?? 0} • Handoffs ${t.handoffs_created ?? 0}`,
        variant: blocked ? "destructive" : "default",
      });
      await loadAudit();
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const totals = lastResult?.totals ?? {};
  const steps: any[] = lastResult?.steps ?? [];

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> Run Liftor — internal agents only
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />no autonomous send</Badge>
            <Badge variant="outline" className="text-[10px]">no Apollo spend</Badge>
            <Badge variant="outline" className="text-[10px]">no Smartlead POST</Badge>
            <Badge variant="outline" className="text-[10px]">no campaign start</Badge>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadAudit}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">Scope</Label>
            <Select value={scope} onValueChange={setScope}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SCOPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="lblr-dry" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="lblr-dry" className="cursor-pointer text-sm">Dry-run</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="lblr-max" className="text-sm whitespace-nowrap">Max items</Label>
            <Input id="lblr-max" type="number" min={1} max={50} value={maxItems}
              onChange={(e) => setMaxItems(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
              className="h-8 w-20" />
          </div>
        </div>

        {!dryRun && (
          <Input placeholder={`Type: ${PHRASE}`} value={phrase} onChange={(e) => setPhrase(e.target.value)} className="h-8 text-xs font-mono" />
        )}

        <Button onClick={run} disabled={running || (!dryRun && phrase !== PHRASE)} className="w-full">
          <Play className="h-4 w-4 mr-2" />
          {running ? "Running…" : dryRun ? "Run dry-run preview" : "Run internal agents (create internal records)"}
        </Button>

        {lastResult && (
          <div className="rounded-md border border-border/50 p-3 text-sm space-y-3">
            <div className="flex items-center gap-2">
              {lastResult.blocked ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
              <span className="font-medium">
                {lastResult.blocked ? `Blocked: ${lastResult.reason}` : `Last run (${lastResult.dry_run ? "dry-run" : "live internal"}) · scope: ${lastResult.scope}`}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Tasks created" value={totals.tasks_created ?? 0} />
              <Stat label="Drafts created" value={totals.drafts_created ?? 0} />
              <Stat label="Approvals pending" value={totals.approvals_created ?? 0} />
              <Stat label="Next actions" value={totals.next_actions_created ?? 0} />
              <Stat label="Handoffs" value={totals.handoffs_created ?? 0} />
              <Stat label="Reviews" value={totals.reviews_created ?? 0} />
              <Stat label="Captured" value={totals.captured ?? 0} />
              <Stat label="Candidates" value={totals.candidates_found ?? 0} />
            </div>
            {steps.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/40">
                <div className="font-medium text-muted-foreground">Steps</div>
                {steps.map((s, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <span className="font-mono truncate">{s.scope} → {s.function}</span>
                    <div className="flex items-center gap-1">
                      {s.blocked && <Badge variant="secondary" className="text-[10px]">blocked: {s.reason}</Badge>}
                      <Badge variant={s.ok ? "default" : "destructive"} className="text-[10px]">{s.ok ? "ok" : `err ${s.status ?? ""}`}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-1 pt-2 border-t border-border/40 text-[10px]">
              <Badge variant="outline">emails sent: {lastResult.emails_sent ?? 0}</Badge>
              <Badge variant="outline">apollo: {String(lastResult.apollo_called ?? false)}</Badge>
              <Badge variant="outline">smartlead POST: {String(lastResult.smartlead_post_called ?? false)}</Badge>
              <Badge variant="outline">external sends locked: {String(lastResult.external_sends_locked ?? true)}</Badge>
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Recent runs</div>
          {audit.length === 0 ? (
            <div className="text-xs text-muted-foreground">No runs yet.</div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {audit.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-xs rounded border border-border/40 px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono">{row.action_type}</span>
                    <span className="text-muted-foreground ml-2">{row.metadata?.scope ?? ""}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.dry_run && <Badge variant="outline" className="text-[10px]">dry</Badge>}
                    <Badge variant={row.action_status === "applied" ? "default" : row.action_status === "blocked" ? "secondary" : row.action_status === "error" ? "destructive" : "outline"} className="text-[10px]">
                      {row.action_status}{row.blocked_reason ? `: ${row.blocked_reason}` : ""}
                    </Badge>
                    <span className="text-muted-foreground whitespace-nowrap">{new Date(row.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded border border-border/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

export default LiftorBusinessLiveRunPanel;