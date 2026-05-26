import { Link, useLocation } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow } from "lucide-react";

export const ORCH_TABS = [
  { to: "/founder/orchestration", label: "Overview", end: true },
  { to: "/founder/orchestration/events", label: "Events" },
  { to: "/founder/orchestration/workflows", label: "Workflows" },
  { to: "/founder/orchestration/runs", label: "Runs" },
  { to: "/founder/orchestration/failures", label: "Failures" },
  { to: "/founder/orchestration/settings", label: "Settings" },
];

export function OrchLayout({ title, children }: { title: string; children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 pt-6 space-y-4">
        <Card className="tech-card border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Workflow size={18} className="text-primary" /> Event Bus &amp; Workflow Orchestrator
              <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-auto">Live-first · internal-only execution</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Central event bus and internal workflow execution. Internal steps run live. Steps
            that would cause sends, payments, refunds, payouts, invites, exports or other
            external mutations are parked as <em>waiting_approval</em> and surfaced in the
            Master Work Queue — never executed automatically.
          </CardContent>
        </Card>
        <div className="flex gap-1 flex-wrap">
          {ORCH_TABS.map((t) => {
            const active = t.end ? pathname === t.to : pathname.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`text-xs px-3 py-1.5 rounded-md border ${active ? "bg-primary/15 text-primary border-primary/40" : "border-border text-muted-foreground hover:border-primary/40"}`}
              >{t.label}</Link>
            );
          })}
        </div>
        <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
        {children}
      </div>
    </FounderLayout>
  );
}