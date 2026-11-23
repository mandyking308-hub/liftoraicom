# Quarterly repeating campaigns (all businesses)

## What you get
- Every campaign, for any business you onboard, becomes a repeating campaign: 4 emails per round, a new round every quarter, with no end date.
- Each round starts on its own only if all checks pass. If a check fails, that round stays paused and you get a message.
- A person stops getting rounds as soon as they unsubscribe, bounce or reply. People who reply move to the inbox instead.
- A new "Quarterly rounds" panel on the Outreach Command Centre shows each campaign's next round date, last result and who was dropped and why.

## Safety (unchanged rules)
- Tomorrow's Kindnesss launch and the 6-person pilot are not touched. Kindnesss education's first quarterly round would be about 24 Feb 2027.
- The 935 held-back contacts, the GHAT charity mailboxes and other businesses' contacts are never added.
- Rounds use the shared 180 GSM mailbox calendar, so two businesses never use the same mailbox at the same time.
- Each round's emails are written as drafts 2 weeks ahead, so you can change the wording. If you don't, the last approved wording is used.

## Checks before each round
- Mailbox health (live warm-up score of 90 or more).
- Each contact is still verified, not catch-all, and not suppressed. The contact list is checked again against past bounces, replies and unsubscribes.
- Compliance: opt-out link and postal address in every email, and no calendar clash.

## Technical details
- New tables: `campaign_recurrence_plans` (business_id, smartlead campaign, interval, sequence size 4, next_round_at, auto_start) and `campaign_recurrence_rounds` (round number, eligible/held counts, check results, status). Founder/admin RLS.
- New function `campaign-quarterly-round`: a daily check finds rounds that are due, copies the approved 4-step sequence into a new paused Smartlead campaign, adds only the eligible leads, books calendar slots, runs the same gate checks as the 24 Nov activation, then starts or pauses and notifies.
- Uses the existing email history check (fails closed) and the existing external-action gates. Tests cover the 4-step size, dropping suppressed people, pausing on failure, and running forever.
