import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { SCLayout } from "./_shared";
import { fetchFlags, requestFlagToggle, FLAG_CATEGORY_LABEL, type FeatureFlag } from "@/lib/systemConfig";
import { Lock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export default function SCFeatureFlags() {
  const qc = useQueryClient();
  const flags = useQuery({ queryKey: ["sc-flags"], queryFn: fetchFlags });
  const [filter, setFilter] = useState("");
  const list = (flags.data ?? []).filter(f =>
    !filter || f.flag_key.includes(filter.toLowerCase()) || f.flag_name.toLowerCase().includes(filter.toLowerCase())
  );

  const onToggle = async (f: FeatureFlag, v: boolean) => {
    try {
      const res = await requestFlagToggle(f, v);
      if (res.blocked) {
        toast.warning(`${f.flag_name}: change blocked — founder approval required. Audit event logged.`);
      } else {
        toast.success(`${f.flag_name} ${v ? "enabled" : "disabled"}`);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    qc.invalidateQueries({ queryKey: ["sc-flags"] });
    qc.invalidateQueries({ queryKey: ["sc-audit"] });
  };

  return (
    <SCLayout title="Feature flags">
      <Card className="tech-card p-3">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter flags…"
               className="w-full bg-secondary border border-border/50 rounded px-2 py-1 text-xs" />
      </Card>
      <div className="space-y-2">
        {list.map(f => (
          <Card key={f.id} className="tech-card p-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{f.flag_name}</p>
                  <Badge variant="outline" className="text-[10px]">{FLAG_CATEGORY_LABEL[f.flag_category]}</Badge>
                  {f.external_action_risk && (
                    <Badge variant="outline" className="text-[10px] bg-red-500/15 text-red-300 border-red-500/30">
                      <AlertTriangle size={9} className="mr-1" /> external risk
                    </Badge>
                  )}
                  {f.requires_founder_approval && (
                    <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">
                      <Lock size={9} className="mr-1" /> approval required
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">{f.description}</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Key <code>{f.flag_key}</code> · default {String(f.default_value)}
                </p>
              </div>
              <Switch checked={f.current_value} onCheckedChange={v => onToggle(f, v)} />
            </div>
          </Card>
        ))}
        {!list.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No flags match.</Card>}
      </div>
    </SCLayout>
  );
}