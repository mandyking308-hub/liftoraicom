import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldAlert, RefreshCw } from "lucide-react";

type Setting = {
  id: string;
  setting_key: string;
  setting_value: boolean;
  description: string | null;
  risk_level: string;
};
type AuditRow = {
  id: string;
  agent_key: string | null;
  action_type: string;
  source_function: string | null;
  target_table: string | null;
  action_status: string;
  blocked_reason: string | null;
  dry_run: boolean;
  created_at: string;
};

const SAFE_KEYS = new Set([
  "agent_task_creation_enabled",
  "ai_draft_creation_enabled",
  "founder_approval_item_creation_enabled",
  "crm_next_action_creation_enabled",
  "crm_interaction_capture_enabled",
  "conversation_bridge_review_enabled",
  "proposal_draft_creation_enabled",
  "commercial_handoff_review_enabled",
  "revenue_review_creation_enabled",
]);

export function AgentBusinessLivePanel() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: a }] = await Promise.all([
      supabase.from("agent_business_live_settings").select("id,setting_key,setting_value,description,risk_level").is("business_id", null).order("risk_level").order("setting_key"),
      supabase.from("agent_action_audit_log").select("id,agent_key,action_type,source_function,target_table,action_status,blocked_reason,dry_run,created_at").order("created_at", { ascending: false }).limit(20),
    ]);
    setSettings((s as Setting[]) ?? []);
    setAudit((a as AuditRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (row: Setting, next: boolean) => {
    if (!SAFE_KEYS.has(row.setting_key) && next) {
      toast({ title: "Locked", description: "Dangerous external setting. Enable from Founder Legal/Live Readiness console only.", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("agent_business_live_settings").update({ setting_value: next }).eq("id", row.id);
    if (error) { toast({ title: "Update failed", description: error.message, variant: "destructive" }); return; }
    toast({ title: next ? "Enabled" : "Disabled", description: row.setting_key });
    load();
  };

  const safe = settings.filter((s) => SAFE_KEYS.has(s.setting_key));
  const dangerous = settings.filter((s) => !SAFE_KEYS.has(s.setting_key));

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Agent Business-Live Mode</CardTitle>
          <CardDescription>Internal record creation is live. External sends remain locked behind founder approval.</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /></Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-500" />Internal capabilities (live where enabled)</h4>
          <div className="space-y-2">
            {safe.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium font-mono truncate">{s.setting_key}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <Switch checked={s.setting_value} onCheckedChange={(v) => toggle(s, v)} />
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />External / dangerous (locked)</h4>
          <div className="space-y-2">
            {dangerous.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                <div className="min-w-0 pr-3">
                  <div className="text-sm font-medium font-mono truncate">{s.setting_key}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.description}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">locked</Badge>
                  <Switch checked={s.setting_value} onCheckedChange={(v) => toggle(s, v)} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent agent actions</h4>
          {audit.length === 0 ? (
            <div className="text-xs text-muted-foreground">No agent actions logged yet.</div>
          ) : (
            <div className="space-y-1">
              {audit.map((row) => (
                <div key={row.id} className="flex items-center justify-between text-xs rounded border border-border/40 px-2 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono">{row.action_type}</span>
                    <span className="text-muted-foreground ml-2">{row.source_function} → {row.target_table}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.dry_run && <Badge variant="outline" className="text-[10px]">dry-run</Badge>}
                    <Badge variant={row.action_status === "applied" ? "default" : row.action_status === "blocked" ? "secondary" : row.action_status === "error" ? "destructive" : "outline"} className="text-[10px]">
                      {row.action_status}{row.blocked_reason ? `: ${row.blocked_reason}` : ""}
                    </Badge>
                    <span className="text-muted-foreground">{new Date(row.created_at).toLocaleString()}</span>
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

export default AgentBusinessLivePanel;
