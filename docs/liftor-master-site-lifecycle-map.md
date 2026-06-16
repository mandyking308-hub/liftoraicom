# Liftor Master Site Map & Business Lifecycle Flow Audit

_Read-only architecture and process audit. No code changed. No data created. No external actions enabled._

Audit date: 2026-06-16
Audit scope: `src/App.tsx`, `src/pages/founder/**`, `supabase/functions/**` (576 functions), Supabase tables (1000+), `docs/*`, `.lovable/memory/*`, prior audits (`business-function-coverage-audit.md`, `searchable-video-library-*`, `healthcare-overlay-pack.md`, `operating-loops-closure-pack.md`).

---

## A. Executive Summary

Liftor is a very large founder/admin operating console. The router exposes **~775 `/founder/*` routes** across **~235 top-level founder page modules** and **~100 sub-route folders**, backed by **576 Supabase edge functions** and **>1,000 RLS-protected tables**. All `/founder/*` routes are gated by `FounderRoute`, and policy enforcement runs through `is_founder_or_admin(auth.uid())` plus per-table RLS.

The end-to-end journey **Opportunity → Build → Launch → Operate → Scale → Exit** is now structurally present:

- Opportunity in: Funding Radar, Distressed Radar, Quarterly Build Selector, Strategic Targets, Relationship Intelligence, Global PR Radar.
- Build / activation: Quarterly Production Machine, Business Onboarding Factory, Starter Pack Materialiser, Business Internal Activation, External Activation Readiness, Build Phase Closeout.
- Operate: Business Daily Operating Loop, Business Weekly Review, Customer Success, Support, Delivery, Operations, Operating Loops (insurance/filings/secretarial/expansion/release/FX), Healthcare Overlay.
- Scale: Marketing, Social Autopilot, Outreach, CRM, Customer Upgrades, Marketplace, Channel Strategy, Experiments.
- Exit: Portfolio Exit Command Centre, M&A Intelligence Workspace, Exit Valuation Engine, Portfolio Buyer Warm-up, Data Room, Acquisition/Funding deal structures.

**Verdict (preview):** Liftor is **founder-review-ready** as an internal operating shell — the journey is reachable and the spine entities exist — but it is **not yet operationally lean for daily use**: route count and module duplication create navigation noise, several modules write records without surfacing them to the Command Centre, and a number of older "v1" pages overlap with newer hubs. See §J for the exact pre-live cleanup list.

---

## B. Full Route / Page Map (clustered)

> 775 founder routes are too many to list line-by-line. They are grouped here by domain. Each group lists representative top-level page modules and the route prefix that contains them.

### B.1 Founder Command & Attention
| Route prefix | Pages | Purpose |
|---|---|---|
| `/founder` | `FounderOverview` | Founder home, overview metrics |
| `/founder/command-centre` | `CommandCentre` (+ legacy `CommandCenter` at `/founder/command-center/legacy`) | Master attention layer |
| `/founder/attention-guard/*` | Overview, Today, Noise, Decisions, Delegation, Settings | Attention/fatigue guardrails |
| `/founder/approvals-ops/*` | Approvals Ops queue | Approval routing |
| `/founder/work-queue/*` | Master Work Queue | Cross-module task feed |
| `/founder/decisions` | `DecisionEngine` | Founder decision log |
| `/founder/priority` | `PriorityDashboard` | Cross-business prioritisation |
| `/founder/copilot` | `FounderCoPilot` | Founder assistant |
| `/founder/brain*`, `/founder/brain-core` | `LiftorBrain`, `BrainCore`, sessions/drafts/audit/tools/provider | Liftor Brain console |

