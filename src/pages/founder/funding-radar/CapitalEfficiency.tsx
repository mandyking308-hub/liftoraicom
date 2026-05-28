import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, DemoBadge, HideDemoToggle, useHideDemo, applyDemoFilter } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { CAPITAL_EFFICIENCY_QUESTIONS } from "@/lib/fundingRadarEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FRCapitalEfficiency() {
  const [rows, setRows] = useState<any[]>([]);
  const [hideDemo] = useHideDemo();
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("funding_radar_scores")
        .select("*, funding_radar_companies(id, company_name, sector, last_funding_amount_usd)")
        .order("total_score", { ascending: false });
      setRows(data ?? []);
    })();
  }, []);

  return (
    <FundingRadarLayout
      title="Capital Efficiency Build Selector"
      subtitle="Ranks scored companies by the capital-efficiency advantage Liftor would have. Promotion still flows through the existing Quarterly Build Selector (one selected build per quarter)."
    >
      <FRSection title="Scoring questions">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          {CAPITAL_EFFICIENCY_QUESTIONS.map((q) => (
            <div key={q.key} className="border border-border/50 rounded p-2 text-muted-foreground">• {q.q}</div>
          ))}
        </div>
      </FRSection>

      <FRSection title={`Ranked companies (${rows.length})`} actions={<HideDemoToggle />}>
        {applyDemoFilter(rows, hideDemo).length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No scored companies yet. Open a company from the Companies tab and score it.</p>
        ) : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Company</TableHead><TableHead>Sector</TableHead><TableHead>Funding</TableHead>
              <TableHead>CE</TableHead><TableHead>AI</TableHead><TableHead>Rec</TableHead><TableHead>Inv</TableHead><TableHead>Global</TableHead>
              <TableHead>Total</TableHead><TableHead>Levers</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {applyDemoFilter(rows, hideDemo).map((s) => {
                const c = s.funding_radar_companies;
                const levers = [
                  s.staff_heavy && "staff", s.sales_heavy && "sales", s.onboarding_heavy && "onboarding",
                  s.support_heavy && "support", s.compliance_heavy && "compliance", s.delivery_manual && "delivery",
                ].filter(Boolean) as string[];
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-2">
                        {c?.company_name ?? "—"}
                        <DemoBadge record={c} />
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">{c?.sector ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c?.last_funding_amount_usd ? `$${Number(c.last_funding_amount_usd).toLocaleString()}` : "—"}</TableCell>
                    <TableCell className="text-xs">{s.capital_efficiency_advantage_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.ai_automation_advantage_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.recurring_revenue_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.investor_validation_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">{s.global_expansion_score ?? "—"}</TableCell>
                    <TableCell className="text-sm font-bold text-primary">{s.total_score ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {levers.map((l) => <Badge key={l} variant="outline" className="text-[10px]">{l}-heavy</Badge>)}
                        {s.ai_can_collapse_cost && <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400">AI collapse</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {c?.id && <Link to={`/founder/funding-radar/company/${c.id}`} className="text-primary hover:underline">Open</Link>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}