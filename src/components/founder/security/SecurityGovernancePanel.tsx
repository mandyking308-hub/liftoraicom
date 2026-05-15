import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Lock, KeyRound, AlertTriangle, RefreshCw, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type AuditResult = {
  ok: boolean;
  generated_at: string;
  secrets: { secret_name: string; present: boolean }[];
  registry: any[];
  agent_permissions: any[];
  external_action_locks: Record<string, any>;
  rls_status: { table: string; rls_enabled_expected: boolean }[];
  recent_audit: any[];
  risky_settings: string[];
  missing_secrets: string[];
  external_actions_locked_summary: Record<string, boolean>;
};

export function SecurityGovernancePanel() {
  const { toast } = useToast();
  const [data, setData] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const { data: r, error } = await supabase.functions.invoke("agent-permission-audit", { body: {} });
      if (error) throw error;
      setData(r as AuditResult);
      toast({ title: "Security audit refreshed", description: `Risky settings: ${(r as any)?.risky_settings?.length ?? 0}` });
    } catch (e: any) {
      toast({ title: "Audit failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally { setLoading(false); }
  };
  useEffect(() => { run(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const summary = data?.external_actions_locked_summary ?? {};
  const risky = data?.risky_settings ?? [];

  return (
    <Card className="tech-card">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              Security · Access · Secret Governance
            </CardTitle>
            <CardDescription>
              Read-only audit. Secrets are never displayed. No emails, no Apollo calls, no Smartlead POST.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs"><EyeOff size={10} className="mr-1" /> values hidden</Badge>
            <Button size="sm" variant="outline" onClick={run} disabled={loading}>
              <RefreshCw size={14} className={`mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!data ? (
          <p className="text-sm text-muted-foreground">Loading audit…</p>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="flex-wrap">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="secrets">Secrets ({data.secrets.length})</TabsTrigger>
              <TabsTrigger value="permissions">Agent Permissions ({data.agent_permissions.length})</TabsTrigger>
              <TabsTrigger value="locks">External Locks</TabsTrigger>
              <TabsTrigger value="rls">RLS</TabsTrigger>
              <TabsTrigger value="audit">Audit Log</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 mt-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat ok={summary.sends_locked_unless_approved} label="Sends locked" />
                <Stat ok={summary.provider_mutations_locked} label="Provider mutations locked" />
                <Stat ok={summary.founder_approval_required_everywhere} label="Founder approval everywhere" />
                <Stat ok={data.missing_secrets.length === 0} label={`Secrets present (${data.secrets.filter(s=>s.present).length}/${data.secrets.length})`} warn={data.missing_secrets.length > 0} />
              </div>
              {risky.length > 0 ? (
                <Card className="bg-destructive/10 border-destructive/30">
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-center gap-2 text-destructive text-sm font-medium"><AlertTriangle size={14} /> Risky settings</div>
                    <ul className="text-xs list-disc pl-5 space-y-0.5">{risky.map((r,i)=>(<li key={i}>{r}</li>))}</ul>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-xs text-green-400 flex items-center gap-1"><CheckCircle2 size={12} /> No risky settings detected.</p>
              )}
            </TabsContent>

            <TabsContent value="secrets" className="mt-3">
              <div className="space-y-2">
                {data.registry.map((r: any) => (
                  <div key={`${r.provider_key}-${r.secret_name}-${r.business_id ?? "global"}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/40 border border-border/40">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <KeyRound size={14} className="text-muted-foreground" />
                        <span className="text-sm font-medium">{r.display_label ?? r.secret_name}</span>
                        <Badge variant="outline" className="text-[10px]">{r.provider_key}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{r.secret_name} · scope: {r.usage_scope ?? "—"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {r.secret_present ? (
                        <Badge className="bg-green-500/20 text-green-400 text-[10px]"><CheckCircle2 size={10} className="mr-1" /> present</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]"><XCircle size={10} className="mr-1" /> missing</Badge>
                      )}
                      <Badge variant="outline" className="text-[10px]"><EyeOff size={10} className="mr-1" /> value hidden</Badge>
                    </div>
                  </div>
                ))}
                {data.registry.length === 0 && <p className="text-xs text-muted-foreground">Registry empty.</p>}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="mt-3">
              <div className="space-y-2 max-h-96 overflow-auto">
                {data.agent_permissions.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border/40 text-xs">
                    <div>
                      <p className="font-medium">{p.permission_label ?? p.permission_key}</p>
                      <p className="text-muted-foreground">role: {p.agent_role_id} · key: {p.permission_key}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {p.allowed ? <Badge className="bg-green-500/20 text-green-400 text-[10px]">allowed</Badge> : <Badge className="bg-muted text-[10px]">denied</Badge>}
                      {p.requires_founder_approval && <Badge className="bg-yellow-500/20 text-yellow-400 text-[10px]"><Lock size={9} className="mr-1" /> approval</Badge>}
                    </div>
                  </div>
                ))}
                {data.agent_permissions.length === 0 && <p className="text-xs text-muted-foreground">No agent permission rows.</p>}
              </div>
            </TabsContent>

            <TabsContent value="locks" className="mt-3">
              <div className="space-y-2 text-xs">
                {Object.entries(data.external_action_locks).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border/40">
                    <span className="font-mono">{k}</span>
                    <span className="text-muted-foreground">{Array.isArray(v) ? (v.length ? v.join(", ") : "—") : String(v)}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="rls" className="mt-3">
              <div className="grid sm:grid-cols-2 gap-2">
                {data.rls_status.map((r) => (
                  <div key={r.table} className="flex items-center justify-between p-2 rounded bg-secondary/30 border border-border/40 text-xs">
                    <span className="font-mono">{r.table}</span>
                    <Badge className="bg-green-500/20 text-green-400 text-[10px]"><ShieldCheck size={10} className="mr-1" /> RLS expected</Badge>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="audit" className="mt-3">
              <div className="space-y-1 max-h-96 overflow-auto">
                {data.recent_audit.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between text-xs p-2 rounded bg-secondary/30 border border-border/40">
                    <div>
                      <p className="font-medium">{a.agent_key} · {a.action}</p>
                      <p className="text-muted-foreground">{a.status}{a.business_id ? ` · biz ${String(a.business_id).slice(0,8)}` : ""}</p>
                    </div>
                    <span className="text-muted-foreground">{a.created_at ? formatDistanceToNow(new Date(a.created_at), { addSuffix: true }) : ""}</span>
                  </div>
                ))}
                {data.recent_audit.length === 0 && <p className="text-xs text-muted-foreground">No recent audit events.</p>}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ ok, label, warn }: { ok?: boolean; label: string; warn?: boolean }) {
  const tone = ok ? "text-green-400 border-green-500/30 bg-green-500/10"
    : warn ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10"
    : "text-destructive border-destructive/30 bg-destructive/10";
  return (
    <div className={`p-3 rounded-lg border ${tone}`}>
      <div className="flex items-center gap-2 text-xs font-medium">
        {ok ? <CheckCircle2 size={14} /> : warn ? <AlertTriangle size={14} /> : <XCircle size={14} />}
        <span>{label}</span>
      </div>
    </div>
  );
}

export default SecurityGovernancePanel;