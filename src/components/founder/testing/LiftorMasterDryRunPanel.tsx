import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  ShieldCheck, Lock, RefreshCw, FlaskConical, CheckCircle2, AlertTriangle, XCircle, Activity, Rocket,
} from "lucide-react";

type Scenario = {
  key: string;
  status: "pass" | "warn" | "fail" | "skip";
  score: number;
  details: Record<string, any>;
  blockers: string[];
};

type Gate = {
  gate_key: string;
  gate_label: string;
  gate_area: string;
  required_for_live: boolean;
  status: string;
  blocker_reason?: string | null;
};

type Resp = {
  ok: boolean;
  readiness_score: number;
  total_scenarios: number;
  passed: number;
  warned: number;
  failed: number;
  scenario_results: Scenario[];
  blockers: string[];
  next_actions: string[];
  live_readiness_gates: Gate[];
  live_blockers_count: number;
  live_activation_enabled: boolean;
  live_activation_reason: string;
  forbidden_operations_detected: string[];
  seeded_scenarios: number;
  seeded_gates: number;
};

const statusIcon = (s: string) => {
  if (s === "pass" || s === "passed") return <CheckCircle2 size={12} className="text-green-400" />;
  if (s === "warn") return <AlertTriangle size={12} className="text-yellow-400" />;
  if (s === "fail" || s === "blocked") return <XCircle size={12} className="text-red-400" />;
  return <Activity size={12} className="text-muted-foreground" />;
};

const statusClass = (s: string) => {
  if (s === "pass" || s === "passed") return "bg-green-500/10 text-green-400 border-green-500/30";
  if (s === "warn") return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
  if (s === "fail" || s === "blocked") return "bg-red-500/10 text-red-400 border-red-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export default function LiftorMasterDryRunPanel() {
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["liftor-master-dry-run"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("liftor-master-dry-run", { body: { persist_run: false } });
      if (error) throw error;
      return data as Resp;
    },
  });

  const score = data?.readiness_score ?? 0;
  const scoreClass = score >= 85 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FlaskConical size={18} className="text-primary" /> Liftor Master Dry-Run (preview)
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> No-Send · No-Provider-Mutation
          </Badge>
          <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
            <Lock size={10} className="mr-1" /> Live activation disabled
          </Badge>
          <Button size="sm" variant="ghost" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw size={14} className={isFetching ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Running master dry-run…</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase">Readiness score</p>
                <p className={`text-3xl font-semibold ${scoreClass}`}>{score}<span className="text-base text-muted-foreground">/100</span></p>
                <Progress value={score} className="mt-1 h-1.5" />
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Scenarios</p>
                <p className="text-sm">{data.total_scenarios}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-400 border-green-500/30">pass {data.passed}</Badge>
                  <Badge variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">warn {data.warned}</Badge>
                  <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/30">fail {data.failed}</Badge>
                </div>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Live gates</p>
                <p className="text-sm">{data.live_readiness_gates.length} total</p>
                <p className="text-[11px] text-red-400">{data.live_blockers_count} required blocker(s)</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Operating spine — scenario results</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {data.scenario_results.map((s) => (
                  <div key={s.key} className="rounded-md border border-border/50 p-2 bg-card/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {statusIcon(s.status)}
                        <span className="text-xs font-medium truncate">{s.key}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] uppercase ${statusClass(s.status)}`}>{s.status} · {Math.round(s.score * 100)}%</Badge>
                    </div>
                    {s.blockers.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.blockers.map((b) => (
                          <Badge key={b} variant="outline" className="text-[9px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">{b}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live readiness gates</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {data.live_readiness_gates.map((g) => (
                  <div key={g.gate_key} className="rounded-md border border-border/50 p-2 bg-card/30">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {statusIcon(g.status)}
                        <span className="text-xs font-medium truncate">{g.gate_label}</span>
                      </div>
                      <Badge variant="outline" className={`text-[9px] uppercase ${statusClass(g.status)}`}>{g.status}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{g.gate_area}{g.required_for_live ? " · required" : ""}{g.blocker_reason ? ` · ${g.blocker_reason}` : ""}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next actions</p>
              <ul className="space-y-1">
                {data.next_actions.map((a, i) => (
                  <li key={i} className="text-xs flex items-start gap-2"><span className="text-primary">•</span>{a}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground flex items-center gap-2">
              <Rocket size={12} /> Live activation is disabled — preview only. No emails sent. No Apollo calls. No Smartlead POSTs. No operational records mutated.
              <Button size="sm" variant="outline" disabled className="ml-auto"><Lock size={12} className="mr-1" /> Activate live (disabled)</Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}