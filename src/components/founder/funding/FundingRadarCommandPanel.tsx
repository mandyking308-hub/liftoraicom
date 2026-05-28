import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Trophy, Sparkles, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  lastRunAt: string | null;
  companiesDetected: number;
  beyondSeed: number;
  shortlisted: number;
  topCE: { name: string; score: number } | null;
  approvalsPending: number;
  quarter: number;
  year: number;
  selectedBuild: string | null;
  candidateCount: number;
  blockedCount: number;
  topAdvantage: Array<{ name: string; score: number; id: string }>;
};

const APPROVAL_GATED_ACTIONS = [
  "Paid API activation",
  "Contacting companies",
  "Contacting investors",
  "Contacting customers",
  "Contacting acquirers",
  "Publishing competitor comparisons",
  "Launching campaigns",
  "Exporting data",
  "Creating a new live business",
  "Sending outreach",
  "Opening a data room",
];

export default function FundingRadarCommandPanel() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      const year = now.getFullYear();
      const sb: any = supabase as any;
      const [run, companies, beyond, shortlist, topScore, candidates, approvals] = await Promise.all([
        sb.from("funding_monthly_runs").select("run_date,companies_detected").order("run_date", { ascending: false }).limit(1),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }).neq("last_funding_round", "pre_seed").neq("last_funding_round", "seed").not("last_funding_round", "is", null),
        sb.from("funding_shortlist").select("id,build_thesis,status,funding_radar_companies(company_name)").in("status", ["shortlisted","candidate","reviewing"]),
        sb.from("funding_radar_scores").select("capital_efficiency_advantage_score,funding_company_id,funding_radar_companies(company_name)").order("capital_efficiency_advantage_score", { ascending: false }).limit(3),
        sb.from("ma_build_candidates").select("id,candidate_name,recommendation_status,rejection_reason").eq("quarter", quarter).eq("year", year),
        sb.from("founder_approval_items").select("id", { count: "exact", head: true }).eq("status", "pending"),
      ]);
      const candRows = (candidates.data ?? []) as any[];
      const selected = candRows.find((c) => c.recommendation_status === "selected");
      const topRows = (topScore.data ?? []) as any[];
      setS({
        lastRunAt: run.data?.[0]?.run_date ?? null,
        companiesDetected: companies.count ?? 0,
        beyondSeed: beyond.count ?? 0,
        shortlisted: (shortlist.data ?? []).length,
        topCE: topRows[0]
          ? { name: topRows[0].funding_radar_companies?.company_name ?? "—", score: topRows[0].capital_efficiency_advantage_score ?? 0 }
          : null,
        approvalsPending: approvals.count ?? 0,
        quarter, year,
        selectedBuild: selected?.candidate_name ?? null,
        candidateCount: candRows.filter((c) => ["candidate","shortlisted","selected"].includes(c.recommendation_status)).length,
        blockedCount: candRows.filter((c) => ["rejected","parked"].includes(c.recommendation_status)).length,
        topAdvantage: topRows.map((r) => ({
          id: r.funding_company_id,
          name: r.funding_radar_companies?.company_name ?? "—",
          score: r.capital_efficiency_advantage_score ?? 0,
        })),
      });
    })().catch(() => setS(null));
  }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Radar className="h-4 w-4 text-primary" />Funding Radar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <Row label="Last monthly run" value={s?.lastRunAt ? new Date(s.lastRunAt).toLocaleDateString() : "—"} />
          <Row label="Companies detected" value={s?.companiesDetected ?? 0} />
          <Row label="Beyond seed" value={s?.beyondSeed ?? 0} />
          <Row label="Shortlisted" value={s?.shortlisted ?? 0} />
          <Row label="Top capital efficiency" value={s?.topCE ? `${s.topCE.name} · ${s.topCE.score}/100` : "—"} />
          <Row label="Approvals pending" value={s?.approvalsPending ?? 0} />
          <Button asChild size="sm" variant="outline" className="w-full mt-2 h-7 text-[11px]">
            <Link to="/founder/funding-radar">Open Funding Radar <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Trophy className="h-4 w-4 text-primary" />Quarterly Build Selector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <Row label="Current quarter" value={s ? `Q${s.quarter} ${s.year}` : "—"} />
          <Row label="Selected build" value={s?.selectedBuild ?? <span className="text-muted-foreground">none</span>} />
          <Row label="Active candidates" value={s?.candidateCount ?? 0} />
          <Row label="Blocked / rejected" value={s?.blockedCount ?? 0} />
          <Row label="Next action" value={s?.selectedBuild ? "Promote to portfolio asset" : (s && s.candidateCount > 0 ? "Pick one selected build" : "Promote from Funding Radar shortlist")} />
          <Button asChild size="sm" variant="outline" className="w-full mt-2 h-7 text-[11px]">
            <Link to="/founder/quarterly-build-selector">Open Selector <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Capital Efficiency Advantage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <p className="text-[11px] text-muted-foreground">Top 3 funded companies where Liftor can remove staff / capital dependency.</p>
          {(s?.topAdvantage ?? []).length === 0 ? (
            <p className="text-muted-foreground py-2">No scored companies yet.</p>
          ) : (
            <ol className="space-y-1 mt-1">
              {(s?.topAdvantage ?? []).map((t, i) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className="truncate">{i + 1}. {t.name}</span>
                  <Badge variant="outline" className="text-[10px]">{t.score}/100</Badge>
                </li>
              ))}
            </ol>
          )}
          <Button asChild size="sm" variant="outline" className="w-full mt-2 h-7 text-[11px]">
            <Link to="/founder/funding-radar/capital-efficiency">Capital Efficiency Selector <ArrowRight className="h-3 w-3 ml-1" /></Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" />Founder approval required before</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {APPROVAL_GATED_ACTIONS.map((a) => (
              <Badge key={a} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{a}</Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">All gated actions queue into the founder approval queue. Nothing in the Funding Radar or Quarterly Build Selector bypasses the existing approval workflow.</p>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}