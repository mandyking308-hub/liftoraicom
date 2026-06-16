# Liftor Business Function Coverage Audit
Date: 2026-06-16  
Scope: Read-only audit of `src/pages/founder/*`, `supabase/functions/*`, Supabase tables, `.lovable/memory/*`, and `docs/*`. No fake data, no builds, no activations.

## Update 2026-06-16: Operating Loops Closure Pack delivered

The following P1/P2 gaps are now closed by founder/admin-only workflows with audit trails. See `docs/operating-loops-closure-pack.md`.

| Gap | Status after closure pack |
| --- | --- |
| Insurance claim lifecycle | Closed-loop tracking — `/founder/insurance-claims` |
| Tax / statutory filings calendar | Closed-loop tracking — `/founder/statutory-filings` |
| Corporate secretarial cadence | Closed-loop tracking — `/founder/corporate-secretarial` |
| International expansion runbook | Closed-loop tracking — `/founder/international-expansion` |
| Investor data room hardening | Access governance + audit — `/founder/data-room` |
| Roadmap → release → comms loop | Approval-gated workflow — `/founder/release-workflow` |
| Portfolio FX consolidation | Read-only consolidation — `/founder/portfolio-fx` |

All external actions (filings, broker/insurer sends, customer release comms, live investor links) remain adviser-led and out of scope by design.

## Coverage scale
0 Missing · 1 Logged · 2 Managed · 3 Assisted · 4 Automated w/ approval · 5 Strategic intelligence

---

## A. Overall coverage score
**Weighted average: ~3.7 / 5** across 30 core functions + 10 healthcare overlay.  
Liftor already exceeds the operating model of a typical single business and approaches Level-4 across most portfolio control functions. Weakness is concentrated in the **healthcare/clinical overlay**, **insurance claim execution**, **international expansion**, and **investor capital readiness execution** (the data layers exist, the workflow loops do not yet close).

---

## B. Heatmap — core business functions

