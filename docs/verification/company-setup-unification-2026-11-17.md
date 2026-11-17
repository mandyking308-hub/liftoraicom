# Unified company setup — verification, 17 November 2026

## Built

`Add a business` now offers one founder-only action that creates the canonical company when necessary and synchronises all 14 Liftor HQ sections. It uses stable business-scoped keys, refreshes setup-owned drafts on rerun, and reports created, updated, reused, optional and failed records per section.

| Liftor section | Native shared records |
|---|---|
| Daily running | Business operating runbook |
| Radars & prospecting | Business context profile; no contacts invented |
| Sales | Business sales target and pace inputs |
| Email outreach | Outreach campaign draft, capped at five supplied email drafts |
| Social media | Optional social post draft only when content is supplied |
| Marketing | Marketing campaign brief |
| Customers | Generic customer onboarding template; no customer or portal invite |
| Money | Draft cash-flow forecast with no invented financial figures |
| Legal & tax | Founder-review compliance profile |
| Portfolio & exit | Closed data-room profile and exit-readiness profile |
| Setup & knowledge | Shared knowledge profile plus Brain-readable knowledge assets |
| People & suppliers | Business operating profile; no suppliers or assignments invented |
| AI | Explicit business AI execution setting, off |
| Platform & security | Activation profile, factory sync run and isolated runtime |

The factory summary is finalised from actual native-record outcomes, not input counts or fallback placeholders. Previous setup-run records are adopted when a draft becomes a company, avoiding duplicate setup runs. Legacy connection labels are mapped to the new sections; the old sales/outreach record appears under Email outreach rather than Sales.

## Safety boundary

- No provider, Smartlead, Apollo, payment, publishing, mailbox-booking or send function is called.
- New email drafts have sending blocked and no provider campaign. New social drafts cannot publish or schedule externally.
- New runtime records have outbound, queue and AI orchestration off. New activation profiles are sandbox-only and go-live false.
- Existing live, externally shared, approved, provider and runtime switches are preserved. Existing metadata is merged rather than replaced.
- A section failure is shown explicitly and does not hide successful sections. The operation is safe to retry; it is not a cross-section database transaction and does not roll back earlier successful writes.

## Verification

- 27 focused tests passed across unified native-record sync, idempotent updates, safety defaults, live-state preservation, optional social, five-email cap, legacy mapping, draft-run adoption, one-click UI, founder navigation and manual registry.
- Automatic preview build: `build OK`.
- Signed-in founder preview opened Kindnesss at `/founder/business-setup-tunnel`: the sync action was enabled, all 14 status cards and all 14 registered section links were present, and the panel was visually inspected.
- The synchronise button was **not** pressed against Kindnesss or any other real company. No real company was created or changed by this verification.
- Manual raw-import requests emitted transient 500 responses during hot reload; direct reads then returned 200 and all five manual-registry tests passed. These were not company-sync requests.

## Remaining handoffs

Unification creates the shared internal records. It does not make a company ready to send or launch: recipient clearance, provider mappings, sender booking, customer/partner details, approvals and external gates remain separate founder-controlled work.
