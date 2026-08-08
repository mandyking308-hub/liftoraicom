# Elyntor → Liftor Handoff

## Purpose

Elyntor owns specialist real-assets origination, screening, underwriting, diligence, transaction decisions and portfolio management. Liftor remains the shared operating platform for multiple GSM businesses and must not become a duplicate Elyntor investment system.

Liftor receives only small, explicitly approved relationship tasks from Elyntor.

## What stays in Elyntor

- Global deal radar and source monitoring
- Opportunity database and source evidence
- Investment screening and fit scoring
- Underwriting and financial analysis
- Due-diligence records and investment decisions
- Regulatory-pathway status
- Transaction structuring records
- Private pipeline and public-pipeline publication decisions
- Completed investment / portfolio records

Liftor must not ingest Elyntor's full radar or use the supplier pipeline as a substitute for Elyntor deal records.

## Handoff 1: DEAL_APPROACH_REQUEST

Used only after Elyntor has screened an opportunity and approved it for an approach.

Minimum payload:

- `source_system = ELYNTOR`
- `deal_id`
- `deal_code`
- sponsor/company
- target role/person where known
- known contact route
- reason for contact
- specific request
- priority
- approved wording summary
- desired outcome
- source URL
- regulatory pathway
- `founder_approval_required = true`

Liftor may then use its existing contact-enrichment, CRM, relationship-intelligence and outreach workflow to identify the right person, prepare/queue the contact and return relationship status.

Expected return statuses include contact found, queued, sent, opened, replied, meeting requested, NDA requested/received and next action. The external-send gate remains under the existing founder approval controls.

## Handoff 2: CAPITAL_PARTNER_SEARCH_REQUEST

Used only when an Elyntor transaction is sufficiently serious and its capital-communication regulatory pathway has been cleared. A request with `regulatory_pathway = not_cleared` must be rejected.

Minimum payload:

- `source_system = ELYNTOR`
- `deal_id`
- `deal_code`
- capital requirement
- Elyntor participation concept
- partner capital sought where known
- sector and geography
- transaction/JV structure
- preferred partner profile
- materials status
- cleared regulatory pathway
- `founder_approval_required = true`

Liftor's role is relationship discovery and managed outreach. It does not make the investment decision, underwrite the deal, hold investor money or decide the legal structure.

## Non-goals

This integration does **not** create a new Liftor command centre, duplicate the Elyntor database, convert project sponsors into ordinary suppliers, automate securities promotion, send material capital outreach without approval, or make Liftor responsible for investment management.

## Code contract

The TypeScript payload contract and validation helper live in `src/lib/elyntorHandoff.ts`.
