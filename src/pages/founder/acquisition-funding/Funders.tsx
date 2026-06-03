import { useEffect, useState } from "react";
import { AFLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fetchFunders, FUNDER_TYPE_LABEL, fmtMoney, type AFFunder } from "@/lib/acquisitionFundingEngine";

export default function AFFunders() {
  const [funders, setFunders] = useState<AFFunder[]>([]);
  useEffect(() => { fetchFunders().then(setFunders).catch(() => {}); }, []);
  return (
    <AFLayout title="Funding Sources" subtitle="Internal database of possible funders. No funder is contacted automatically. Outreach is founder-approval gated.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{funders.length} funder records</CardTitle></CardHeader>
        <CardContent>
          {funders.length === 0 && <p className="text-xs text-muted-foreground">No funder records yet.</p>}
          {funders.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Deal size</TableHead>
                  <TableHead>Pre-rev</TableHead>
                  <TableHead>Loss-making</TableHead>
                  <TableHead>Structure</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funders.map(f => (
                  <TableRow key={f.id}>
                    <TableCell className="text-xs">{f.funder_name}</TableCell>
                    <TableCell className="text-xs">{FUNDER_TYPE_LABEL[f.funder_type]}</TableCell>
                    <TableCell className="text-xs">{f.geography ?? "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">{fmtMoney(f.preferred_deal_size_min)}–{fmtMoney(f.preferred_deal_size_max)}</TableCell>
                    <TableCell className="text-xs">{f.accepts_pre_revenue ? "yes" : "no"}</TableCell>
                    <TableCell className="text-xs">{f.accepts_loss_making ? "yes" : "no"}</TableCell>
                    <TableCell className="text-xs">{f.preferred_structure}</TableCell>
                    <TableCell className="text-xs">{f.risk_appetite}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{f.status}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AFLayout>
  );
}