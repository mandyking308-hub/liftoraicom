// Slim Mandy Manual — short, portable summary Mandy can download/upload to ChatGPT or advisers.
// NOT the technical source of truth. Do NOT use to overwrite the User Manual or Full Technical Manual.
// v1.9 refresh (11 Sep 2026) — Smartlead activation closeout. Kept deliberately slim.

export const SLIM_MANDY_MANUAL_VERSION = "1.9 — 11 September 2026 (Smartlead activation closeout)";

export const SLIM_MANDY_MANUAL_MARKDOWN = `# Slim Mandy Manual

_Version 1.9 — 11 September 2026_

_Portable summary. Safe to upload to ChatGPT or share with advisers. Not the full technical source of truth (that is the Full Technical Manual)._

## What Liftor is
Liftor is ONE internal AI operating system and control plane Mandy uses to run multiple businesses from one Command Centre. It reads, drafts, prepares, and waits for founder approval. It never sends, posts, charges or files anything without a yes.

## How the data is organised
- Each business has its own **isolated operating context** — campaigns, conversations, deals, delivery, support, finance activity, content. Context must not cross-contaminate.
- People, organisations and reusable data assets are **portfolio assets stored once and shared**, not duplicated per business.
- Business-specific commercial relevance, eligibility and activity live on the **business relationship**, not on the person.
- **Relationship Intelligence** is research/evidence; it reaches the CRM only through a controlled promotion bridge. It is not the operational CRM.
- A source-manifest / source-fidelity layer records and validates the material behind each business's knowledge. It authorises no external action.
- Importing, deduping or promoting data **never** triggers outreach.

## Always label three states separately
Implemented in code · live-configured in the database/provider · historical evidence. A provider connection is never permission to send.

## Current state — 11 September 2026
- **CRM:** live contact and business-relationship counts are read from the CRM page (they grow as you work). Distinct from research pools.
- **Apollo:** free People Search, staging, qualification and selected reveal infrastructure exist, protected by the portfolio-wide Apollo Credit Firewall. Paid enrichment is **disabled with a hard limit of 0**, and phone/personal-email/waterfall reveal are false.
- **Smartlead / sending:** provider **connected**. The delivery spine is implemented: one campaign link per Liftor campaign, one lead link per person, a shared suppression gate, an idempotent reply/bounce/unsubscribe return loop, bulk mailbox registration, deterministic mailbox allocation and a zero-provider-mutation dry run. Live state: **0 campaign mappings, 0 lead mappings, 0 provider events, 0 GSM domains, 0 GSM mailboxes, webhook not configured.** The canonical 12-key activation checklist is seeded for each education business: 2 ready / 6 not ready / 4 blocked, with live_launch_approval blocked. A synthetic dry run returns structured **BLOCKED** and writes nothing.
- **Winnr / GSM:** the Winnr account/estate has been purchased and the server-side API token is configured/reachable, but the canonical GSM registry deliberately remains at **0 domains and 0 mailboxes** until the purchased provider estate is synced. No mailbox is campaign-ready merely because it exists at the provider. Warm-up is founder-confirmed and remains a separate gate.
- **Neon Candy:** its two legacy inboxes stay locked to Neon Candy and excluded from education/GSM allocation. \`hello@neoncandy.online\` may be observed in read-only Smartlead discovery but is never imported into the GSM estate.
- **CRM-native education placement:** education companies live once in \`organisations\`; education people live once in \`contacts\` linked to their company. Relationship Intelligence is evidence/research, not the education CRM.
- **Education 152 universe:** all 152 reviewed groups are loaded once into canonical organisations and mirrored to the planning layer: 60 International operator / 54 Domestic reserve / 21 Network route / 17 Review needed. The company load spent zero Apollo credits and replayed no education people.
- **Education commercial layer:** Billy and the Wild Forest, Aurelia, Kindnesss and Kingsbridge Global share one person spine, with business-specific relevance and collision rules. All four campaign shells remain non-live, externally blocked, unapproved and unmapped.

## Classification
LIFTOR_INTERNAL_OPERATING_SYSTEM_READY. External go-live remains LOCKED_BY_DESIGN.

## Safety rules (always true)
No live emails sent. No DMs sent. No posts published or scheduled externally. No Apollo credit spend. No Smartlead campaign start or live lead push. No payment or filing mutations. Data Room closed. Buyer contact blocked unless explicitly founder-approved. auto_send and outbound cron stay off. Executing a prepared packet needs a separate, channel-specific founder confirmation phrase.

## What it can do now
Run the portfolio CRM and shared data estate; prepare and review campaigns; manage the education commercial layer; register and inspect sender infrastructure; run read-only provider checks; calculate the 12-key Smartlead activation checklist; and run zero-mutation sending rehearsals that fail closed until prerequisites are real.

## How to use it
Always start at /founder/command-centre. Pick a business. Work Today's Actions. Review Approvals. Run safe internal agents. Glance at Revenue and Risk.

## Build discipline
GitHub \`main\` is the code source of truth. Every material architecture change ships its manual update in the same build unit.

## Where to find deeper detail
- **User Manual** — plain-English operator guide (/founder/user-manual).
- **Full Technical Manual** — canonical architecture (/founder/founder-manual).
- **Build Log** — historical decisions (/founder/build-log).
- **Manuals Hub** — layer hierarchy, versions and drafts (/founder/manuals-hub).

## Sending estate (GSM Outbound)
One shared GSM-owned sending estate, not one per business: target ~50 mailboxes across up to 10 GSM-controlled domains, with Launch 30 and Evergreen 20. A mailbox in a live conversation keeps that sender. Nothing is usable until the domain is verified, SMTP and IMAP are healthy, Smartlead is connected, warm-up is finished, health is acceptable and a safe daily limit is set. The purchased Winnr estate must first be synced into the canonical registry; current registered GSM count is still zero. Page: /founder/gsm-outbound.

## Smartlead activation checklist
Exactly 12 controls: provider connection; webhook; campaign mapping; lead mapping; event return; sending domains; mailbox estate; warm-up; sender caps; suppression sync; first end-to-end dry run; founder live-launch approval. Today only provider connection and suppression sync are ready. Everything else remains honestly blocked/not-ready until the physical sender estate, webhook, mappings and founder approval exist.

## What not to touch without a deliberate decision
Any external gate, auto_send, cron, Smartlead campaign start or lead push, Apollo paid enrichment, buyer contact approval, data-room sharing, portal invites, payments or filings.
`;

export const SLIM_MANDY_MANUAL_FILENAME = `liftor-slim-mandy-manual-v1.9-2026-09-11.md`;
