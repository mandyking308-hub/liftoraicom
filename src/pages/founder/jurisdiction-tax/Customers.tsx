import { useEffect, useState } from "react";
import { JTLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchJurisdictionRecords, fetchTaxFlags, JURISDICTION_META, TAX_FLAG_META, type JurisdictionRecord, type TaxTreatmentFlag } from "@/lib/jurisdictionTaxEngine";

export default function JTCustomers() {
  const [recs, setRecs] = useState<JurisdictionRecord[]>([]);
  const [flags, setFlags] = useState<TaxTreatmentFlag[]>([]);
  useEffect(() => {
    fetchJurisdictionRecords({ party_type: ["customer"] }).then(setRecs);
    fetchTaxFlags().then(setFlags);
  }, []);
  return (
    <JTLayout title="Customer jurisdictions" subtitle="Where your customers are based and the tax flags raised for each combination.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Customer countries ({recs.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Country</th><th className="p-2">Region</th><th className="p-2">Tax ID</th><th className="p-2">Confidence</th></tr>
            </thead>
            <tbody>
              {recs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">No customer jurisdiction records.</td></tr>}
              {recs.map(r => (
                <tr key={r.id} className="border-b border-border/30">
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
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Tax treatment flags ({flags.length})</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-muted-foreground border-b border-border/50">
              <tr><th className="p-2">Cust</th><th className="p-2">Seller</th><th className="p-2">Ccy</th><th className="p-2">VAT/Sales</th><th className="p-2">Withhold</th><th className="p-2">Marketplace</th><th className="p-2">Adviser?</th></tr>
            </thead>
            <tbody>
              {flags.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No tax-treatment flags.</td></tr>}
              {flags.map(f => (
                <tr key={f.id} className="border-b border-border/30">
                  <td className="p-2 font-mono">{f.customer_country ?? "—"}</td>
                  <td className="p-2 font-mono">{f.seller_country ?? "—"}</td>
                  <td className="p-2 font-mono">{f.currency ?? "—"}</td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${TAX_FLAG_META[f.vat_sales_tax_flag].cls}`}>{TAX_FLAG_META[f.vat_sales_tax_flag].label}</Badge></td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${TAX_FLAG_META[f.withholding_flag].cls}`}>{TAX_FLAG_META[f.withholding_flag].label}</Badge></td>
                  <td className="p-2"><Badge variant="outline" className={`text-[10px] ${TAX_FLAG_META[f.marketplace_tax_flag].cls}`}>{TAX_FLAG_META[f.marketplace_tax_flag].label}</Badge></td>
                  <td className="p-2">{f.adviser_review_required ? <Badge variant="outline" className="text-[10px] bg-orange-500/15 text-orange-300 border-orange-500/30">Adviser</Badge> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </JTLayout>
  );
}