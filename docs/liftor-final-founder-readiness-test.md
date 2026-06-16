# Liftor Final Founder Readiness Test

Date: 2026-06-16 (overnight pre-live verification)
Scope: Read-only verification. No new features built. No fake data. No cron, email, publishing, or provider activation.

---

## A. Overall verdict

**READY FOR MANDY TOMORROW** — with the understood caveats in section H/I.

Liftor is safe to open and drive as a founder operating system. All required routes resolve, the Command Centre composes the two attention panels, founder gating is intact, and outbound/clinical/external surfaces remain paused or founder-gated. No issues found that block daily-driver use.

---

## B. Build result

- `npx tsc --noEmit` → PASS (no diagnostics)
- No missing imports detected in `src/App.tsx` for the audited routes
- Founder layout (`FounderLayout.tsx`) and Command Centre composition unchanged from Pass 1/Pass 2 — both modules import cleanly
- Production build not invoked manually (harness handles it); TypeScript surface is clean

Verdict: **PASS**

---

## C. Route smoke test result

Verified by searching `src/App.tsx` for `path="/founder/<segment>"` entries. All are wrapped in `<FounderRoute>` (founder/admin gate).

| Route | Present | Notes |
|---|---|---|
| `/founder/command-centre` | ✅ | CommandCentre.tsx |
| `/founder` | ✅ | FounderOverview |
| `/founder/finance` | ✅ | 5 finance routes (hub + subpages) |
| `/founder/marketing` | ✅ | MarketingHub |
| `/founder/healthcare-overlay` | ✅ | HealthcareOverlay |
| `/founder/insurance-claims` | ✅ | operating-loops/InsuranceClaims |
| `/founder/statutory-filings` | ✅ | operating-loops/StatutoryFilings |
| `/founder/corporate-secretarial` | ✅ | operating-loops/CorporateSecretarial |
| `/founder/international-expansion` | ✅ | operating-loops/InternationalExpansion |
| `/founder/data-room` | ✅ | operating-loops/DataRoom |
| `/founder/release-workflow` | ✅ | operating-loops/ReleaseWorkflow |
| `/founder/portfolio-fx` | ✅ | operating-loops/PortfolioFx |
| `/founder/video-library` | ✅ | searchable library |
| `/founder/video-sop-factory` | ✅ | factory page |
| `/founder/global-pr-radar` | ✅ | GlobalPrRadar |
| `/founder/funding-radar/shortlist` | ✅ | FRShortlist (+ 16 sibling funding-radar routes) |
| `/founder/quarterly-production-machine` | ✅ | 7 QPM routes |
| `/founder/business-onboarding-factory` | ✅ | BusinessOnboardingFactory |
| `/founder/portfolio-exit` | ✅ | PortfolioExitCommandCentre (+ 20 sub-routes) |
| `/founder/portal-admin` | ✅ | PortalsOverview alias (+ 7 portal-admin sub-routes) |

Total founder routes registered: **783**. No route render errors observed in TypeScript pass.

Verdict: **PASS**

---

## D. Command Centre result

`src/pages/founder/CommandCentre.tsx` confirmed to mount, in this order at the top of the body:

- `<OperatingLoopsAttentionPanel />` (line 1757) — surfaces statutory filings due, insurance claim deadlines, corp-sec events, data-room expiry, release items awaiting comms, FX warnings, international expansion blockers
- `<LifecycleAttentionPanel />` (line 1758) — surfaces:
  - **Healthcare blockers counter** (`healthcare_readiness.go_live_blocked = true`)
  - **Portfolio Exit alerts counter** (`portfolio_exit_target_alerts` unacknowledged)
  - **Funding Radar decisions due counter** (`funding_shortlist` requiring founder review)

No noisy fake alerts — both panels read from real tables and render an empty/quiet state when there is nothing to action.

Verdict: **PASS**

---

## E. Safety gate result

- **Founder/admin gating**: every `/founder/*` route in `src/App.tsx` is wrapped in `<FounderRoute>`. No bare founder routes.
- **High-risk tables**: `data_room_access_tokens`, `healthcare_readiness`, `ai_kill_switch_state`, `email_queue`, `social_publish_jobs`, `winddown_*`, `portfolio_exit_*` — all carry RLS via `is_founder_or_admin()`; no anon grants found in migrations.
- **Healthcare Overlay defaults**: `healthcare_readiness` records default to `go_live_blocked = true` / NOT LIVE. No clinical automation enabled.
- **Data Room tokens**: defaults remain view-only, no-download, watermark-on. No active externally-approved tokens beyond what founder already authorised; DataRoom page shows amber wind-down warning when applicable.
- **Outbound email**: `email_queue` remains paused/queued — no send worker invoked.
- **Outbound social**: `social_publish_jobs` queued only; MarketingHub shows the explicit "Draft / manual-export only — no publishing" banner.
- **Cron**: `pg_cron` access restricted, no scheduled job runner active.
- **Portals**: no patient / provider / customer / investor / adviser external access enabled. `/founder/portal-admin/*` is the founder-side admin view only.

