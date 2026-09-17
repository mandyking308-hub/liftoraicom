# Section K — Data model and end-to-end flows

## K1. Portfolio CRM spine (the identity model)

Four separated layers. Mixing them is the single most common way this system breaks.

```text
person truth        public.contacts              one row per human, portfolio-wide, never duplicated per brand
account truth       public.organisations         contacts.organisation_id → organisations.id
relationship truth  public.business_contact_relationships   one row per (contact, business)
ownership truth     public.portfolio_contact_ownership      ≤1 active owner per contact, portfolio-wide
audit               public.portfolio_ownership_events       append-only claims/releases/blocks/overrides
```

`business_contact_relationships` carries `business_relevance_score`, `business_relevance_level`, `business_relevance_reasons`, `business_relevance_categories`, `relevance_engine_version`, `campaign_eligible`, `do_not_contact`. Relevance is computed by deterministic, versioned, pure engines (e.g. `src/lib/education/educationBusinessRelevance.ts`) so rescoring is idempotent and auditable.

**Superseded:** `contacts.assigned_business` (single-business model). Do not reintroduce it.
**Planned, not built:** `crm_accounts` is referenced as future work in `src/lib/crm/portfolioCrmModel.ts` and is not a table.

Supporting modules: `portfolioCrmQueries.ts`, `portfolioCrmPoolResolver.ts`, `dataAssetRegistry.ts`, `identity resolution`, `dataQualityEngine.ts`, `importCentre` surfaces, `duplicate_*` tables.

Sequence — a person becomes contactable:

```text
import/Apollo → contacts (dedupe/identity resolution) → organisations link
  → business_contact_relationships (relevance score, engine version)
  → portfolio_contact_ownership claim (claim_portfolio_contact RPC; collision + cooldown checks)
  → suppression/sendability checks (check_outreach_allowed, unsubscribe/DNC/bounce/reply)
  → campaign eligibility gate → only then any sending path (Section N)
```

## K2. Education commercial layer

Four canonical education businesses — Billy and the Wild Forest, Aurelia, Kindnesss, Kingsbridge Global — share one commercial layer: relevance engine → relationship layer → ownership/collision → campaign shell → outreach eligibility gate. Each has a campaign shell in `outreach_campaign_drafts` (`edu-*-shell`) with `is_live=false`, `external_send_blocked=true`, no Smartlead campaign id and no founder approval. Reported through the `education_commercial_funnel` view. Per-business detail lives in `docs/business-manuals/**` (a separate canonical layer, not duplicated here).

## K3. Relationship Intelligence (wealth networks)

`relationship_intelligence_contacts` (428 rows) plus event history tables and the `billionaire_*` research stack (coverage, pathways, affiliations, wealth snapshots, network links, exclusions, enrichment queue). There are **no** dedicated retry/cooldown/withdrawn columns: resurfacing control is `relationship_status`, `outreach_status`, `park_reason`, `next_action_at`, `last_contact_at`. Every insert records a `research_added` / `daily_hnw_discovered` event. Outreach here is manual, principal-to-principal, founder-owned — never automated.

## K4. Commercial, finance and customer

- **Quote-to-cash:** proposals → deals → `qtc_*` → `invoices` → `payments` → `collections_*` → `reconciliation_*` → `fx_*`, with `generate_invoice_number`, `finance_mark_overdue_invoices`, `finance_target_vs_actual`.
- **Sales pace:** `src/lib/commercialPace.ts` and the revenue/target tables drive the sales-pace engine (`docs/liftor-sales-target-revenue-pace-engine.md`).
- **Customer success:** onboarding packs, quarterly reports, surveys, voice transcripts, win-back, complaints, disputes — all share the token-access RPC pattern (`get_customer_quarterly_report_by_token`) for public views, and share gates for anything outbound.
- **Support:** `support_*` with SLA computation (`compute_assignment_sla`, `at_risk_assignments`, `flag_idle_assignments`).

## K5. M&A / exit

`ma_*` (58 tables) covers buyers, warmth, data room, advisers, valuations, signals, recommendations and approvals (`ma_approval_queue_open`). Founder-led exit sales engine, buyer warm-up engine and market-domination engine are documented in `docs/founder-led-*.md`. Buyer outreach and warm-up actions are blocked at database-trigger level without recorded founder approval.

## K6. Social, PR and media

`social_*` (110 tables) spans content factory, campaign plans, calendar, distribution jobs, inbox, engagement, competitor/viral radars and the social relationship engine. Distribution submits through `_shared/socialDistribution*.ts`; provider event receiving is a hard-403 shell. PR runs through the Global PR Radar and a Gmail **draft-only** desk.

## K7. Giving rail (GHAT) — newest subsystem

The freeze commit adds the founder **SME sales-linked giving rail MVP** (`docs/ghat-sme-sales-linked-giving-rail-mvp.md`): SME partners pledge a share of sales to Global Health Access Trust, with pledge/ledger tables, founder surfaces and no automated outreach. GHAT is also a **sending estate** kept operationally and reputationally isolated from the shared commercial (GSM) estate — see Section N. `apps/giving-platform` is a separate standalone prototype (Section A6).

## K8. Compliance, legal and evidence

`compliance_*`, `legal_*`, `policy_*`, `privacy_*`, `consent_*`, `evidence_*`, `statutory_*`, plus the public legal document stack under `src/pages/legal/**` with acceptance audit logging. Compliance checks are Postgres functions called before commercially meaningful writes (`compliance_check_contact`, `compliance_check_outbound_communication`, `compliance_check_invoice`, …), so compliance cannot be bypassed by calling a different UI.

## K9. Healthcare overlay

`healthcare_*` (7 tables) is a **readiness overlay only — NOT LIVE / BLOCKED**. No clinical features, no patient data, no delivery path. Do not treat it as a product.
