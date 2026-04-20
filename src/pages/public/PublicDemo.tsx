import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import SEOHead from "@/components/SEOHead";
import { Bot, Workflow, Activity, BarChart3, ShieldCheck, Zap, Lock } from "lucide-react";

export default function PublicDemo() {
  const { token } = useParams();
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [error, setError] = useState("");
  const [accessCount, setAccessCount] = useState(0);

  useEffect(() => {
    (async () => {
      const { data, error: e } = await supabase.rpc("log_demo_event", {
        _token: token!, _event_type: "view", _metadata: {},
      });
      if (e || (data as any)?.ok === false) {
        setError((data as any)?.error || e?.message || "Demo unavailable");
        setState("error"); return;
      }
      setAccessCount((data as any)?.access_count || 0);
      setState("ok");
    })();
  }, [token]);

  if (state === "loading") return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading demo…</div>;

  if (state === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="tech-card max-w-md p-8 text-center">
          <Lock size={32} className="mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-bold mb-2">Demo unavailable</h1>
          <p className="text-sm text-muted-foreground">{error}. Please request a new demo link.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Liftor AI — Live Sandbox Demo" description="Sandboxed walkthrough of the Liftor AI platform." />
      <div className="border-b border-border/50 bg-card/50 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold">Liftor <span className="text-primary">AI</span></span>
            <Badge variant="outline">SANDBOX DEMO</Badge>
          </div>
          <div className="text-xs text-muted-foreground">All data shown is illustrative · Read-only · Session #{accessCount}</div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Operations Command Center</h1>
          <p className="text-muted-foreground mt-1">A guided walkthrough of how Liftor AI orchestrates intelligent infrastructure for enterprise organisations.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat icon={<Bot size={18} />} label="Active Agents" value="14" />
          <Stat icon={<Workflow size={18} />} label="Workflows" value="38" />
          <Stat icon={<Activity size={18} />} label="Executions / 24h" value="2,184" />
          <Stat icon={<ShieldCheck size={18} />} label="Compliance" value="100%" />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="tech-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><BarChart3 size={16} /> System Performance (sample)</h2>
            <div className="space-y-3">
              {[
                { label: "Financial Operations Engine", value: 98 },
                { label: "Client Onboarding Workflow", value: 94 },
                { label: "Knowledge Intelligence", value: 89 },
                { label: "Outreach Automation", value: 92 },
              ].map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1"><span>{r.label}</span><span className="text-muted-foreground">{r.value}%</span></div>
                  <div className="h-2 rounded bg-secondary overflow-hidden"><div className="h-full bg-primary" style={{ width: `${r.value}%` }} /></div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="tech-card p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2"><Zap size={16} /> Recent Agent Activity (sample)</h2>
            <div className="space-y-3 text-sm">
              {[
                { agent: "Finance Sentinel", action: "Reconciled 24 invoices", time: "2 min ago" },
                { agent: "Outreach Strategist", action: "Scheduled batch · 80 contacts", time: "8 min ago" },
                { agent: "Conversation Engine", action: "Classified 12 inbound replies", time: "14 min ago" },
                { agent: "Knowledge Curator", action: "Indexed 3 new architectures", time: "31 min ago" },
                { agent: "Compliance Monitor", action: "Audit pass · zero findings", time: "1 hr ago" },
              ].map((r, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-border/30 pb-2 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{r.agent}</div>
                    <div className="text-xs text-muted-foreground">{r.action}</div>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">{r.time}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="tech-card p-6">
          <h2 className="font-semibold mb-3">What you would see in production</h2>
          <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
            <li>Live operational dashboards scoped to your organisation</li>
            <li>Agent directory with per-agent control surfaces</li>
            <li>Architecture flow visualisations of every system</li>
            <li>Real-time monitoring, decisioning, and optimisation modules</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">This is a sandboxed environment with illustrative data only. No real client systems or data are exposed.</p>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="tech-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">{icon} {label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </Card>
  );
}