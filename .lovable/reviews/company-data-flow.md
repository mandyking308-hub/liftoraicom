# Add a company: does Liftor work as one system?

Checked 17 November 2026 using source tracing and read-only live records.

## Short answer

**One database, but not yet one seamless company-onboarding system.** The 14 Liftor HQ areas share canonical business IDs in many places, but adding a company does not automatically create, connect and maintain everything needed across those areas.

## What happens now

1. **Create new** inserts only the canonical `businesses` row and saves setup-tunnel progress. Module promotion is a separate click (`src/lib/businessSetupTunnel.ts:348-365`; `src/pages/founder/BusinessSetupTunnel.tsx:200-234`).
2. **Promote into modules** attempts separate draft inserts. It does not roll back partial failures and existing records are reused rather than updated (`src/lib/businessSetupTunnel.ts:597-641`).
3. **Onboarding factory**, **launch-plan apply** and **runtime activation** are different engines with different records. Navigation tabs did not merge them.

## Live Kindnesss evidence

Kindnesss (`640de582-a112-4d16-a221-03c27f00c6ec`) has:

- 1 activation profile: **33% ready, sandbox, go-live false**.
- 1 onboarding-factory run: **partial**, 8 missing context sections, no materialised items.
- 30 contact relationships, 3 marketing briefs, 15 social drafts, 1 campaign plan and 1 exit profile.
- 0 launch plans, 0 business knowledge profiles, 0 product-margin profiles, 0 outreach campaigns, 0 send bookings, 0 KPIs and 0 OKRs.
- CRM and buyer warm-up explicitly marked `manual_action_needed` in the setup-tunnel connection record.

## Section map

| Area | Shared now | Still separate or missing |
|---|---|---|
| Daily running | Draft operating runbook can be promoted | No automatic daily operating loop or reports |
| Radars & prospecting | Canonical business ID and contact relationships | CRM relationships are manual; a business row alone creates none |
| Sales | Draft outreach shell | Product catalogue and real offers are separate; no Smartlead campaign |
| Email outreach | Business appears in calendar pickers | Mailbox booking, campaign mapping, lead mapping and inbox tagging need separate setup |
| Social media | Existing drafts can carry business ID | Social accounts/settings and native drafts are not provisioned by the tunnel |
| Marketing | Draft campaign brief | No launch permission or automatic social-content flow |
| Customers | Customerless onboarding template | No real customer, support configuration or active onboarding |
| Money | Empty cash-flow forecast skeleton | Legacy finance and QTC reporting remain separate engines |
| Legal & tax | Legal name/status can be recorded | Legal entity creation, assignment and compliance evidence are separate |
| Portfolio & exit | Closed data-room profile | Buyer warm-up deliberately skipped; other exit setup separate |
| Setup & knowledge | Tunnel JSON and canonical business row | Business manuals are static registry entries; Brain knowledge has its own tables |
| People & suppliers | Business ID available | Suppliers and assignments are independent records |
| AI | Business can appear in selectors | Budgets, agents and runtime permissions are separately configured and off |
| Platform & security | Safe activation/runtime records | Providers and external actions stay off; no universal provisioning call |

## Highest-priority corrections

1. Make one canonical onboarding orchestration with explicit per-module status and idempotent upserts.
2. Ensure pasted factory knowledge is persisted into the actual Brain knowledge tables; it is currently counted but not ingested (`business-onboarding-factory-run` vs `business-onboarding-brain-run`).
3. Replace fallback-only starter-pack “materialised” claims with native module records or truthful fallback labels (`supabase/functions/starter-pack-materialise/index.ts:208,261-285`).
4. Synchronise existing downstream drafts on re-promotion instead of leaving stale first-pass data.
5. Reconcile activation/operating/runtime profiles, legacy finance/QTC reporting and approval stores before calling them interchangeable.
6. Remove generic-business defaults that are education-specific, such as the hard-coded school-licence onboarding template (`src/lib/businessSetupTunnel.ts:522-538`).

## Safety boundary

Unification should create and link **internal draft/setup records only**. It must not send email, publish social posts, create provider campaigns, allocate live sending, spend Apollo credits, activate AI execution or open any external-action gate.
