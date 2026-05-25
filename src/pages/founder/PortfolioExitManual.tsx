import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft, ShieldCheck, Lock, AlertTriangle } from "lucide-react";

export default function PortfolioExitManual() {
  const { hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash]);
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
        <Card id="user-manual" className="tech-card scroll-mt-24">
          <CardHeader><CardTitle>User Manual</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section title="Carrier-grade Controls Centre (new)">
              The Controls Centre is the single place to manage operational discipline across all portfolio assets. It contains 14 panels — each is described below. Open it from the Command Centre header or the sidebar.
            </Section>
            <Section title="Lifecycle stages & gates">
              Every asset moves through: idea → watch → validate → build → launch → operate → scale → warm_buyers → sale_prep → sale_process → sold. Any asset can also go to <b>parked</b> or <b>killed</b> with a written decision-memory.
              Each transition requires named evidence (e.g. <i>distribution_path, lovable_buildability_score</i>) and founder approval. Missing evidence becomes a warning on the proposed transition.
            </Section>
            <Section title="KPI dictionary">
              Every KPI has one definition, one formula, one source field, one owner, and a rule on whether AI may estimate or whether a human must confirm. If a number doesn't appear in the dictionary, it is not a KPI.
            </Section>
            <Section title="Confidence & freshness">
              Every signal, buyer match, competitor profile and valuation benchmark is scored: <b>fresh (≤30d), current (≤90d), stale (≤180d), archived (&gt;180d)</b>. Confidence is multiplied by a freshness factor (1.0 / 0.85 / 0.6 / 0.3). Reconfirm a record to reset its factor.
            </Section>
            <Section title="Challenge mode">
              Before approving any build, scale, park, kill or sale decision, run Challenge. It forces the system to answer eight questions including the weakest assumption, what a buyer would reject, and the simplest validation test. Challenges are stored against the recommendation.
            </Section>
            <Section title="Cost & budget control">
              Log AI runs, paid data, outreach tools, oversight and adviser hours per asset. Set monthly budgets per asset and per category. The dashboard warns when projected spend &gt;80% or actual spend &gt;100% of budget.
            </Section>
            <Section title="Data classification">
              Tag any record as public, internal, confidential, highly_confidential, personal_data, adviser_privileged, paid_source_restricted, or do_not_export. The platform shows the tag everywhere the record is surfaced and blocks export of <code>do_not_export</code> rows.
            </Section>
            <Section title="Backup, export & recovery">
              The platform logs every export, backup, restore and rollback. The "Emergency Export Checklist" lists the exact tables to download in a crisis. Full automatic off-platform backup is documented as a future integration.
            </Section>
            <Section title="AI prompt versions">
              Every recommendation records which prompt name + version produced it, what data snapshot it used, and its freshness score. Roll back by activating an earlier version.
            </Section>
            <Section title="Alerts & exceptions">
              Alerts cover overdue approvals, missed execution targets, stale signals, legal/IP risk, paid-source warnings, capacity exceeded, build/exit reviews due, import or scheduled-run failures. Each has severity, owner, due date and recommended action.
            </Section>
            <Section title="Human workload ceiling">
              Capacity snapshots track active assets, pending approvals, oversight hours required vs capacity. When utilisation exceeds 100%, the Build Selector must delay, scope down, or pair a new build with parking a weaker asset.
            </Section>
            <Section title="Data room document policy">
              Each data-room item now carries classification, version, owner, storage location, buyer-safe flag, adviser-reviewed flag, last-reviewed date, missing-evidence notes and expiry. Items must be adviser-reviewed before they are marked buyer-safe.
            </Section>
            <Section title="Mock buyer diligence">
              Run a simulated buyer-side review per asset. Output: red flags, missing evidence, likely buyer objections, valuation weaknesses, urgent fixes, readiness score, 30-day cleanup plan.
            </Section>
            <Section title="Agent integration contracts">
              Each Liftor agent (Outreach, CRM, Inbox, Content, Reporting, Compliance, Buyer Warm-Up, Data Room, Founder Approval) has a published contract listing data it receives, actions allowed/prohibited, approval requirements, expected output, completion criteria, and escalation rules.
            </Section>
            <Section title="Capital allocation">
              Per-asset budgets for monthly opex, oversight, adviser, outreach and data/API spend, plus priority score and a recommended resource action (increase / hold / reduce / park / kill / adviser_review).
            </Section>
            <Section title="Do-not-build pattern library">
              The Build Selector must check candidates against this list (warehouse-heavy, manufacturing-heavy, stocked fashion, moonshots, deep hardware, heavily-regulated without adviser, large pre-revenue teams, anything not buildable in Lovable, no distribution path, no buyer thesis, high IP-copy risk). Blockers stop the recommendation outright.
            </Section>
            <Section title="How to read alerts">
              Critical/high alerts at the top; severity colour-coded. Each alert lists owner, due date, related asset and recommended action. Resolve only when the underlying record is fixed — alerts are auditable.
            </Section>
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
        <Card id="technical-manual" className="tech-card scroll-mt-24">
          <CardHeader><CardTitle>Technical Manual</CardTitle></CardHeader>
          <CardContent className="space-y-4 text-sm">
            <Section title="Patch additions (May 2026)">
              <ul className="list-disc pl-5 space-y-1 text-xs">
                <li><strong>New routes:</strong> <code>/founder/portfolio-exit/buyer-warmup</code>, <code>/investors</code>, <code>/competitors</code>, <code>/operating-panels</code>, <code>/ai-bypass-register</code>.</li>
                <li><strong>New components:</strong> <code>PortfolioBuyerWarmUp</code>, <code>PortfolioInvestorIntelligence</code>, <code>PortfolioCompetitorIntelligence</code>, <code>PortfolioOperatingPanels</code>, <code>AIGatewayBypassRegister</code>.</li>
                <li><strong>Buyer Warm-Up</strong> reads <code>ma_buyer_matches</code> joined to <code>ma_portfolio_assets</code> and <code>ma_companies</code>. Approval status comes from <code>ma_approval_queue</code> rows where <code>module='buyer_warmup'</code> and <code>related_record_id</code> matches the buyer-match id. No outreach is sent from this page.</li>
                <li><strong>Investor Intelligence</strong> reads <code>ma_investors</code> with source join to <code>ma_intelligence_sources</code>, linked <code>ma_deals</code> and read-side hints from <code>ma_buyer_matches</code>. Detail drawer uses shadcn <code>Sheet</code>.</li>
                <li><strong>Competitor Intelligence</strong> reads <code>ma_competitor_profiles</code> with company and asset joins, evidence rows from <code>ma_evidence_links</code> filtered to <code>related_record_type='ma_competitor_profiles'</code>. Always shows the principle "Adopt the market signal, do not copy protected assets."</li>
                <li><strong>Operating Panels</strong> surfaces five previously hidden tables: <code>ma_capital_allocation</code>, <code>ma_capacity_snapshots</code>, <code>ma_strategic_assumptions</code>, <code>ma_paid_connectors</code>, <code>ma_integration_allowlist</code>. View-only. Paid connectors and allowlist show <em>status only</em> — no keys, no activation.</li>
                <li><strong>AI Gateway Bypass Register</strong> reads <code>KNOWN_DIRECT_AI_CALLERS</code> from <code>src/services/aiGateway.ts</code> and renders risk grade + recommended action per function. Migration target: every entry should call <code>callAIGateway</code> from <code>supabase/functions/_shared/aiGateway.ts</code>.</li>
              </ul>
            </Section>
            <Section title="Orchestrator parser hardening">
              <p className="text-xs">
                <code>ma-intelligence-orchestrator</code> now wraps every AI response in <code>safeJsonParse</code>: tries the raw <code>tool_calls.arguments</code>, then strips <code>```json</code> fences, then extracts the first balanced <code>{`{ ... }`}</code> block. Failures throw <code>ai_parse_failed</code>, are logged into <code>ma_error_queue</code> (with a truncated 500-char raw sample in <code>notes</code>), and a failed run row is recorded in <code>ma_intelligence_runs</code>. The panel surfaces a friendly message ("AI returned an unparseable response — safe to retry") and never crashes.
              </p>
              <p className="text-xs mt-2"><strong>Manual acceptance steps:</strong> (1) Run portfolio briefing — expect success and a <code>ma_ai_briefings</code> row. (2) Temporarily change the model to one without tool-call support to force unparseable output, run again, expect HTTP 500 with friendly message and a new row in <code>ma_error_queue</code> + <code>ma_intelligence_runs</code> with <code>status='failed'</code>. (3) Revert model.</p>
            </Section>
            <Section title="TypeScript / Supabase typing status">
              <p className="text-xs">
                The auto-generated <code>src/integrations/supabase/types.ts</code> currently lags the <code>ma_*</code> schema. New Portfolio &amp; Exit components still cast via <code>(supabase as any)</code> or a single <code>const sb: any = supabase</code> alias.
              </p>
              <ul className="list-disc pl-5 text-xs space-y-1 mt-2">
                <li><strong>Where casts remain:</strong> <code>PortfolioBuyerWarmUp</code>, <code>PortfolioInvestorIntelligence</code>, <code>PortfolioCompetitorIntelligence</code>, <code>PortfolioOperatingPanels</code>, <code>AIGatewayBypassRegister</code>, plus pre-existing casts in <code>PortfolioExitCommandCentre</code>, <code>PortfolioExitHardening</code>, <code>PortfolioExitControls</code>, <code>MAIntelligenceWorkspace</code>.</li>
                <li><strong>Why:</strong> auto-regeneration of <code>types.ts</code> is not available from inside this patch; manually editing the file is forbidden.</li>
                <li><strong>Next step:</strong> trigger a Supabase types regeneration from the Cloud connector, then sweep the files above and replace <code>(supabase as any)</code> with typed table references and inferred row types.</li>
              </ul>
            </Section>
            <Section title="Limitations after patch">
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>9+ legacy edge functions still bypass the AI Gateway — visible in <code>/founder/portfolio-exit/ai-bypass-register</code>. Operational status remains <strong>Live — Bypass Detected</strong> until migrated.</li>
                <li>Paid connector activation, billing and secret entry happen in Connectors and the Approval Queue, never inside the Operating Panels view.</li>
                <li>Investor ↔ portfolio-asset linkage is currently inferred from notes; a hard FK can be added later if needed.</li>
              </ul>
            </Section>
            <Section title="Database tables (all prefixed ma_)">
              <code className="text-xs">ma_portfolio_assets, ma_companies, ma_investors, ma_buyer_matches, ma_deals, ma_competitor_profiles, ma_adviser_channels, ma_intelligence_sources, ma_weekly_signals, ma_build_candidates, ma_exit_targets, ma_execution_targets, ma_valuation_benchmarks, ma_data_room_items, ma_ai_recommendations, ma_ai_briefings, ma_audit_logs,
              <br/>ma_lifecycle_gates, ma_lifecycle_transitions, ma_kpi_dictionary, ma_prompt_versions, ma_cost_entries, ma_budgets, ma_data_classifications, ma_backup_events, ma_alerts, ma_workload_capacity, ma_mock_diligence_runs, ma_agent_contracts, ma_capital_allocation, ma_do_not_build_patterns</code>
            </Section>
            <Section title="Lifecycle state machine">
              <code>ma_lifecycle_gates(from_stage,to_stage,required_evidence jsonb,requires_founder_approval)</code> defines allowed transitions and required evidence keys.
              <code>ma_lifecycle_transitions</code> stores every proposal with status pending|approved|rejected, captured evidence JSON, warnings (missing keys) and approval audit. On approve, <code>ma_portfolio_assets.current_stage</code> is updated.
            </Section>
            <Section title="KPI dictionary schema">
              <code>ma_kpi_dictionary(kpi_name PK, definition, formula, source_table, source_field, update_frequency, owner, ai_estimate_allowed bool, human_confirmation_required bool, confidence_rules)</code>. UI cards/tables that surface a KPI should look up its row to display its provenance.
            </Section>
            <Section title="Confidence decay logic">
              Freshness derived from <code>updated_at</code> or domain date field. Bands: 0–30d fresh, 31–90 current, 91–180 stale, 180+ archived. Displayed confidence = base_confidence × {`{1, 0.85, 0.6, 0.3}`}. A reconfirm action (touching updated_at) resets the band. The Controls Centre Freshness tab is the live monitor.
            </Section>
            <Section title="Challenge mode design">
              <code>ma_ai_recommendations.challenge jsonb</code> stores eight named fields (why_might_fail, weakest_assumption, buyer_rejection, missing_evidence, too_expensive, legal_ip_risk, simpler_test, kill_park_triggers).
              The orchestrator <code>mode=challenge</code> generates them; users can also save a manual challenge. Build/scale/sale approval UIs should require a non-null challenge before allowing approval.
            </Section>
            <Section title="Cost-control architecture">
              <code>ma_cost_entries(portfolio_asset_id, category, amount, currency, incurred_at, related_recommendation_id)</code> and <code>ma_budgets(portfolio_asset_id, scope, category, monthly_budget)</code>. Spend rolled up per asset/category per month; UI warns &gt;80% and &gt;100%.
              No automatic charging — purely tracking.
            </Section>
            <Section title="Data classification model">
              <code>ma_data_classifications(record_type, record_id, classification, do_not_export bool)</code> tags any record. Exporters must check this table before writing to CSV/PDF. Adviser-privileged rows are excluded from buyer-facing surfaces.
            </Section>
            <Section title="Backup, export & recovery">
              <code>ma_backup_events</code> logs admin-initiated backup/export/restore/rollback events. Automated cross-region backup is provided by the managed database — see the Emergency Export Checklist for the manual procedure. Deleted record recovery uses point-in-time restore from the managed backend.
            </Section>
            <Section title="AI prompt versioning">
              <code>ma_prompt_versions(prompt_name, version UNIQUE per name, model, provider, active, prompt_body)</code>. Only one version per name should be active. Every <code>ma_ai_recommendations</code> row stores <code>prompt_version_id</code>, <code>data_snapshot_at</code>, <code>freshness_score</code>.
            </Section>
            <Section title="Notification / exception schema">
              <code>ma_alerts(alert_type, severity {`{low,medium,high,critical}`}, status, owner, due_date, portfolio_asset_id, related_record_type/id, recommended_action)</code>. Background generators (cron) can insert rows; resolution writes resolved_at + resolved_by.
            </Section>
            <Section title="Human capacity scoring model">
              <code>ma_workload_capacity</code> rolling weekly snapshots. Utilisation = hours_required / hours_capacity. Build Selector reads the latest snapshot; if utilisation &gt;100, candidate must specify a delay, scope reduction, asset to park, or oversight assignment.
            </Section>
            <Section title="Data room document policy">
              <code>ma_data_room_items</code> extended with <code>classification, doc_version, buyer_safe, adviser_reviewed, last_reviewed_at, missing_evidence_notes, expiry_at</code>. <code>buyer_safe=true</code> requires <code>adviser_reviewed=true</code>.
            </Section>
            <Section title="Mock buyer diligence logic">
              <code>ma_mock_diligence_runs(portfolio_asset_id, prompt_version_id, red_flags jsonb, missing_evidence jsonb, buyer_objections jsonb, valuation_weaknesses jsonb, urgent_fixes jsonb, cleanup_plan_30d jsonb, readiness_score)</code>.
              Orchestrator mode <code>mock_buyer_diligence</code> assembles input from portfolio_assets + buyer_matches + data_room_items + valuation_benchmarks + execution_targets, then produces structured output via tool calls.
            </Section>
            <Section title="Agent integration contracts">
              <code>ma_agent_contracts(agent_name UNIQUE, data_received, actions_allowed, actions_prohibited, approval_requirements, output_expected, completion_criteria, escalation_rules, active)</code>. Agents read their own contract at start of every run; violations are logged to <code>ma_audit_logs</code> and escalated.
            </Section>
            <Section title="Capital allocation model">
              <code>ma_capital_allocation</code> (one row per asset, UNIQUE) with five budgets + priority_score (0–100) + resource_recommendation ∈ {`{increase,hold,reduce,park,kill,adviser_review}`}. Portfolio Commander surfaces this alongside operating snapshots.
            </Section>
            <Section title="Do-not-build library logic">
              <code>ma_do_not_build_patterns(category, reason, examples, severity {`{low,medium,high,blocker}`}, active)</code>. Build Selector pipeline runs a string/keyword + AI semantic check of every candidate brief against active rows. Severity=blocker stops the candidate; high attaches a warning + requires founder over-ride.
            </Section>
            <Section title="Limitations & future improvements">
              <ul className="list-disc pl-5 text-muted-foreground space-y-1">
                <li>Alerts are not yet auto-generated — manual create or future cron jobs.</li>
                <li>Cost tracking is manual log; tying directly to AI Gateway metering is a future integration.</li>
                <li>Classification tags are advisory in the UI — full export-time enforcement is a future check.</li>
                <li>Mock diligence and challenge modes require orchestrator support for those modes; manual entry covers both meanwhile.</li>
                <li>Backups rely on the managed database's built-in PITR — off-platform replication is not enabled.</li>
              </ul>
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

        {/* BUILDABILITY CONSTITUTION */}
        <Card id="buildability-constitution" className="tech-card scroll-mt-24">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Buildability Constitution</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Any candidate that fails the Constitution cannot be promoted to a portfolio asset, regardless of upside.</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li><b>Must be buildable inside Lovable</b> — no bespoke infrastructure, no native mobile shell, no heavy on-prem dependencies.</li>
              <li><b>Must have a distribution path</b> we already own, can build, or can buy without venture funding.</li>
              <li><b>Must have a credible buyer thesis</b> — at least one named buyer category with comparable transactions.</li>
              <li><b>Must not require warehousing, manufacturing, stocked inventory, or hardware</b>.</li>
              <li><b>Must not require a regulated licence</b> without an adviser pre-engaged.</li>
              <li><b>Must not depend on copying a protected asset</b> — adopt the market signal, never the protected expression.</li>
              <li><b>Must fit founder capacity</b> — checked against <code>ma_workload_capacity</code> before approval.</li>
              <li><b>Must declare a 90-day kill / park / scale trigger</b> at promotion time.</li>
            </ul>
            <p className="text-xs text-muted-foreground">Enforced by the Build Selector against <code>ma_do_not_build_patterns</code> and the Lovable Buildability score on each candidate.</p>
          </CardContent>
        </Card>

        <Card id="founder-approval-rules" className="tech-card scroll-mt-24">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Founder Approval Rules</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>Founder approval is the final gate. The platform may suggest, draft and queue — never send.</p>
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>All buyer / investor contact requires explicit founder approval per send.</li>
              <li>Any AI recommendation with risk_level ∈ {`{medium, high}`} is auto-flagged <code>required_human_approval=true</code>.</li>
              <li>Legal / tax / jurisdiction items are routed to <code>adviser_review</code>, never decided by AI.</li>
              <li>Promoting a build candidate to a portfolio asset marks the asset <code>needs_review=true</code>.</li>
            </ul>
            <p className="text-xs font-semibold mt-2">Approval IS required for:</p>
            <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
              <li>External outreach / sending</li>
              <li>Buyer / investor / adviser contact</li>
              <li>Paid API activation</li>
              <li>Data export</li>
              <li>Spend commitments</li>
              <li>Legal / tax / entity decisions</li>
              <li>Sale process start, kill decision, sharing buyer packs externally</li>
            </ul>
            <p className="text-xs font-semibold mt-2">Approval is NOT required for:</p>
            <ul className="list-disc pl-5 text-muted-foreground text-xs space-y-1">
              <li>Viewing dashboards, internal recommendations, valuation calculations</li>
              <li>Data entry, imports staged for review</li>
              <li>Execution-target generation, data-room checklist generation, AI analysis, internal reporting</li>
            </ul>
            <div className="text-[10px] italic text-muted-foreground border-t pt-2 flex items-start gap-1">
              <AlertTriangle className="h-3 w-3 mt-0.5" /> Adopt the market signal, do not copy protected assets.
            </div>
          </CardContent>
        </Card>

        {/* DATA SOURCE GOVERNANCE */}
        <Card id="data-source-governance" className="tech-card scroll-mt-24">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Data Source Governance Notes</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <ul className="list-disc pl-5 text-muted-foreground space-y-1">
              <li>Every external source registered in <code>ma_intelligence_sources</code> with: source_type, licence, paid/free, do_not_store flag, refresh frequency, owner.</li>
              <li><b>Paid sources</b> (PitchBook, CB Insights, Crunchbase, Apollo, Owler, S&amp;P CapIQ) are <i>off by default</i>. Activation requires founder approval and is logged.</li>
              <li>Sources flagged <code>do_not_store</code> may be queried but never persisted into Liftor tables.</li>
              <li>Every <code>ma_weekly_signals</code>, <code>ma_buyer_matches</code>, <code>ma_competitor_profiles</code> and <code>ma_valuation_benchmarks</code> row carries source attribution and a freshness band.</li>
              <li>Personal data is classified per row with lawful basis, consent, retention and export restriction. Subject-access exports run through the audit log.</li>
              <li>The AI is never permitted to invent revenue, valuations, acquisition history, buyer or investor interest, legal/tax conclusions, customer traction, or deal multiples — weak evidence must read <i>“Evidence is weak. Treat this as a hypothesis, not a decision.”</i></li>
              <li>Adviser-privileged rows are excluded from buyer-facing surfaces and from any export.</li>
            </ul>
          </CardContent>
        </Card>

        {/* RELEASE GATE ADDENDUM */}
        <Card className="tech-card">
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /> Release Readiness Gate (final hardening)</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-3">
            <Section title="What 'release ready' means">
              The module moves through four states: <b>not ready</b> → <b>internal testing</b> → <b>controlled live use</b> → <b>blocked</b>. A single critical failing check forces <i>Blocked: do not use live until resolved.</i>
            </Section>
            <Section title="AI evidence guardrails">
              Every AI recommendation must carry evidence references, confidence, source freshness, missing-information, assumptions and risk level. If evidence is weak it must read <i>“Evidence is weak. Treat this as a hypothesis, not a decision.”</i> The AI never invents revenue, valuations, acquisition history, buyer/investor interest, legal/tax conclusions, customer traction or deal multiples.
            </Section>
            <Section title="Red team review">
              Any quarterly build, scale, sale, kill, valuation or buyer-outreach decision can be challenged. The red-team asks why this could fail, why the buyer may not care, why valuation may be too high, what legal/IP risk exists, what cheaper test should run first, and what would make us stop.
            </Section>
            <Section title="Privacy / GDPR">
              Personal data carries lawful basis, consent, subject type, retention and export restriction. Imports and exports involving personal data show a privacy warning.
            </Section>
            <Section title="Dual approval, immutable audit, allowlist, rate &amp; cost, safe exports, system health, disaster recovery, acceptance tests, lockdown">
              All documented in the Release Gate page. Audit-log deletion is restricted to admin; true immutability is a known limitation and is mitigated by admin-only RLS plus append-style writes.
            </Section>
            <Section title="What must never be automated" warn>
              External outreach, buyer/investor/adviser contact, legal/tax/entity decisions, data exports, paid API activation, spend commitments and build/kill/sale decisions remain founder-approved.
            </Section>
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