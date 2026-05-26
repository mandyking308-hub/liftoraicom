import { useEffect, useState } from "react";
import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchTaxFlags, FX_META, type TaxTreatmentFlag } from "@/lib/jurisdictionTaxEngine";

export default function JTRevenue() {
  const [rows, setRows] = useState<TaxTreatmentFlag[]>([]);
  useEffect(() => { fetchTaxFlags().then(setRows); }, []);
  const byCcy = rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.currency ?? "unknown"; acc[k] = (acc[k] ?? 0) + 1; return acc;
  }, {});
  return (
    <JTLayout title="Revenue by currency" subtitle="Distribution of tracked revenue-related rows by native currency. FX is labelled separately; revenue should be reported native-first.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">By currency</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-2">
          {Object.keys(byCcy).length === 0 && <p className="text-xs text-muted-foreground col-span-full">No tax-flagged revenue rows yet.</p>}
          {Object.entries(byCcy).map(([k,v]) => (
            <div key={k} className="border border-border/50 rounded p-2">
              <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
              <p className="text-lg font-bold">{v}</p>
              <Badge variant="outline" className={`text-[10px] ${FX_META.estimated.cls}`}>FX estimated</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </JTLayout>
  );
}