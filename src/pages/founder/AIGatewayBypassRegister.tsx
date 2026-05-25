import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { KNOWN_DIRECT_AI_CALLERS } from "@/services/aiGateway";

const sb: any = supabase;

// Curated risk scoring + next action for each known bypassing function.
// Updated when functions migrate to the AI Gateway helper.
const META: Record<string, { risk: "low" | "medium" | "high"; action: string; note?: string }> = {
  "agent-permission-audit": { risk: "low", action: "Migrate next sprint — read-only diagnostics, low spend." },
  "ai-conversation-engine": { risk: "high", action: "Migrate first — high call volume, direct to client conversations." },
  "ai-engagement-agent-run": { risk: "high", action: "Migrate first — repeated runs, no ledger coverage." },
  "apollo-qualify": { risk: "medium", action: "Migrate after lead-fit-classify; tied to outreach." },
  "business-daily-operating-loop-acceptance": { risk: "low", action: "Acceptance test path — schedule simple migration." },
  "business-daily-operating-run": { risk: "medium", action: "Daily cron — migrate to capture daily spend." },
  "business-external-activation-readiness-run": { risk: "low", action: "Pre-activation check — low frequency." },
  "business-weekly-review-acceptance": { risk: "low", action: "Acceptance test — schedule simple migration." },
  "business-weekly-review-run": { risk: "medium", action: "Weekly cron — migrate to capture weekly spend." },
  "founder-copilot": { risk: "high", action: "Migrate — founder chat traffic is significant." },
  "generate-proposal": { risk: "medium", action: "Migrate — external-facing proposal text needs audit." },
  "internal-proposal-generate": { risk: "medium", action: "Migrate — internal proposal drafting needs ledger." },
  "lead-fit-classify": { risk: "medium", action: "Migrate before reactivating outreach." },
  "liftor-brain-chat": { risk: "high", action: "Migrate — high volume founder/AI conversation surface." },
  "ma-intelligence-orchestrator": { risk: "medium", action: "Migrate — single-call but multi-mode and uses gemini-2.5-pro." },
  "multilingual-intake-preview": { risk: "low", action: "Low volume — schedule with general migration." },
};

export default function AIGatewayBypassRegister() {
  const { data: ledgerCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ["bypass_ledger_counts_7d"],
    queryFn: async () => {
      const since = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await sb.from("ai_usage_ledger").select("audit_metadata, created_at").gte("created_at", since).limit(2000);
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        const enforcer = row?.audit_metadata?.enforced_by ?? "";
        if (enforcer === "edge:aiGateway") {
          // routed via gateway — not a bypass
        }
      }
      return map;
    },
  });

  const totals = {
    total: KNOWN_DIRECT_AI_CALLERS.length,
    high: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "high").length,
    medium: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "medium").length,
    low: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "low").length,
  };

  return (
    <FounderLayout>
      <div className="space-y-4 max-w-[1300px]">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2"><ShieldAlert className="h-7 w-7 text-primary" /> AI Gateway Bypass Register</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-3xl">Edge functions that still call Lovable AI directly. Each entry has a risk grade and recommended migration action. The system stays live; this register makes the risk visible and controlled.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit/hardening"><ArrowLeft className="h-4 w-4 mr-1" /> Hardening</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/portfolio-exit/controls">Controls</Link></Button>
            <Button asChild variant="outline" size="sm"><Link to="/founder/ai-cost/ledger">AI Usage Ledger</Link></Button>
          </div>
        </div>

        <Alert>
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Live — bypass detected (controlled)</AlertTitle>
          <AlertDescription className="text-xs">
            Operation continues. Legacy functions log via their own paths; migrations land here as they convert. Source of truth: <code>KNOWN_DIRECT_AI_CALLERS</code> in <code>src/services/aiGateway.ts</code>.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <StatCard label="Functions bypassing" v={totals.total} />
          <StatCard label="High risk" v={totals.high} accent="destructive" />
          <StatCard label="Medium risk" v={totals.medium} accent="amber" />
          <StatCard label="Low risk" v={totals.low} />
        </div>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle>Functions</CardTitle>
            <CardDescription>Migration target: every entry below should call <code>callAIGateway</code> from <code>supabase/functions/_shared/aiGateway.ts</code>.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow>
                <TableHead>Function</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Migration needed</TableHead>
                <TableHead>Recommended next action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {KNOWN_DIRECT_AI_CALLERS.map((c) => {
                  const m = META[c.name] ?? { risk: "medium" as const, action: "Migrate to AI Gateway helper." };
                  return (
                    <TableRow key={c.name}>
                      <TableCell className="font-mono text-xs">{c.name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{c.status}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={m.risk === "high" ? "destructive" : "outline"} className="text-[10px]">{m.risk}</Badge>
                      </TableCell>
                      <TableCell><Badge className="text-[10px]">Yes</Badge></TableCell>
                      <TableCell className="text-xs max-w-[420px]">{m.action}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function StatCard({ label, v, accent }: { label: string; v: number; accent?: string }) {
  const cls = accent === "destructive" ? "text-destructive" : accent === "amber" ? "text-amber-400" : "text-foreground";
  return (
    <Card className="tech-card"><CardContent className="p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold ${cls}`}>{v}</div>
    </CardContent></Card>
  );
}