import { useEffect, useState } from "react";
import { CapLayout, CapSection, CapEmpty, NoAutoPauseBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function CapacityBottlenecks() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await (supabase as any).from("bottleneck_alerts").select("*").order("created_at", { ascending: false });
    setRows(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const update = async (id: string, status: string) => {
    const patch: any = { status };
    if (status === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await (supabase as any).from("bottleneck_alerts").update(patch).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); load(); }
  };

  const sevTone = (s: string) => s === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "high" ? "bg-orange-500/15 text-orange-400 border-orange-500/30"
    : s === "medium" ? "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
    : "bg-secondary/40 text-muted-foreground border-border/40";

  return (
    <CapLayout title="Bottleneck alerts" subtitle="Detected constraints across humans, delivery, support, AI cost, approvals, vendors, knowledge and tech.">
      <NoAutoPauseBanner />
      <CapSection title="Alerts">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p>
         : rows.length === 0 ? <CapEmpty title="No bottlenecks detected" hint="The Capacity Agent monitors workload, approvals, AI cost and delivery to surface bottlenecks here." />
         : (
          <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="rounded border border-border/40 p-3 text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={sevTone(r.severity)}>{r.severity}</Badge>
                      <Badge variant="outline" className="capitalize">{r.bottleneck_type.replace(/_/g, " ")}</Badge>
                      <Badge variant="outline" className={r.status === "open" ? "bg-red-500/10 text-red-300 border-red-500/30" : r.status === "acknowledged" ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"}>{r.status}</Badge>
                    </div>
                    <p className="text-sm">{r.bottleneck_summary}</p>
                    {r.recommended_action && <p className="text-muted-foreground mt-1"><span className="font-medium">Recommended:</span> {r.recommended_action}</p>}
                  </div>
                  <div className="flex gap-1">
                    {r.status === "open" && <Button size="sm" variant="outline" onClick={() => update(r.id, "acknowledged")}>Acknowledge</Button>}
                    {r.status !== "resolved" && <Button size="sm" variant="outline" onClick={() => update(r.id, "resolved")}>Resolve</Button>}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Detected {new Date(r.created_at).toLocaleString()}{r.resolved_at ? ` · Resolved ${new Date(r.resolved_at).toLocaleString()}` : ""}</p>
              </div>
            ))}
          </div>
        )}
      </CapSection>
    </CapLayout>
  );
}