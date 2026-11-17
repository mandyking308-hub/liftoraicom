# One founder dashboard ("Business Journey") and a slimmer menu

## What Liftor can actually do today (by step of your process)
| Step | Capability | State |
|---|---|---|
| 1. Add business | Business registry, setup tunnel, legacy filtering | Works |
| 2. Upload manual | Business manual upload per business | Works (Q&A from manual not built) |
| 3. Emails | Campaign drafts, footer/branding QA, version history | Works (Kindnesss 4-email draft ready) |
| 4. Social (optional) | Social post drafts and calendar | Drafts only; no connected accounts |
| 5. Calendar | Portfolio Send Calendar, no-overlap booking across 180 GSM mailboxes | Works (planning only) |
| 6. Mailboxes | Winnr sync, health/readiness (90+ rule) | Works |
| 7. Recipients | Apollo archive, candidate pool, suppression, eligibility | Works; 0 Kindnesss contacts cleared |
| 8. Send | Smartlead sync, safety gates | Built; all gates off |
| 9. Replies / inbox | Unified communications inbox, quarantine, privacy queue | Built; incoming collection not switched on |
| 10. Close | CRM, conversations, proposals, payments | Partly built; payments not connected |

## What we build
1. **One page: "Business Journey"** (becomes the first page you see). Pick a business at the top; it shows the 10 steps above as a vertical checklist. Each step shows: done / blocked / not started, the live numbers that matter, the one blocker in plain words, and a single "Open" button to the working page for that step.
2. **Slim menu**: only Business Journey, plus the ~8 working pages it links to (Business setup & manual, Marketing/emails, Send calendar & mailboxes, Recipients, Inbox, CRM, Schools, Settings).
3. **Everything else moves under one collapsed "Archive – older tools" entry.** Nothing is deleted; old pages still open if you need them.
4. Old duplicate overviews (Start Here, Command Centre x2, Overview, Daily Operator, Outreach Command Centre, Monday launch/readiness, Micro-batch) go into the archive since Business Journey replaces them.

## Not changing
No data is deleted, nothing is sent, no gates change, no provider changes.

## Technical details
- New `src/pages/founder/BusinessJourney.tsx` reading existing tables read-only (businesses, business_knowledge_uploads, outreach_campaign_drafts, social_post_drafts, portfolio_send_bookings, gsm_mailboxes, business_contact_relationships, external_action_gates, communications/inbox tables).
- Step status logic in a pure helper with unit tests.
- `FounderLayout.tsx` nav reduced to core group + "Archive" group; routes in `App.tsx` untouched.
