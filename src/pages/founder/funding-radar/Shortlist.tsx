import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection, DemoBadge, HideDemoToggle, useHideDemo, applyDemoFilter } from "./_shared";
import { fetchShortlist } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { evaluateKillRules, KILL_REASON_LABEL } from "@/lib/fundingRadarEngine";
import { FileText } from "lucide-react";

export default function FRShortlist() {
  const [rows, setRows] = useState<any[]>([]);
  const [hideDemo] = useHideDemo();
  const reload = () => fetchShortlist().then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); }, []);

  const promoteToBuildCandidate = async (s: any) => {
    const c = s.funding_radar_companies;
    if (!c) { toast.error("Missing company"); return; }
    const quarter = Math.floor(new Date().getMonth() / 3) + 1;
    const year = new Date().getFullYear();
    // Pull latest score
    const { data: scores } = await (supabase as any)
      .from("funding_radar_scores").select("*").eq("funding_company_id", c.id ?? s.funding_company_id)
      .order("scored_at", { ascending: false }).limit(1);
    const score = (scores ?? [])[0];
    // Kill rules — block hard violations before promotion.
    const hits = evaluateKillRules({
      recurring_revenue_score: score?.recurring_revenue_score,
      willingness_to_pay_evidence_count: s.build_thesis ? 1 : 0,
      distribution_route_present: !!s.build_thesis,
      capital_intensity_score: 100 - Number(score?.capital_efficiency_advantage_score ?? 50),
      regulatory_friction_score: 30,
      legal_ip_safety_score: c.distinct_execution_route ? 80 : 40,
      capital_efficiency_advantage_score: score?.capital_efficiency_advantage_score,
      ai_automation_advantage_score: score?.ai_automation_advantage_score,
    });
    const blockers = hits.filter((h) => h.severity === "block");
    if (blockers.length > 0) {
      toast.error(`Blocked by kill rules: ${blockers.map((b) => KILL_REASON_LABEL[b.reason]).join(", ")}`);
      return;
    }
    const payload: any = {
      candidate_name: `[Radar] ${c.company_name}`,
      description: s.build_thesis ?? null,
      source_signal: s.capital_efficiency_summary ?? null,
      revenue_model: c.revenue_model_pattern ?? null,
      target_buyer_type: "strategic",
      recommendation_status: "candidate",
      quarter, year,
      funding_shortlist_id: s.id,
      funding_company_id: s.funding_company_id,
      funding_cluster_id: s.cluster_id ?? null,
      capital_efficiency_advantage_score: score?.capital_efficiency_advantage_score ?? null,
      investor_validation_score: score?.investor_validation_score ?? null,
      ai_automation_advantage_score: score?.ai_automation_advantage_score ?? null,
      recurring_revenue_score: score?.recurring_revenue_score ?? null,
      global_expansion_score: score?.global_expansion_score ?? null,
      funding_source_summary: c.last_funding_amount_usd ? `${c.last_funding_round ?? "round"} $${Number(c.last_funding_amount_usd).toLocaleString()}` : null,
      build_thesis: s.build_thesis ?? null,
      acquirer_pain_thesis: s.acquirer_pain_thesis ?? null,
    };
    const { data: inserted, error } = await (supabase as any).from("ma_build_candidates").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return; }
    await (supabase as any).from("funding_shortlist").update({
      status: "promoted", promoted_build_candidate_id: inserted.id,
    }).eq("id", s.id);
    toast.success("Promoted into Quarterly Build Selector — review & score there.");
    reload();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("funding_shortlist").update({ status }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  return (
    <FundingRadarLayout title="Shortlist" subtitle="Promotion sends a candidate into ma_build_candidates (Quarterly Build Selector). One-selected-per-quarter, red-flag and buildability rules still apply there.">
      <FRSection title={`Shortlist (${rows.length})`} actions={<HideDemoToggle />}>
        {applyDemoFilter(rows, hideDemo).length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nothing shortlisted.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Cluster</TableHead><TableHead>Build thesis</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {applyDemoFilter(rows, hideDemo).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <span className="inline-flex items-center gap-2">
                      {s.funding_radar_companies?.company_name ?? "—"}
                      <DemoBadge record={s.funding_radar_companies} />
                    </span>
                  </TableCell>
                  <TableCell className="text-xs">{s.funding_problem_clusters?.cluster_name ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[360px] truncate">{s.build_thesis ?? <span className="text-amber-400">Needs verification</span>}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.status}</Badge></TableCell>
                  <TableCell className="text-xs flex gap-1">
                    {s.status !== "promoted" && <Button size="sm" onClick={() => promoteToBuildCandidate(s)}>Promote</Button>}
                    {s.status === "promoted" && s.promoted_build_candidate_id && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-[11px]">
                        <Link to={`/founder/funding-radar/handoff/${s.promoted_build_candidate_id}`}><FileText className="h-3 w-3 mr-1" />Handoff</Link>
                      </Button>
                    )}
                    {s.status !== "rejected" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "rejected")}>Reject</Button>}
                    {s.status !== "parked" && <Button size="sm" variant="ghost" onClick={() => setStatus(s.id, "parked")}>Park</Button>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}