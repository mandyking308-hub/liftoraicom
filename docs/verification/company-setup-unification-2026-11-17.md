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

## Kindnesss founder-requested live internal sync — 17 November 2026

The founder explicitly asked to synchronise the saved Kindnesss setup across all 14 sections. The action was run through the signed-in founder UI against active Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec` only.

- First pass: 19 native records created and 6 existing records refreshed. Legal & tax failed closed because four non-null sensitive-data flags were supplied as null. No compliance row was created by that failed attempt.
- Correction: the setup payload now omits those four optional flags so the native schema applies its false defaults pending founder review; it does not infer sensitive-data handling. The focused sync and UI suites passed 12 tests.
- Idempotent retry: Legal & tax created its compliance profile; the other 25 native records were refreshed without duplicates. The UI reported `Company synchronised: 14 sections connected. Nothing sent or activated.`
- Final unique outcome across both passes: **20 created, 6 existing records linked/refreshed, 0 blocked sections, 26 native records connected**.
- Factory run `42524c68-1f89-42d6-a6fb-194e4b2030c0`: draft, internal ready true, external ready false, provider off, 26 materialised items, zero blocked items, zero missing setup sections.
- Read-back confirmed go-live false; runtime activation, outbound, queue, AI orchestration and AI execution false; the new setup email draft is non-live, send-blocked and has no provider campaign; marketing launch remains false. The factory audit records zero emails, provider calls, Apollo credits, publishing and payments.

| Section | Created | Existing linked/refreshed | Final state |
|---|---:|---:|---|
| Daily running | 1 daily runbook | — | Connected; no cron or automatic execution |
| Radars & prospecting | 1 business context profile | — | Connected; no contacts or eligibility invented |
| Sales | 1 sales-target record | — | Connected; founder approval required |
| Email outreach | 1 separate setup-only five-touch draft | — | Connected; non-live, send-blocked, no provider campaign |
| Social media | 1 optional planning draft | — | Connected; publishing and external scheduling off |
| Marketing | — | 1 campaign brief | Connected; launch blocked |
| Customers | 1 generic onboarding template | — | Connected; no customer, invite or external sharing |
| Money | — | 1 draft cash-flow forecast | Connected; no financial actuals invented |
| Legal & tax | 1 founder-review compliance profile | — | Connected after correcting the null-field failure |
| Portfolio & exit | — | 1 closed data-room profile and 1 exit profile | Connected; buyer outreach and data-room opening off |
| Setup & knowledge | 1 knowledge profile and 9 knowledge assets | — | Connected; shared with internal Brain context |
| People & suppliers | 1 operating profile | — | Connected; no people, suppliers or assignments invented |
| AI | 1 AI execution setting | — | Connected; execution off |
| Platform & security | 1 factory sync run | Activation profile and isolated runtime | Connected; existing safety states preserved |
