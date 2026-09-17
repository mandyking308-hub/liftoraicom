# Giving Rail

**Giving that moves.**  
Business giving. Charity control. Proof built in.

Giving Rail is the standalone giving-platform surface inside Liftor. It connects businesses, charities, projects and volunteers around one operating workflow: define the promise, complete the required controls, move the contribution through an approved route, and preserve evidence of what happened next.

## Current launch website

The application now contains a complete branded public website rather than a single prototype screen:

- responsive launch home page;
- How it works page;
- business direct-giving and sales-linked campaign journey;
- live campaign calculator and statement generator;
- downloadable campaign summary;
- charity onboarding and verification path;
- charity discovery surface;
- project discovery, following and funding model;
- volunteer role and supporter-profile journeys;
- pilot pricing and pilot-interest form;
- pilot workspace / dashboard;
- About page;
- Trust & Safety page;
- sign-in / role-selection surface ready for production auth wiring;
- draft Terms, Privacy, Cookies, Accessibility and Complaints pages;
- favicon, social card and installable web manifest;
- responsive design system and mobile layouts;
- static deep links using URL hashes;
- dedicated GitHub build quality gate.

## Run locally

```bash
cd apps/giving-platform
npm install
npm run dev
```

Production build:

```bash
npm run build
```

## Brand

See `BRAND.md` for the visual system, positioning, voice and name-clearance note.

## Production launch gates

See `LAUNCH_CHECKLIST.md` for the full remaining production stack. The most important distinction is:

- **the branded public website can be complete;**
- **secure authentication, charity verification and multi-charity payment processing still require production integrations and legal/compliance approval before they can honestly be called live.**

The current browser-local forms are pilot interaction surfaces, not a production database or authentication system.

## GHAT pilot relationship

Global Health Access Trust remains a distinct charity. Giving Rail links direct corporate gifts to GHAT's existing business-giving route and treats GHAT as the first practical beneficiary / pilot pathway. A future multi-charity marketplace should keep its operating entity, contracts, payment architecture and related-party arrangements separate and explicit.

GHAT business-giving route:

`https://globalhealthaccesstrust.com/support-the-trust#business-giving`

## Compliance architecture

UK sales-linked giving is the first country workflow. Other jurisdictions remain visibly pending until their own legal, tax, payment, charity eligibility, sanctions/financial-crime, privacy and record-retention rules are reviewed.

The interface deliberately separates:

1. a business draft;
2. charity acceptance / approval;
3. the required agreement and public statement;
4. campaign activity;
5. settlement / payment;
6. evidence and close-out.

A business cannot make its own draft legally approved simply by completing a form.

## Commercial model

The working product principle is transparent software, verification and business-service revenue rather than an automatic percentage deducted from every charitable gift. Pilot prices in the interface are commercial hypotheses and can be changed before launch.

## Competitive learning

Public market research reviewed Work for Good and Givey to understand customer demand, workflow categories and market gaps. Giving Rail does not copy competitor source code, branding, protected copy or contractual text.
