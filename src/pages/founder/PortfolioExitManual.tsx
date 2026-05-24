import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, ShieldCheck, Lock, AlertTriangle } from "lucide-react";

export default function PortfolioExitManual() {
  return (
    <FounderLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <BookOpen className="h-7 w-7 text-primary" /> Portfolio &amp; Exit — Manual
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              User &amp; Technical reference for the M&amp;A / Exit Architecture Engine and AI Intelligence Orchestrator.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/founder/portfolio-exit"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
          </Button>
        </div>

        {/* USER MANUAL */}
        <Card className="tech-card">
          <CardHeader><CardTitle>User Manual</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section title="What this module does">
              The Portfolio &amp; Exit Architecture Engine is the single cockpit for managing each Liftor business as an exit-grade asset.
              It tracks valuation targets, buyer warm-up, data-room readiness, execution targets per agent, and AI-generated recommendations.
            </Section>
            <Section title="How to use the Command Centre">
              Filter assets by status, decision, exit readiness or data-room score. Click into any asset to view detail, exit targets, execution targets, buyer matches and data room.
              The AI Intelligence Orchestrator panel summarises portfolio-wide signal and produces actionable recommendations.
            </Section>
            <Section title="How to read AI recommendations">
              Each recommendation shows: type, asset, confidence %, urgency %, risk level (low/medium/high), supporting record ids, and whether founder approval is required.
              Medium/high-risk items are automatically gated for approval. AI never sends anything itself.
            </Section>
            <Section title="What the scores mean">
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li><b>Confidence (0–100):</b> how much evidence supports the recommendation. Below 50 = weak.</li>
                <li><b>Urgency (0–100):</b> how soon action should be taken.</li>
                <li><b>Risk (low/medium/high):</b> reputational, legal, capital or strategic risk if the action goes wrong.</li>
                <li><b>Exit readiness / Data room / Buyer warmth (%):</b> derived from underlying data + manual scoring.</li>
              </ul>
            </Section>
            <Section title="Approving / rejecting recommendations">
              In the Orchestrator panel use Approve, Reject or Mark Actioned. Every state change is audit-logged.
              Approval does not trigger external sends — it just authorises Liftor agents to execute under the existing approval gates.
            </Section>
            <Section title="Quarterly build selection">
              The Build Selector scores candidates against fit, buyer/comparable density, Liftor operability and against capital intensity, regulation and founder cost.
              One serious build per quarter is recommended; the AI-generated Build Memo explains rationale, 90-day proof points and kill/park/scale triggers.
            </Section>
            <Section title="Buyer warm-up">
              Buyer matches move through cold → aware → engaged → warm → strategic_conversation → exit_ready.
              The system tracks next-contact-due, last-contact, decision-makers and risk notes. <b>No emails are sent from here.</b>
            </Section>
            <Section title="Data room readiness">
              Generate the default 15-category checklist per asset. Update each item to missing / requested / in_progress / complete / needs_review.
              Score is computed from completion ratio; founder can override.
            </Section>
            <Section title="What requires founder approval" warn>
              <ul className="list-disc pl-5 space-y-1">
                <li>All external buyer or investor contact</li>
                <li>All outbound emails / messaging</li>
                <li>Any legal, tax or entity decision</li>
                <li>Promoting a build candidate to a portfolio asset</li>
                <li>Any medium- or high-risk AI recommendation</li>
              </ul>
            </Section>
            <Section title="What the system must NEVER do automatically" warn>
              <ul className="list-disc pl-5 space-y-1">
                <li>Send external outreach, email or DM</li>
                <li>Make legal, tax or jurisdictional conclusions</li>
                <li>Copy competitor code, branding, protected wording, customer lists or trade dress</li>
                <li>Use sources marked <code>do_not_store</code></li>
                <li>Take any action without traceable supporting records</li>
              </ul>
            </Section>
          </CardContent>
        </Card>

        {/* TECHNICAL MANUAL */}
        <Card className="tech-card">
          <CardHeader><CardTitle>Technical Manual</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section title="Database tables (all prefixed ma_)">
              <code className="text-xs">ma_portfolio_assets, ma_companies, ma_investors, ma_buyer_matches, ma_deals, ma_competitor_profiles, ma_adviser_channels, ma_intelligence_sources, ma_weekly_signals, ma_build_candidates, ma_exit_targets, ma_execution_targets, ma_valuation_benchmarks, ma_data_room_items, ma_ai_recommendations, ma_ai_briefings, ma_audit_logs</code>
            </Section>
            <Section title="Relationships">
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>portfolio_assets ↔ exit_targets ↔ execution_targets (FK cascade)</li>
                <li>buyer_matches → portfolio_assets + companies</li>
                <li>deals → target_company + buyer_company + investor</li>
                <li>weekly_signals → company / investor / portfolio_asset + source</li>
                <li>competitor_profiles → company + portfolio_asset_match</li>
                <li>ai_recommendations → portfolio_asset (nullable = portfolio-wide)</li>
                <li>ai_briefings → portfolio_asset OR build_candidate</li>
              </ul>
            </Section>
            <Section title="Intelligence / recommendation flow">
              Edge function <code>ma-intelligence-orchestrator</code> (Lovable AI Gateway, model <code>google/gemini-2.5-pro</code>) supports four modes:
              <ul className="list-disc pl-5 mt-2 space-y-1 text-muted-foreground">
                <li><code>portfolio_briefing</code> → writes one row to <code>ma_ai_briefings(kind=portfolio)</code></li>
                <li><code>asset_analysis</code> → writes one row to <code>ma_ai_briefings(kind=asset)</code></li>
                <li><code>build_memo</code> → writes one row to <code>ma_ai_briefings(kind=build_memo)</code></li>
                <li><code>generate_recommendations</code> → inserts N rows into <code>ma_ai_recommendations(status=proposed)</code></li>
              </ul>
              All AI output is structured via OpenAI-style tool calling — no free-form parsing.
            </Section>
            <Section title="Scoring logic">
              Build Selector: fit signal + buyer/comparable density + operability − capital intensity − regulation − founder cost.
              Exit recommendations in Monthly Review: revenue gap %, data-room %, warmth index, operability, founder dependency thresholds.
              All thresholds documented in source.
            </Section>
            <Section title="Source governance">
              Every intelligence record links to <code>ma_intelligence_sources</code>. Licence statuses: public_allowed, internal_use_only, paid_restricted, api_allowed, <b>do_not_store</b> (red warning).
              API secret fields store reference names only — never values.
            </Section>
            <Section title="RLS / security">
              Every ma_ table has RLS enabled with a single policy gating to <code>has_role(auth.uid(),'admin'|'founder')</code>. Audit log is SELECT-only via <code>ma_audit_read</code>.
              Edge function re-checks role via service-role lookup against <code>user_roles</code>.
            </Section>
            <Section title="Audit logging">
              <code>ma_audit_trigger</code> attached AFTER INSERT/UPDATE/DELETE on every ma_ table, writing to <code>ma_audit_logs</code> with actor, table, op and row payload.
            </Section>
            <Section title="Secrets / API keys">
              No keys stored in app DB. AI key is <code>LOVABLE_API_KEY</code>, server-side only. Connector secrets are referenced by name, not by value.
            </Section>
            <Section title="AI prompt / orchestration design">
              System prompt enforces hard rules: no external send, no legal/tax conclusions, citation-required, weak-evidence disclosure, anti-copy clause, paid-source flagging, mandatory approval flag on medium/high risk.
              Context is passed as a single JSON object (capped at ~60k chars). Output validated against JSON schemas.
            </Section>
            <Section title="Scheduled weekly intelligence run (design)">
              Use <code>pg_cron</code> + <code>pg_net</code> to call the orchestrator with mode <code>portfolio_briefing</code> weekly and <code>generate_recommendations</code> bi-weekly. Not enabled by default — manual trigger only.
            </Section>
            <Section title="Execution-agent handoff">
              Exit Valuation Engine inserts targets into <code>ma_execution_targets</code> with <code>assigned_agent</code>. Execution Handoff dashboard surfaces them per agent and tracks overdue/missed.
            </Section>
            <Section title="Known limitations">
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>One-build-per-quarter is soft-enforced (warning, not hard block)</li>
                <li>Valuation outputs are heuristic planning estimates</li>
                <li>AI briefings depend on populated tables — empty data ⇒ low confidence</li>
                <li>No file upload bucket for data-room artefacts yet</li>
              </ul>
            </Section>
            <Section title="Future paid-data integrations (not enabled)">
              PitchBook, CB Insights, Crunchbase, Apollo, Owler, S&amp;P CapIQ — all would be added as <code>ma_intelligence_sources</code> rows with <code>source_type='api'</code> and a secret reference name.
            </Section>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Founder Approval Rules</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Founder approval is the final gate. The platform may suggest, draft and queue — never send.</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>All buyer / investor contact requires explicit founder approval per send.</li>
              <li>Any AI recommendation with risk_level ∈ {`{medium, high}`} is auto-flagged <code>required_human_approval=true</code>.</li>
              <li>Legal / tax / jurisdiction items are routed to <code>adviser_review</code>, never decided by AI.</li>
              <li>Promoting a build candidate to a portfolio asset marks the asset <code>needs_review=true</code>.</li>
            </ul>
            <div className="text-[10px] italic text-muted-foreground border-t pt-2 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5" /> Adopt the market signal, do not copy protected assets.
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}

function Section({ title, children, warn }: { title: string; children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={warn ? "p-3 rounded border border-amber-500/30 bg-amber-500/5" : ""}>
      <h3 className="font-semibold mb-1 flex items-center gap-2">
        {warn && <Lock className="h-4 w-4 text-amber-400" />} {title}
      </h3>
      <div className="text-muted-foreground">{children}</div>
    </div>
  );
}