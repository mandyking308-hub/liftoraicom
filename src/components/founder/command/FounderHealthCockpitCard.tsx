import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, HeartPulse, ShieldAlert, Gauge, ArrowUpRight } from "lucide-react";
import { loadSystemHealth, HEALTH_COLOR, type ComponentHealth } from "@/lib/systemHealthEngine";

function StatusDot({ status }: { status: ComponentHealth["status"] }) {
  const cls =
    status === "GREEN" ? "bg-emerald-400" :
    status === "AMBER" ? "bg-amber-400" :
    status === "RED" ? "bg-destructive" : "bg-muted-foreground/60";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />;
}

export default function FounderHealthCockpitCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["founder_system_health_v1"],
    queryFn: loadSystemHealth,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const overallCls = HEALTH_COLOR[data?.status ?? "UNKNOWN"];

  return (
    <Card className="tech-card border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <HeartPulse className="h-4 w-4 text-primary" />
            System Health
            <Badge variant="outline" className={`ml-2 text-[10px] ${overallCls}`}>
              {isLoading ? "…" : `${data?.status} · ${data?.score}/100`}
            </Badge>
          </CardTitle>
          <div className="flex gap-1.5">
            <Link to="/founder/system-health">
              <Button size="sm" variant="outline" className="h-8 text-xs">
                <Activity className="h-3.5 w-3.5 mr-1" /> Open System Health
              </Button>
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Gauge className="h-3 w-3" /> Uptime estimate
            </div>
            <div className="font-semibold text-sm mt-0.5">{data?.uptimeEstimatePct ?? "—"}%</div>
          </div>
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2 text-amber-300">
            <div className="text-[10px] uppercase tracking-wide flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Warnings
            </div>
            <div className="font-semibold text-sm mt-0.5">{data?.warnings ?? 0}</div>
          </div>
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-destructive">
            <div className="text-[10px] uppercase tracking-wide flex items-center gap-1">
              <ShieldAlert className="h-3 w-3" /> Critical
            </div>
            <div className="font-semibold text-sm mt-0.5">{data?.criticals ?? 0}</div>
          </div>
          <div className="rounded-md border border-border p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Components monitored</div>
            <div className="font-semibold text-sm mt-0.5">{data?.components.length ?? 0}</div>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
          <div className="text-[11px] font-semibold mb-1.5">Live component status</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {(data?.components ?? []).map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 rounded border border-border/50 px-2 py-1 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <StatusDot status={c.status} />
                  <span className="truncate">{c.label}</span>
                </div>
                <span className="text-muted-foreground truncate text-right">{c.metric}</span>
              </div>
            ))}
          </div>
        </div>

        {data && data.degraded.length > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-xs">
            <div className="flex items-center gap-2 mb-1 text-amber-300 font-semibold">
              <ArrowUpRight className="h-3.5 w-3.5" /> Degraded services
            </div>
            <ul className="space-y-0.5">
              {data.degraded.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2">
                  <span>{c.label}</span>
                  <span className="text-muted-foreground">{c.detail}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}