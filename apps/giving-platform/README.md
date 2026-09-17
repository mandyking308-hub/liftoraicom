# Giving Rail — standalone global giving platform prototype

Working product name only. Built 17 September 2026 in GitHub first to avoid unnecessary Lovable generation credits.

## Problem

Ordinary corporate donations are straightforward. The friction appears when a business publicly links a purchase to a charitable contribution. In the UK that can make the business a commercial participator and requires a written arrangement, a clear public statement, record keeping and charity oversight before the promotion begins.

The product thesis is to make that workflow simple enough for small businesses while giving charities control, evidence and low-cost stewardship.

## Competitive learning (public-source review, 17 Sep 2026)

Work for Good publicly demonstrates that there is demand for digital Commercial Participation Agreement workflows. Its published model includes charity onboarding, business pledge/campaign creation, generated participation statements, Stripe-connected charity payouts and charity-side fees. Givey demonstrates demand for charity/fundraiser discovery, project pages, donor profiles, Gift Aid and fundraising/community functionality.

We use those public facts as market research only. This codebase does not copy either company's branding, proprietary copy, source code or contractual text.

Public references reviewed:
- https://workforgood.co.uk/how-we-help-businesses/
- https://workforgood.co.uk/how-we-help-charities/
- https://workforgood.co.uk/commercial-participation-agreement/
- https://workforgood.co.uk/our-fees/
- https://workforgood.co.uk/terms-and-conditions/for-businesses/
- https://workforgood.co.uk/terms-and-conditions/for-charities/
- https://www.givey.com/
- https://support.givey.com/

## What is built now

A standalone Vite/React product prototype with:

- charity discovery and clearly labelled pilot listings;
- self-service charity onboarding record;
- business sales-linked giving campaign builder;
- fixed £ per sale, % of eligible sales and fixed campaign models;
- campaign value calculator;
- generated public campaign statement;
- UK agreement-readiness checklist;
- direct corporate gift route into GHAT;
- project discovery and project following;
- volunteer opportunity and volunteer-interest records;
- provisional charity/business membership tiers;
- a local prototype dashboard;
- browser-local persistence for the pilot workflows.

Run locally:

```bash
cd apps/giving-platform
npm install
npm run dev
```

## Product architecture

### Layer 1 — Marketplace
Charity profiles, project profiles, discovery, search, verification state and supporter-facing content.

### Layer 2 — Business giving
Direct corporate donations plus sales-linked campaigns. The sales-linked flow captures business, recipient charity, formula, eligible product/service, dates, estimated amount, public statement and jurisdiction.

### Layer 3 — Compliance packs
UK pack first. Other jurisdictions remain blocked from being represented as compliant until a local legal pack is reviewed and activated.

### Layer 4 — Payments
Production should use regulated payment infrastructure and connected recipient accounts. The platform should avoid casually becoming custodian of charitable funds. The multi-charity payment rail is not activated in this prototype.

GHAT already has its own Stripe donation architecture and can therefore act as the first real beneficiary/payment pathway independently of the multi-charity rail.

### Layer 5 — Stewardship
Campaign evidence, reconciliation, project reporting, volunteer management, donor/business history and impact reporting.

## Commercial thesis

The working differentiated model is to make charity listings free or low-cost and generate revenue through transparent software/verification/business subscriptions rather than automatically retaining a percentage of charitable gifts.

Pilot prices shown in the UI are hypotheses, not final commercial commitments.

## Production gates

Before external launch:

1. UK charity/fundraising lawyer approves the business-charity agreement framework, participation statement rules, platform terms, complaints route and record-keeping workflow.
2. FCA/payment counsel confirms payment architecture and custody boundaries.
3. Stripe Connect or an equivalent regulated marketplace payment architecture is configured and tested.
4. Charity registration, authority, bank/KYC, sanctions and risk verification are implemented.
5. Data protection impact assessment and retention rules are approved.
6. Real charity/project listings replace demonstration records.
7. Country packs are separately approved before international sales-linked campaigns are enabled.

## GHAT relationship

Global Health Access Trust remains a distinct charity and should not be confused with the commercial platform. GHAT can be a verified beneficiary and pilot user. Liftor can provide the technology/operations layer. Legal ownership and any related-party arrangements should be documented before commercial launch.
