import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Radar, Trophy, Sparkles, Lock, CalendarClock, FileText, Upload, BookOpen, ListChecks, Eye, Map as MapIcon, Gavel, AlertTriangle, Factory, Stethoscope, ShieldCheck, ListOrdered, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ENTRY_STRATEGY_LABEL, type EntryStrategy } from "@/lib/fundingRadarEngine";

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
  marketsMapped: number;
  topCrowded: { name: string; crowding: string } | null;
  topWhiteSpace: { name: string; score: number } | null;
  highestSaturation: { name: string; risk: string } | null;
  bestNicheWedge: { name: string; strategy: string } | null;
  topAvoid: { name: string; reason: string } | null;
  decisionsNeeded: Array<{ id: string; name: string; status: string }>;
  topRisks: Array<{ name: string; reason: string }>;
  watchChanges: Array<{ name: string; title: string }>;
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
      const [latestRun, currentRun, companies, beyond, needsVerify, clusters, shortlist, promotedCount, topScore, candidates, approvals, legalNotif, watchActive, newSignals, topNeg, topPos, reviewDue, marketMaps] = await Promise.all([
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
        sb.from("funding_market_maps").select("market_name,crowding_level,saturation_risk,white_space_score,recommended_entry_strategy,avoid_reason,liftor_entry_score").order("liftor_entry_score",{ascending:false,nullsFirst:false}).limit(50),
      ]);
      const decisionsNeeded = ((shortlist.data ?? []) as any[])
        .filter((r) => ["shortlisted","reviewing"].includes(r.status))
        .slice(0, 3)
        .map((r: any) => ({ id: r.id, name: r.funding_radar_companies?.company_name ?? "—", status: r.status }));
      const candRows = (candidates.data ?? []) as any[];
      const selected = candRows.find((c) => c.recommendation_status === "selected");
      const topRows = (topScore.data ?? []) as any[];
      const mmRows = (marketMaps.data ?? []) as any[];
      const topRisks = mmRows
        .filter((m: any) => String(m.recommended_entry_strategy ?? "").startsWith("AVOID") || m.saturation_risk === "extreme" || m.saturation_risk === "high")
        .slice(0, 3)
        .map((m: any) => ({ name: m.market_name, reason: m.avoid_reason ?? m.saturation_risk ?? m.recommended_entry_strategy ?? "" }));
      const crowdOrder: Record<string, number> = { extreme: 4, high: 3, moderate: 2, low: 1 };
      const topCrowdedRow = [...mmRows].sort((a, b) => (crowdOrder[b.crowding_level] ?? 0) - (crowdOrder[a.crowding_level] ?? 0))[0] ?? null;
      const topWhiteSpaceRow = [...mmRows].sort((a, b) => Number(b.white_space_score ?? 0) - Number(a.white_space_score ?? 0))[0] ?? null;
      const highestSatRow = [...mmRows].sort((a, b) => (crowdOrder[b.saturation_risk] ?? 0) - (crowdOrder[a.saturation_risk] ?? 0))[0] ?? null;
      const niche = mmRows.find((m) => m.recommended_entry_strategy === "BUILD_NICHE_WEDGE") ?? mmRows.find((m) => String(m.recommended_entry_strategy ?? "").startsWith("BUILD")) ?? null;
      const avoid = mmRows.find((m) => String(m.recommended_entry_strategy ?? "").startsWith("AVOID")) ?? null;
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
        marketsMapped: mmRows.length,
        topCrowded: topCrowdedRow ? { name: topCrowdedRow.market_name, crowding: topCrowdedRow.crowding_level ?? "—" } : null,
        topWhiteSpace: topWhiteSpaceRow ? { name: topWhiteSpaceRow.market_name, score: Number(topWhiteSpaceRow.white_space_score ?? 0) } : null,
        highestSaturation: highestSatRow ? { name: highestSatRow.market_name, risk: highestSatRow.saturation_risk ?? "—" } : null,
        bestNicheWedge: niche ? { name: niche.market_name, strategy: ENTRY_STRATEGY_LABEL[niche.recommended_entry_strategy as EntryStrategy] ?? niche.recommended_entry_strategy } : null,
        topAvoid: avoid ? { name: avoid.market_name, reason: avoid.avoid_reason ?? (ENTRY_STRATEGY_LABEL[avoid.recommended_entry_strategy as EntryStrategy] ?? "") } : null,
        decisionsNeeded,
        topRisks,
        watchChanges: [],
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

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><MapIcon className="h-4 w-4 text-primary" />Market Crowding & White Space</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Markets mapped" value={s?.marketsMapped ?? 0} />
          <Row label="Most crowded" value={s?.topCrowded ? `${s.topCrowded.name} · ${s.topCrowded.crowding}` : "—"} />
          <Row label="Highest white space" value={s?.topWhiteSpace ? `${s.topWhiteSpace.name} · ${s.topWhiteSpace.score}/100` : "—"} />
          <Row label="Highest saturation" value={s?.highestSaturation ? `${s.highestSaturation.name} · ${s.highestSaturation.risk}` : "—"} />
          <Row label="Best niche wedge" value={s?.bestNicheWedge ? `${s.bestNicheWedge.name}` : "—"} />
          <Row label="Top avoid" value={s?.topAvoid ? `${s.topAvoid.name}` : "—"} />
          <div className="col-span-2 md:col-span-6 flex gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/market-maps"><MapIcon className="h-3 w-3 mr-1" />Market maps</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/white-space"><Sparkles className="h-3 w-3 mr-1" />White space</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Crowded does not mean bad. Use Market Maps to distinguish saturated commodity markets from proven markets with white space, and to identify niche, vertical or geographic wedges before promoting into the Quarterly Build Selector.</p>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Gavel className="h-4 w-4 text-primary" />Founder decisions</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="border border-border/50 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Top 3 needing decision</p>
            {(s?.decisionsNeeded ?? []).length === 0 ? (
              <p className="text-muted-foreground italic">None — shortlist is clean.</p>
            ) : (
              <ul className="space-y-1">
                {(s?.decisionsNeeded ?? []).map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">{d.name}</span>
                    <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-border/50 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3 text-amber-400" />Top 3 risks</p>
            {(s?.topRisks ?? []).length === 0 ? (
              <p className="text-muted-foreground italic">No risk markets logged.</p>
            ) : (
              <ul className="space-y-1">
                {(s?.topRisks ?? []).map((r, i) => (
                  <li key={i}><span className="font-medium">{r.name}</span><span className="text-muted-foreground"> — {r.reason}</span></li>
                ))}
              </ul>
            )}
          </div>
          <div className="border border-border/50 rounded p-2">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Run & build</p>
            <p>Next run: <span className="text-foreground">{s?.nextRunAt ?? "—"}</span></p>
            <p>Selected build: <span className="text-foreground">{s?.selectedBuild ?? "none"}</span></p>
            <p>Missing evidence: <span className="text-foreground">{s?.needsVerification ?? 0}</span></p>
            <p>Blocked / rejected: <span className="text-foreground">{s?.blockedCount ?? 0}</span></p>
            <p className="text-primary">Next action: {s?.nextAction ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Factory className="h-4 w-4 text-primary" />Quarterly Production Build Machine</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Current quarter" value={s ? `Q${s.quarter} ${s.year}` : "—"} />
          <Row label="Recommended primary" value={s?.selectedBuild ?? <span className="text-muted-foreground">pending evaluation</span>} />
          <Row label="Backup build" value={(s?.candidateCount ?? 0) > 1 ? "available" : <span className="text-muted-foreground">none</span>} />
          <Row label="Production pack" value={s?.selectedBuild ? "draft ready" : "—"} />
          <Row label="Founder approval" value={<span className="text-amber-300">required to start build</span>} />
          <Row label="Next action" value={<span className="text-primary">{s?.selectedBuild ? "Review production pack" : "Promote shortlist → selector"}</span>} />
          <div className="col-span-2 md:col-span-6 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine"><Factory className="h-3 w-3 mr-1" />Production machine</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/portfolio-exit/build-selector"><Trophy className="h-3 w-3 mr-1" />Build Selector</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/launch-factory"><FileText className="h-3 w-3 mr-1" />Launch Factory</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Reads the last three monthly Funding Radar runs, applies kill rules, capacity, market and portfolio gates, and recommends one Primary and one Backup build. Founder approval still gates production build, brand/site, domains, outreach and live launch.</p>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Business Autopsy & Better Build Generator</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Latest autopsy" value={<span className="text-muted-foreground">open list</span>} />
          <Row label="Better Build Pack" value={<span className="text-muted-foreground">generated per autopsy</span>} />
          <Row label="Lovable prompt pack" value={<span className="text-muted-foreground">10-step pack</span>} />
          <Row label="Approval required" value={<span className="text-amber-300">before build / brand / outreach</span>} />
          <Row label="Linked quarterly build" value={<span className="text-muted-foreground">via Production Machine</span>} />
          <Row label="Next action" value={<span className="text-primary">Open an autopsy → run analysis</span>} />
          <div className="col-span-2 md:col-span-6 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/funding-radar/business-autopsy"><Stethoscope className="h-3 w-3 mr-1" />Business autopsy</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/build-generator"><Sparkles className="h-3 w-3 mr-1" />Better Build Generator</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine"><Factory className="h-3 w-3 mr-1" />Production Machine</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Public, manual, uploaded, founder-approved or licensed sources only. Liftor extracts validated customer pain and weakness signals — never code, branding, copy, customer data or proprietary workflows. Generates a legally distinct Better Build Pack and a 10-prompt Lovable build pack. Founder approval still gates production build, brand/site, domains, outreach and live launch.</p>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><ListOrdered className="h-4 w-4 text-primary" />Production Queue · Build Pack Validator + Lovable Prompt Queue</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Current quarterly build" value={s?.selectedBuild ?? <span className="text-muted-foreground">pending</span>} />
          <Row label="Build pack validation" value={<span className="text-muted-foreground">opens validator</span>} />
          <Row label="Current prompt stage" value={<span className="text-muted-foreground">opens queue</span>} />
          <Row label="Next prompt ready" value={<span className="text-muted-foreground">based on deps</span>} />
          <Row label="Blocked dependencies" value={<span className="text-muted-foreground">enforced in queue</span>} />
          <Row label="QA + live mode" value={<span className="text-amber-300">locked until founder approves</span>} />
          <div className="col-span-2 md:col-span-6 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/build-pack-validator"><ShieldCheck className="h-3 w-3 mr-1" />Build Pack Validator</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/prompt-queue"><ListOrdered className="h-3 w-3 mr-1" />Prompt Queue</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine"><Factory className="h-3 w-3 mr-1" />Production Machine</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Validator confirms 23 required artefacts before any Lovable prompts run. The 14-stage queue enforces dependencies, acceptance criteria, QA gate and founder approval for live mode. No outbound, no paid APIs, no public claims, no copying of competitor branding, code, copy, customer lists or protected assets.</p>
        </CardContent>
      </Card>

      <Card className="tech-card lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" />Vertical Launch Cannon · 30-Day Revenue Strike Plan</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
          <Row label="Doctrine" value={<span className="text-muted-foreground">Build · QA · Launch · One vertical · Measure · Fix · Push</span>} />
          <Row label="Launch mode" value={<span className="text-amber-300">PREPARING until gates pass</span>} />
          <Row label="Soft launch" value={<span className="text-rose-300">disabled by doctrine</span>} />
          <Row label="Outreach" value={<span className="text-amber-300">drafted · approval-gated</span>} />
          <Row label="CRM pipeline" value={<span className="text-muted-foreground">14 stages</span>} />
          <Row label="Strike plan" value={<span className="text-muted-foreground">30 days · daily measure</span>} />
          <div className="col-span-2 md:col-span-6 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/quarterly-production-machine/vertical-launch"><Rocket className="h-3 w-3 mr-1" />Vertical Launch Cannon</Link></Button>
            <Button asChild size="sm" variant="outline" className="h-7 text-[11px]"><Link to="/founder/launch-factory/vertical-launch-cannon"><Factory className="h-3 w-3 mr-1" />Open in Launch Factory</Link></Button>
          </div>
          <p className="col-span-2 md:col-span-6 text-[11px] text-muted-foreground">Controlled hard launch into one chosen vertical with a 30-day revenue strike plan. Founder approval gates remain in force for public launch, outreach sending, sending domain/email, paid APIs, paid ads, external contact, public claims and payments. No outbound, no paid APIs, no spend, no contact triggered automatically.</p>
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