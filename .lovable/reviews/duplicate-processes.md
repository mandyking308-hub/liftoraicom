# What runs automatically: overlaps and problems (23 Nov 2026)

There are 18 jobs that run by themselves. Nothing has been changed yet.

## 1. Two ways of collecting email replies
- **Old mailbox check**: runs every 2 minutes (5,040 times a week). It reads replies straight from the mailboxes and belongs to the old in-house sending system, which is switched off.
- **Smartlead check**: runs every 10 minutes and is the one you actually use.
- **Suggestion:** switch off the old mailbox check.

## 2. Five health checks doing the same job
- These are the anomaly check, system health, auto-resolve, and three "mirror" checks.
- **System health has failed on every single run this week (672 out of 672)** because one figure is blank.
- **Suggestion:** fix that one. Switch off the 3 mirror checks, because they only re-check the paperwork.

## 3. Apollo daily job that does nothing
- It runs at 06:00 every day, but it has no lists turned on. Its last real run was 23 Oct.
- A second daily job, the lead-quality check, also runs at 06:00 and covers the useful part.
- **Suggestion:** switch off the Apollo daily job. This also keeps paid Apollo credits safe.

## 4. A gap, not a duplicate: the education campaign isn't being read back
- The automatic Smartlead check covers **only the six-person pilot (4103531)**.
- Once the education campaign (4664652) starts tomorrow, its sends, replies and bounces won't show in Liftor unless someone presses "Sync now".
- **Suggestion:** add the education campaign to the same 10-minute check. It only reads; it sends nothing.

## Keep as they are
- Tomorrow's two start checks (09:50 and 10:15).
- The quarterly round check.
- The reply handover, which never sends anything.
- Overdue invoices.
- Daily resets.
- Demo expiry.
- The retry queue.

## Not running at all
- The app has around 635 background tasks. Most of them are tests, previews or placeholders that only run when a button is pressed.
- They don't run by themselves, so they cause no harm. They are left alone.
