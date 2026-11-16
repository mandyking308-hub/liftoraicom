# Kindnesss launch readiness in Liftor — 16 Nov 2026 (read-only audit)

Scope: active Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec` only. Legacy `993b9b12-ada2-42e0-97c7-0eda1f591889` = `legacy_prelaunch`, left untouched (no merge, no third record).
Method: read-only SQL on 16 Nov 2026 ~20:30 UTC. **No database writes, sends, posts, provider/DNS/gate changes.**

**Tracker note:** Mandy's 101-action tracker is not in this project. The L-01..L-18 items below are defined from live evidence and need mapping to the tracker's own IDs by the owner.

## Live evidence
| Area | Live value | Status |
|---|---|---|
| Business records | 1 active, 1 legacy | LIVE VERIFIED |
| Approved claims (`approved_claims`) | 0 | GAP |
| Kindnesss offers (`customer_sales_offers`) | 0. Portfolio total 9, checkout enabled 0 | GAP. The brief's "51 offers" does not match this table; unreconciled |
| `global_offers` (Kindnesss) | 0 | GAP |
| Social post drafts | 13 draft, publish_allowed=false, scheduled_externally=false | LIVE VERIFIED (brief said 12) |
| Outreach drafts | 1 draft, 1 inactive, 3 archived, none live | LIVE VERIFIED |
| Launch profile / knowledge profile / knowledge sources / social brain | 0 / 0 / 0 / 0 | GAP |
| Social accounts | 0 | BLOCKED EXTERNAL |
| Launch checklist items | 0 | GAP |
| Contact relationships | 30, campaign_eligible 0 | LIVE VERIFIED |
| External action gates | 19, enabled 0 | LIVE VERIFIED |
| Privacy requests | 0. KND-003 receiver BUILT/SOURCE TESTED, not deployed | BUILT only |
| Payment (Dodo) | certification unverified | NOT CLAIMED |

## Why no content packs or claims were written
Any content pack must be grounded in approved claims and live offers. Both are zero, so writing claims or offers now would invent public statements. The 13 existing drafts stay as review-only drafts.

## L-01..L-18
| ID | Action | State | Owner action |
|---|---|---|---|
| L-01 | Single active business confirmed | DONE (verified) | — |
| L-02 | Approve the list of public claims, live sectors only, no minors targeted | BLOCKED | Owner supplies or approves claims with sources |
| L-03 | Kindnesss offers and prices | BLOCKED | Owner confirms live plans and prices |
| L-04 | Dodo payment certification | BLOCKED EXTERNAL | Owner completes a Dodo test or certification |
| L-05 | Reconcile "51 offers" against the 9 in the database | OPEN | Owner names the source of 51 |
| L-06 | Review the 13 social drafts against approved claims | WAITS L-02 | Owner review |
| L-07 | Operating knowledge profile | BLOCKED | Owner approves profile content |
| L-08 | Source links (website, legal pages) | BLOCKED | Owner confirms canonical URLs |
| L-09 | Social profiles connected | BLOCKED EXTERNAL | Owner creates and connects accounts (e.g. Buffer) |
| L-10 | Audience/campaign attribution (UTM, campaign key alias) | PARTIAL: alias documented | Owner approves UTM scheme |
| L-11 | Registration/contact handoff | BUILT, OFF | Owner provisions signing secret; reviewed migration |
| L-12 | Inbox/reply ownership | BUILT, OFF | Owner names reply owner and sender mailbox |
| L-13 | Suppression/compliance per contact | BLOCKED | 0 of 30 eligible; lawful-basis evidence needed |
| L-14 | Verified postal address for email footer | BLOCKED | Owner supplies verified address |
| L-15 | Sender readiness (GSM warm-up, campaign_ready) | BLOCKED EXTERNAL | Fresh Winnr read and sender pick |
| L-16 | Smartlead webhook signing key | BLOCKED EXTERNAL | Owner provisions key |
| L-17 | Privacy receiver activation (KND-003) | BUILT, OFF | Dedicated secret, reviewed SQL, signed QA |
| L-18 | Liftor CI green | UNVERIFIED | Fix `98bc2a4a` passed locally; check GitHub Actions |

## BUILT / TESTED / LIVE
- LIVE VERIFIED: the counts above, gates all off, no publish/schedule flags.
- BUILT + SOURCE TESTED: commercial and privacy receivers, footer QA, CI workflow fix (local clean run: 1,110 passed).
- NOT LIVE: any sending, posting, checkout, receivers, social distribution.
- GitHub CI result for `98bc2a4a`: UNVERIFIED (sandbox cannot read Actions).
