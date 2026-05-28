import { useEffect, useState } from "react";
import { FundingRadarLayout, FRSection, ConnectorPlaceholder } from "./_shared";
import { fetchImports } from "@/lib/fundingRadarEngine";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";

export default function FRSettings() {
  const [imports, setImports] = useState<any[]>([]);
  useEffect(() => { fetchImports().then(setImports).catch(() => {}); }, []);
  return (
    <FundingRadarLayout title="Settings" subtitle="Future connectors, ingestion log, and legal/IP policy.">
      <FRSection
        title="Founder runbook — monthly cadence"
        description="Read this once a month before opening the radar."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <p className="text-foreground font-semibold mb-1">What to do monthly</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Open Monthly run, click Start / log run.</li>
              <li>Add or CSV-import funded companies (Series A and beyond).</li>
              <li>Score each company on the 8 capital-efficiency questions.</li>
              <li>Group companies into problem clusters with a distinct execution route.</li>
              <li>Shortlist 5–10 opportunities; reject or park the rest.</li>
              <li>Promote at most 0–3 to the Quarterly Build Selector.</li>
              <li>Generate the Monthly Decision Pack and finalise the run.</li>
            </ol>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">What to import</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Public funding announcements (Series A and beyond).</li>
              <li>Problem thesis, customer pain, market validation signal.</li>
              <li>Buyer type, pricing logic, recurring-revenue pattern.</li>
              <li>Public weakness + a legally distinct execution route.</li>
            </ul>
            <p className="text-foreground font-semibold mt-3 mb-1">What to ignore</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Pre-seed and seed-stage companies.</li>
              <li>Anything without a public source URL.</li>
              <li>Branding, copy, UI, code, customer lists, scraped restricted data.</li>
            </ul>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">How to shortlist</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Total score ≥ 70 with capital-efficiency advantage ≥ 70.</li>
              <li>AI can collapse the operating cost.</li>
              <li>Recurring revenue pattern visible.</li>
              <li>A clean, legally distinct execution route exists.</li>
            </ul>
            <p className="text-foreground font-semibold mt-3 mb-1">When to promote to Quarterly Build Selector</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Founder confirms the build thesis is buildable in this quarter.</li>
              <li>No outstanding legal/IP warnings on the source company.</li>
              <li>Promotion creates a candidate; final scoring & one-per-quarter selection still happens there.</li>
            </ul>
          </div>
          <div>
            <p className="text-foreground font-semibold mb-1">What must never be copied</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Names, branding, website copy, UI design.</li>
              <li>Source code, customer lists, proprietary workflows.</li>
              <li>Confidential documents, restricted scraped data.</li>
            </ul>
            <p className="text-foreground font-semibold mt-3 mb-1">What requires founder approval</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Activating any paid funding API connector.</li>
              <li>Promoting more than 3 shortlist items in a run.</li>
              <li>Quarterly build selection (still in Quarterly Build Selector).</li>
              <li>Any outbound contact, campaign, data room, or live business creation.</li>
            </ul>
            <p className="text-foreground font-semibold mt-3 mb-1">How to choose 1–2 builds per quarter</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Open Quarterly Build Selector with the top 3 promoted candidates.</li>
              <li>Score buildability + operability; pick at most 1–2 that pass red-flag checks.</li>
            </ul>
          </div>
        </div>
      </FRSection>

      <FRSection title="No external actions — confirmed">
        <p className="text-xs text-muted-foreground mb-2">
          The Funding Radar operating layer cannot perform any of the following. All such actions remain gated by the existing
          founder-approval queue elsewhere in Liftor.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1 text-xs text-muted-foreground">
          {[
            "Contact companies",
            "Contact investors",
            "Contact customers",
            "Contact acquirers",
            "Activate paid APIs",
            "Scrape restricted data",
            "Publish competitor comparisons",
            "Launch campaigns",
            "Create a live business",
            "Send outreach",
            "Open a data room",
          ].map((x) => (
            <div key={x} className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Cannot {x.toLowerCase()}
            </div>
          ))}
        </div>
      </FRSection>

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