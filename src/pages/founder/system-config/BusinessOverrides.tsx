import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCLayout } from "./_shared";
import { fetchFlags, fetchOverrides } from "@/lib/systemConfig";

export default function SCBusinessOverrides() {
  const flags = useQuery({ queryKey: ["sc-flags"], queryFn: fetchFlags });
  const overrides = useQuery({ queryKey: ["sc-overrides"], queryFn: fetchOverrides });
  const flagById = new Map((flags.data ?? []).map(f => [f.id, f]));
  return (
    <SCLayout title="Business overrides" subtitle="Per-business flag overrides. Sensitive overrides require founder approval. Every override is audited.">
      <div className="space-y-2">
        {(overrides.data ?? []).map(o => {
          const f = flagById.get(o.flag_id);
          return (
            <Card key={o.id} className="tech-card p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium">{f?.flag_name ?? o.flag_id}</span>
                <Badge variant="outline" className="text-[10px]">{f?.flag_category}</Badge>
                <Badge variant="outline" className={`text-[10px] ${o.override_value ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>
                  override = {String(o.override_value)}
                </Badge>
                <span className="text-[10px] text-muted-foreground ml-auto">{o.created_at.slice(0,16).replace("T"," ")}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">{o.override_reason}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Business {o.business_id ?? "—"} {o.founder_approved_at ? `· approved ${o.founder_approved_at.slice(0,16)}` : "· awaiting approval"}</p>
            </Card>
          );
        })}
        {!overrides.data?.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No overrides.</Card>}
      </div>
    </SCLayout>
  );
}