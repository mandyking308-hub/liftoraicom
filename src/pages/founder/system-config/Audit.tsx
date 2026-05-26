import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCLayout } from "./_shared";
import { fetchAuditEvents } from "@/lib/systemConfig";

export default function SCAudit() {
  const audit = useQuery({ queryKey: ["sc-audit"], queryFn: () => fetchAuditEvents(200) });
  return (
    <SCLayout title="Configuration audit" subtitle="Append-only audit ledger for every flag, override and config-value change. Blocked attempts are recorded too.">
      <div className="space-y-2">
        {(audit.data ?? []).map(e => {
          const blocked = e.audit_metadata?.blocked === true;
          return (
            <Card key={e.id} className="tech-card p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{e.config_type}</Badge>
                {blocked && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">BLOCKED</Badge>}
                <code className="text-[11px]">{e.config_key}</code>
                <span className="text-[10px] text-muted-foreground ml-auto">{e.created_at.slice(0,19).replace("T"," ")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{e.change_reason}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                old <code>{JSON.stringify(e.old_value)}</code> → new <code>{JSON.stringify(e.new_value)}</code>
              </p>
            </Card>
          );
        })}
        {!audit.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No audit events.</Card>}
      </div>
    </SCLayout>
  );
}