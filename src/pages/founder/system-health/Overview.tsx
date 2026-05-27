import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeartPulse, Activity, AlertTriangle } from "lucide-react";
import { loadSystemHealth, loadHealthTrend, HEALTH_COLOR } from "@/lib/systemHealthEngine";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function SystemHealthOverview() {
  const { data: health } = useQuery({
    queryKey: ["system_health_full"],
    queryFn: loadSystemHealth,
    refetchInterval: 60_000,
  });
  const { data: trend } = useQuery({
    queryKey: ["system_health_trend_12h"],
    queryFn: () => loadHealthTrend(12),
    refetchInterval: 120_000,
  });

  const cls = HEALTH_COLOR[health?.status ?? "UNKNOWN"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-primary" /> Liftor System Health Engine
        </h1>
        <Badge variant="outline" className={`text-xs ${cls}`}>
          {health ? `${health.status} · ${health.score}/100 · ${health.uptimeEstimatePct}% uptime` : "Loading…"}
        </Badge>
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" /> Health trend — last 12h
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="t" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).getHours() + "h"} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 10 }} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))" }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Monitored components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-1.5">Component</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Score</th>
                  <th className="text-left">Metric</th>
                  <th className="text-left">Heartbeat</th>
                  <th className="text-left">Detail</th>
                </tr>
              </thead>
              <tbody>
                {(health?.components ?? []).map((c) => (
                  <tr key={c.id} className="border-b border-border/30">
                    <td className="py-1.5 font-medium">{c.label}</td>
                    <td>
                      <Badge variant="outline" className={`text-[10px] ${HEALTH_COLOR[c.status]}`}>{c.status}</Badge>
                    </td>
                    <td>{c.score}</td>
                    <td className="text-muted-foreground">{c.metric}</td>
                    <td className="text-muted-foreground">
                      {c.stale && <span className="text-amber-300 mr-1">stale</span>}
                      {c.lastHeartbeat ? new Date(c.lastHeartbeat).toLocaleTimeString() : "—"}
                    </td>
                    <td className="text-muted-foreground">{c.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Issue history (current degraded)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {health && health.degraded.length === 0 ? (
            <div className="text-xs text-muted-foreground">No degraded services. All systems GREEN.</div>
          ) : (
            <ul className="space-y-1 text-xs">
              {(health?.degraded ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 border-b border-border/30 py-1">
                  <span className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-[10px] ${HEALTH_COLOR[c.status]}`}>{c.status}</Badge>
                    {c.label}
                  </span>
                  <span className="text-muted-foreground">{c.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Scoring methodology</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• <strong>Failure-rate scoring:</strong> {"<2% = GREEN · 2-10% = AMBER · ≥10% = RED"}.</p>
          <p>• <strong>Latency scoring:</strong> {"<400ms = GREEN · 400-1200ms = AMBER · ≥1200ms = RED"} (p95).</p>
          <p>• <strong>Heartbeat:</strong> components without a signal in 15 min are flagged stale.</p>
          <p>• <strong>Overall:</strong> any RED → RED · else any AMBER → AMBER · else GREEN. Score = mean of known component scores.</p>
          <p>• <strong>Uptime estimate:</strong> derived from rolling score (90–100% band).</p>
        </CardContent>
      </Card>
    </div>
  );
}