### B.2 Opportunity & Build Pipeline
| Route prefix | Pages |
|---|---|
| `/founder/funding-radar/*` | Radar, Companies, Clusters, Capital Efficiency, Monthly Run, Shortlist, Decision Pack, Watchlist, Weakness Signals, Market Maps, White Space, Build Handoff, Business Autopsy |
| `/founder/distressed-radar/*` | Distressed acquisition opportunities |
| `/founder/quarterly-production-machine/*` | Build Generator, Build Pack Validator, Prompt Queue, Vertical Launch, Production Pack, Lovable Pack |
| `/founder/portfolio-exit/build-selector` | `QuarterlyBuildSelector` |
| `/founder/proposals`, `/founder/internal-proposals` | Outbound and internal proposals |
| `/founder/pipeline` | `LeadPipeline` |
| `/founder/strategy` | `StrategyEngine` |
| `/founder/archetypes/*` | Business archetypes |

### B.3 Business Setup / Entity / Compliance
| Route prefix | Pages |
|---|---|
| `/founder/business-onboarding-factory` | Factory generating new business shells |
| `/founder/starter-pack-materialiser` | Materialise starter packs |
| `/founder/business-activation/*`, `/founder/business-internal-activation`, `/founder/external-activation-readiness`, `/founder/business-lifecycle/*` | Pre-live readiness gates |
| `/founder/business-compliance/*`, `/founder/jurisdiction-tax/*`, `/founder/policies/*`, `/founder/legal`, `/founder/compliance/*` | Policy/legal/tax |
| `/founder/entity-map/*`, `/founder/organisations` | Entity register |
| `/founder/corporate-secretarial`, `/founder/statutory-filings` | Operating Loops governance |
| `/founder/healthcare-overlay` | Healthcare governance overlay (founder-only) |
| `/founder/insurance-liability/*`, `/founder/insurance-claims` | Insurance register + claims loop |
| `/founder/ip-assets/*`, `/founder/contracts/*` | IP & contract registers |
| `/founder/access-governance/*`, `/founder/access-control`, `/founder/security`, `/founder/security-vault/*`, `/founder/trust-safety/*`, `/founder/privacy/*` | Security/privacy/trust |

### B.4 Product / Roadmap / QA / Release
| Route prefix | Pages |
|---|---|
| `/founder/product/*`, `/founder/product-catalogue/*` | Product, features, roadmap, bugs |
| `/founder/release-workflow` | Release workflow loop |
| `/founder/testing`, `/founder/platform-monitor/*`, `/founder/system/*`, `/founder/system-health/*`, `/founder/runtime-mode/*` | QA, runtime, system health |
| `/founder/build-phase-closeout` | Closeout before activation |
| `/founder/build-log` | Append-only build log |
| `/founder/monday-launch`, `/founder/monday-readiness`, `/founder/launch-factory/*` | Launch readiness |

### B.5 Sales / Outreach / CRM
| Route prefix | Pages |
|---|---|
| `/founder/crm/*` | CRM dashboard, contacts, inboxes |
| `/founder/outreach/*` | Imports, campaigns, queue, Apollo, engagement, send preview, queue audit, live monitor |
| `/founder/sending` | Sending health |
| `/founder/communications/*`, `/founder/conversations/*` | Comms and threads |
| `/founder/sales-targets/*`, `/founder/sales-coaching/*`, `/founder/customer-sales/*` | Sales motion |
| `/founder/relationship-intelligence`, `/founder/relationship-health/*` | Relationship intelligence |
| `/founder/identity-resolution/*`, `/founder/imports/*` | Identity + import |

### B.6 Marketing / PR / Visibility
| Route prefix | Pages |
|---|---|
| `/founder/marketing`, `/founder/assets` | Marketing hub & creative |
| `/founder/social`, `/founder/social-autopilot/*` | Social brain + autopilot (accounts, content, calendar, publishing, inbox, replies, engagement, performance, funnels, ads) |
| `/founder/global-pr-radar` | PR radar |
| `/founder/campaign-factory` | Campaign factory |
| `/founder/channel-strategy/*` | Channel strategy |
| `/founder/analytics-attribution/*`, `/founder/analytics` | Attribution + analytics |

