import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Boxes, AlertTriangle, CheckCircle2, RefreshCw, ExternalLink } from "lucide-react";

type Module = {
  id: string;
  module_key: string;
  module_name: string;
  module_category: string;
  command_centre_section: string | null;
  primary_route: string | null;
  business_scoped: boolean;
  global_module: boolean;
  component_name: string | null;
  status_source: string | null;
  required_for_core: boolean;
};

const STATUS_TONES: Record<string, string> = {
  active: "border-green-500/40 text-green-400",
  partial: "border-yellow-500/40 text-yellow-400",
  blocked: "border-destructive/40 text-destructive",
  missing: "border-border/60 text-muted-foreground",
};

export default function CommandCentreModuleRegistryPanel() {
  const [scan, setScan] = useState<any>(null);
  const [gaps, setGaps] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: modules = [] } = useQuery<Module[]>({
    queryKey: ["cc-module-registry"],
    queryFn: async () => ((await (supabase as any).from("command_centre_modules").select("*").order("module_category").order("module_name")).data ?? []) as Module[],
  });
  const { data: statuses = [] } = useQuery<any[]>({
    queryKey: ["cc-business-module-status"],
    queryFn: async () => (await (supabase as any).from("business_module_status").select("*")).data ?? [],
  });

  const byCategory = useMemo(() => {
    const map: Record<string, Module[]> = {};
    for (const m of modules) (map[m.module_category] ||= []).push(m);
    return map;
  }, [modules]);

  const counts = useMemo(() => {
    const c = { active: 0, partial: 0, blocked: 0, missing: 0, total: modules.length };
    for (const m of modules) {
      const rows = statuses.filter((s) => s.module_key === m.module_key);
      const blockers = rows.filter((r) => Array.isArray(r.blockers) && r.blockers.length > 0).length;
      const live = rows.filter((r) => r.live_internal).length;
      const configured = rows.filter((r) => r.configured).length;
      const status = rows.length === 0 ? "missing" : blockers > 0 ? "blocked" : live === rows.length ? "active" : configured > 0 ? "partial" : "missing";
      (c as any)[status] += 1;
    }
    return c;
  }, [modules, statuses]);

  const moduleStatus = (key: string) => {
    const rows = statuses.filter((s) => s.module_key === key);
    if (!rows.length) return "missing";
    const blockers = rows.filter((r) => Array.isArray(r.blockers) && r.blockers.length > 0).length;
    if (blockers > 0) return "blocked";
    if (rows.every((r) => r.live_internal)) return "active";
    if (rows.some((r) => r.configured)) return "partial";
    return "missing";
  };

  const runScan = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([
        supabase.functions.invoke("command-centre-module-status", { body: {} }),
        supabase.functions.invoke("command-centre-gap-detector", { body: {} }),
      ]);
      setScan(s.data);
      setGaps(g.data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Boxes size={16} className="text-primary" />
          Command Centre Module Registry
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-border/60 text-muted-foreground text-[10px]">No-send · read-only</Badge>
          <Button size="sm" variant="outline" onClick={runScan} disabled={loading}>
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Run scan
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
          <Stat label="Registered" value={counts.total} tone="default" />
          <Stat label="Active" value={counts.active} tone="good" />
          <Stat label="Partial" value={counts.partial} tone="warn" />
          <Stat label="Blocked" value={counts.blocked} tone="danger" />
          <Stat label="Missing" value={counts.missing} tone="warn" />
        </div>

        {gaps && (
          <div className="rounded-md border border-border/50 bg-muted/10 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-medium"><AlertTriangle size={12} className="text-yellow-400" /> Gap detector</div>
            <p>Lost pages (routes not in registry): <span className="text-yellow-400">{(gaps.lost_pages ?? []).length}</span></p>
            <p>Modules without panels: <span className="text-yellow-400">{(gaps.modules_without_panels ?? []).length}</span></p>
            <p>Modules without route: <span className="text-yellow-400">{(gaps.modules_without_routes ?? []).length}</span></p>
            <p>Modules missing Command Centre section: <span className="text-yellow-400">{(gaps.modules_without_section ?? []).length}</span></p>
            <p>Businesses missing module status rows: <span className="text-yellow-400">{(gaps.business_scoped_module_gaps ?? []).length}</span></p>
          </div>
        )}

        <div className="space-y-3">
          {Object.entries(byCategory).map(([cat, mods]) => (
            <div key={cat}>
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{cat}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {mods.map((m) => {
                  const status = moduleStatus(m.module_key);
                  return (
                    <div key={m.id} className="p-2 rounded-md border border-border/50 bg-background/40 text-xs space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-medium leading-tight">{m.module_name}</div>
                        <Badge variant="outline" className={`${STATUS_TONES[status]} text-[10px]`}>{status}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1 text-[10px] text-muted-foreground">
                        {!m.component_name && <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px]">no panel</Badge>}
                        {!m.primary_route && <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px]">no route</Badge>}
                        {!m.command_centre_section && <Badge variant="outline" className="border-yellow-500/30 text-yellow-400 text-[10px]">missing from CC</Badge>}
                        {m.business_scoped && <Badge variant="outline" className="border-border/60 text-[10px]">business-scoped</Badge>}
                        {m.global_module && <Badge variant="outline" className="border-border/60 text-[10px]">global</Badge>}
                        {m.required_for_core && <Badge variant="outline" className="border-primary/40 text-primary text-[10px]">core</Badge>}
                      </div>
                      {m.primary_route && (
                        <Link to={m.primary_route} className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline">
                          {m.primary_route} <ExternalLink size={10} />
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {scan?.gaps?.businesses_missing_module_status?.length > 0 && (
          <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2 text-[11px]">
            <div className="flex items-center gap-1 font-medium text-yellow-400 mb-1"><AlertTriangle size={12} /> Business-scoped coverage gaps</div>
            {scan.gaps.businesses_missing_module_status.slice(0, 5).map((b: any) => (
              <div key={b.business_id}>{b.business_id.slice(0, 8)}… missing {b.missing_modules.length} modules</div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <CheckCircle2 size={10} className="text-green-400" /> Scans are read-only — no emails, no Apollo, no Smartlead, no social publish, no DMs.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "good" | "warn" | "danger" }) {
  const toneCls = tone === "good" ? "text-green-400" : tone === "warn" ? "text-yellow-400" : tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="p-2 rounded-md border border-border/50 bg-background/40">
      <p className={`text-lg font-bold ${toneCls}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}