| # | Function | Level | Status | Priority |
|---|---|---|---|---|
| 1 | Founder / Executive Control | 5 | Strong — CommandCentre, FounderCoPilot, FounderOverview, Approvals Ops, Attention Guard | — |
| 2 | Strategy & Planning | 4 | StrategyEngine, DecisionEngine, PortfolioPrioritisation, QuarterlyProductionMachine | P2 |
| 3 | Corporate / Entity Management | 3 | entity-map, group_entity_register, legal_entities | P1 |
| 4 | Legal & Contracts | 4 | contracts/* pages, contracts engine, contract_obligations, FounderLegalConsole | P2 |
| 5 | Finance & Accounting | 4 | finance/*, qtc_*, accounting_close_tasks, collections/*, reconciliation/* | P1 |
| 6 | Tax & Structuring | 3 | jurisdiction-tax/*, tax_sensitive_questions, tax_treatment_flags | P1 |
| 7 | Sales / Revenue Generation | 5 | customer-sales/*, LeadPipeline, revenue-autopilot, sales-targets, sales-coaching | — |
| 8 | Marketing & Brand | 4 | MarketingHub, CampaignFactory, SocialAutopilot, longform_content_*, paid_media_* | P2 |
| 9 | PR / Media / Visibility | 4 | GlobalPrRadar, media_opportunities, journalist_relationships, owned_media_articles | P2 |
| 10 | Customer Onboarding | 4 | customer-onboarding/*, customer_onboarding_plans, welcome_packs | — |
| 11 | Customer Support | 4 | SupportHub, support-tickets/*, support_* tables, SupportKnowledgeAgent | P2 |
| 12 | Customer Success / Retention | 5 | CustomerSuccess, retention/winback engines, quarterly_reports, NPS | — |
| 13 | Product / Service Development | 3 | product/*, product-catalogue, voc_feature_requests, product_roadmap_items | P1 |
| 14 | Operations / Delivery | 4 | delivery/*, scheduling/*, capacity/*, delivery_orders, fulfilment_shipments | P2 |
| 15 | People / Workforce / Contractors | 4 | people/*, HumanWorkforceControl, worker_* tables, operator/oversight portals | P2 |
| 16 | SOPs / Training / Knowledge Base | 4 | sops/*, VideoSopFactory, **VideoLibrary** (searchable), knowledge-governance | — |
| 17 | Compliance / Risk / Governance | 4 | compliance/*, business-compliance, policies/*, audit-ledger, ai-compliance | P2 |
| 18 | Data / Analytics / Reporting | 4 | analytics-attribution/*, reporting-truth, FounderAnalytics, KPI panels | P2 |
| 19 | Technology / Systems / Security | 4 | system-health, platform-monitor, security-vault, SecurityDashboard, backup-recovery | P2 |
| 20 | AI Governance | 5 | AICostGovernorHub, AI compliance, ai_governance edge fns, autonomy_policies, kill switch | — |
| 21 | Supplier / Vendor Management | 4 | suppliers/*, vendors/*, procurement_requests, supplier_risk_reviews | P2 |
| 22 | Partnerships / Channels | 3 | partners/*, partner portal, partner_referral_records, channel-strategy | P1 |
| 23 | Quality Assurance | 4 | qa_checklists, qa_test_cases, ai_quality_scores, platform_test_runs, validation suite | P2 |
| 24 | Admin / Back Office | 3 | documents/*, FounderDocuments, accounting-close-run, organisations | P2 |
| 25 | Insurance / Protection | 2 | insurance-liability/* pages + 3 tables exist, no claim workflow loop | P1 |
| 26 | IP / Asset Management | 3 | ip-assets/*, ip_asset_register, ip_rights_checklists, licensing_opportunities | P2 |
| 27 | M&A / Exit Readiness | 5 | PortfolioExitCommandCentre, ExitValuationEngine, MAIntelligenceWorkspace, ma_* tables | — |
| 28 | Investor / Capital Readiness | 4 | funding-radar/*, acquisition-funding, investor_buyer_targets, PortfolioInvestorIntel | P1 |
| 29 | International Expansion | 2 | jurisdiction profiles, supported_languages, multilingual reviews — no expansion workflow | P1 |
| 30 | Crisis / Continuity / Kill Switches | 4 | incidents/*, crisis_response_plans, business_continuity_plans, worker_kill_switch, AI kill switch | — |

## Healthcare / marketplace overlay

| # | Function | Level | Notes |
|---|---|---|---|
| H1 | Provider onboarding | 3 | `marketplace/Onboarding`, `seller_onboarding_records`, `SellerChecklist` cover generic seller flow — not clinical |
| H2 | Credentialing / qualification tracking | 1 | `seller_verification_checks` exists but no DBS/GMC/HCPC schema, no expiry alerts |
| H3 | Safeguarding / clinical risk | 0 | No safeguarding tables, no clinical risk register, no Caldicott role |
| H4 | Referral intake & triage | 1 | `multi_channel_inbound_events` + support_triage can hold it; no referral-specific schema |
| H5 | Patient/customer data governance | 3 | privacy/*, data_privacy_requests, customer_data_inventory — generic GDPR, not special-category health data |
| H6 | Marketplace matching | 4 | `marketplace_match_attempts`, liquidity scores, supply/demand snapshots |
| H7 | Provider/customer payments & refunds | 4 | `marketplace_payout_records`, qtc_payments, refund_requests, complaints/Refunds |
| H8 | Complaints & incident handling | 4 | complaints/*, complaint_resolution_plans, incident_register — generic, no clinical incident flow |
| H9 | Quality monitoring | 3 | qa_*, customer_satisfaction_surveys, performance_scorecards — not clinical-outcomes-aware |
| H10 | Regulatory evidence | 2 | compliance_documents, evidence_records, ai_compliance_evidence_items — no CQC/MHRA mapping |

---

## C. Strongest covered areas (Level 4–5)
- **AI Governance** — cost controls, kill switch, autonomy policies, quality scoring, gateway register.
- **Founder Control** — Command Centre, CoPilot, Approvals Ops, Attention Guard, Master Work Queue.
- **Sales & Revenue Autopilot** — sales targets, coaching, revenue routing, lead pipeline, conversion engine.
- **Customer Success / Retention** — quarterly reports, winback plans, retention scoring, voice-of-customer.
- **M&A / Exit Readiness** — full PortfolioExit suite, valuation snapshots, ma_* (40+ tables), buyer warm-up.
- **SOPs / Searchable Video Library** — newly upgraded to Panopto-style transcript search.
- **CRM & Outreach** — total interaction capture, sanity layer, execution modes, oversight engine.

## D. Weakest / missing areas (Level 0–2)
- **Healthcare clinical overlay** (H2 credentialing, H3 safeguarding, H8 clinical incidents, H10 CQC/MHRA evidence).
- **Insurance claim workflow** (data exists, no claim-lifecycle loop, no broker handoff).
- **International expansion runbook** (jurisdictions logged, no entry-playbook orchestration).
- **Tax filing calendar** (jurisdiction_action_check edge fn exists, no filings register).
- **Investor data room hardening** (data_room_items exists, no per-investor access scoping with watermarks).
- **Corporate secretarial cadence** (entity register exists, no Companies-House style filings tracker).

## E. P0 blockers
None. Every Level-0/1 gap can be deferred without blocking founder operation of the current portfolio.

## F. P1 important gaps
1. **Healthcare credentialing & safeguarding schema** (H2 + H3) — required before any clinical marketplace tenant goes live.
2. **Insurance claim lifecycle** — close the loop from `incident_records` → `insurance_policy_records` → claim → recovery.
3. **Tax filings calendar** — recurring obligations with owner + due-date + evidence.
4. **Corporate secretarial register** — confirmation statements, PSC, dormant filings per entity.
5. **International expansion playbook** — gate by jurisdiction risk + tax + payments + language readiness.
6. **Investor data room access scoping** — per-investor links, watermarking, audit on every view.
7. **Product roadmap → release loop** — `product_roadmap_items` not yet connected to `release_records` + customer-comms.

## G. P2 later improvements
- Clinical-outcomes dashboard for H9 quality monitoring.
- Regulatory mapping for CQC/MHRA/HCPC under H10.
- Partner commission auto-calculation against `partner_commission_rules` (currently logged, not computed).
- Entity-level cashflow forecasting per `group_entity_register` row.
- Multi-currency consolidated P&L across the portfolio (currency_settings + qtc_payments exist; rollup missing).
- Adviser pack auto-refresh on policy/version change.

## H. Recommended next build sequence
1. **Healthcare overlay pack** — credentialing schema (DBS/GMC/HCPC), expiry alerts, safeguarding register, clinical incident flow. (~1 module, founder-only first.)
2. **Insurance claim loop** — wire incident → policy → claim → recovery with founder approval gate.
3. **Filings & secretarial calendar** — single table `statutory_filings` covering tax + corporate, with owner/due/evidence.
4. **Investor data room hardening** — per-investor access tokens + watermark + view audit.
5. **International expansion runbook** — jurisdiction launch template referencing tax, payments, language, legal.
6. **Roadmap → release → comms loop** — connect `product_roadmap_items` → `release_records` → customer notifications.
7. **Portfolio FX consolidation** — multi-currency rollup view on top of existing payments.

Each of the above should be **built into Liftor core** (founder-only first), except:
- **Insurance claim broker handoff** — track in Liftor, executed by external broker.
- **Specialist clinical regulatory mapping** — track in Liftor, approved by external clinical adviser.
- **Cross-border legal/tax filings** — track in Liftor, executed by jurisdictional advisers.

---

## I. Plain-English verdict
**Liftor already covers ~80% of the operating model of a real multi-business portfolio at Level 3 or higher**, with a few functions (founder control, AI governance, sales, customer success, M&A, SOPs/video) running at Level 5. The remaining 20% is concentrated in two pockets:

1. **Healthcare/clinical specifics** — generic marketplace, complaint, incident and privacy machinery exists, but nothing is yet specialised for clinical risk, credentialing or regulator evidence. This is the single biggest gap before any healthcare tenant can be activated safely.
2. **Execution loops on top of existing data** — insurance, tax filings, statutory filings, international expansion, investor data room and product release notifications all *have* the underlying tables, but the closed-loop workflow (owner → due → action → evidence → approval) is not yet wired end-to-end.

Liftor is **not missing any core business function**, and it is **not at risk of operating blind**. It needs **seven focused builds** (above) to move from "complete operating system" to "ready to sell, raise on, and expand into healthcare/international with confidence."