### B.7 Customer Lifecycle
| Route prefix | Pages |
|---|---|
| `/founder/customer-onboarding/*` | Onboarding |
| `/founder/customer-success`, `/founder/customer-feedback/*` (VoC) | Success + voice of customer |
| `/founder/customer-upgrades/*` | Renewals, upgrades, follow-up |
| `/founder/support/*`, `/founder/support-tickets/*`, `/founder/complaints/*` | Support |
| `/founder/clients` | Client portal admin |
| `/founder/portals/*` | Customer/seller/partner/adviser portal admin |
| `/founder/business-wind-down/*` | Wind-down / offboarding |

### B.8 Operations / Delivery / People
| Route prefix | Pages |
|---|---|
| `/founder/operations`, `/founder/delivery/*`, `/founder/scheduling/*`, `/founder/capacity/*`, `/founder/resource-allocation/*` | Ops delivery |
| `/founder/people/*`, `/founder/human-workforce-control`, `/founder/worker-manuals`, `/founder/worker-help-audit` | People & operator oversight |
| `/founder/sops/*`, `/founder/video-sop-factory`, `/founder/video-library`, `/founder/manuals-hub`, `/founder/manual/*`, `/founder/automation-book` | SOPs, video, manuals |
| `/founder/suppliers/*`, `/founder/vendors/*` | Supply side |
| `/founder/ecommerce/*`, `/founder/marketplace/*` | Storefront & marketplace |

### B.9 Finance / Money / Risk
| Route prefix | Pages |
|---|---|
| `/founder/finance/*`, `/founder/revenue`, `/founder/revenue-autopilot/*`, `/founder/quote-to-cash/*` | Finance |
| `/founder/collections/*`, `/founder/reconciliation/*`, `/founder/pricing-margin/*` | AR, recon, margin |
| `/founder/portfolio-fx` | Portfolio FX consolidation |
| `/founder/portfolio-risk/*`, `/founder/incidents/*`, `/founder/recovery/*`, `/founder/backup-recovery/*` | Risk, incidents, recovery |
| `/founder/internal-sla/*` | SLA |

### B.10 AI Governance / Cost / Brain
| Route prefix | Pages |
|---|---|
| `/founder/ai-cost/*` | Action board, runtime, orchestration, health, ledger, routing, budgets, agent controls, alerts, ROI, approvals, templates, context, pricing, quality, security, queue, sandbox, finance, live |
| `/founder/ai-compliance/*`, `/founder/ai-evals/*` | AI compliance + evals |
| `/founder/agent-capabilities/*`, `/founder/agents/*`, `/founder/orchestration/*` | Agents |
| `/founder/connectors/*`, `/founder/integrations/*`, `/founder/integration-map/*`, `/founder/webhooks/*` | Integrations |

### B.11 International / Portfolio / Exit
| Route prefix | Pages |
|---|---|
| `/founder/expansion/*`, `/founder/international-expansion` | Expansion |
| `/founder/portfolio-prioritisation/*`, `/founder/portfolio-diversity/*`, `/founder/portfolio-memory/*` | Portfolio shaping |
| `/founder/portfolio-exit/*` | Exit Command Centre, intelligence, valuation, manual, controls, ingestion, hardening, release gate, execution handoff |
| `/founder/portfolio-exit/intelligence` | `MAIntelligenceWorkspace` |
| `/founder/portfolio-exit/valuation` | `ExitValuationEngine` |
| `/founder/data-room` | Investor data room access tokens |
| `/founder/acquisition-funding/*` | Deal structures, pitch packs, opportunities, sources |
| `/founder/exit-metrics/*` | Exit metric scorecards |

### B.12 Cross-cutting
Knowledge (`/founder/knowledge/*`, `/founder/knowledge-governance/*`), Templates (`/founder/templates/*`, `/founder/business-templates/*`), Processes (`/founder/processes/*`), Architectures (`/founder/architectures/*`), Deployments (`/founder/deployments/*`), Documents (`/founder/documents`, `/founder/contracts/*`), Audit (`/founder/audit-ledger/*`), Search (`/founder/search/*`), Notifications (`/founder/notifications/*`), Reporting Truth (`/founder/reporting-truth/*`), Reports (`/founder/reports/*`), Scheduled Jobs (`/founder/scheduled-jobs/*`, **disabled — no cron active**), Wind-down (`/founder/business-wind-down/*`).

