import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Trophy, Sparkles, Lock, CalendarClock, FileText, Upload, BookOpen, ListChecks, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Stats = {
  lastRunLabel: string | null;
  lastRunStatus: string | null;
  currentRunStatus: string | null;
  currentRunMonth: string | null;
  companiesDetected: number;
  beyondSeed: number;
  needsVerification: number;
  problemClusters: number;
  shortlisted: number;
  promoted: number;
  topCE: { name: string; score: number } | null;
  approvalsPending: number;
  legalWarnings: number;
  nextRunAt: string;
  nextAction: string;
  quarter: number;
  year: number;
  selectedBuild: string | null;
  candidateCount: number;
  blockedCount: number;
  topAdvantage: Array<{ name: string; score: number; id: string }>;
  watchActive: number;
  newSignals30d: number;
  topWeakness: { name: string; title: string } | null;
  topPositive: { name: string; title: string } | null;
  reviewDue: number;
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

function nextFirstOfMonth9amLondon(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  // candidate this month at 09:00 London ≈ 08:00 or 09:00 UTC depending on DST; render in London tz
  const target = new Date(Date.UTC(y, m, 1, 9, 0, 0));
  const useNext = now > target;
  const final = useNext ? new Date(Date.UTC(y, m + 1, 1, 9, 0, 0)) : target;
  return final.toLocaleString("en-GB", { timeZone: "Europe/London", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function FundingRadarCommandPanel() {
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const sb: any = supabase as any;
      const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
      const [latestRun, currentRun, companies, beyond, needsVerify, clusters, shortlist, promotedCount, topScore, candidates, approvals, legalNotif, watchActive, newSignals, topNeg, topPos, reviewDue] = await Promise.all([
        sb.from("funding_monthly_runs").select("month,year,status,finalised_at,updated_at").order("year", { ascending: false }).order("month", { ascending: false }).limit(1),
        sb.from("funding_monthly_runs").select("month,year,status").eq("month", month).eq("year", year).maybeSingle(),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }).not("last_funding_round", "is", null).not("last_funding_round", "in", '("seed","pre_seed","pre-seed")'),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }).eq("needs_verification", true),
        sb.from("funding_problem_clusters").select("id", { count: "exact", head: true }),
        sb.from("funding_shortlist").select("id,status").in("status", ["shortlisted","candidate","reviewing"]),
        sb.from("funding_shortlist").select("id", { count: "exact", head: true }).eq("status", "promoted"),
        sb.from("funding_radar_scores").select("capital_efficiency_advantage_score,funding_company_id,funding_radar_companies(company_name)").order("capital_efficiency_advantage_score", { ascending: false }).limit(3),
        sb.from("ma_build_candidates").select("id,candidate_name,recommendation_status,rejection_reason").eq("quarter", quarter).eq("year", year),
        sb.from("founder_notification_queue").select("id", { count: "exact", head: true }).eq("status", "unread").eq("founder_action_required", true),
        sb.from("funding_radar_companies").select("id", { count: "exact", head: true }).eq("needs_verification", true),
        sb.from("funding_watchlist").select("id", { count: "exact", head: true }).eq("watch_status", "active"),
        sb.from("funding_weakness_signals").select("id", { count: "exact", head: true }).gte("created_at", since30d),
        sb.from("funding_weakness_signals").select("signal_title,severity_score,funding_radar_companies(company_name)").eq("signal_polarity","negative").order("severity_score",{ascending:false,nullsFirst:false}).limit(1),
        sb.from("funding_weakness_signals").select("signal_title,funding_radar_companies(company_name)").eq("signal_polarity","positive").order("created_at",{ascending:false}).limit(1),
        sb.from("funding_watchlist").select("id", { count: "exact", head: true }).lte("next_review_due_at", new Date().toISOString()),
      ]);
      const candRows = (candidates.data ?? []) as any[];
      const selected = candRows.find((c) => c.recommendation_status === "selected");
      const topRows = (topScore.data ?? []) as any[];
      const lr = latestRun.data?.[0];
      const cr = currentRun.data;
      const candidateCount = candRows.filter((c) => ["candidate","shortlisted","selected"].includes(c.recommendation_status)).length;
      const nextAction = cr?.status === "draft"
        ? "Import or add companies for this month"
        : selected
          ? "Promote selected build to portfolio asset"
          : candidateCount > 0
            ? "Score buildability & pick one Q-build"
            : (shortlist.data ?? []).length > 0
              ? "Promote 0–3 from shortlist"
              : "Start monthly run & import CSV";
      setS({
        lastRunLabel: lr ? `${String(lr.month).padStart(2,"0")}/${lr.year}` : null,
        lastRunStatus: lr?.status ?? null,
        currentRunStatus: cr?.status ?? null,
        currentRunMonth: cr ? `${String(cr.month).padStart(2,"0")}/${cr.year}` : null,
        companiesDetected: companies.count ?? 0,
        beyondSeed: beyond.count ?? 0,
        needsVerification: needsVerify.count ?? 0,
        problemClusters: clusters.count ?? 0,
        shortlisted: (shortlist.data ?? []).length,
        promoted: promotedCount.count ?? 0,
        topCE: topRows[0]
          ? { name: topRows[0].funding_radar_companies?.company_name ?? "—", score: topRows[0].capital_efficiency_advantage_score ?? 0 }
          : null,
        approvalsPending: approvals.count ?? 0,
        legalWarnings: legalNotif.count ?? 0,
        nextRunAt: nextFirstOfMonth9amLondon(),
        nextAction,
        quarter, year,
        selectedBuild: selected?.candidate_name ?? null,
        candidateCount,
        blockedCount: candRows.filter((c) => ["rejected","parked"].includes(c.recommendation_status)).length,
        topAdvantage: topRows.map((r) => ({
          id: r.funding_company_id,
          name: r.funding_radar_companies?.company_name ?? "—",
          score: r.capital_efficiency_advantage_score ?? 0,
        })),
        watchActive: watchActive.count ?? 0,
        newSignals30d: newSignals.count ?? 0,
        topWeakness: (topNeg.data?.[0]) ? { name: topNeg.data[0].funding_radar_companies?.company_name ?? "—", title: topNeg.data[0].signal_title ?? "" } : null,
        topPositive: (topPos.data?.[0]) ? { name: topPos.data[0].funding_radar_companies?.company_name ?? "—", title: topPos.data[0].signal_title ?? "" } : null,
        reviewDue: reviewDue.count ?? 0,
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
          <Row label="Next scheduled run" value={<span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" />{s?.nextRunAt ?? "—"}</span>} />
          <Row label="Last run" value={s?.lastRunLabel ? `${s.lastRunLabel} · ${s.lastRunStatus}` : "—"} />
          <Row label="Current run" value={s?.currentRunMonth ? `${s.currentRunMonth} · ${s.currentRunStatus}` : <span className="text-muted-foreground">not started</span>} />
          <Row label="Companies detected" value={s?.companiesDetected ?? 0} />
          <Row label="Beyond seed" value={s?.beyondSeed ?? 0} />
          <Row label="Needs verification" value={s?.needsVerification ?? 0} />
          <Row label="Problem clusters" value={s?.problemClusters ?? 0} />
          <Row label="Shortlisted" value={s?.shortlisted ?? 0} />
          <Row label="Promoted candidates" value={s?.promoted ?? 0} />
          <Row label="Top capital efficiency" value={s?.topCE ? `${s.topCE.name} · ${s.topCE.score}/100` : "—"} />
          <Row label="Approvals pending" value={s?.approvalsPending ?? 0} />
          <Row label="Next action" value={<span className="text-primary">{s?.nextAction ?? "—"}</span>} />
          {(s?.companiesDetected ?? 0) === 0 && (
            <p className="text-[11px] text-muted-foreground italic pt-1">No live records yet — import CSV or add companies manually.</p>
          )}
          <div className="grid grid-cols-2 gap-1 mt-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar"><Radar className="h-3 w-3 mr-1" />Radar</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/monthly-run"><CalendarClock className="h-3 w-3 mr-1" />Monthly run</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/companies"><Upload className="h-3 w-3 mr-1" />Import CSV</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/decision-pack"><FileText className="h-3 w-3 mr-1" />Decision pack</Link></Button>
          </div>
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
          {(s?.candidateCount ?? 0) === 0 && (
            <p className="text-[11px] text-muted-foreground italic pt-1">No promoted candidates yet — shortlist first.</p>
          )}
          <div className="grid grid-cols-2 gap-1 mt-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/portfolio-exit/build-selector"><Trophy className="h-3 w-3 mr-1" />Selector</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/shortlist"><ListChecks className="h-3 w-3 mr-1" />Shortlist</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Capital Efficiency Advantage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-xs">
          <p className="text-[11px] text-muted-foreground">Top 3 funded companies where Liftor can remove staff / capital dependency.</p>
          {(s?.topAdvantage ?? []).length === 0 ? (
            <p className="text-muted-foreground italic py-2">No live records yet — import CSV or add companies manually.</p>
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
          <div className="grid grid-cols-2 gap-1 mt-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/capital-efficiency"><Sparkles className="h-3 w-3 mr-1" />CE Selector</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/settings"><BookOpen className="h-3 w-3 mr-1" />Runbook</Link></Button>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Lock className="h-4 w-4 text-amber-400" />No external actions enabled — founder approval required before</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {APPROVAL_GATED_ACTIONS.map((a) => (
              <Badge key={a} variant="outline" className="text-[10px] border-amber-500/30 text-amber-300">{a}</Badge>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Operating mode: <span className="text-foreground">Manual / CSV-first intelligence</span>. Future API-assisted mode (Crunchbase, Dealroom, PitchBook, Tracxn, CB Insights) requires explicit founder approval. All gated actions queue into the founder approval queue. Nothing in the Funding Radar or Quarterly Build Selector bypasses the existing approval workflow.</p>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Eye className="h-4 w-4 text-primary" />Watchlist & Weakness Signals</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Active watched" value={s?.watchActive ?? 0} />
          <Row label="New signals · 30d" value={s?.newSignals30d ?? 0} />
          <Row label="Top weakness" value={s?.topWeakness ? `${s.topWeakness.name}` : "—"} />
          <Row label="Top positive" value={s?.topPositive ? `${s.topPositive.name}` : "—"} />
          <Row label="Highest Liftor advantage" value={s?.topCE ? s.topCE.name : "—"} />
          <Row label="Review due" value={s?.reviewDue ?? 0} />
          <div className="col-span-2 md:col-span-6 flex gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/watchlist"><Eye className="h-3 w-3 mr-1" />Watchlist</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/weakness-signals"><ListChecks className="h-3 w-3 mr-1" />Weakness signals</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Internal intelligence only. No outbound contact, no scraping of restricted sources, no allegations or defamation. Public sources and manual/CSV input only.</p>
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