import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCLayout } from "./_shared";
import { fetchFlags } from "@/lib/systemConfig";
import { Lock, AlertTriangle } from "lucide-react";

export default function SCExternalActions() {
  const flags = useQuery({ queryKey: ["sc-flags"], queryFn: fetchFlags });
  const list = (flags.data ?? []).filter(f => f.external_action_risk || f.flag_category === "external_action" || f.flag_category === "provider");
  return (
    <SCLayout title="External-action lock board" subtitle="Every flag that can produce an external side-effect. Locked by default. Enabling requires founder approval and is logged.">
      <div className="space-y-2">
        {list.map(f => (
          <Card key={f.id} className="tech-card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <AlertTriangle size={14} className="text-red-300" />
              <span className="text-sm font-semibold">{f.flag_name}</span>
              <Badge variant="outline" className="text-[10px]">{f.flag_category}</Badge>
              <Badge variant="outline" className={`text-[10px] ml-auto ${f.current_value ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"}`}>
                {f.current_value ? "ENABLED" : "LOCKED"}
              </Badge>
              {f.requires_founder_approval && (
                <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                  <Lock size={9} className="mr-1" /> approval required
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{f.description}</p>
            <p className="text-[10px] text-muted-foreground mt-1"><code>{f.flag_key}</code></p>
          </Card>
        ))}
      </div>
    </SCLayout>
  );
}