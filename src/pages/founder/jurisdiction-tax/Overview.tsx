import { useEffect, useState } from "react";
import { JTLayout, JTStat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { fetchCurrencySettings, fetchJurisdictionRecords, fetchTaxFlags, fetchAdviserReviewItems, summarize, REVIEW_TYPE_META, type JTSummary } from "@/lib/jurisdictionTaxEngine";

export default function JTOverview() {
  const [sum, setSum] = useState<JTSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchCurrencySettings(), fetchJurisdictionRecords(), fetchTaxFlags(), fetchAdviserReviewItems()])
      .then(([c,j,f,r]) => setSum(summarize(c,j,f,r))).catch(() => setSum(null));
  }, []);
  return (
    <JTLayout title="Jurisdiction & Tax Overview" subtitle="Tracks currencies, customer/seller/entity countries and tax-review flags across UK, US, UAE, Europe and global. Tracker-only — never gives final tax or legal advice and never files returns.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <JTStat label="Currencies"          value={sum?.total_currencies ?? 0} />
        <JTStat label="Estimated FX rows"   value={sum?.estimated_fx ?? 0} tone={(sum?.estimated_fx ?? 0) > 0 ? "warn" : "ok"} />
        <JTStat label="Customer countries"  value={sum?.customer_countries ?? 0} />
        <JTStat label="Seller countries"    value={sum?.seller_countries ?? 0} />
        <JTStat label="Unknown jurisdiction" value={sum?.unknown_jurisdictions ?? 0} tone={(sum?.unknown_jurisdictions ?? 0) > 0 ? "bad" : "ok"} />
        <JTStat label="VAT/sales-tax review" value={sum?.vat_review ?? 0} tone={(sum?.vat_review ?? 0) > 0 ? "warn" : "ok"} />
        <JTStat label="Marketplace review"  value={sum?.marketplace_review ?? 0} tone={(sum?.marketplace_review ?? 0) > 0 ? "warn" : "ok"} />
        <JTStat label="Adviser queue"       value={sum?.adviser_open ?? 0} tone={(sum?.adviser_open ?? 0) > 0 ? "warn" : "ok"} />
      </div>
      {sum?.top_review && (
        <Card className="tech-card border-orange-500/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2">Top adviser question
            <Badge variant="outline" className="text-[10px] bg-blue-500/15 text-blue-300 border-blue-500/30">{REVIEW_TYPE_META[sum.top_review.review_type]}</Badge>
            <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground border-border/50">{sum.top_review.priority}</Badge>
          </CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <p className="text-sm font-medium">{sum.top_review.question}</p>
            <Link to="/founder/jurisdiction-tax/adviser-review" className="text-[11px] text-primary hover:underline">Adviser review queue →</Link>
          </CardContent>
        </Card>
      )}
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Approval gates</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p>• Tracker only — no final tax advice, no return filings, no entity routing changes, no adviser/customer emails without founder approval.</p>
          <p>• Selling globally where critical tax/policy info is missing surfaces a warning but does not block internal operation.</p>
          <p>• FX rates labelled estimated / provider / manual / verified — confirmed revenue uses native currency, not estimated FX.</p>
        </CardContent>
      </Card>
    </JTLayout>
  );
}