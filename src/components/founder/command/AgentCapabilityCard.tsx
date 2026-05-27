import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ArrowRight } from "lucide-react";
import { summariseAgentRegistry } from "@/lib/agentCapabilityEngine";

export default function AgentCapabilityCard() {
  const { data: s } = useQuery({ queryKey: ["acr-card"], queryFn: summariseAgentRegistry, refetchInterval: 60000 });
  const watch = (s?.openViolations ?? 0) + (s?.capabilityGaps ?? 0);
  const tone = (s?.openViolations ?? 0) > 0 ? "border-red-500/40" : watch > 0 ? "border-yellow-500/40" : "border-border/50";
  return (
    <Card className={`tech-card ${tone}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield size={14} className="text-primary" /> Agent Capability Registry
          <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] ml-2">Live</Badge>
          <Badge variant="outline" className="bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]">Boundaries enforced</Badge>
          <Link to="/founder/agent-capabilities" className="ml-auto text-[11px] text-primary hover:underline inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          <Stat label="Agents" value={s?.agents ?? 0} />
          <Stat label="Capabilities" value={s?.capabilities ?? 0} />
          <Stat label="Prohibited" value={s?.prohibitedActions ?? 0} />
          <Stat label="Approval req" value={s?.approvalRequired ?? 0} tone={s?.approvalRequired ? "warn" : undefined} />
          <Stat label="Open violations" value={s?.openViolations ?? 0} tone={s?.openViolations ? "bad" : undefined} />
          <Stat label="Capability gaps" value={s?.capabilityGaps ?? 0} tone={s?.capabilityGaps ? "warn" : undefined} />
        </div>
        {s && s.watchItems.length > 0 && (
          <div className="text-yellow-300 text-[11px]">{s.watchItems.map((w,i)=><div key={i}>• {w}</div>)}</div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number|string; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40 text-red-300" : tone === "warn" ? "border-yellow-500/40 text-yellow-300" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-2`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}