# Manual Architecture Reconciliation — 25 August 2026

**Change type:** documentation architecture sync (no application behaviour change)
**Layers updated:** Full Technical Manual (v6.0), User Manual (v1.6), Slim Mandy Manual (v1.1), manual module index
**Layers unchanged:** Command Centre Truth Sync (live-state authority), Build Log history, Business Manuals

## Why

The manuals still described the May 2026 snapshot. The repository on main has moved
substantially since then: the August 2026 Portfolio CRM architecture, the Master Data Asset
Register, the intelligence radars (PR, social viral, distressed, funding, acquisition
funding, wealth networks), the exit/buyer engines, import/identity/search infrastructure and
large parts of the legal, evidence and AI-governance stacks were implemented but not
documented.

## Audit performed

- `src/App.tsx` — 799 founder routes enumerated and grouped
- `src/pages/founder/**` — ~110 module directories plus top-level pages
- `src/lib/**` — engine and registry modules (`dataAssetRegistry`, `portfolioCrmModel`,
  `portfolioCrmQueries`, `portfolioCrmPoolResolver`, operating-loop engines, etc.)
- `supabase/functions/**` — 604 edge functions
- `docs/**` — portfolio CRM architecture and schema notes, operating-loops closure,
  social distribution, PR radar, billionaire intelligence, Apollo education recovery
- Manual surfaces: `founderManualContent.ts`, `liftorUserManualContent.ts`,
  `slimMandyManualContent.ts`, ManualsHub, ManualsHierarchyPanel, User Manual page

## Newly documented architecture areas

Portfolio CRM (person truth / business relationship truth / research truth / client-tenant
layer separation), Master Data Asset Register and reusable buyer pools, the Education
portfolio data asset with live counts, Relationship Intelligence and the controlled
promotion bridge, Import/Migration Centre, Identity Resolution, Data Quality, Global
Search/Knowledge Index, Portfolio Memory, Global PR Radar and press/owned-media flows,
Social Autopilot, Social Relationship Engine, Social Viral Opportunity Radar, Distressed
Radar, Funding Radar, Acquisition Funding, Billionaire/wealth-network intelligence,
Founder-Led Exit Sales Engine, Buyer & Market Domination / warm-up engine, Portfolio Exit
Targets and Exit Metrics, business lifecycle chain (Setup Tunnel → Onboarding Factory →
Starter Pack Materialiser → Internal Activation → Daily/Weekly loops → External Readiness →
Micro-Batch), wind-down, quote-to-cash and sales pace, customer success/support/complaints,
marketplace and e-commerce, finance/reconciliation/collections/FX, the legal-entity-filings
stack, insurance and IP, delivery/supplier/vendor/capacity, people/access/secrets/SLA,
document vault/data room/adviser pack, audit/privacy/compliance/trust-safety/context and
cross-contamination guards, SOP and knowledge governance, backup/recovery/deployment/
platform monitoring/scheduled jobs/webhooks/connectors/integration map, AI cost governor,
evals, agent capability registry and AI compliance, portals and partners.

## Explicitly marked parked / superseded (not deleted)

- Healthcare Overlay — readiness overlay only; NOT LIVE / BLOCKED; no clinical features.
- Social viral provider adapter (Tubular) — safe-off shell.
- IONOS-as-cold-outreach wording in pre-May sections — superseded by the two-lane model.
- `contacts.assigned_business` single-business model — superseded by
  `business_contact_relationships`.
- NeonCandy execution lane — parked by founder decision, retained intact.

## Unresolved documentation/code discrepancies

1. `crm_accounts` is described as planned in `portfolioCrmModel.ts` and is not yet a table;
   prospect organisation context currently lives on the contact plus pool membership.
2. Route count exceeds documented module count because many routes are sub-tabs; the index
   documents modules rather than every tab.
3. Some historical acceptance functions still mention `OPENAI_API_KEY` cosmetically; the
   runtime path is gateway-controlled.

## Non-destructive confirmation

No routes, tables, components, data or safety gates were removed. No external action was
enabled. No application behaviour was changed. Manual history remains in place; the new
canonical current-state map is added as Section 100 rather than replacing earlier sections.