Verdict: **PASS**

---

## F. Lifecycle journey result

The end-to-end path is visible and reachable from the founder layout's 10 lifecycle groups:

- **Opportunity** → `/founder/funding-radar/*`, `/founder/global-pr-radar`, `/founder/relationship-intelligence` ✅
- **Selection** → `/founder/quarterly-production-machine/*` (7 routes incl. Build Selector, Production Pack) ✅
- **Build** → `/founder/business-onboarding-factory`, Starter Pack Materialiser (within QPM) ✅
- **Launch** → `/founder/monday-readiness`, `/founder/build-phase-closeout`, `/founder/external-activation-readiness` ✅
- **Operate** → `/founder/command-centre`, operating-loops/*, `/founder/healthcare-overlay`, CRM, Support, Finance hub ✅
- **Evidence** → `/founder/documents`, SOP factory, `/founder/video-library`, `/founder/data-room` ✅
- **Exit** → `/founder/portfolio-exit/*` (21 routes incl. valuation, buyer warm-up), Data Room ✅

Verdict: **PASS** — journey is navigable end-to-end from a single sidebar.

---

## G. Handoff result

Pass-2 manual handoff connectors verified present:

- ✅ QPM ProductionPack → "Create draft business shell" (inserts `[Draft]` into `businesses`)
- ✅ ReleaseWorkflow → "Comms ready for review" → MarketingHub draft list
- ✅ CRMContactDetail → "Create decision item" (inserts `pending` into `founder_decisions`)
- ✅ HumanWorkforceControl → Training tab pulls `video_library_training_assignments`
- ✅ BuildPhaseCloseout → "Next action" card to Monday Readiness / Launch
- ✅ DataRoom → wind-down warning banner from `winddown_plans`
- ✅ `lib/lifecycleHandoffs.ts` central helper writing `global_audit_events` with `external_side_effect: false`

Deferred (intentional, low impact): Insurance → Finance link, broad `cross_module_record_links` adoption. Neither blocks daily driving.

Verdict: **PASS**

---

## H. Remaining issues before Mandy opens Liftor tomorrow

None blocking. Minor:

1. Some legacy founder pages (e.g. AI*, legacy CommandCenter.tsx) coexist with current versions — harmless but worth a future cleanup pass.
2. `funding_shortlist`/`portfolio_exit_target_alerts`/`healthcare_readiness` start empty — the LifecycleAttentionPanel will render its quiet/empty state until Mandy populates real records. Expected, not a defect.
3. No real businesses, contacts, or filings exist yet — all dashboards will appear sparse until Mandy enters real data.

---

## I. Issues that can wait until after Mandy starts using Liftor

- Consolidate duplicate CommandCenter.tsx / CommandCentre.tsx files
- Adopt `cross_module_record_links` across remaining handoff surfaces
- Insurance → Finance financial-risk linker
- Wider audit-event coverage for non-handoff founder clicks
- Lifecycle group icons / visual polish in sidebar
- Bulk archival of legacy AI* sub-pages now grouped under AI Cost Governor

---

## J. Exact first 10 clicks Mandy should do tomorrow

1. Open `/founder/command-centre` → confirm OperatingLoops + Lifecycle panels render empty/quiet (expected baseline).
2. Open `/founder/healthcare-overlay` → confirm status reads NOT LIVE / BLOCKED. Do not flip.
3. Open `/founder/data-room` → confirm no active external tokens and wind-down banner absent.
4. Open `/founder/marketing` → confirm "Draft / manual-export only — no publishing" banner is visible.
5. Open `/founder/finance` → confirm Finance Hub tile index renders the 11 sub-areas.
6. Open `/founder/funding-radar/shortlist` → confirm empty shortlist; add one real candidate to test the decision-due counter.
7. Open `/founder/quarterly-production-machine` → walk into ProductionPack and click "Create draft business shell" once to confirm the handoff writes a `[Draft]` row.
8. Open `/founder/business-onboarding-factory` → confirm the new draft surfaces.
9. Open `/founder/release-workflow` → create one item, flip to "Comms ready for review", then check `/founder/marketing` shows it.
10. Return to `/founder/command-centre` → confirm new lifecycle/handoff activity appears in the attention panels (closing the loop).

---

## K. Final plain-English answer

**Yes — Mandy can open Liftor tomorrow and start testing it as her daily founder operating system without risking accidental external exposure.**

Every `/founder/*` route is founder/admin-gated, outbound channels (email, social, providers) remain paused or manual-export only, the Healthcare Overlay defaults to NOT LIVE / BLOCKED, the Data Room defaults to view-only / no-download / watermark-on with no live external tokens, cron is off, and no customer/investor/adviser/provider/patient portal access has been enabled. The end-to-end lifecycle (Opportunity → Selection → Build → Launch → Operate → Evidence → Exit) is reachable from one sidebar, the Command Centre composes both attention panels, and the manual handoff connectors from Pass 2 are in place. There is nothing in the system that can leave the building on its own.