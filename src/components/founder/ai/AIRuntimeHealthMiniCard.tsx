import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, ShieldAlert, ShieldCheck, MessagesSquare, Cpu } from "lucide-react";
import { KNOWN_DIRECT_AI_CALLERS } from "@/services/aiGateway";

const sb: any = supabase;

export default function AIRuntimeHealthMiniCard() {
  const since24h = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { data } = useQuery({
    queryKey: ["cc_ai_runtime_mini"],
    refetchInterval: 15000,
    queryFn: async () => {
      const [reqs, convs] = await Promise.all([
        sb.from("ai_gateway_requests").select("status,created_at,actual_cost_gbp,estimated_cost_gbp").gte("created_at", since24h).limit(1000),
        sb.from("ai_conversations").select("id,status").eq("status", "active").limit(500),
      ]);
      const rows = reqs.data ?? [];
      return {
        running: rows.filter((r: any) => r.status === "running").length,
        queued: rows.filter((r: any) => r.status === "queued").length,
        waiting: rows.filter((r: any) => r.status === "waiting_approval").length,
        failed: rows.filter((r: any) => r.status === "failed").length,
        cost24h: rows.reduce((s: number, r: any) => s + Number(r.actual_cost_gbp ?? r.estimated_cost_gbp ?? 0), 0),
        activeConvs: (convs.data ?? []).length,
      };
    },
  });

  const bypassCount = KNOWN_DIRECT_AI_CALLERS.length - 3; // 3 migrated/no-op
  const failed = data?.failed ?? 0;
  const waiting = data?.waiting ?? 0;

  return (
    <Card className="tech-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-primary" /> AI Runtime Health
          </div>
          <div className="flex gap-1">
            <Link to="/founder/ai-cost/health" className="text-[10px] underline text-muted-foreground">Health</Link>
            <span className="text-[10px] text-muted-foreground">·</span>
            <Link to="/founder/ai-cost/orchestration-live" className="text-[10px] underline text-muted-foreground">Live</Link>
            <span className="text-[10px] text-muted-foreground">·</span>
            <Link to="/founder/portfolio-exit/ai-bypass-register" className="text-[10px] underline text-muted-foreground">Bypass</Link>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Mini icon={Activity} label="Running" v={data?.running ?? 0} />
          <Mini icon={MessagesSquare} label="Active conv." v={data?.activeConvs ?? 0} />
          <Mini icon={Cpu} label="Cost 24h" v={`£${(data?.cost24h ?? 0).toFixed(2)}`} />
          <Mini icon={ShieldCheck} label="Awaiting approval" v={waiting} accent={waiting ? "amber" : undefined} />
          <Mini icon={AlertTriangle} label="Failed 24h" v={failed} accent={failed ? "destructive" : undefined} />
          <Mini icon={ShieldAlert} label="Bypasses" v={bypassCount} accent={bypassCount ? "amber" : undefined} />
        </div>
        {(failed > 10 || waiting > 10 || bypassCount > 0) && (
          <div className="mt-2 text-[10px] text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">runtime alerts</Badge>{" "}
            {failed > 10 && <span className="text-destructive">{failed} failed · </span>}
            {waiting > 10 && <span className="text-amber-400">{waiting} awaiting approval · </span>}
            {bypassCount > 0 && <span className="text-amber-400">{bypassCount} bypass functions</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Mini({ icon: Icon, label, v, accent }: { icon: any; label: string; v: number | string; accent?: string }) {
  const cls = accent === "destructive" ? "text-destructive" : accent === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <div className="border border-border/40 rounded p-2">
      <div className="flex items-center gap-1 justify-center text-[10px] uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className={`text-base font-semibold ${cls}`}>{v}</div>
    </div>
  );
}