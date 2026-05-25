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

// Full audit per function (2026-05-25). Source: codebase scan of supabase/functions/* for
// direct fetch to ai.gateway.lovable.dev or api.openai.com. Doc-only — no code migrated yet.
type Treatment =
  | "migrate_now"
  | "migrate_carefully"
  | "deprecated_candidate"
  | "keep_temporarily_with_exception"
  | "blocked_needs_review";

type Batch = "A" | "B" | "C" | "D";

type AuditEntry = {
  risk: "low" | "medium" | "high" | "critical";
  batch: Batch;
  treatment: Treatment;
  active: "active" | "likely_unused" | "scheduled";
  provider: string;
  model: string;
  purpose: string;
  caller: string;
  reads: string;
  writes: string;
  drafts_external: boolean;
  sends_external: boolean;
  sensitive: string;
  complexity: "simple" | "moderate" | "complex";
  action: string;
  migration_status?: "pending" | "migrated" | "migrated_no_op" | "in_progress";
  migration_notes?: string;
};

const META: Record<string, AuditEntry> = {
  "agent-permission-audit": {
    risk: "low", batch: "A", treatment: "migrate_now", active: "scheduled",
    provider: "lovable-ai-gateway", model: "google/gemini-3-flash-preview",
    purpose: "Read-only agent permission diagnostic.",
    caller: "Founder agent controls page.",
    reads: "agent config, permissions.", writes: "audit row only.",
    drafts_external: false, sends_external: false, sensitive: "internal config",
    complexity: "simple",
    action: "Batch A — wrap call in callAIGateway helper; no behavioural change.",
    migration_status: "migrated_no_op",
    migration_notes: "Re-audit (v5.9): no AI call present. LOVABLE_API_KEY appears only in TRACKED_SECRETS for presence reporting. Removed from active bypass count.",
  },
  "ai-conversation-engine": {
    risk: "high", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-2.5-flash",
    purpose: "Drafts and routes inbound conversation replies.",
    caller: "CRM / Conversations / Inbox surfaces.",
    reads: "conversation history, contact, business context.",
    writes: "conversation_messages, ai_drafts (no auto-send).",
    drafts_external: true, sends_external: false,
    sensitive: "customer + CRM data",
    complexity: "moderate",
    action: "Batch B — migrate with redaction + approval gating preserved.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: Lovable AI Gateway fetch wrapped with beginGatewayLog/endGatewayLog. Logs to ai_gateway_requests + ai_usage_ledger. Drafts only; auto-send unchanged.",
  },
  "ai-engagement-agent-run": {
    risk: "high", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-3-flash-preview",
    purpose: "Recurring engagement scoring + next-action suggestions.",
    caller: "Engagement tracking + outreach dashboards.",
    reads: "engagement events, contacts, campaigns.",
    writes: "engagement_runs, suggested_actions.",
    drafts_external: false, sends_external: false,
    sensitive: "CRM + outreach data",
    complexity: "moderate",
    action: "Batch B — capture spend in ledger; keep human approval for outreach.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: wrapped with beginGatewayLog/endGatewayLog. Founder approval for outreach unchanged.",
  },
  "apollo-qualify": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-2.5-flash-lite",
    purpose: "Qualifies Apollo-imported leads against ICP.",
    caller: "Lead pipeline / imports.",
    reads: "imported contacts, ICP rules.", writes: "lead_fit_scores.",
    drafts_external: false, sends_external: false,
    sensitive: "buyer/contact data",
    complexity: "simple",
    action: "Batch B — migrate alongside lead-fit-classify.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: wrapped with beginGatewayLog/endGatewayLog.",
  },
  "business-daily-operating-loop-acceptance": {
    risk: "low", batch: "D", treatment: "deprecated_candidate", active: "likely_unused",
    provider: "n/a (acceptance harness)", model: "n/a",
    purpose: "Acceptance test wrapper for daily loop.",
    caller: "CI / acceptance scripts only.",
    reads: "test fixtures.", writes: "acceptance_runs.",
    drafts_external: false, sends_external: false,
    sensitive: "test data",
    complexity: "simple",
    action: "Batch D — confirm unused, then retire or fold into one harness.",
    migration_status: "migrated_no_op",
    migration_notes: "v5.9.5: re-audit confirmed no direct AI call (provider_status flag only). Still referenced by liftor-final-linking-acceptance + liftor-build-phase-closeout — not deprecated yet; safe.",
  },
  "business-daily-operating-run": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway (indirect via brain)", model: "varies",
    purpose: "Daily operating loop generator.",
    caller: "Business daily operating loop page + cron.",
    reads: "business state, KPIs, recent events.", writes: "daily_run rows.",
    drafts_external: false, sends_external: false,
    sensitive: "internal business data",
    complexity: "moderate",
    action: "Batch B — route through gateway to capture daily spend.",
    migration_status: "migrated_no_op",
    migration_notes: "v5.9.5: re-audit confirmed no direct AI fetch in this function — provider_status flag only. Any AI usage routes via liftor-brain-chat (now gateway-controlled).",
  },
  "business-external-activation-readiness-run": {
    risk: "low", batch: "A", treatment: "migrate_now", active: "active",
    provider: "lovable-ai-gateway (indirect)", model: "varies",
    purpose: "Pre-activation readiness check.",
    caller: "ExternalActivationReadiness page.",
    reads: "activation checklist + configs.", writes: "readiness_runs.",
    drafts_external: false, sends_external: false,
    sensitive: "internal config",
    complexity: "simple",
    action: "Batch A — straightforward wrap.",
    migration_status: "migrated_no_op",
    migration_notes: "Re-audit (v5.9): no AI call present. References LOVABLE_API_KEY only for provider_status flag. Removed from active bypass count.",
  },
  "business-weekly-review-acceptance": {
    risk: "low", batch: "D", treatment: "deprecated_candidate", active: "likely_unused",
    provider: "n/a (acceptance harness)", model: "n/a",
    purpose: "Acceptance harness for weekly review.",
    caller: "CI / acceptance only.",
    reads: "fixtures.", writes: "acceptance_runs.",
    drafts_external: false, sends_external: false, sensitive: "test data",
    complexity: "simple",
    action: "Batch D — retire or fold.",
    migration_status: "migrated_no_op",
    migration_notes: "v5.9.5: re-audit confirmed no direct AI call. Still referenced by liftor-final-linking-acceptance; safe to keep.",
  },
  "business-weekly-review-run": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway (indirect)", model: "varies",
    purpose: "Weekly business review generator.",
    caller: "BusinessWeeklyReview page + cron.",
    reads: "weekly KPIs.", writes: "weekly_review rows.",
    drafts_external: false, sends_external: false,
    sensitive: "internal business data",
    complexity: "moderate",
    action: "Batch B — wrap and ledger-tag.",
    migration_status: "migrated_no_op",
    migration_notes: "v5.9.5: re-audit confirmed no direct AI fetch — provider_status flag only.",
  },
  "founder-copilot": {
    risk: "high", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-3-flash-preview",
    purpose: "Founder chat copilot across the Command Centre.",
    caller: "Founder copilot dock / hub.",
    reads: "founder context, recent activity.",
    writes: "copilot_sessions, copilot_messages.",
    drafts_external: false, sends_external: false,
    sensitive: "founder + business data",
    complexity: "moderate",
    action: "Batch B — high volume; migrate to capture spend and apply redaction.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: streaming call wrapped with beginGatewayLog (fire-and-forget endGatewayLog on stream start). Streamed token counts remain estimate-only.",
  },
  "generate-proposal": {
    risk: "high", batch: "C", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-3-flash-preview",
    purpose: "Generates external-facing proposal drafts.",
    caller: "Proposal builder + public proposal flow.",
    reads: "client brief, pricing, templates.",
    writes: "proposal_drafts (no auto-send).",
    drafts_external: true, sends_external: false,
    sensitive: "client + commercial data",
    complexity: "complex",
    action: "Batch C — migrate with approval gate; legal/commercial sensitive.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: wrapped with beginGatewayLog/endGatewayLog. Drafts only — public flow still requires founder review before any external action.",
  },
  "internal-proposal-generate": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-2.5-flash",
    purpose: "Generates internal proposal drafts for founder review.",
    caller: "Internal proposals page.",
    reads: "opportunity + pricing.",
    writes: "internal_proposals.",
    drafts_external: false, sends_external: false,
    sensitive: "commercial data",
    complexity: "moderate",
    action: "Batch B — wrap with ledger.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: wrapped with beginGatewayLog/endGatewayLog.",
  },
  "lead-fit-classify": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-2.5-flash-lite",
    purpose: "Classifies lead fit vs ICP.",
    caller: "Lead pipeline.",
    reads: "contacts, ICP rules.", writes: "lead_fit_scores.",
    drafts_external: false, sends_external: false,
    sensitive: "buyer/contact data",
    complexity: "simple",
    action: "Batch B — migrate before any outreach reactivation.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: per-row classify wrapped with beginGatewayLog/endGatewayLog.",
  },
  "liftor-brain-chat": {
    risk: "critical", batch: "C", treatment: "blocked_needs_review", active: "active",
    provider: "lovable-ai-gateway", model: "openai/gpt-5.5 (configurable; fallback google/gemini-3-flash-preview)",
    purpose: "Liftor Brain founder chat — only function that bypasses Lovable AI entirely.",
    caller: "LiftorBrain page + brain chat surfaces.",
    reads: "brain sessions, drafts, founder context.",
    writes: "brain_sessions, brain_drafts, audit.",
    drafts_external: false, sends_external: false,
    sensitive: "founder + business data",
    complexity: "complex",
    action: "Batch C — migrate to Lovable AI Gateway; remove OpenAI direct dependency. Coordinate with provider-check + draft-inbound-reply.",
    migration_status: "migrated",
    migration_notes: "v5.9.5 CRITICAL MIGRATION: replaced api.openai.com/v1/chat/completions with ai.gateway.lovable.dev/v1/chat/completions using LOVABLE_API_KEY. Model namespaced (openai/gpt-5.5). Wrapped with beginGatewayLog/endGatewayLog → appears in ai_gateway_requests, ai_usage_ledger, ai_runtime_events. response_format json_object preserved; response shape unchanged. External actions remain locked; provider-check legacy path still references OPENAI_API_KEY for status flag only.",
  },
  "ma-intelligence-orchestrator": {
    risk: "medium", batch: "B", treatment: "migrate_carefully", active: "active",
    provider: "lovable-ai-gateway", model: "google/gemini-2.5-pro",
    purpose: "Portfolio & Exit intelligence orchestrator (briefings, asset analysis, memos, recs).",
    caller: "PortfolioExitCommandCentre + asset detail.",
    reads: "ma_* tables.", writes: "ma_intelligence_runs, ma_ai_recommendations, ma_audit_logs.",
    drafts_external: false, sends_external: false,
    sensitive: "buyer/investor/deal data — already gated by approvals.",
    complexity: "moderate",
    action: "Batch B — wrap with callAIGateway; keep existing approval queue behaviour.",
    migration_status: "migrated",
    migration_notes: "v5.9.5: wrapped shared callAI helper with beginGatewayLog/endGatewayLog.",
  },
  "multilingual-intake-preview": {
    risk: "low", batch: "A", treatment: "migrate_now", active: "active",
    provider: "lovable-ai-gateway (via @ai-sdk/openai-compatible)",
    model: "google/gemini-3-flash-preview",
    purpose: "Multilingual intake preview translator.",
    caller: "Public intake preview.",
    reads: "intake draft.", writes: "preview only (no persistence).",
    drafts_external: false, sends_external: false,
    sensitive: "intake text",
    complexity: "simple",
    action: "Batch A — wrap with helper; preserve streaming.",
    migration_status: "migrated",
    migration_notes: "v5.9: wrapped Vercel AI SDK call with beginGatewayLog/endGatewayLog. Calls now appear in ai_gateway_requests + ai_usage_ledger with trace_id/request_id. Behaviour unchanged; structured output preserved.",
  },
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
    critical: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "critical").length,
    high: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "high").length,
    medium: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "medium").length,
    low: KNOWN_DIRECT_AI_CALLERS.filter((c) => META[c.name]?.risk === "low").length,
  };
  const migrated = KNOWN_DIRECT_AI_CALLERS.filter((c) => {
    const s = META[c.name]?.migration_status;
    return s === "migrated" || s === "migrated_no_op";
  }).length;
  const activeBypass = totals.total - migrated;

  const batches: Record<Batch, string[]> = { A: [], B: [], C: [], D: [] };
  for (const c of KNOWN_DIRECT_AI_CALLERS) {
    const b = META[c.name]?.batch ?? "B";
    batches[b].push(c.name);
  }
  const batchLabel: Record<Batch, string> = {
    A: "Batch A — simple low-risk",
    B: "Batch B — active medium-risk",
    C: "Batch C — high-risk / approval-sensitive",
    D: "Batch D — deprecated / unused candidates",
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

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <StatCard label="Functions bypassing" v={totals.total} />
          <StatCard label="Critical" v={totals.critical} accent="destructive" />
          <StatCard label="High risk" v={totals.high} accent="destructive" />
          <StatCard label="Medium risk" v={totals.medium} accent="amber" />
          <StatCard label="Low risk" v={totals.low} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <StatCard label="Migrated (real + no-op)" v={migrated} />
          <StatCard label="Active bypasses remaining" v={activeBypass} accent={activeBypass === 0 ? undefined : "amber"} />
          <StatCard label="System status" v={activeBypass === 0 ? 1 : 0} accent={activeBypass === 0 ? undefined : "amber"} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
          {(Object.keys(batches) as Batch[]).map((b) => (
            <Card key={b} className="tech-card">
              <CardContent className="p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{batchLabel[b]}</div>
                <div className="text-2xl font-semibold">{batches[b].length}</div>
                <ul className="text-[11px] text-muted-foreground mt-1 space-y-0.5 font-mono">
                  {batches[b].map((n) => <li key={n}>· {n}</li>)}
                </ul>
              </CardContent>
            </Card>
          ))}
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
                <TableHead>Provider / model</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead>Treatment</TableHead>
                <TableHead>Migration</TableHead>
                <TableHead>External</TableHead>
                <TableHead>Recommended next action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {KNOWN_DIRECT_AI_CALLERS.map((c) => {
                  const m = META[c.name];
                  if (!m) return null;
                  const ext = m.sends_external ? "sends" : m.drafts_external ? "drafts only" : "none";
                  return (
                    <TableRow key={c.name}>
                      <TableCell className="font-mono text-xs align-top">
                        <div>{c.name}</div>
                        <div className="text-[10px] text-muted-foreground font-sans mt-0.5 max-w-[260px]">{m.purpose}</div>
                      </TableCell>
                      <TableCell className="text-[11px] align-top">
                        <div>{m.provider}</div>
                        <div className="text-muted-foreground">{m.model}</div>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant="outline" className="text-[10px]">{m.active}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={m.risk === "high" || m.risk === "critical" ? "destructive" : "outline"} className="text-[10px]">{m.risk}</Badge>
                      </TableCell>
                      <TableCell className="align-top"><Badge className="text-[10px]">{m.batch}</Badge></TableCell>
                      <TableCell className="align-top"><Badge variant="outline" className="text-[10px]">{m.treatment}</Badge></TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant={m.migration_status === "migrated" || m.migration_status === "migrated_no_op" ? "default" : "outline"}
                          className="text-[10px]"
                        >
                          {m.migration_status ?? "pending"}
                        </Badge>
                        {m.migration_notes && (
                          <div className="text-[10px] text-muted-foreground font-sans mt-0.5 max-w-[260px]">{m.migration_notes}</div>
                        )}
                      </TableCell>
                      <TableCell className="align-top">
                        <Badge variant={ext === "sends" ? "destructive" : "outline"} className="text-[10px]">{ext}</Badge>
                      </TableCell>
                      <TableCell className="text-xs max-w-[360px] align-top">{m.action}</TableCell>
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