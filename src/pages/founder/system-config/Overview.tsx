import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { SCLayout, SCStat } from "./_shared";
import { fetchFlags, fetchOverrides, fetchAuditEvents, summarize } from "@/lib/systemConfig";

export default function SCOverview() {
  const flags = useQuery({ queryKey: ["sc-flags"], queryFn: fetchFlags });
  const overrides = useQuery({ queryKey: ["sc-overrides"], queryFn: fetchOverrides });
  const audit = useQuery({ queryKey: ["sc-audit"], queryFn: () => fetchAuditEvents(50) });
  const sum = flags.data && overrides.data && audit.data
    ? summarize(flags.data, overrides.data, audit.data) : null;

  return (
    <SCLayout title="System Configuration — Overview"
      subtitle="Central registry for every Liftor flag and config value. Internal modules can be toggled freely; any flag with external-action risk requires founder approval and is blocked by default.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <SCStat label="Modules active"      value={sum?.modules_active ?? "—"} tone="ok" />
        <SCStat label="Modules inactive"    value={sum?.modules_inactive ?? "—"} />
        <SCStat label="External locked"     value={sum?.external_locked ?? "—"} tone="ok" />
        <SCStat label="Dangerous enabled"   value={sum?.dangerous_enabled ?? "—"} tone={(sum?.dangerous_enabled ?? 0) > 0 ? "warn" : "ok"} />
        <SCStat label="Overrides active"    value={sum?.overrides_active ?? "—"} />
        <SCStat label="Changes (24h)"       value={sum?.recent_changes_24h ?? "—"} />
      </div>
      {sum?.top_alert && (
        <Card className="tech-card p-3 border-primary/30 bg-primary/5">
          <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
          <p className="text-sm font-semibold">{sum.top_alert.summary}</p>
          <p className="text-xs text-muted-foreground mt-1">{sum.recommended_action}</p>
        </Card>
      )}
      <Card className="tech-card p-3 text-xs">
        <p className="font-semibold mb-2">Jump to</p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <Link to="/founder/system-config/feature-flags" className="text-primary hover:underline">Feature Flags</Link>
          <Link to="/founder/system-config/modules" className="text-primary hover:underline">Modules</Link>
          <Link to="/founder/system-config/external-actions" className="text-primary hover:underline">External Actions</Link>
          <Link to="/founder/system-config/business-overrides" className="text-primary hover:underline">Business Overrides</Link>
          <Link to="/founder/system-config/audit" className="text-primary hover:underline">Audit</Link>
        </div>
      </Card>
    </SCLayout>
  );
}