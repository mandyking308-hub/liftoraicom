import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowRight } from "lucide-react";

const sb: any = supabase as any;

type Row = { module: string; to: string; signal: number; tone: "ok"|"warn"|"bad"; note: string };

async function loadBackbone(): Promise<Row[]> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const safe = async <T,>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch { return null; } };
  const counts = await Promise.all([
    safe(sb.from("liftor_events").select("id", { count: "exact", head: true }).eq("event_status","failed")),
    safe(sb.from("ai_workflow_runs").select("id", { count: "exact", head: true }).eq("status","failed")),
    safe(sb.from("scheduled_job_runs").select("id", { count: "exact", head: true }).eq("run_status","failed").gte("created_at", since)),
    safe(sb.from("feature_flags").select("id", { count: "exact", head: true }).eq("external_action_risk", true).eq("current_value", true)),
    safe(sb.from("connector_health_checks").select("id", { count: "exact", head: true }).in("health_status",["warning","failed"]).gte("checked_at", since)),
    safe(sb.from("webhook_inbox_events").select("id", { count: "exact", head: true }).eq("processing_status","failed").gte("received_at", since)),
    safe(sb.from("global_audit_events").select("id", { count: "exact", head: true }).in("sensitivity_level",["high","critical"]).gte("created_at", since)),
    safe(sb.from("global_search_index").select("id", { count: "exact", head: true }).eq("active", true)),
    safe(sb.from("import_batches").select("id", { count: "exact", head: true }).eq("import_status","draft")),
    safe(sb.from("duplicate_identity_candidates").select("id", { count: "exact", head: true }).eq("merge_status","pending")),
    safe(sb.from("communications").select("id", { count: "exact", head: true }).eq("ai_generated", true).gte("created_at", since)),
    safe(sb.from("relationship_health_scores").select("id", { count: "exact", head: true }).in("relationship_status",["at_risk","critical"])),
    safe(sb.from("trust_risk_events").select("id", { count: "exact", head: true }).in("severity",["high","critical"]).eq("status","open")),
    safe(sb.from("internal_sla_breaches").select("id", { count: "exact", head: true }).eq("status","open")),
    safe(sb.from("environment_records").select("id", { count: "exact", head: true }).neq("environment_status","healthy")),
    safe(sb.from("platform_performance_events").select("id", { count: "exact", head: true }).eq("status","open").in("severity",["high","critical"])),
  ]);
  const c = (i: number) => Number((counts[i] as any)?.count ?? 0);
  const mk = (module: string, to: string, n: number, badThresh: number, note: string): Row => ({
    module, to, signal: n, tone: n >= badThresh ? "bad" : n > 0 ? "warn" : "ok", note,
  });
  return [
    mk("Event Bus", "/founder/event-bus", c(0), 1, "failed events 24h"),
    mk("Workflows", "/founder/workflows", c(1), 1, "failed runs"),
    mk("Scheduled Jobs", "/founder/scheduled-jobs", c(2), 1, "failed runs 24h"),
    mk("Feature Flags", "/founder/system-config", c(3), 1, "external-risk flags ON"),
    mk("Connectors", "/founder/connectors", c(4), 3, "connector warnings 24h"),
    mk("Webhook Inbox", "/founder/webhooks", c(5), 1, "failed webhooks 24h"),
    mk("Audit Ledger", "/founder/audit-ledger", c(6), 5, "sensitive events 24h"),
    mk("Search Index", "/founder/search", c(7), Number.MAX_SAFE_INTEGER, "active records"),
    mk("Imports", "/founder/imports", c(8), 1, "draft batches awaiting approval"),
    mk("Identity", "/founder/identity-resolution", c(9), 1, "duplicate candidates"),
    mk("Communications", "/founder/communications", c(10), Number.MAX_SAFE_INTEGER, "AI drafts 24h (approval-gated)"),
    mk("Relationships", "/founder/relationship-health", c(11), 1, "at-risk relationships"),
    mk("Trust & Safety", "/founder/trust-safety", c(12), 1, "high/critical risks open"),
    mk("Internal SLA", "/founder/internal-sla", c(13), 1, "open breaches"),
    mk("Deployment", "/founder/deployment", c(14), 1, "non-healthy environments"),
    mk("Platform Monitor", "/founder/platform-monitor", c(15), 1, "high/critical perf events"),
  ];
}

export default function PlatformBackboneHealthCard() {
  const { data: rows = [] } = useQuery({ queryKey: ["platform-backbone-health"], queryFn: loadBackbone, refetchInterval: 60000 });
  const watch = rows.filter(r => r.tone !== "ok").length;
  const tone = rows.some(r => r.tone === "bad") ? "border-red-500/40" : watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Network size={14} className="text-primary" /> Platform Backbone Health
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">No external action</Badge>
          <span className="ml-auto text-[11px] text-muted-foreground">{watch} watch item(s)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {rows.map(r => {
            const cls = r.tone === "bad" ? "border-red-500/40 text-red-300" : r.tone === "warn" ? "border-yellow-500/40 text-yellow-300" : "border-border/50";
            return (
              <Link key={r.module} to={r.to} className={`border ${cls} rounded p-2 hover:bg-secondary/40 transition flex flex-col`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{r.module}</span>
                  <ArrowRight size={10} className="text-muted-foreground" />
                </div>
                <span className="text-sm font-bold">{r.signal}</span>
                <span className="text-[10px] text-muted-foreground">{r.note}</span>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}