import { useEffect, useState } from "react";
import { AFLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import {
  fetchOpportunities, ACTION_LABEL, fmtMoney,
  type AFOpportunity,
} from "@/lib/acquisitionFundingEngine";

export default function AFOpportunities() {
  const [opps, setOpps] = useState<AFOpportunity[]>([]);
  useEffect(() => { fetchOpportunities().then(setOpps).catch(() => {}); }, []);
  return (
    <AFLayout title="Acquisition Opportunities" subtitle="Scored leads. Nothing is contacted automatically.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">{opps.length} opportunities</CardTitle></CardHeader>
        <CardContent>
          {opps.length === 0 && <p className="text-xs text-muted-foreground">No opportunities yet. Add one from the acquisition radar or here.</p>}
          {opps.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Distress</TableHead>
                  <TableHead>Ask</TableHead>
                  <TableHead>Fit</TableHead>
                  <TableHead>Legal risk</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opps.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="text-xs">
                      <Link to={`/founder/acquisition-funding/opportunities/${o.id}`} className="hover:text-primary">{o.opportunity_name}</Link>
                    </TableCell>
                    <TableCell className="text-xs">{o.category}</TableCell>
                    <TableCell className="text-xs">{o.distress_signal}</TableCell>
                    <TableCell className="text-xs tabular-nums">{fmtMoney(o.asking_price)}</TableCell>
                    <TableCell className="text-xs tabular-nums">{o.liftor_fit_score ?? "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">{o.legal_risk_score ?? "—"}</TableCell>
                    <TableCell className="text-xs tabular-nums">{o.overall_priority_score ?? "—"}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline" className="text-[10px]">{ACTION_LABEL[o.recommended_action]}</Badge></TableCell>
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