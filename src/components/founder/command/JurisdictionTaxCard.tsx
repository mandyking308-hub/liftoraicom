import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchCurrencySettings, fetchJurisdictionRecords, fetchTaxFlags, fetchAdviserReviewItems, summarize, REVIEW_TYPE_META, type JTSummary } from "@/lib/jurisdictionTaxEngine";

export default function JurisdictionTaxCard() {
  const [sum, setSum] = useState<JTSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchCurrencySettings(), fetchJurisdictionRecords(), fetchTaxFlags(), fetchAdviserReviewItems()])
      .then(([c,j,f,r]) => setSum(summarize(c,j,f,r))).catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Globe size={14} className="text-primary" />
          Multi-Currency / Jurisdiction / Tax Tracker
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> No advice / no filings</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Tracks customer/seller/entity countries, currencies and tax-review flags across UK, US, UAE, Europe and global. Adviser questions queued — never sent without approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/jurisdiction-tax/currencies"     label="Currencies"   value={sum?.total_currencies} />
          <Tile to="/founder/jurisdiction-tax/currencies"     label="Est. FX"      value={sum?.estimated_fx}          cls={warn(sum?.estimated_fx ?? 0)} />
          <Tile to="/founder/jurisdiction-tax/customers"      label="Cust ctry"    value={sum?.customer_countries} />
          <Tile to="/founder/jurisdiction-tax/sellers"        label="Seller ctry"  value={sum?.seller_countries} />
          <Tile to="/founder/jurisdiction-tax/customers"      label="Unknown"      value={sum?.unknown_jurisdictions} cls={bad(sum?.unknown_jurisdictions ?? 0)} />
          <Tile to="/founder/jurisdiction-tax/adviser-review" label="Adviser Q"    value={sum?.adviser_open}          cls={warn(sum?.adviser_open ?? 0)} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Tile to="/founder/jurisdiction-tax/customers" label="VAT review"         value={sum?.vat_review}         cls={warn(sum?.vat_review ?? 0)} />
          <Tile to="/founder/jurisdiction-tax/customers" label="Withholding"        value={sum?.withholding_review} cls={warn(sum?.withholding_review ?? 0)} />
          <Tile to="/founder/jurisdiction-tax/customers" label="Marketplace tax"    value={sum?.marketplace_review} cls={warn(sum?.marketplace_review ?? 0)} />
        </div>
        {sum?.top_review && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">{REVIEW_TYPE_META[sum.top_review.review_type]}</Badge>
              <p className="text-[10px] uppercase text-muted-foreground">Top adviser question</p>
            </div>
            <p className="text-sm font-medium">{sum.top_review.question}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/jurisdiction-tax" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/jurisdiction-tax/customers" className="text-primary hover:underline">Customers</Link>
          <Link to="/founder/jurisdiction-tax/sellers" className="text-primary hover:underline">Sellers/entities</Link>
          <Link to="/founder/jurisdiction-tax/adviser-review" className="text-primary hover:underline">Adviser queue</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}