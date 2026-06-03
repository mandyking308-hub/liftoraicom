import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { AFLayout, AFStat } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  fetchOpportunity, fetchFunders, fetchDealStructures, fetchPitchPacks,
  matchFunders, pitchPackReadiness, ACTION_LABEL, FUNDER_TYPE_LABEL, fmtMoney,
  type AFOpportunity, type AFFunder, type AFDealStructure, type AFPitchPack,
} from "@/lib/acquisitionFundingEngine";

export default function AFOpportunityDetail() {
  const { id } = useParams();
  const [o, setO] = useState<AFOpportunity | null>(null);
  const [funders, setFunders] = useState<AFFunder[]>([]);
  const [deals, setDeals] = useState<AFDealStructure[]>([]);
  const [packs, setPacks] = useState<AFPitchPack[]>([]);
  useEffect(() => {
    if (!id) return;
    fetchOpportunity(id).then(setO).catch(() => {});
    fetchFunders().then(setFunders).catch(() => {});
    fetchDealStructures(id).then(setDeals).catch(() => {});
    fetchPitchPacks(id).then(setPacks).catch(() => {});
  }, [id]);

  if (!o) return <AFLayout title="Opportunity"><p className="text-xs text-muted-foreground">Loading or not found.</p></AFLayout>;

  const matched = matchFunders(o, funders);
  const pack = packs[0] ?? null;
  const readiness = pitchPackReadiness(pack);

  return (
    <AFLayout title={o.opportunity_name} subtitle={o.notes ?? undefined}>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <AFStat label="Priority" value={o.overall_priority_score ?? "—"} />
        <AFStat label="Liftor fit" value={o.liftor_fit_score ?? "—"} />
        <AFStat label="Legal risk" value={o.legal_risk_score ?? "—"} accent="rose" />
        <AFStat label="Action" value={ACTION_LABEL[o.recommended_action]} />
        <AFStat label="Asking" value={fmtMoney(o.asking_price)} />
      </div>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Asset snapshot</CardTitle></CardHeader>
        <CardContent className="text-xs grid md:grid-cols-2 gap-2">
          <Row k="Category" v={o.category} />
          <Row k="Country" v={o.country ?? "—"} />
          <Row k="Distress signal" v={o.distress_signal} />
          <Row k="Owner reason" v={o.owner_reason_for_sale ?? "—"} />
          <Row k="Revenue (TTM)" v={fmtMoney(o.revenue_ttm)} />
          <Row k="Profit (TTM)" v={fmtMoney(o.profit_ttm)} />
          <Row k="MRR" v={fmtMoney(o.current_mrr)} />
          <Row k="ARR" v={fmtMoney(o.current_arr)} />
          <Row k="Customers" v={o.customer_count ?? "—"} />
          <Row k="Users" v={o.user_count ?? "—"} />
          <Row k="Email list" v={o.email_list_size ?? "—"} />
          <Row k="Social" v={o.social_following ?? "—"} />
          <Row k="Liftor advantage" v={o.liftor_operating_advantage ?? "—"} />
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Matched funder shortlist ({matched.length})</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {matched.length === 0 && <p className="text-muted-foreground">No funders currently match. Add or update funding sources.</p>}
          {matched.map(f => (
            <div key={f.id} className="flex items-center gap-2 border-b border-border/30 py-1">
              <span className="flex-1 truncate">{f.funder_name}</span>
              <Badge variant="outline" className="text-[10px]">{FUNDER_TYPE_LABEL[f.funder_type]}</Badge>
              <Badge variant="outline" className="text-[10px]">{f.status}</Badge>
              <span className="text-muted-foreground">{fmtMoney(f.preferred_deal_size_min)}–{fmtMoney(f.preferred_deal_size_max)}</span>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground italic pt-2">Matched internally only. No funder is contacted without founder approval.</p>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Deal structures ({deals.length})</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          {deals.length === 0 && <p className="text-muted-foreground">No deal structure drafted yet.</p>}
          {deals.map(d => (
            <div key={d.id} className="flex items-center gap-2 border-b border-border/30 py-1">
              <span className="flex-1 truncate">{d.recommended_structure ?? "Draft"}</span>
              <span className="text-muted-foreground">cash {fmtMoney(d.cash_upfront)}</span>
              <span className="text-muted-foreground">seller {fmtMoney(d.seller_finance_amount)}</span>
              <span className="text-muted-foreground">earn-out {fmtMoney(d.earn_out_amount)}</span>
              {d.spv_required && <Badge variant="outline" className="text-[10px] bg-amber-500/15 text-amber-300 border-amber-500/30">SPV</Badge>}
              {d.legal_review_required && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-400 border-rose-500/30">Legal</Badge>}
              {d.tax_review_required && <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-400 border-rose-500/30">Tax</Badge>}
              <Badge variant="outline" className="text-[10px]">{d.founder_approval_status}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Pitch pack readiness</CardTitle></CardHeader>
        <CardContent className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] ${readiness.ready ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
              {readiness.ready ? "Ready for review" : `Missing ${readiness.missing.length} field(s)`}
            </Badge>
            {pack && <Badge variant="outline" className="text-[10px]">{pack.founder_approval_status}</Badge>}
          </div>
          {!readiness.ready && (
            <p className="text-muted-foreground">Missing: {readiness.missing.join(", ")}</p>
          )}
        </CardContent>
      </Card>
    </AFLayout>
  );
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div className="flex items-baseline gap-2 border-b border-border/30 py-1">
      <span className="text-[10px] uppercase text-muted-foreground w-32 shrink-0">{k}</span>
      <span className="flex-1 truncate">{String(v ?? "—")}</span>
    </div>
  );
}