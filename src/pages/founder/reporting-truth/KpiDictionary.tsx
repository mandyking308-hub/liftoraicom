import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RTLayout } from "./_shared";
import { fetchKpiDefinitions, CATEGORY_META, type KpiDefinition, type KpiCategory } from "@/lib/reportingTruthEngine";

export default function KpiDictionary() {
  const [rows, setRows] = useState<KpiDefinition[]>([]);
  useEffect(() => { fetchKpiDefinitions().then(setRows); }, []);
  const grouped = useMemo(() => {
    const g: Partial<Record<KpiCategory, KpiDefinition[]>> = {};
    for (const r of rows) (g[r.kpi_category] ||= []).push(r);
    return g;
  }, [rows]);
  return (
    <RTLayout title="KPI Dictionary" subtitle={`${rows.length} canonical KPI definitions. Any dashboard reporting a metric must use this definition or raise a conflict.`}>
      {Object.entries(grouped).map(([cat, items]) => (
        <Card key={cat} className="tech-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              {CATEGORY_META[cat as KpiCategory] ?? cat}
              <Badge variant="outline" className="text-[10px]">{items!.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {items!.map(k => (
              <div key={k.id} className="border border-border/50 rounded p-3 space-y-1 hover:border-primary/40 transition">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">{k.kpi_code}</Badge>
                  <span className="text-sm font-medium">{k.kpi_name}</span>
                  {!k.active && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                </div>
                <p className="text-muted-foreground">{k.definition}</p>
                <div className="grid md:grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div><span className="text-muted-foreground">Source:</span> {k.source_of_truth_table ?? "—"}{k.source_of_truth_field ? `.${k.source_of_truth_field}` : ""}</div>
                  <div><span className="text-muted-foreground">Logic:</span> {k.calculation_logic_summary ?? "—"}</div>
                  <div><span className="text-muted-foreground">Confirmed vs estimated:</span> {k.confirmed_vs_estimated_rules ?? "—"}</div>
                  <div><span className="text-muted-foreground">Test exclusion:</span> {k.test_data_exclusion_rules ?? "—"}</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </RTLayout>
  );
}