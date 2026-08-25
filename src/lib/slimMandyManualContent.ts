// Slim Mandy Manual — short, portable summary Mandy can download/upload to ChatGPT or advisers.
// NOT the technical source of truth. Do NOT use to overwrite the User Manual or Full Technical Manual.
// v1.1 refresh (25 Aug 2026) — current-state architecture summary only. Kept deliberately slim.

export const SLIM_MANDY_MANUAL_VERSION = "1.1 — 25 August 2026 (Architecture Reconciliation)";

export const SLIM_MANDY_MANUAL_MARKDOWN = `# Slim Mandy Manual

_Version 1.1 — 25 August 2026_

_Portable summary. Safe to upload to ChatGPT or share with advisers. Not the full technical source of truth (that is the Full Technical Manual, Section 100)._

## What Liftor is
Liftor is ONE internal AI operating system and control plane Mandy uses to run multiple businesses from one Command Centre. It reads, drafts, prepares, and waits for founder approval. It never sends, posts, charges or files anything without a yes.

## How the data is organised (current, August 2026)
- Each business has its own **isolated operating context** — campaigns, conversations, deals, delivery, support, finance activity, content. Context must not cross-contaminate.
- People, organisations and reusable data assets are **portfolio assets stored once and shared**, not duplicated per business.
- Business-specific commercial relevance, eligibility and activity live on the **business relationship**, not on the person.
- **Relationship Intelligence** is research/evidence; it reaches the CRM only through a controlled promotion bridge.
- Importing, deduping or promoting data **never** triggers outreach.

## Current classification
LIFTOR_INTERNAL_OPERATING_SYSTEM_READY. External go-live remains LOCKED_BY_DESIGN.

## Safety rules (always true)
No emails sent. No DMs sent. No posts published or scheduled externally. No Apollo credit spend. No Smartlead POST or campaign starts. No Metricool / ManyChat / ad / payment mutations. No portal accounts or invites. No surveys or reports shared. No filings. Data Room closed, no external tokens. Buyer contact blocked unless explicitly founder-approved. auto_send and outbound cron stay off. Executing a prepared packet needs a separate, channel-specific founder confirmation phrase.

## What it can do now
Run the portfolio CRM and shared data estate (including the recovered Global Education asset: 2,519 contacts / 266 organisations). Onboard businesses internally through the Setup Tunnel, build and materialise starter packs, activate internally, run daily and weekly loops, score external readiness, prepare micro-batch approval packets. Run intelligence radars — PR/media, social autopilot, social relationships, viral opportunity, distressed, funding, acquisition funding, wealth networks, exit and buyer warm-up. Run the finance, legal/entity, delivery, people, evidence and AI-governance stacks in review-first mode.

## How to use it
Always start at /founder/command-centre. Pick a business. Work Today's Actions. Review Approvals. Run safe internal agents. Glance at Revenue and Risk.

## Where to find deeper detail
- **User Manual** — plain-English operator guide (/founder/user-manual).
- **Full Technical Manual** — canonical architecture; Section 100 is the current August 2026 map (/founder/founder-manual).
- **Build Log** — historical decisions (/founder/build-log).
- **Manuals Hub** — layer hierarchy, versions and drafts (/founder/manuals-hub).

## What not to touch without a deliberate decision
Any external gate, auto_send, cron, Smartlead campaign start, Apollo credit spend, buyer contact approval, data-room sharing, portal invites, payments or filings.
`;

export const SLIM_MANDY_MANUAL_FILENAME = `liftor-slim-mandy-manual-v1.1-2026-08-25.md`;
