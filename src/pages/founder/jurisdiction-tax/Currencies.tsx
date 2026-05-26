import { useEffect, useState } from "react";
import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchCurrencySettings, FX_META, type CurrencySetting } from "@/lib/jurisdictionTaxEngine";

export default function JTCurrencies() {
  const [rows, setRows] = useState<CurrencySetting[]>([]);
  useEffect(() => { fetchCurrencySettings().then(setRows); }, []);
  return (
    <JTLayout title="Currencies & FX" subtitle="Default and supported currencies per business. FX confidence is labelled — estimated rates never count as verified revenue.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Currency settings ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Default</th><th className="p-2">Display</th><th className="p-2">Supported</th><th className="p-2">FX source</th><th className="p-2">FX confidence</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No currency settings yet.</td></tr>}
              {rows.map(c => (
                <tr key={c.id} className="border-b border-border/30">
                  <td className="p-2 font-mono">{c.default_currency}</td>
                  <td className="p-2 font-mono">{c.display_currency}</td>
                  <td className="p-2 font-mono">{(c.supported_currencies ?? []).join(", ")}</td>
                  <td className="p-2">{c.fx_rate_source ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${FX_META[c.fx_rate_confidence].cls}`}>{FX_META[c.fx_rate_confidence].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </JTLayout>
  );
}