import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bot, Play, RefreshCw, ShieldAlert, ShieldCheck } from "lucide-react";

type AuditRow = {
  id: string; agent_key: string | null; action_type: string;
  source_function: string | null; target_table: string | null; target_id: string | null;
  action_status: string; blocked_reason: string | null; dry_run: boolean; created_at: string;
};

const PHRASE = "RUN AI ENGAGEMENT AGENT";

export function AIEngagementAgentLivePanel() {
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
      .select("id,agent_key,action_type,source_function,target_table,target_id,action_status,blocked_reason,dry_run,created_at")
      .eq("agent_key", "ai_engagement_agent")
      .order("created_at", { ascending: false })
      .limit(20);
    setAudit((data as AuditRow[]) ?? []);
  };

  useEffect(() => { loadAudit(); }, []);

  const run = async () => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-engagement-agent-run", {
        body: { dry_run: dryRun, max_items: maxItems, confirmation_phrase: dryRun ? undefined : phrase },
      });
      if (error) throw error;
      setLastResult(data);
      const blocked = (data as any)?.blocked;
      toast({
        title: blocked ? "Run blocked" : dryRun ? "Dry-run complete" : "Live run complete",
        description: blocked
          ? `Reason: ${(data as any)?.reason}`
          : `Candidates: ${(data as any)?.candidates_found ?? 0} • Tasks: ${(data as any)?.tasks_created ?? 0} • Drafts: ${(data as any)?.drafts_created ?? 0} • Approvals: ${(data as any)?.approvals_created ?? 0}`,
        variant: blocked ? "destructive" : "default",
      });
      await loadAudit();
    } catch (e: any) {
      toast({ title: "Run failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-primary" />AI Engagement Agent (live, internal-only)</CardTitle>
          <CardDescription className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-[10px]">no external send</Badge>
            <Badge variant="outline" className="text-[10px]">no Apollo</Badge>
            <Badge variant="outline" className="text-[10px]">no Smartlead POST</Badge>
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={loadAudit}><RefreshCw className="h-4 w-4" /></Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-2">
            <Switch id="dry" checked={dryRun} onCheckedChange={setDryRun} />
            <Label htmlFor="dry" className="cursor-pointer text-sm">Dry-run (no inserts)</Label>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="max" className="text-sm whitespace-nowrap">Max items</Label>
            <Input id="max" type="number" min={1} max={50} value={maxItems} onChange={(e) => setMaxItems(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} className="h-8 w-20" />
          </div>
          <div className="flex items-center gap-2">
            <Input placeholder={`Type: ${PHRASE}`} value={phrase} onChange={(e) => setPhrase(e.target.value)} disabled={dryRun} className="h-8 text-xs font-mono" />
          </div>
        </div>

        <Button onClick={run} disabled={running || (!dryRun && phrase !== PHRASE)} className="w-full">
          <Play className="h-4 w-4 mr-2" /> {running ? "Running..." : dryRun ? "Run dry-run preview" : "Create internal records (no send)"}
        </Button>

        {lastResult && (
          <div className="rounded-md border border-border/50 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              {lastResult.blocked ? <ShieldAlert className="h-4 w-4 text-destructive" /> : <ShieldCheck className="h-4 w-4 text-emerald-500" />}
              <span className="font-medium">{lastResult.blocked ? `Blocked: ${lastResult.reason}` : `Last run (${lastResult.dry_run ? "dry-run" : "live"})`}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <Stat label="Candidates" value={lastResult.candidates_found ?? 0} />
              <Stat label="Tasks" value={lastResult.tasks_created ?? 0} />
              <Stat label="Drafts" value={lastResult.drafts_created ?? 0} />
              <Stat label="Approvals" value={lastResult.approvals_created ?? 0} />
              <Stat label="Next actions" value={lastResult.next_actions_created ?? 0} />
            </div>
            {Array.isArray(lastResult.classifications) && lastResult.classifications.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/40">
                <div className="font-medium text-muted-foreground">Detected intents</div>
                {lastResult.classifications.slice(0, 8).map((c: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="font-mono truncate">{c.intent}</span>
                    <span className="text-muted-foreground">{Math.round((c.confidence ?? 0) * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Recent agent runs</div>
          {audit.length === 0 ? (
            <div className="text-xs text-muted-foreground">No runs yet.</div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {audit.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-xs rounded border border-border/40 px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono">{row.action_type}</span>
                    {row.target_table && <span className="text-muted-foreground ml-2">→ {row.target_table}</span>}
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

export default AIEngagementAgentLivePanel;