> Full machine-readable list: see `/tmp/routes.txt` regenerated from `src/App.tsx` (775 entries). The set is stable across this audit.

---

## C. Lifecycle Stage Coverage Table

Legend: ✅ live-ready (founder review safe) · 🟡 partial · 🟠 founder-review only · 🔴 missing / unsafe.

| Stage | Primary modules | Status | Notes |
|---|---|---|---|
| Opportunity discovery | Funding Radar, Distressed Radar, Global PR Radar, Relationship Intelligence | ✅ | Read/track only; no external sends. |
| Opportunity scoring/prioritisation | Funding Radar shortlist, Portfolio Prioritisation, Priority Dashboard, Decision Pack | ✅ | |
| Quarterly build selection | Quarterly Build Selector, Quarterly Production Machine | ✅ | |
| Business record creation | Business Onboarding Factory, Starter Pack Materialiser | ✅ | |
| Entity / legal / tax / structure | Entity Map, Organisations, Jurisdiction Tax, Corporate Secretarial, Policies, Legal Console | ✅ | External filing/legal action still adviser-led. |
| Product/service build | Product, Product Catalogue, Templates, Architectures | 🟡 | Roadmap → release link partially manual. |
| Roadmap / QA / release | Release Workflow, Platform Testing, Platform Monitor | ✅ | Release Workflow loop in place. |
| Launch readiness | Monday Readiness, Launch Factory, External Activation Readiness, Build Phase Closeout | ✅ | |
| Sales / outreach / CRM | CRM, Outreach (queued only), Sales Targets, Conversations | 🟡 | Outreach send remains paused/founder-gated. |
| Marketing / PR / visibility | Marketing Hub, Social Autopilot (manual export), PR Radar, Campaign Factory | 🟠 | Social/PR live posting parked; export-only is correct. |
| Customer onboarding | Customer Onboarding, Welcome Packs | ✅ | |
| Customer support | Support Hub, Support Tickets, Complaints, Knowledge Agent | ✅ | |
| Customer success / retention | Customer Success, VoC, Customer Upgrades, Retention scores | ✅ | |
| Operations / delivery | Operations, Delivery, Scheduling, Capacity | 🟡 | Heavy module count, navigation noise. |
| People / operator oversight | People, Human Workforce Control, Worker Manuals, Worker Help Audit | ✅ | |
| SOPs / training / searchable video | Video SOP Factory, Video Library, Manuals Hub, Automation Book | ✅ | Founder review path proven in prior audit. |
| Finance / payments / accounting | Finance, Revenue, Revenue Autopilot, Quote-to-Cash, Collections, Reconciliation, Pricing & Margin | 🟡 | Multiple finance entry points overlap. |
| Insurance / claims | Insurance Liability register, Insurance Claims loop | ✅ | Adviser handoff only. |
| Statutory / tax / corporate filings | Statutory Filings, Corporate Secretarial, Jurisdiction Tax | ✅ | Tracking-only; no auto-submission. |
| Compliance / risk / healthcare | Compliance, Business Compliance, Policies, Healthcare Overlay | ✅ | Healthcare Overlay founder-only, NOT LIVE default. |
| Data / analytics / reporting | Analytics, Analytics Attribution, Reports, Reporting Truth, Founder Analytics | 🟡 | Reporting Truth needs cross-module pull verification. |
| AI governance / cost | AI Cost (20 sub-pages), AI Compliance, AI Evals, Agent Capabilities, Brain | ✅ | Strongest area. |
| International expansion | International Expansion run, Expansion directory | ✅ | Tracking. |
| Investor / acquirer data room | Data Room (tokens), Founder Documents, Document Vault | ✅ | Access tokens revocable; not externally shared by default. |
| M&A / valuation / buyer radar | Portfolio Exit Command Centre, MA Intelligence Workspace, Exit Valuation Engine, Buyer Warm-up | ✅ | |
| Exit / sale readiness | Exit Metrics, Portfolio Exit Hardening, Release Gate, Execution Handoff | ✅ | |
| Crisis / continuity / kill switch | Recovery, Backup Recovery, Incidents, Trust & Safety, AI Kill Switch | 🟡 | Kill switch exists per-agent; portfolio-wide drill not exercised. |
| Founder Command Centre / attention | Command Centre, Attention Guard, Approvals Ops, Master Work Queue, Founder Action Board | ✅ | |

