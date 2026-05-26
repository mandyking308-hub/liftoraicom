import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlidersHorizontal, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchFlags, fetchOverrides, fetchAuditEvents, summarize, type ConfigSummary } from "@/lib/systemConfig";

export default function SystemConfigCard() {
  const [sum, setSum] = useState<ConfigSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchFlags(), fetchOverrides(), fetchAuditEvents(50)])
      .then(([f, o, a]) => setSum(summarize(f, o, a)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-primary" />
          System Configuration
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> External gated
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Central registry of feature flags, modules, external-action locks and business overrides. External-risk flags are locked by default and need founder approval to enable.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/system-config/modules"            label="Modules on"      value={sum?.modules_active} />
          <Tile to="/founder/system-config/external-actions"   label="External locked" value={sum?.external_locked} />
          <Tile to="/founder/system-config/feature-flags"      label="Dangerous on"    value={sum?.dangerous_enabled} cls={warn(sum?.dangerous_enabled ?? 0)} />
          <Tile to="/founder/system-config/external-actions"   label="Unapproved ext"  value={sum?.external_enabled_without_approval} cls={bad(sum?.external_enabled_without_approval ?? 0)} />
          <Tile to="/founder/system-config/business-overrides" label="Overrides"       value={sum?.overrides_active} />
          <Tile to="/founder/system-config/audit"              label="Changes 24h"     value={sum?.recent_changes_24h} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
            <p className="text-[11px] text-muted-foreground">{sum.recommended_action}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/system-config" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/system-config/feature-flags" className="text-primary hover:underline">Flags</Link>
          <Link to="/founder/system-config/modules" className="text-primary hover:underline">Modules</Link>
          <Link to="/founder/system-config/external-actions" className="text-primary hover:underline">External</Link>
          <Link to="/founder/system-config/business-overrides" className="text-primary hover:underline">Overrides</Link>
          <Link to="/founder/system-config/audit" className="text-primary hover:underline">Audit</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}