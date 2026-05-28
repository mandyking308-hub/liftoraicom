import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection } from "./_shared";
import { fetchShortlist } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function FRShortlist() {
  const [rows, setRows] = useState<any[]>([]);
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
      <FRSection title={`Shortlist (${rows.length})`}>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">Nothing shortlisted.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Cluster</TableHead><TableHead>Build thesis</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.funding_radar_companies?.company_name ?? "—"}</TableCell>
                  <TableCell className="text-xs">{s.funding_problem_clusters?.cluster_name ?? "—"}</TableCell>
                  <TableCell className="text-xs max-w-[360px] truncate">{s.build_thesis ?? <span className="text-amber-400">Needs verification</span>}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{s.status}</Badge></TableCell>
                  <TableCell className="text-xs flex gap-1">
                    {s.status !== "promoted" && <Button size="sm" onClick={() => promoteToBuildCandidate(s)}>Promote</Button>}
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