---

## D. End-to-End Business Journey Map

```text
[Opportunity]
  Funding Radar / Distressed Radar / PR Radar / Relationship Intel
    └─> shortlist + score (Founder decision)
         entry: /founder/funding-radar/shortlist
         owner: Founder
         records: funding_radar_companies, funding_radar_scores
         gate: Founder Decision Pack
         evidence: funding_radar_decision_pack export
         output → Quarterly Build Selector

[Selection]
  Quarterly Build Selector → Quarterly Production Machine
    entry: /founder/portfolio-exit/build-selector → /founder/quarterly-production-machine
    owner: Founder
    records: business_archetype_assignments, ma_build_candidates
    gate: Build Pack Validator
    evidence: Production Pack / Lovable Pack
    output → Business Onboarding Factory

[Build / Activation]
  Business Onboarding Factory → Starter Pack Materialiser → Business Internal Activation
    → External Activation Readiness → Build Phase Closeout
    entry: /founder/business-onboarding-factory
    records: businesses, business_activation_profiles, business_internal_activation_records,
             business_external_activation_readiness_runs, liftor_build_phase_closeout_records
    gates: business_runtime_activation, business_go_live_approval (edge fn)
    evidence: starter_pack_materialised_items, business_pre_live_baselines
    output → Launch Factory + Monday Readiness

[Launch]
  Monday Readiness / Launch Factory → Business Daily Operating Loop
    entry: /founder/monday-readiness
    gate: liftor_live_readiness_gates (must be present)
    evidence: business_launch_checklist_items, business_press_readiness
    output → Operate

[Operate]
  Daily: Business Daily Operating Loop, Customer Support, Delivery, AI Live Operations
  Weekly: Business Weekly Review
  Monthly: Operating Loops (Insurance Claims, Statutory Filings, Corporate Secretarial,
                            International Expansion, Release Workflow, Portfolio FX)
  Continuous: CRM, Outreach (queued), Social Autopilot (manual export),
              Customer Success, Healthcare Overlay (if regulated)
  records: business_daily_operating_runs, business_weekly_review_runs,
           insurance_claims, statutory_filings, corporate_secretarial_records,
           release_workflow_items, fx_rate_snapshots
  gate: Founder Approval Items
  evidence: per-module *_events audit tables
  output → Scale, Evidence, Exit prep

[Scale]
  Marketing, Social Autopilot, Marketplace, Customer Upgrades, Experiments,
  International Expansion, Channel Strategy
  records: campaign_*, marketplace_*, customer_upgrade_*, experiment_*
  gate: Founder approval per channel/budget
  evidence: ai_quality_scores, experiment_results
  output → Revenue + Exit metrics

[Exit / Sale]
  Portfolio Exit Command Centre → MA Intelligence Workspace → Exit Valuation Engine
    → Portfolio Exit Hardening → Data Room → Portfolio Buyer Warm-up
    → Execution Handoff
  entry: /founder/portfolio-exit
  owner: Founder + external adviser (tracked, not automated)
  records: portfolio_exit_targets, ma_deals, ma_data_room_items,
           data_room_access_tokens, business_valuation_snapshots
  gate: ma_release_gate_checks
  evidence: ma_evidence_links, ma_audit_logs
  output → external advisers (manual handoff)
```

---

## E. Command Centre Integration Map

