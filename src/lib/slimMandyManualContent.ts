// Slim Mandy Manual — short, portable summary Mandy can download/upload to ChatGPT or advisers.
// NOT the technical source of truth. Do NOT use to overwrite the User Manual or Full Technical Manual.
// v1.2 refresh (10 Sep 2026) — September reconciliation current-state summary. Kept deliberately slim.

export const SLIM_MANDY_MANUAL_VERSION = "1.5 — 10 September 2026 (CRM-Native Education Correction, Quality Gate)";

export const SLIM_MANDY_MANUAL_MARKDOWN = `# Slim Mandy Manual

_Version 1.5 — 10 September 2026_

_Portable summary. Safe to upload to ChatGPT or share with advisers. Not the full technical source of truth (that is the Full Technical Manual, Sections 100 and 101)._

## What Liftor is
Liftor is ONE internal AI operating system and control plane Mandy uses to run multiple businesses from one Command Centre. It reads, drafts, prepares, and waits for founder approval. It never sends, posts, charges or files anything without a yes.

## How the data is organised
- Each business has its own **isolated operating context** — campaigns, conversations, deals, delivery, support, finance activity, content. Context must not cross-contaminate.
- People, organisations and reusable data assets are **portfolio assets stored once and shared**, not duplicated per business.
- Business-specific commercial relevance, eligibility and activity live on the **business relationship**, not on the person.
- **Relationship Intelligence** is research/evidence; it reaches the CRM only through a controlled promotion bridge. It is not the operational CRM.
- A new **source-manifest / source-fidelity** layer records and validates the material behind each business's knowledge. It authorises no external action.
- Importing, deduping or promoting data **never** triggers outreach.

## Always label three states separately
Implemented in code · live-configured in the database/provider · historical evidence. A provider connection is never permission to send.

## Current state — 10 September 2026
- **CRM:** 81 contacts, 68 business relationships. Distinct from research pools.
- **Apollo:** free People Search, staging, qualification and selective founder-approved reveal all work. But several paths still carry Neon Candy-specific defaults, and caps were per run not per company. A **portfolio-wide Apollo Credit Firewall is now implemented**: every paid Apollo call must first take an atomic reservation against one shared budget. That budget is live but **disabled with a hard limit of 0**, and phone/personal-email/waterfall reveal are all false, so automatic paid enrichment stays OFF.
- **Smartlead:** provider **connected**, substantial code implemented — but **0 campaign mappings, 0 lead mappings, 0 provider events, 0 activation-checklist rows**. The closed loop is not activated. Smartlead is the delivery lane, not the education prospect-data source.
- **Sending estate:** 8 domains, 2 inboxes (1 active) — legacy Neon Candy infrastructure, not the planned education estate (~50 mailboxes, still to be built and warmed).
- **CRM-native education placement (correction):** education companies live once in the master company list (\`organisations\`); education people live once in the master CRM (\`contacts\`) linked to their company. The research/pipeline account view links back to the canonical company. Relationship Intelligence is research/evidence only, not the education CRM. Discovery writes non-sendable people with no email; a separate founder-selected reveal path exists but cannot run while the credit firewall is locked at 0.
- **Education 152 universe:** all 152 reviewed education groups are loaded once into the canonical CRM company list (\`organisations\`) and mirrored to the strategic planning layer, split 60 International operator / 54 Domestic reserve / 21 Network route / 17 Review needed. The company load spent zero Apollo credits and replayed no education people; no education research candidates have been restored yet.
- **Education universe:** the August recovery (2,520 rows / 266 organisations) is **historical evidence only**. The 10 September live check found **zero** \`school_education_contact\` rows in Relationship Intelligence. Restoring it is a deliberate later stage.

## Classification
LIFTOR_INTERNAL_OPERATING_SYSTEM_READY. External go-live remains LOCKED_BY_DESIGN.

## Safety rules (always true)
No emails sent. No DMs sent. No posts published or scheduled externally. No Apollo credit spend. No Smartlead POST or campaign starts. No Metricool / ManyChat / ad / payment mutations. No portal accounts or invites. No surveys or reports shared. No filings. Data Room closed, no external tokens. Buyer contact blocked unless explicitly founder-approved. auto_send and outbound cron stay off. Executing a prepared packet needs a separate, channel-specific founder confirmation phrase.

## What it can do now
Run the portfolio CRM and shared data estate. Onboard businesses internally through the Setup Tunnel, register and validate source manifests, build and materialise starter packs, activate internally, run daily and weekly loops, score external readiness, prepare micro-batch approval packets. Run intelligence radars — PR/media, social autopilot, social relationships, viral opportunity, distressed, funding, acquisition funding, wealth networks, exit and buyer warm-up. Run the finance, legal/entity, delivery, people, evidence and AI-governance stacks in review-first mode.

## How to use it
Always start at /founder/command-centre. Pick a business. Work Today's Actions. Review Approvals. Run safe internal agents. Glance at Revenue and Risk.

## Build discipline
GitHub \`main\` is the code source of truth. Work in discrete reviewed branches. Every architecture change ships its manual update in the same build unit.

## Where to find deeper detail
- **User Manual** — plain-English operator guide (/founder/user-manual); Section 111 is the September current state.
- **Full Technical Manual** — canonical architecture; Section 100 (August map) plus Section 101 (10 September delta, which controls on current state) (/founder/founder-manual).
- **Build Log** — historical decisions (/founder/build-log).
- **Manuals Hub** — layer hierarchy, versions and drafts (/founder/manuals-hub).

## What not to touch without a deliberate decision
Any external gate, auto_send, cron, Smartlead campaign start or lead push, Apollo paid enrichment, buyer contact approval, data-room sharing, portal invites, payments or filings.
`;

export const SLIM_MANDY_MANUAL_FILENAME = `liftor-slim-mandy-manual-v1.5-2026-09-10.md`;
