// Slim Mandy Manual — short, portable summary Mandy can download/upload to ChatGPT or advisers.
// NOT the technical source of truth. Do NOT use to overwrite the User Manual or Full Technical Manual.
// v1.11 refresh (17 Sep 2026) — estate reconciled (39 domains / 200 mailboxes warming); pilot-first before any estate-wide use.

export const SLIM_MANDY_MANUAL_VERSION = "1.11 — 17 September 2026 (outbound readiness baseline)";

export const SLIM_MANDY_MANUAL_MARKDOWN = `# Slim Mandy Manual

_Version 1.11 — 17 September 2026_

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

## Current state — 17 September 2026
- **CRM:** live contact and business-relationship counts are read from the CRM page (they grow as you work). Distinct from research pools.
- **Apollo:** free People Search, staging, qualification and selected reveal infrastructure exist, protected by the portfolio-wide Apollo Credit Firewall. Paid enrichment is **disabled with a hard limit of 0**, and phone/personal-email/waterfall reveal are false.
- **Smartlead / sending:** provider **connected and healthy**, but the webhook is **not configured** and provider warm-up state is **not configured** on the provider row. Live state is still **0 campaign links, 0 lead links, 0 returned events, 0 campaign-ready mailboxes**. Only the 10 trust (GHAT) mailboxes are connected to Smartlead; **0** shared-estate (GSM) mailboxes are connected. Live campaign sending remains blocked.
- **Winnr / GSM:** the estate is now reconciled into Liftor from the provider: **39 sending domains** (all DNS, SPF, DKIM and DMARC verified) and **200 mailboxes**, all active and all warming — **180 GSM mailboxes across 36 domains** and **20 trust (GHAT) mailboxes across 3 domains**. Warm-up and registration prove the infrastructure exists; they do **not** make any mailbox campaign-ready, and none is.
- **Inventory is not permission:** 200 warming mailboxes is inventory, not authorisation to use 200. Outbound gets proved by one tiny controlled pilot first — one business, a handful of recipients (the existing cap is **≤5** for cold Smartlead outreach), one or two selected senders, every other mailbox kept out of allocation. The pilot must run all the way through: approved audience/offer/copy → data import → CRM person + business link → suppression checks → selected sender → campaign and lead link → actual delivery → replies/bounces/unsubscribes coming back → CRM updated → audit trail, stopping dead at any broken step. **No pilot has been sent or passed yet.** Your final live-launch approval stays a separate yes, and estate-wide use a further yes after that.
- **Apollo:** the infrastructure exists, but the only active verified connection today is Neon Candy. Apollo is not yet set up business-by-business for the wider portfolio.
- **Portfolio size:** there are **14** businesses in the system today; more are meant to be onboarded through the Business Setup Tunnel / Business Onboarding Factory. Liftor should never claim 40 are already configured.
- **GSM control panel:** /founder/gsm-outbound now supports Winnr test/preview/apply sync, guarded Winnr warm-up, Smartlead preview/apply reconciliation, webhook status, pool preview/fill and readiness reporting. Registry writes require explicit founder confirmation; none of these controls sends a campaign email.
- **Neon Candy:** its two legacy inboxes stay locked to Neon Candy and excluded from education/GSM allocation. \`hello@neoncandy.online\` may be observed in read-only Smartlead discovery but is never imported into the GSM estate.
- **CRM-native education placement:** education companies live once in \`organisations\`; education people live once in \`contacts\` linked to their company. Relationship Intelligence is evidence/research, not the education CRM.
- **Education 152 universe:** all 152 reviewed groups are loaded once into canonical organisations and mirrored to the planning layer: 60 International operator / 54 Domestic reserve / 21 Network route / 17 Review needed. The company load spent zero Apollo credits and replayed no education people.
- **Education commercial layer:** Billy and the Wild Forest, Aurelia, Kindnesss and Kingsbridge Global share one person spine, with business-specific relevance and collision rules. All four campaign shells remain non-live, externally blocked, unapproved and unmapped.

## Classification
LIFTOR_INTERNAL_OPERATING_SYSTEM_READY. External go-live remains LOCKED_BY_DESIGN.

## Safety rules (always true)
No live emails sent. No DMs sent. No posts published or scheduled externally. No Apollo credit spend. No Smartlead campaign start or live lead push. No payment or filing mutations. Data Room closed. Buyer contact blocked unless explicitly founder-approved. auto_send and outbound cron stay off. Executing a prepared packet needs a separate, channel-specific founder confirmation phrase.

## What it can do now
Run the portfolio CRM and shared data estate; prepare and review campaigns; manage the education commercial layer; register and inspect sender infrastructure; run read-only provider checks; reconcile the purchased Winnr/Smartlead sender estate; start founder-confirmed warm-up; fill GSM pools only with campaign-ready senders; and run zero-mutation sending rehearsals that fail closed until prerequisites are real.

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
One shared GSM-owned sending estate, not one per business, plus a separate trust (GHAT) estate that never mixes with it. The estate **is** synced into the canonical registry: 39 domains and 200 mailboxes (GSM 180 / GHAT 20), all warming — see "Current state" above for the single authoritative figures. Allocation still works in lanes (Launch target 30, Evergreen target 20, Quarantine); those are allocation targets for a pilot-sized launch, **not** the size of the estate. A mailbox in a live conversation keeps that sender. Nothing is usable until the domain is verified, SMTP and IMAP are healthy, Smartlead is connected, warm-up is healthy, health score is at least 70 and a safe daily limit is set — today **0** mailboxes meet that bar. Page: /founder/gsm-outbound.

## Smartlead activation checklist
Provider connection is live, but webhook/event return, campaign mapping, lead mapping, physical sending domains/mailboxes, warm-up, sender caps, the final end-to-end evidence and founder live-launch approval remain separate truthful gates. Nothing is marked campaign-ready from an assumption.

## What not to touch without a deliberate decision
Any external gate, auto_send, cron, Smartlead campaign start or lead push, Apollo paid enrichment, buyer contact approval, data-room sharing, portal invites, payments or filings.
`;

export const SLIM_MANDY_MANUAL_FILENAME = `liftor-slim-mandy-manual-v1.10-2026-09-11.md`;
