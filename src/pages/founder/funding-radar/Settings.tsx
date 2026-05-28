import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection, ConnectorPlaceholder } from "./_shared";
import { fetchImports } from "@/lib/fundingRadarEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function FRSettings() {
  const [imports, setImports] = useState<any[]>([]);
  useEffect(() => { fetchImports().then(setImports).catch(() => {}); }, []);
  return (
    <FundingRadarLayout title="Settings" subtitle="Future connectors, ingestion log, and legal/IP policy.">
      <FRSection title="Future API connectors" description="Phase 1 ships with manual entry + CSV only. The connectors below are placeholders and are not wired.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConnectorPlaceholder name="Crunchbase API" />
          <ConnectorPlaceholder name="PitchBook API" />
          <ConnectorPlaceholder name="CB Insights" />
          <ConnectorPlaceholder name="SEC EDGAR funding filings" />
          <ConnectorPlaceholder name="LinkedIn public job-posting signals" />
          <ConnectorPlaceholder name="OpenCorporates" />
        </div>
      </FRSection>

      <FRSection title="Legal / IP policy">
        <p className="text-xs text-muted-foreground mb-2">The Funding Radar never recommends copying:</p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          <li>company names, branding, website copy</li>
          <li>UI design, source code</li>
          <li>customer lists, proprietary workflows</li>
          <li>confidential documents, restricted scraped data</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-3">It only extracts public thesis fields:</p>
        <ul className="text-xs text-muted-foreground list-disc list-inside space-y-1">
          <li>problem thesis, customer pain, market validation signal</li>
          <li>buyer type, pricing logic, revenue model pattern</li>
          <li>publicly visible weakness, better legally distinct execution route</li>
        </ul>
      </FRSection>

      <FRSection title={`Ingestion log (${imports.length})`}>
        {imports.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No imports yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>When</TableHead><TableHead>Method</TableHead><TableHead>Rows</TableHead><TableHead>Accepted</TableHead><TableHead>Rejected</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {imports.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="text-xs">{new Date(i.created_at).toLocaleString()}</TableCell>
                  <TableCell className="text-xs">{i.ingestion_method}</TableCell>
                  <TableCell className="text-xs">{i.row_count}</TableCell>
                  <TableCell className="text-xs text-emerald-400">{i.accepted_count}</TableCell>
                  <TableCell className="text-xs text-destructive">{i.rejected_count}</TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{i.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}