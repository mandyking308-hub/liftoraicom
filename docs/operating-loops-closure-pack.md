# Operating Loops Closure Pack

Converts existing registers into founder/admin-only closed-loop workflows.
All modules: owner → due → status → evidence → approval → audit → next action.

## Scope

| Module | Route | Tables |
| --- | --- | --- |
| Insurance claim loop | `/founder/insurance-claims` | `insurance_claims`, `insurance_claim_events` |
| Statutory filings & tax calendar | `/founder/statutory-filings` | `statutory_filings`, `statutory_filing_events` |
| Corporate secretarial | `/founder/corporate-secretarial` | `corporate_secretarial_records`, `corporate_secretarial_events` |
| International expansion runbook | `/founder/international-expansion` | `international_expansion_runs`, `international_expansion_events` |
| Investor data room hardening | `/founder/data-room` | `data_room_access_tokens`, `data_room_view_audit`, `data_room_share_requests` |
| Release workflow | `/founder/release-workflow` | `release_workflow_items`, `release_workflow_events` |
| Portfolio FX consolidation | `/founder/portfolio-fx` | `fx_rate_snapshots`, `portfolio_fx_warnings` |

## What is automated

- Status transitions are recorded with `actor`, payload and timestamp into the per-module `*_events` table.
- Founder approval is captured via `founder_approved_by` / `founder_approved_at` fields where applicable.
- Counts surface in Command Centre via `OperatingLoopsAttentionPanel`.

## What stays adviser-led / external

- Insurance broker / insurer correspondence and submissions
- Tax / corporate / regulatory filings to authorities
- Legal opinions on jurisdiction expansion
- Live investor data room link generation (records intent + approval only)
- Customer comms for releases (draft stored, never sent)
- Statutory accounts and tax calculations

## What requires founder approval

- `insurance_claims.founder_approval_status` before broker/insurer handoff
- `international_expansion_runs.founder_decision` before any go-live
- `data_room_access_tokens.approval_status` before access is treated as granted
- `data_room_share_requests.status`
- `release_workflow_items.release_status = 'approved'`

## Security

All tables: RLS enabled, founder/admin only via `is_founder_or_admin(auth.uid())`. No anon access. Service role retained for edge functions. `FounderRoute` gates all UI routes.

## Hard limits

No cron. No outbound email / SMS / webhook. No paid provider activation. No customer/investor/adviser/regulator notifications. No legal/tax/insurance/clinical/investment automation. No fake seed data.
