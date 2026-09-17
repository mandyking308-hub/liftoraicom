# GHAT / Liftor SME Sales-Linked Giving Rail — MVP

Date: 17 September 2026
Branch: `feature/ghat-sme-giving-rail`

## Gap identified

Small businesses can donate directly to charities, but sales-linked promotions create disproportionate legal and administrative friction because the business and charity need a compliant commercial participation arrangement, a clear donation formula and suitable public wording before the promotion goes live.

## Product hypothesis

Liftor can remove that friction without becoming a donation custodian.

The first useful product is therefore not a fundraising marketplace and not a payment processor. It is a compliance workflow that turns a business giving promise into:

1. verified business + charity facts;
2. an objectively calculable donation rule;
3. campaign dates and eligible-sale scope;
4. a generated public campaign statement;
5. a CPA readiness checklist;
6. a structured agreement handoff pack;
7. later, an adviser-approved standard agreement and e-signature workflow;
8. later, evidence + reconciliation against actual sales and direct charity payment.

## MVP implemented

Founder-only prototype is surfaced inside:

`/founder/business-compliance`

Component:

`src/components/founder/compliance/SMEGivingRailMVP.tsx`

The MVP includes:

- SME/company details;
- charity details;
- four giving bases: fixed amount per sale, percentage of sale price, percentage of eligible revenue, fixed campaign amount;
- campaign dates and eligible product/service scope;
- donation calculator;
- generated public statement;
- CPA readiness checks;
- agreement handoff summary;
- local browser draft persistence.

## Deliberate safety boundary

The MVP does **not**:

- move or hold charitable money;
- create or sign a legal agreement;
- publish a campaign externally;
- contact a charity or SME;
- connect to Stripe or another payment provider;
- create production database tables;
- claim that the generated statement is legally sufficient.

This keeps the prototype cheap, reversible and founder-only while the commercial and legal thesis is tested.

## Commercial hypothesis to test before deeper build

Do not build payment or marketplace infrastructure until evidence supports all three:

1. SMEs experience enough CPA/admin friction to pay for simplification or choose a platform because of it.
2. Charities want a standardised way to accept many small sales-linked partnerships.
3. The unit economics work without taking a material percentage of money intended for the charity.

A likely differentiated model to test is charging businesses for software/compliance rather than charging charities a percentage of donations.

## Next build only after validation

If the hypothesis validates:

- charity onboarding / authorised signatory;
- company verification;
- adviser-approved CPA templates;
- e-signature;
- Shopify / WooCommerce / Stripe sales evidence connectors;
- payment instruction / reconciliation without Liftor custody;
- immutable audit trail;
- charity reporting dashboard;
- campaign expiry / renewal controls;
- jurisdiction handling for England & Wales, Scotland and Northern Ireland.

## Legal review gate

Before any external pilot, a UK charity/fundraising lawyer should review the standard commercial participation agreement, public solicitation wording, charity approval workflow, record-keeping obligations, territorial differences and the final payment architecture.
