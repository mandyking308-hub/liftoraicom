# Daily Driver Polish Pass 2 — Manual Handoff Connectors

_Source of truth: `docs/liftor-master-site-lifecycle-map.md` section H._

Each handoff is **founder/admin-click only**, writes a `global_audit_events`
row (category `handoff`, sensitivity `low`, `external_side_effect=false`),
and never sends email, publishes externally, activates a provider or
exposes data outside the founder console.

| # | Handoff | Surface | Action |
|---|---|---|---|
| 1 | Funding Radar shortlist → Quarterly Build Selector | `/founder/funding-radar/shortlist` | Pre-existing **Promote** button (verified, audit added via `logHandoffAudit` available). |
| 2 | Quarterly Production Machine → Business Onboarding Factory | `/founder/quarterly-production-machine/production-pack` | New **Create draft business shell** button → inserts `[Draft] …` row in `businesses`, links to Onboarding Factory. |
| 3 | Build Phase Closeout → Monday Readiness | `/founder/build-phase-closeout` | New **Next action** card linking to Monday Readiness / Monday Launch / External Activation Readiness. Navigation only. |
| 4 | Release Workflow → Marketing | `/founder/release-workflow` + `/founder/marketing` | New **Comms ready for review** button flips status to `founder_review`; Marketing Hub shows a read-only awaiting-review list. |
| 5 | Healthcare Overlay → Command Centre | already surfaced by `LifecycleAttentionPanel` (Pass 1). | — |
| 6 | Portfolio Exit alerts → Command Centre | already surfaced by `LifecycleAttentionPanel` (Pass 1). | — |
| 7 | Video Library / SOP completion → People oversight | `/founder/human-workforce-control` → new **Training** tab | Read-only feed from `video_library_training_assignments`. |
| 8 | CRM Interaction Ledger → Founder Decisions | `/founder/crm/contacts/:id` | New **Create decision item** button → inserts pending `founder_decisions` row rooted in the contact. |
| 9 | Wind-down → Data Room exclusion warning | `/founder/data-room` (operating-loops) | Read-only amber banner whenever `winddown_plans` rows exist. No auto-revoke. |
| 10 | Insurance Claims → Finance | **Deferred.** Touches `revenue_records` and would post money — out of scope for a safe internal handoff pass. |

## Implementation summary

- New helper module: `src/lib/lifecycleHandoffs.ts` exposes
  `logHandoffAudit`, `createDraftBusinessShellFromPack`,
  `markReleaseCommsReadyForReview`, `fetchReleasesAwaitingCommsReview`,
  `createDecisionFromCrmContact`, `fetchWindDownSummary`,
  `fetchTrainingAssignmentsForPeople`.
- No migrations. No new tables. No route deletions. No RLS changes.
- TypeScript build clean.

## Safety verification

- All writes target existing tables already protected by founder/admin RLS.
- No edge functions invoked. No outbound HTTP. No cron. No emails.
- Wind-down banner is informational; it never modifies tokens or items.
- CRM decision creation never auto-fires — strict on-click only.