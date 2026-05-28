import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat, DemoBadge, HideDemoToggle, useHideDemo, applyDemoFilter, isDemoRecord } from "./_shared";
import {
  fetchCompanies,
  fetchClusters,
  fetchShortlist,
  fetchMonthlyRuns,
  FORBIDDEN_EXTRACTION_FIELDS,
} from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShieldAlert, Sparkles, Download } from "lucide-react";
import { ENTRY_STRATEGY_LABEL, type EntryStrategy } from "@/lib/fundingRadarEngine";

const SEED_ROUNDS = ["pre-seed", "preseed", "pre_seed", "seed"];

const APPROVAL_REQUIRED_ACTIONS = [
  "Activating any paid funding API connector",
  "Promoting more than 3 shortlist items in a single run",
  "Selecting a quarterly build inside Quarterly Build Selector",
  "Any outbound contact with funded companies, investors, customers or acquirers",
  "Publishing competitor comparisons or campaigns",
  "Opening a data room or creating a live business",
];

export default function FRDecisionPack() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [scores, setScores] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [marketMaps, setMarketMaps] = useState<any[]>([]);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [hideDemo] = useHideDemo();

  const generate = async () => {
    setCompanies(await fetchCompanies().catch(() => []));
    setClusters(await fetchClusters().catch(() => []));
    setShortlist(await fetchShortlist().catch(() => []));
    setRuns(await fetchMonthlyRuns().catch(() => []));
    const { data } = await (supabase as any)
      .from("funding_radar_scores")
      .select("*, funding_radar_companies(id, company_name, sector, last_funding_amount_usd, last_funding_round, cluster_id)")
      .order("total_score", { ascending: false });
    setScores(data ?? []);
    const { data: mm } = await (supabase as any)
      .from("funding_market_maps")
      .select("*, funding_problem_clusters(cluster_name)")
      .order("liftor_entry_score", { ascending: false, nullsFirst: false });
    setMarketMaps(mm ?? []);
    setGeneratedAt(new Date().toISOString());
  };

  useEffect(() => { generate(); }, []);

  const visibleCompanies = applyDemoFilter(companies, hideDemo);
  const visibleScores = applyDemoFilter(scores, hideDemo);
  const visibleShortlist = applyDemoFilter(shortlist, hideDemo);
  const visibleClusters = applyDemoFilter(clusters, hideDemo);

  const beyondSeed = useMemo(
    () =>
      visibleCompanies.filter((c) => {
        const r = String(c.last_funding_round ?? "").toLowerCase().replace(/\s+/g, "");
        return r && !SEED_ROUNDS.includes(r);
      }),
    [visibleCompanies],
  );
  const seedExcluded = useMemo(
    () =>
      visibleCompanies.filter((c) => {
        const r = String(c.last_funding_round ?? "").toLowerCase().replace(/\s+/g, "");
        return r && SEED_ROUNDS.includes(r);
      }),
    [visibleCompanies],
  );

  const topClusters = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const c of beyondSeed) {
      if (!c.cluster_id) continue;
      const cl = visibleClusters.find((x) => x.id === c.cluster_id);
      const key = c.cluster_id;
      const name = cl?.cluster_name ?? "Unnamed cluster";
      const cur = counts.get(key) ?? { name, count: 0 };
      cur.count += 1;
      counts.set(key, cur);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [beyondSeed, visibleClusters]);

  const topCE = visibleScores.slice(0, 5);
  const promoted = visibleShortlist.filter((s) => s.status === "promoted");
  const rejected = visibleShortlist.filter((s) => s.status === "rejected" || s.status === "parked");
  const ipWarnings = visibleCompanies.filter((c) => !c.distinct_execution_route || c.needs_verification);

  const downloadJson = () => {
    const pack = {
      generated_at: generatedAt,
      monthly_run: runs[0] ?? null,
      companies_detected: visibleCompanies.length,
      beyond_seed: beyondSeed.length,
      excluded_seed: seedExcluded.length,
      top_clusters: topClusters,
      top_capital_efficiency: topCE.map((s) => ({
        company: s.funding_radar_companies?.company_name,
        total_score: s.total_score,
      })),
      shortlisted: visibleShortlist.length,
      promoted: promoted.length,
      rejected_or_parked: rejected.length,
      legal_ip_warnings: ipWarnings.length,
      market_crowding: {
        markets_reviewed: marketMaps.length,
        avoid: marketMaps.filter((m) => String(m.recommended_entry_strategy ?? "").startsWith("AVOID")).map((m) => ({ name: m.market_name, reason: m.avoid_reason })),
        watch: marketMaps.filter((m) => String(m.recommended_entry_strategy ?? "").startsWith("WATCH")).map((m) => m.market_name),
        white_space: marketMaps.filter((m) => String(m.recommended_entry_strategy ?? "").startsWith("BUILD")).map((m) => ({ name: m.market_name, strategy: m.recommended_entry_strategy, white_space_score: m.white_space_score })),
      },
      forbidden_extraction_fields: FORBIDDEN_EXTRACTION_FIELDS,
      approval_required_actions: APPROVAL_REQUIRED_ACTIONS,
    };
    const blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `liftor_funding_decision_pack_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <FundingRadarLayout
      title="Monthly Decision Pack"
      subtitle="A read-only summary of this month's radar state for the founder. Promotion still flows through the Quarterly Build Selector — this pack does not select, contact, or send anything."
    >
      <FRSection
        title="Generate"
        description={generatedAt ? `Last generated ${new Date(generatedAt).toLocaleString()}` : "Click generate to refresh."}
        actions={
          <div className="flex gap-2">
            <HideDemoToggle />
            <Button size="sm" variant="outline" onClick={downloadJson}><Download className="h-4 w-4 mr-1" />Export JSON</Button>
            <Button size="sm" onClick={generate}><Sparkles className="h-4 w-4 mr-1" />Regenerate</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <FRStat label="Companies detected" value={visibleCompanies.length} />
          <FRStat label="Beyond seed" value={beyondSeed.length} />
          <FRStat label="Excluded seed/pre-seed" value={seedExcluded.length} />
          <FRStat label="Shortlisted" value={visibleShortlist.length} />
          <FRStat label="Promoted" value={promoted.length} />
        </div>
      </FRSection>

      <FRSection title="Top problem clusters">
        {topClusters.length === 0 ? (
          <p className="text-xs text-muted-foreground">No clustered companies yet.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {topClusters.map((c, i) => (
              <li key={i} className="flex justify-between border border-border/50 rounded p-2">
                <span>{c.name}</span>
                <Badge variant="outline" className="text-[10px]">{c.count} companies</Badge>
              </li>
            ))}
          </ul>
        )}
      </FRSection>

      <FRSection title="Top capital-efficiency opportunities">
        {topCE.length === 0 ? (
          <p className="text-xs text-muted-foreground">No scored companies yet.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Sector</TableHead><TableHead>Round</TableHead><TableHead>Total</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {topCE.map((s) => {
                const c = s.funding_radar_companies;
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {c?.company_name ?? "—"}
                        <DemoBadge record={c} />
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{c?.sector ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c?.last_funding_round ?? "—"}</TableCell>
                    <TableCell className="text-sm font-bold text-primary">{s.total_score ?? "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </FRSection>

      <FRSection title="Shortlisted opportunities & recommended quarterly build candidates">
        {visibleShortlist.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing shortlisted.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Cluster</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {visibleShortlist.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {s.funding_radar_companies?.company_name ?? "—"}
                      {isDemoRecord(s) && <DemoBadge record={s.funding_radar_companies} />}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{s.funding_problem_clusters?.cluster_name ?? "—"}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <p className="text-xs text-muted-foreground mt-3">
          Final selection (one build per quarter) happens in the{" "}
          <Link to="/founder/portfolio-exit/build-selector" className="text-primary hover:underline">
            Quarterly Build Selector
          </Link>
          . Red-flag and buildability rules still apply there.
        </p>
      </FRSection>

      <FRSection title="Blocked / rejected opportunities">
        {rejected.length === 0 ? (
          <p className="text-xs text-muted-foreground">None.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {rejected.map((s) => (
              <li key={s.id} className="border border-border/50 rounded p-2 flex justify-between">
                <span>{s.funding_radar_companies?.company_name ?? "—"}</span>
                <Badge variant="outline" className="text-[10px]">{s.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </FRSection>

      <FRSection
        title="Legal / IP warnings"
        description="Companies missing a distinct execution route or still flagged needs_verification cannot be promoted safely."
      >
        {ipWarnings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No outstanding legal/IP warnings.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {ipWarnings.slice(0, 20).map((c) => (
              <li key={c.id} className="border border-amber-500/30 rounded p-2 flex items-center gap-2">
                <ShieldAlert className="h-3 w-3 text-amber-400" />
                <span>{c.company_name}</span>
                <DemoBadge record={c} />
                {!c.distinct_execution_route && <Badge variant="outline" className="text-[10px]">no distinct route</Badge>}
                {c.needs_verification && <Badge variant="outline" className="text-[10px]">needs verification</Badge>}
              </li>
            ))}
          </ul>
        )}
      </FRSection>

      <FRSection title="Founder approvals required">
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          {APPROVAL_REQUIRED_ACTIONS.map((a) => <li key={a}>{a}</li>)}
        </ul>
      </FRSection>

      <FRSection
        title="Market crowding & white space"
        description="Crowded does not mean bad. This section separates saturated commodity markets from proven markets with white space."
      >
        {marketMaps.length === 0 ? (
          <p className="text-xs text-muted-foreground">No market maps yet. Add one in <Link to="/founder/funding-radar/market-maps" className="text-primary hover:underline">Market Maps</Link>.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="text-left border-b border-border/50">
                  <th className="py-2 pr-2">Market</th>
                  <th className="py-2 pr-2">Crowding</th>
                  <th className="py-2 pr-2">Saturation</th>
                  <th className="py-2 pr-2">White space</th>
                  <th className="py-2 pr-2">Liftor entry</th>
                  <th className="py-2 pr-2">Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {marketMaps.slice(0, 20).map((m) => (
                  <tr key={m.id} className="border-b border-border/30">
                    <td className="py-2 pr-2">{m.market_name}</td>
                    <td className="py-2 pr-2">{m.crowding_level ?? "—"}</td>
                    <td className="py-2 pr-2">{m.saturation_risk ?? "—"}</td>
                    <td className="py-2 pr-2">{m.white_space_score ?? "—"}</td>
                    <td className="py-2 pr-2 text-primary">{m.liftor_entry_score ?? "—"}</td>
                    <td className="py-2 pr-2"><Badge variant="outline" className="text-[10px]">{m.recommended_entry_strategy ? (ENTRY_STRATEGY_LABEL[m.recommended_entry_strategy as EntryStrategy] ?? m.recommended_entry_strategy) : "—"}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}