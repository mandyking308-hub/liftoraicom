import { useEffect, useState } from "react";
import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJurisdictionRecords, JURISDICTION_META, PARTY_META, type JurisdictionRecord } from "@/lib/jurisdictionTaxEngine";

export default function JTSellers() {
  const [rows, setRows] = useState<JurisdictionRecord[]>([]);
  useEffect(() => { fetchJurisdictionRecords({ party_type: ["seller","vendor","partner","entity","payment_provider"] }).then(setRows); }, []);
  return (
    <JTLayout title="Seller / vendor / entity jurisdictions" subtitle="Where your sellers, vendors, partners, payment providers and legal entities are located.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Records ({rows.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Party</th><th className="p-2">Country</th><th className="p-2">Region</th><th className="p-2">Tax ID</th><th className="p-2">Confidence</th></tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No seller/vendor/entity records.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/30">
                  <td className="p-2">{PARTY_META[r.party_type]}</td>
                  <td className="p-2 font-mono">{r.country ?? "—"}</td>
                  <td className="p-2">{r.region ?? "—"}</td>
                  <td className="p-2">{r.tax_identifier_summary ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${JURISDICTION_META[r.jurisdiction_confidence].cls}`}>{JURISDICTION_META[r.jurisdiction_confidence].label}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </JTLayout>
  );
}