| Source module | Feeds into Command Centre via | Status |
|---|---|---|
| Approvals Ops | Founder Approval Items | ✅ |
| Master Work Queue | master_work_items | ✅ |
| Attention Guard | attention_focus_priorities, attention_fatigue_warnings | ✅ |
| Operating Loops (insurance/filings/secretarial/expansion/data room/release/FX) | `OperatingLoopsAttentionPanel` on `/founder/command-centre` | ✅ |
| Healthcare Overlay | `healthcare_readiness` blocker status | 🟡 panel not yet on Command Centre |
| Funding Radar shortlist | Decision Pack export | 🟡 not piped to attention layer |
| Quarterly Production Machine | Build pack validator results | 🟡 not piped |
| Business Activation / Closeout | business_runtime_activation_log | ✅ |
| CRM / Conversations | founder_review_queue, agent_alerts | ✅ |
| Outreach queue | queue audit + send preview | ✅ (founder-gated) |
| AI Cost / Kill Switch | ai_cost_alerts, ai_kill_switch_state | ✅ |
| Portfolio Exit | portfolio_exit_target_alerts | 🟡 alerts table exists; Command Centre panel missing |
| Video Library / SOPs | video_library_audit_events | 🟠 not surfaced |
| Relationship Intelligence | relationship_health_scores | 🟡 score yes, attention items no |

---

## F. Data Spine Map

```text
auth.users
  └─ profiles
       └─ user_roles ──(has_role/is_founder_or_admin)──> all RLS

businesses ──┬─ business_activation_profiles
             ├─ business_runtime_activation
             ├─ business_operating_profiles
             ├─ business_revenue_targets / revenue_records
             ├─ business_compliance_profiles
             └─ healthcare_readiness (optional overlay)

legal_entities / group_entity_register
  ├─ entity_policy_assignments
  ├─ corporate_secretarial_records ── corporate_secretarial_events
  ├─ statutory_filings ── statutory_filing_events
  ├─ insurance_policy_register ── insurance_claims ── insurance_claim_events
  └─ international_expansion_runs ── international_expansion_events

opportunity layer
  funding_radar_companies ── funding_radar_scores ── funding_shortlist ──> ma_build_candidates
  distressed_acquisition_opportunities ──> ma_build_candidates
  ma_build_candidates ──> business_archetype_assignments ──> businesses

product / build
  product_features ── product_roadmap_items ── release_workflow_items ── release_workflow_events
  product_bugs, qa_test_cases, platform_test_runs

customer / commercial
  contacts ── identity_profiles ── crm_interaction_ledger
  deals ── qtc_quotes ── qtc_invoices ── qtc_payments ── revenue_records
  customer_subscriptions ── customer_renewal_reviews ── customer_upgrade_opportunities
  customer_success_profiles ── customer_success_checkins ── customer_complaints

evidence & documents
  document_vault_items, asset_rights_records, organisation_documents
  ma_data_room_items ── data_room_access_tokens ── data_room_view_audit
  ma_evidence_links → ma_deals

policy / compliance / risk
  policy_templates ── policy_drafts ── policy_approvals ── policy_public_pages
  compliance_rules ── compliance_events ── compliance_scores
  incident_register ── incident_timeline_events ── incident_postmortems
  privacy_requests, privacy_breach_events

SOPs / training / video
  sop_documents ── sop_versions ── sop_review_tasks
  video_library_items ── video_transcript_segments ── video_library_chapters
  video_sop_assets ── video_sop_scripts ── video_sop_links ── video_sop_training_assignments

investor / buyer / exit
  ma_companies, ma_investors, ma_deals, ma_buyer_matches, ma_exit_targets
  portfolio_exit_targets ── portfolio_exit_target_alerts
  business_valuation_assumptions ── business_valuation_snapshots
  exit_metric_templates ── business_exit_metric_values ── business_exit_readiness_scores
  funding_exit_readiness

AI governance spine
  ai_agent_registry / ai_agents ── ai_agent_permissions / ai_agent_roles
  ai_action_queue ── ai_runtime_events ── ai_usage_ledger ── ai_cost_alerts
  ai_kill_switch_state, autonomy_levels, autonomy_policies, autonomy_action_audit
  ai_human_oversight_records, ai_compliance_systems, ai_compliance_evidence_items
```

---

## G. Orphan / Duplicate Route List

