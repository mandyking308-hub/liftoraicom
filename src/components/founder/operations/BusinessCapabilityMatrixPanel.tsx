import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Grid3x3, RefreshCw, Wand2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

type Row = {
  business_id: string;
  business_name: string;
  module_key: string;
  module_name: string;
  module_category: string;
  status: "active" | "partial" | "blocked" | "missing" | "planned";
  readiness_score: number;
  live_internal: boolean;
  external_actions_enabled: boolean;
  blockers: string[];
  next_action: string;
  primary_route: string | null;
};

const STATUS_TONE: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  partial: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  blocked: "bg-destructive/15 text-destructive border-destructive/30",
  planned: "bg-primary/10 text-primary border-primary/30",
  missing: "bg-muted/20 text-muted-foreground border-border/50",
};

export default function BusinessCapabilityMatrixPanel() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [planning, setPlanning] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("business-capability-matrix", { body: {} });
      if (error) throw error;
      setData(res);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load matrix");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const rows: Row[] = data?.rows ?? [];
  const readiness = data?.readiness ?? {};
  const categories: string[] = ["all", ...((data?.categories ?? []) as string[])];

  const filteredRows = useMemo(() => category === "all" ? rows : rows.filter((r) => r.module_category === category), [rows, category]);

  const businesses = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of filteredRows) map.set(r.business_id, r.business_name);
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [filteredRows]);

  const modules = useMemo(() => {
    const map = new Map<string, { key: string; name: string; route: string | null }>();
    for (const r of filteredRows) if (!map.has(r.module_key)) map.set(r.module_key, { key: r.module_key, name: r.module_name, route: r.primary_route });
    return Array.from(map.values());
  }, [filteredRows]);

  const cellByKey = useMemo(() => {
    const m = new Map<string, Row>();
    for (const r of filteredRows) m.set(`${r.business_id}|${r.module_key}`, r);
    return m;
  }, [filteredRows]);

  const generatePlanForBusiness = async (businessId: string) => {
    setPlanning(businessId);
    try {
      const ready = readiness[businessId];
      const missing: string[] = ready?.missing_modules ?? [];
      if (missing.length === 0) { toast.message("No missing modules for this business"); return; }
      const { data: res, error } = await supabase.functions.invoke("business-module-setup-plan", {
        body: { business_id: businessId, module_keys: missing.slice(0, 25), confirm: true },
      });
      if (error) throw error;
      toast.success(`Setup plan created — ${res.created_status_rows} module${res.created_status_rows === 1 ? "" : "s"} planned`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Plan failed");
    } finally { setPlanning(null); }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Grid3x3 size={16} className="text-primary" /> Business Capability Matrix (internal-only)
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">No-send · read-only scan</Badge>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-center text-xs">
          <span className="text-muted-foreground">Filter:</span>
          {categories.map((c) => (
            <Button key={c} size="sm" variant={category === c ? "default" : "outline"} onClick={() => setCategory(c)}>{c}</Button>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">
            {data?.businesses_count ?? 0} businesses · {data?.modules_count ?? 0} modules · {data?.missing_total ?? 0} missing-module instances
          </span>
        </div>

        {/* Readiness band per business */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {businesses.map((b) => {
            const r = readiness[b.id] ?? {};
            return (
              <div key={b.id} className="rounded-md border border-border/50 bg-background/40 p-2 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{b.name}</div>
                  <Button size="sm" variant="outline" onClick={() => generatePlanForBusiness(b.id)} disabled={planning === b.id}>
                    <Wand2 size={12} /> {planning === b.id ? "Planning…" : `Plan ${r.missing_count ?? 0} missing`}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="outline" className={r.ready_for_internal_use ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>internal {r.ready_for_internal_use ? "✓" : "—"}</Badge>
                  <Badge variant="outline" className={r.ready_for_social ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>social {r.ready_for_social ? "✓" : "—"}</Badge>
                  <Badge variant="outline" className={r.ready_for_outbound ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>outbound {r.ready_for_outbound ? "✓" : "—"}</Badge>
                  <Badge variant="outline" className={r.ready_for_agents ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>agents {r.ready_for_agents ? "✓" : "—"}</Badge>
                  <Badge variant="outline" className={r.ready_for_revenue ? "border-green-500/40 text-green-400" : "border-yellow-500/40 text-yellow-400"}>revenue {r.ready_for_revenue ? "✓" : "—"}</Badge>
                </div>
              </div>
            );
          })}
        </div>

        {/* Matrix table */}
        <div className="overflow-x-auto border border-border/50 rounded-md">
          <table className="w-full text-[11px]">
            <thead className="bg-muted/20">
              <tr>
                <th className="text-left p-2 sticky left-0 bg-muted/20 z-10 min-w-[140px]">Business</th>
                {modules.map((m) => (
                  <th key={m.key} className="text-left p-2 min-w-[120px] font-medium">
                    {m.route ? <Link to={m.route} className="hover:text-primary">{m.name}</Link> : m.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {businesses.map((b) => (
                <tr key={b.id} className="border-t border-border/40">
                  <td className="p-2 sticky left-0 bg-card z-10 font-medium">{b.name}</td>
                  {modules.map((m) => {
                    const c = cellByKey.get(`${b.id}|${m.key}`);
                    if (!c) return <td key={m.key} className="p-2"><span className="text-muted-foreground">—</span></td>;
                    return (
                      <td key={m.key} className="p-1.5">
                        <div className={`rounded px-1.5 py-1 border ${STATUS_TONE[c.status]}`}>
                          <div className="font-medium capitalize">{c.status}</div>
                          {c.blockers.length > 0 && (
                            <div className="flex items-start gap-1 mt-0.5 text-[10px]">
                              <AlertTriangle size={10} /> {c.blockers.length} blocker{c.blockers.length === 1 ? "" : "s"}
                            </div>
                          )}
                          {c.next_action && c.status !== "active" && (
                            <div className="text-[10px] opacity-80 line-clamp-2 mt-0.5">→ {c.next_action}</div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {businesses.length === 0 && (
                <tr><td colSpan={modules.length + 1} className="p-3 text-muted-foreground text-center">No businesses to show.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 size={10} className="text-green-400" /> Read-only matrix. Setup plans create internal status rows + a founder approval item — no emails, no Apollo, no Smartlead, no social publish, no DMs.
        </p>
      </CardContent>
    </Card>
  );
}