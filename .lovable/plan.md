## Apollo Reveal Workflow — Search → Shortlist → Reveal → Promote

Rebuild Liftor's Apollo workflow to correctly model the two-stage Apollo process (search vs. reveal), with a founder approval gate before any credit spend. No credits spent, no AI, no promotion, no queueing, no sends during this task.

### 1. Data model (migration)

Extend `lead_quality_profiles.lifecycle_stage` constraint with the canonical stages used across the new flow:
- `apollo_candidate_email_available_locked` (replaces today's `verified_email_available_locked` for the 75)
- `email_reveal_required`
- `reveal_shortlisted`
- `reveal_attempted_no_email`
- `reveal_invalid_email`
- `safe_to_promote_after_reveal`
- `already_in_crm_after_reveal`
- `needs_founder_review`

Add columns to `lead_quality_profiles` (nullable, additive only):
- `reveal_recommendation text` — `reveal | hold | skip`
- `reveal_score numeric`
- `reveal_rank int`
- `reveal_reason text`
- `revealed_at timestamptz`
- `reveal_outcome text`
- `apollo_credits_used int default 0`

Add table `apollo_reveal_batches` to log founder approvals:
- `founder_user_id`, `selected_candidate_ids uuid[]`, `estimated_credits int`, `actual_credits_used int`, `status text` (`pending | approved | revealed | failed`), `created_at`, `revealed_at`.
- RLS: founder-only (admin role via `has_role`).

Reclassify the 75 current `verified_email_available_locked` rows to `email_reveal_required` via the same migration (UPDATE statement, no credits spent).

Update `lead_lifecycle_summary` view to expose new buckets.

### 2. Edge functions

**`lead-quality-autopilot`** — extend Step 0/1 scoring to compute, for each `email_reveal_required` candidate, deterministic checks only (no AI):
- title fit, company fit, campaign fit
- duplicate Apollo person_id, duplicate name+company
- already in CRM (contacts table)
- already has BCR / queued / sent / has conversation / proposal / demo / deal / invoice
- bounced / suppressed / internal
- domain already contacted, domain overload (>N per domain)

Writes `reveal_score`, `reveal_rank`, `reveal_recommendation`, `reveal_reason`. Top 25 unique `reveal` candidates form the shortlist.

**`apollo-reveal-shortlist`** (new, read-only) — returns the ranked shortlist + credit estimate (unique recommended only, capped at 25, no padding).

**`apollo-reveal-batch`** (new) — founder-approval-gated reveal. Accepts selected candidate IDs, validates auth (admin role), de-dupes, excludes CRM-known, calls Apollo enrichment for each, writes results back, runs post-reveal classification (safe_to_promote_after_reveal / already_in_crm_after_reveal / attempted_no_email / invalid_email / needs_founder_review). Logs credit spend in `apollo_reveal_batches`. **Does not promote, enqueue, or send.** Behind a `dry_run` flag defaulting to true so this task ships without spending credits.

**`apollo-pull-verified`** — update return payload labels:
- `apollo_candidate_profiles_staged` (was `leads_pulled_into_staging`)
- `verified_email_available_candidates_pulled` (was `verified_emails_imported`)
- Remove any `safe_to_promote` from the immediate pull response; replace with note that promotion requires reveal + post-reveal CRM check.

### 3. UI changes

**`src/components/founder/ApolloPullPanel.tsx`** — relabel result tiles per Part 1; add a "Candidate profiles staged → email reveal required" status line.

**`src/components/founder/LeadQualityPanel.tsx`** — replace any "Verified emails imported" wording. Add Apollo stage breakdown counters: candidate profiles pulled, email reveal required, shortlisted, revealed, safe to promote (post-reveal).

**New: `src/components/founder/ApolloRevealShortlist.tsx`** — table of recommended reveal candidates with rank, name, title, company, location, Apollo person ID, campaign fit, score, reason, CRM/domain flags, recommendation. Bulk-select, shows credit estimate (unique only, ≤25), and a "Reveal emails for selected Apollo candidates" button with confirm dialog showing estimated credits. Dry-run on by default.

**`src/pages/founder/CommandCentre.tsx`** — within the existing Apollo section, render the 9-stage sequence (Part 9) as a horizontal stepper, mount `ApolloRevealShortlist` between Source and Quality sections.

### 4. Acceptance verification

After implementation, run `supabase--read_query` to confirm:
- 75 rows now show `lifecycle_stage = 'email_reveal_required'`
- No promotions, queue rows, or sends were created
- `apollo_reveal_batches` has zero `revealed` rows

### Technical details

- Migration is additive (new stages added to CHECK constraint, columns nullable with defaults). No destructive schema changes.
- `apollo-reveal-batch` defaults to `dry_run = true`; founder must explicitly pass `dry_run: false` after reviewing the shortlist. This task ships with dry-run only — no live reveal triggered.
- Shortlist scoring is deterministic SQL/JS, no AI gateway calls.
- Credit estimate = `count(distinct apollo_person_id where reveal_recommendation='reveal' and not in CRM and not duplicate) capped at 25`.
- All new RLS policies use `public.has_role(auth.uid(), 'admin')`.