### G.1 Duplicates / superseded
| Newer hub | Older / overlapping route(s) | Recommendation |
|---|---|---|
| `/founder/command-centre` (CommandCentre.tsx) | `/founder/command-center/legacy` (CommandCenter.tsx) | Hide legacy from nav, keep route alive for one release. |
| `/founder/finance/*` (Finance Dashboard) | `/founder/revenue` (FounderRevenue), `/founder/revenue-autopilot/*`, `/founder/quote-to-cash/*` | Pick one **finance home**; the other two should become tabs inside it. |
| `/founder/marketing` (MarketingHub) | `/founder/social`, `/founder/social-autopilot/*`, `/founder/campaign-factory`, `/founder/assets` | Make Marketing Hub the umbrella with sub-tabs. |
| `/founder/portals/*` (admin) | `/portal/*` (public-facing) | Names too close; rename admin to `/founder/portal-admin/*` (cosmetic only). |
| `/founder/manuals-hub` | `/founder/manual`, `/founder/manual/full`, `/founder/manual/user`, `/founder/automation-book`, `/founder/worker-manuals` | Consolidate under Manuals Hub navigation. |
| `/founder/portfolio-exit/build-selector` | `/founder/quarterly-production-machine/build-generator` (also points at `FRBusinessAutopsy`) | Confusing dual entry; pick one canonical build-selection page. |
| `/founder/business-internal-activation` | `/founder/business-activation/*` | Move single page into the multi-tab activation hub. |
| `/founder/customer-success` | `/founder/customer-feedback/*`, `/founder/customer-upgrades/*` | Group as Customer hub. |
| Operating Loops single pages (insurance-claims, statutory-filings, corporate-secretarial, international-expansion, data-room, release-workflow, portfolio-fx) | Old single-page registers (`/founder/insurance-liability/*`, `/founder/contracts/*`) | Keep both; cross-link explicitly. |
| `QuarterlyProductionMachine.tsx` (top-level) + `/founder/quarterly-production-machine/*` (folder) | — | Decide whether top page is hub or list. |

### G.2 Likely-orphan / hard-to-reach (have route but unclear nav entry)
- `/founder/full-system-mirror` (FullSystemMirror via `/founder/manual/full`)
- `/founder/build-log`
- `/founder/cross-contamination/*`
- `/founder/reporting-truth/*`
- `/founder/identity-resolution/*`
- `/founder/reconciliation/*`
- `/founder/adviser-pack/*`
- `/founder/sending`
- `/founder/portfolio-memory/*`
- `/founder/portfolio-diversity/*`
- `/founder/portfolio-prioritisation/*`
- `/founder/context-guard/*`
- `/founder/data-quality/*`
- `/founder/audit-ledger/*`
- `/founder/scheduled-jobs/*` (correctly parked — no cron)
- `/founder/wind-down/*` and `/founder/business-wind-down/*` (two prefixes)

All resolve; they just don't have obvious nav placements.

---

## H. Missing Handoffs

1. **Funding Radar shortlist → Quarterly Build Selector**: no explicit "promote shortlisted company to build candidate" button visible; promotion appears to require manual creation in `ma_build_candidates`.
2. **Quarterly Production Machine → Business Onboarding Factory**: production pack output exists but doesn't auto-create a `businesses` shell.
3. **Business Onboarding Factory → External Activation Readiness**: handoff exists but Closeout → Monday Readiness is implicit.
4. **Release Workflow → Customer Comms**: customer comms draft field exists on `release_workflow_items` but is not piped to Marketing/Support.
5. **Healthcare Overlay → Command Centre**: blockers exist on `healthcare_readiness` but not on Command Centre attention panel.
6. **Insurance Claims → Finance**: recovered amount field exists but no `revenue_records` posting.
7. **Portfolio Exit alerts → Command Centre**: alert table exists, no panel.
8. **Video Library / SOP completion → People oversight**: training assignments not surfaced on People dashboard.
9. **CRM Interaction Ledger → Founder Decisions**: high-signal interactions don't auto-create founder decision items.
10. **Wind-down → Data Retention → Data Room exclusion**: wind-down records don't update data room item visibility.

