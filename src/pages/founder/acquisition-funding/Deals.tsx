import { useEffect, useState } from "react";
import { AFLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  fetchDealStructures, fetchOpportunities, fmtMoney,
  type AFDealStructure, type AFOpportunity,
} from "@/lib/acquisitionFundingEngine";

export default function AFDeals() {
  const [deals, setDeals] = useState<AFDealStructure[]>([]);
  const [opps, setOpps] = useState<AFOpportunity[]>([]);
  useEffect(() => {
    fetchDealStructures().then(setDeals).catch(() => {});
    fetchOpportunities().then(setOpps).catch(() => {});
  }, []);
  const byId = new Map(opps.map(o => [o.id, o]));
  return (
    <AFLayout title="Deal Structures" subtitle="Drafted financial structures per opportunity. SPV or external-equity automatically triggers legal + tax review. No deal proceeds without founder approval.">
      {deals.length === 0 && <p className="text-xs text-muted-foreground">No deal structures yet.</p>}
      {deals.map(d => {
        const o = byId.get(d.opportunity_id);
        return (
          <Card key={d.id} className="tech-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                {o ? <Link to={`/founder/acquisition-funding/opportunities/${o.id}`} className="hover:text-primary">{o.opportunity_name}</Link> : "Unknown opportunity"}
                <Badge variant="outline" className="text-[10px]">{d.recommended_structure ?? "Draft"}</Badge>
                <Badge variant="outline" className="text-[10px]">{d.founder_approval_status}</Badge>
                {d.spv_required && <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">SPV</Badge>}
                {d.legal_review_required && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-400 border-rose-500/30">Legal review</Badge>}
                {d.tax_review_required && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-400 border-rose-500/30">Tax review</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs grid md:grid-cols-3 gap-2">
              <Cell k="Total price" v={fmtMoney(d.total_purchase_price)} />
              <Cell k="Cash upfront" v={fmtMoney(d.cash_upfront)} />
              <Cell k="Seller finance" v={fmtMoney(d.seller_finance_amount)} />
              <Cell k="Deferred" v={fmtMoney(d.deferred_payment_amount)} />
              <Cell k="Earn-out" v={fmtMoney(d.earn_out_amount)} />
              <Cell k="Revenue share" v={d.revenue_share_terms ?? "—"} />
              <Cell k="Investor equity" v={fmtMoney(d.investor_equity_required)} />
              <Cell k="Debt" v={fmtMoney(d.debt_required)} />
              <Cell k="Regulatory risk" v={d.regulatory_risk ?? "—"} />
            </CardContent>
          </Card>
        );
      })}
    </AFLayout>
  );
}

function Cell({ k, v }: { k: string; v: any }) {
  return (
    <div className="border border-border/40 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{k}</p>
      <p className="tabular-nums">{String(v ?? "—")}</p>
    </div>
  );
}