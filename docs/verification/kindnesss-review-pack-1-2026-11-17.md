# Kindnesss founder review pack 1 — 17 Nov 2026 (internal, approved=false)

Business: Kindnesss `640de582-a112-4d16-a221-03c27f00c6ec` (no new business, no duplicate).

## Public source check (read-only, 17 Nov 09:41 UTC)
- Brand name on site: "Kindnesss" (three s). Landing https://joinkindnesss.com → HTTP 200, tagline "Change what spreads".
- Pricing https://joinkindnesss.com/pricing → 200. Individual Plus annual $24.99 USD/yr (monthly $2.99), adults 18+, 20% Impact Promise of fees actually received; Kindness Credits have no cash value.
- Checkout https://joinkindnesss.com/checkout/plan?plan=k26_individual_1_annual → 200, requires sign-in; activation "after verified payment". A completed hosted Dodo payment was NOT verified ⇒ every plan is **NOT ON SALE / PILOT PENDING** in Liftor marketing.
- Destination verified: https://joinkindnesss.com/demo?area=company-volunteering → 200, fictional "Willow Works" demo.
- KND marketing claims: zero approved_claims records; post claims are limited to what the public demo/site shows.

## Recommendation (one owner choice)
First adult-facing product/channel: **Companies & Workplaces volunteering, LinkedIn organic**, offer = public demo + pilot conversation (no purchase CTA). Persona: HR/CSR/people lead running workplace volunteering. Alternative: Individual Plus (18+).

## DB writes (internal, no triggers beyond updated_at; no external side effects)
- social_post_drafts: +2 (`6b1f0e2a-1a01-4c11-9a01-000000000001/2`), linkedin, draft, publish_allowed=false, metadata.approved=false, sale_status NOT ON SALE / PILOT PENDING, UTM `utm_source=linkedin&utm_medium=organic_social&utm_campaign=knd_review_pack_1&utm_content=org_volunteering_post1|2`.
- Existing "Kindnesss is open" draft `2ffb9a91…` tagged metadata.unsafe_superseded (implies on sale). No other draft changed or deleted.
- master_work_items: +3 `kindnesss_review_pack/founder_review/knd-review-pack-1:{choose-first-product-channel,approve-two-linkedin-drafts,verify-hosted-checkout}`.
- Read-back: Kindnesss posts 13→15 (0 publish_allowed); work items 101→104; external_action_gates enabled = 0. Re-runnable script: `supabase/pending/kindnesss-review-pack-1-2026-11-17.sql` (ON CONFLICT DO NOTHING; DB copy of platform_variants holds the full caption).

## Preview
Founder page `/founder/marketing` → Social calendar: authenticated local check showed 3 "Review pack 1" badges, 2 "NOT ON SALE / PILOT PENDING", 1 "Superseded". Not published.

## Not done
No publish, social connection, campaign, send, lead, customer/child data, checkout/sender/privacy/GHAT/mailbox change. Legal approval not inferred.