---

## I. Live-Use Readiness Checklist (pre-Mandy daily use)

Blockers to clear before daily founder operation:
- [ ] Hide or merge **5 duplicate finance entries** (Finance / Revenue / Revenue Autopilot / Quote-to-Cash / Pricing & Margin) into a single Finance Hub with tabs.
- [ ] Add a **single Marketing Hub** umbrella nav grouping Social, PR Radar, Campaign Factory, Assets.
- [ ] Add a **left-nav grouping** keyed to the 7 lifecycle stages (Opportunity / Build / Launch / Operate / Scale / Evidence / Exit) so 775 routes become navigable.
- [ ] Add **Command Centre panels** for: Healthcare Overlay blockers, Portfolio Exit alerts, Funding Radar decisions due.
- [ ] Resolve legacy `/founder/command-center/legacy` — keep redirect, drop from nav.
- [ ] Rename `/founder/portals/*` → `/founder/portal-admin/*` to avoid clash with public `/portal/*`.
- [ ] Confirm `is_founder_or_admin()` returns true only for `mandyking308@gmail.com` and explicit admins; spot-check 10 high-risk tables (`data_room_access_tokens`, `healthcare_readiness`, `insurance_claims`, `statutory_filings`, `ai_kill_switch_state`, `founder_approval_items`, `liftor_brain_messages`, `ma_data_room_items`, `agent_action_audit_log`, `autonomy_action_audit`).
- [ ] Verify no `/founder/*` page is reachable by `authenticated` non-founder role.
- [ ] Verify outbound send remains paused: `outbound_provider_events`, `email_queue`, `social_publish_jobs` all in dry-run/queued state.
- [ ] Confirm cron is OFF (no `pg_cron` or scheduled-job runners enabled in `supabase/config.toml`).
- [ ] Confirm Healthcare Overlay defaults to `NOT LIVE / BLOCKED`.
- [ ] Confirm Data Room tokens default to `revoked` / `view_only`.

These are nav, label and gate verification only — **no new features required**.

---

## J. Post-Live Improvements (can wait)

- Pipe Funding Radar → Build Selector → Onboarding Factory as a single "promote" action.
- Pipe Release Workflow customer comms drafts into Support + Marketing.
- Auto-post recovered insurance amounts into `revenue_records` (founder approval gated).
- Surface Video Library training completion on People dashboard.
- Add cross-module record links (`cross_module_record_links` table already exists) between business → entity → policy → SOP → claim → filing → release → valuation.
- Consolidate the 20 AI Cost sub-pages into a 5-tab console; current breadth is correct for governance but heavy for daily use.
- Build a single "Lifecycle Stage" filter on the Master Work Queue so attention items can be grouped by stage.
- Add a self-test edge function that walks the journey above and reports broken handoffs (read-only).

---

## K. Final Verdict

**Is Liftor ready to be used as a founder operating system from opportunity discovery through exit/sale?**

**Yes, with one pre-flight cleanup.** The structural journey is now complete and reachable. Every lifecycle stage from opportunity in to exit out has at least one founder-only module with RLS, audit tables, and a clear write/approve path. Operating Loops, Healthcare Overlay, Video Library, PR Radar, Funding Radar, Portfolio Exit Command Centre and the AI governance spine all exist and are founder-gated. External legal, tax, insurance, clinical and investor actions are correctly tracked but not automated.

The remaining barrier is **navigation noise, not capability**: 775 routes need lifecycle-stage grouping in the founder sidebar, the 5 finance and 5 marketing/social entry points need umbrella hubs, and 3 Command Centre panels (Healthcare blockers, Portfolio Exit alerts, Funding Radar decisions due) need to be added before Mandy operates daily.

Once the items in §I are confirmed (no new code beyond nav grouping and 3 attention-panel wires), Liftor is safe to use as Mandy's founder operating system end-to-end. Until then, treat it as **founder-review-ready** rather than daily-driver-ready.
