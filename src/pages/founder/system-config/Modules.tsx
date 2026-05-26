import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SCLayout } from "./_shared";
import { fetchFlags } from "@/lib/systemConfig";

export default function SCModules() {
  const flags = useQuery({ queryKey: ["sc-flags"], queryFn: fetchFlags });
  const modules = (flags.data ?? []).filter(f => f.flag_category === "module");
  return (
    <SCLayout title="Modules" subtitle="Internal modules. Toggle from Feature Flags. Internal-safe — no external action risk.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {modules.map(f => (
          <Card key={f.id} className="tech-card p-3">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium flex-1 truncate">{f.flag_name}</p>
              <Badge variant="outline" className={`text-[10px] ${f.current_value ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-muted text-muted-foreground border-border/50"}`}>
                {f.current_value ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">{f.description}</p>
          </Card>
        ))}
        {!modules.length && <Card className="tech-card p-4 text-xs text-muted-foreground">No modules.</Card>}
      </div>
    </SCLayout>
  );
}