# Kindness Habits private feed verification — 17 Nov 2026

## Scope
Connect the existing private Kindness Habits summary feed to the canonical active Kindnesss business (`640de582-a112-4d16-a221-03c27f00c6ec`) and show sign-up totals in Liftor. Read-only only; no personal records, sends, publishing, payments or activation.

## Built
- `kindness-habits-summary` requires a founder/admin caller before using the saved `LIFTOR_FEED_KEY`.
- The bridge calls only `https://joinkindnesss.com/api/public/liftor-summary-feed`, refuses redirects, and accepts only the documented aggregate schema.
- The response is bound to the canonical Kindnesss business. Other business IDs are rejected.
- Liftor HQ and the selected Kindnesss business setup page show total sign-ups, sign-ups in the last 24 hours and seven days, active users in the last seven days, feed freshness and a Refresh action.
- No feed response is stored in Liftor and no child names, emails or personal records are requested or displayed.

## Source tests
`bunx vitest run src/test/kindnessHabitsFeed.test.ts src/pages/founder/__tests__/BusinessSetupTunnel.multiBusiness.test.tsx src/lib/__tests__/founderAreas.test.ts`

Result: 3 files passed, 14 tests passed. The automatic preview build reported `build OK`.

## Live verification
- Kindness Habits feed without a key: HTTP 401.
- Kindness Habits feed with an incorrect key: HTTP 403.
- Liftor bridge without a signed-in caller: HTTP 401 `auth_missing`.
- Signed-in founder browser check on Liftor HQ: HTTP 200 and visible totals.
- Refresh: second HTTP 200 with a new `generated_at` time.
- Selected Kindnesss business page: the same live card was visible.
- Observed at 22:24 UTC: 7 total sign-ups, 0 in the last 24 hours, 0 in the last seven days, and 2 active users in the last seven days.

These counts are a dated verification snapshot, not a permanent metric. The dashboard reads current totals on load and Refresh.
