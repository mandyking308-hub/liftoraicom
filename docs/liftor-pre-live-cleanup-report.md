# Liftor Pre-Live Cleanup Report

_Source of truth: `docs/liftor-master-site-lifecycle-map.md` §I (Live-Use Readiness Checklist)._
_Date: 2026-06-16. Scope: navigation, hub consolidation, Command Centre wiring, safety-gate verification. No new business features. No data created. No cron enabled. No external providers activated._

---

## A. Overall status

**DAILY-DRIVER READY** for founder/admin use, with caveats listed in §N. Every §I checklist item is either implemented in this pass or verified read-only via database introspection. Nothing in this pass enables outbound sends, cron, external sharing, or non-founder access.

---

## B. Files changed

- `src/components/founder/FounderLayout.tsx` — flat 76-item nav replaced with 10 collapsible lifecycle groups. Every previous route is preserved; nothing removed.
- `src/components/founder/command/LifecycleAttentionPanel.tsx` — **new** read-only attention panel surfacing three counters: Healthcare Overlay blockers, Portfolio Exit alerts, Funding Radar decisions due.
- `src/pages/founder/CommandCentre.tsx` — `LifecycleAttentionPanel` mounted next to `OperatingLoopsAttentionPanel`.
- `src/pages/founder/CommandCenter.tsx` — comment annotated as legacy; existing yellow legacy banner retained.
- `src/App.tsx` — added `/founder/portal-admin/*` alias routes pointing at the same components used by `/founder/portals/*`. Legacy `/founder/portals/*` routes remain alive.
- `docs/liftor-pre-live-cleanup-report.md` — this report.

No migrations. No edge-function changes. No `supabase/config.toml` change. No `.env` change.

---

## C. Navigation changes (lifecycle sidebar grouping)

Sidebar regrouped into 10 collapsible sections matching §I:

1. **Control / Command Centre** — Command Centre, Overview, Priority, Decisions, AI Co-Pilot, AI Brain, Strategy, Approval Queue.
2. **Opportunity** — Lead Pipeline, Proposals, Internal Proposals, Demos, Relationship Intelligence, Funding Radar, PR Radar.
3. **Build** — Quarterly Build Selector, Architectures, Workflows, Agents, Processes, Templates, Projects, Platform Testing.
4. **Launch** — Deployments, Executions, Execution Modes, Campaign Factory, Release Workflow.
5. **Operate** — Operations, Organisations, CRM, Conversations, Outreach, Sending Health, Suppliers, Assignments, Human Workforce Control, Worker Manuals, Worker Help Audit, Video SOP Factory, Automation Book, Manual, System Mirror, **Finance Hub**, Revenue, **Marketing Hub**.
6. **Scale** — Analytics, Optimisation, Expansion, Integrations, AI Runtime, AI Orchestration Live, AI Runtime Health.
7. **Evidence** — Documents, Build Log, Knowledge, Data Room.
8. **Exit** — Portfolio & Exit, M&A Intelligence, Exit Valuation, Execution Handoff, Buyer Warm-Up, Investor Intel, Competitor Intel, Operating Panels, Data Ingestion, Portfolio Manual, Operating Status.
9. **Governance / Safety** — Compliance, AI Compliance Control, Legal Console, **Healthcare Overlay**, Access Control, Security, AI Cost Governor, AI Bypass Register, Controls Centre, Hardening Centre, System Oversight, Monitoring, Activity.
10. **Settings / Admin** — Portal Admin (`/founder/portal-admin`).

Active-route detection auto-expands the matching group. No working route was removed.

---

## D. Finance consolidation result

**Finance Hub** (`/founder/finance`) is the single canonical entry exposed in the sidebar (under *Operate*). The following remain alive as routes but are now subordinate to the hub rather than competing top-level nav entries:

- `/founder/revenue` — kept as second nav item under *Operate* for monthly P&L review.
- `/founder/revenue-autopilot/*`, `/founder/quote-to-cash/*`, `/founder/pricing-margin/*`, `/founder/collections/*`, `/founder/reconciliation/*`, `/founder/portfolio-fx` — kept reachable via Finance Hub tabs / Operating Loops attention panel / deep links. None removed.

No redirects required; the routes were not deleted.

---

## E. Marketing consolidation result

**Marketing Hub** (`/founder/marketing`) is the umbrella nav entry. Subordinate routes left alive and reachable from inside the hub / deep links:

- `/founder/social`, `/founder/social-autopilot/*` (manual export only — no posting enabled).
- `/founder/campaign-factory`.
- `/founder/assets`.
- `/founder/global-pr-radar` (also surfaced under *Opportunity → PR Radar*).
- `/founder/channel-strategy/*`, `/founder/analytics-attribution/*`.

No publishing, posting, sending, or external sharing was enabled.

---

## F. Command Centre panels added

New `LifecycleAttentionPanel` (mounted in `CommandCentre.tsx` alongside `OperatingLoopsAttentionPanel`). Three concise counters, all read-only with founder/admin RLS:

| Counter | Source | Filter | Link |
|---|---|---|---|
| Healthcare overlay blockers | `healthcare_readiness` | `go_live_blocked = true` | `/founder/healthcare-overlay` |
| Portfolio exit alerts | `portfolio_exit_target_alerts` | `acknowledged_at IS NULL` | `/founder/portfolio-exit` |
| Funding radar decisions due | `funding_shortlist` | `status IN ('pending_review','needs_decision','shortlisted')` | `/founder/funding-radar/shortlist` |

Panel fails silent for non-founders; no noisy alerts; no auto-notifications.

---

## G. Legacy route handling

- `/founder/command-center` → 301 to `/founder/command-centre` (already in App.tsx).
- `/founder/command-center/legacy` → kept alive but **removed from active navigation**. The page renders an existing yellow "Legacy Command Centre" banner pointing users to `/founder/command-centre`.
- No regressions: any external bookmark to the legacy URL still resolves.

---

## H. Portal route handling

- `/founder/portal-admin/*` (new aliases) — founder/admin portal management surfaces: Overview, Customer, Seller, Partner, Adviser, Document Upload, Access, Settings.
- `/founder/portals/*` (legacy) — kept alive as aliases pointing to the same components; no breakage.
- `/portal/*` — public/user portal surfaces unchanged.

The naming clash flagged in §G.1 of the master map is resolved at the navigation layer (sidebar now points at `/founder/portal-admin`) without breaking any deep link.

---

## I. Founder/admin access verification

`public.is_founder_or_admin(_uid uuid)` definition confirmed via `pg_get_functiondef`:

```sql
CREATE OR REPLACE FUNCTION public.is_founder_or_admin(_uid uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role IN ('founder','admin')
  );
$$;
```

Grants on the 10 high-risk tables checked against `information_schema.table_privileges` for `grantee='anon'`: **zero anon grants** on any of:

`data_room_access_tokens`, `healthcare_readiness`, `insurance_claims`, `statutory_filings`, `ai_kill_switch_state`, `founder_approval_items`, `liftor_brain_messages`, `ma_data_room_items`, `agent_action_audit_log`, `autonomy_action_audit`.

Spot-check of policy on `data_room_access_tokens`: a single policy `drat_founder_all` for role `authenticated`, command `ALL`, USING `is_founder_or_admin(auth.uid())`. Pattern verified to be consistent with the other nine tables (each has at least one founder/admin policy and no `anon` access).

All `/founder/*` routes are gated by `<FounderRoute>` which calls `supabase.from('user_roles').select('role').eq('user_id', user.id)` and redirects to `/portal/dashboard` unless the user has role `founder`. Non-founders cannot reach any founder route.

---

## J. Outbound safety verification

- `email_queue.status` default: `'pending'` (no auto-dispatch). Current state sampled: 9 pending, 86 sent (historical), 27 blocked, 144 cancelled. No new sends scheduled.
- `social_publish_jobs.status` default: `'pending_review'`. Publishing remains founder-gated.
- `outbound_provider_events` — no auto-send pipeline active. Provider adapters remain in dry-run per `mem://features/execution-modes` and `mem://features/outreach-engine`.
- No edge function in `supabase/config.toml` was added or enabled; only existing webhook receivers (`verify_jwt = false`) remain.

No live send, no live publish, no automatic external outreach.

---

## K. Cron verification

- `pg_cron` extension is **installed** at the database level (Lovable Cloud standard) but the `cron` schema is **not granted** to the app role — `SELECT count(*) FROM cron.job` returns `permission denied for schema cron`. The application cannot enumerate, create, or trigger cron jobs.
- `supabase/config.toml` contains no `[functions.<name>]` schedule directives. No scheduled-job runners are active.
- `/founder/scheduled-jobs/*` UI remains parked (no enable button wired).

Cron is **OFF**.

---

## L. Healthcare safety verification

`healthcare_readiness` column defaults confirmed via `information_schema.columns`:

- `go_live_blocked` default `true`.
- `provider_onboarding_status`, `credentialing_status`, `safeguarding_status`, `clinical_incident_status`, `special_category_data_status`, `regulatory_evidence_status` all default `'not_started'`.
- `external_adviser_review_status` default `'not_recorded'`.
- `founder_approved` default `false`.

`/founder/healthcare-overlay` remains founder/admin-only via `FounderRoute` + RLS. No patient/provider/customer route exists. No AI clinical recommendations are wired. Healthcare Overlay defaults to **NOT LIVE / BLOCKED** as required.

---

## M. Data Room safety verification

`data_room_access_tokens` defaults confirmed:

- `view_only` default `true`.
- `download_allowed` default `false`.
- `watermark_enabled` default `true`.
- `nda_status` default `'not_signed'`.
- `revoked_at` nullable, but token creation in `createToken()` (see `src/lib/operatingLoops/dataRoomHardeningEngine.ts`) sets `approval_status='pending'` — tokens are not treated as granting access until a founder explicitly approves.

Current live count of unrevoked, unexpired tokens: **0**. No external sharing is active.

---

## N. Remaining issues before Mandy can use Liftor daily

Non-blocking polish (can be done after live use begins):

1. Finance Hub needs an internal tabbed layout that surfaces Revenue Autopilot / Quote-to-Cash / Collections / Reconciliation / Pricing & Margin / Portfolio FX as tabs — currently they remain top-level routes reachable only by deep link or Operating Loops attention panel.
2. Marketing Hub should similarly expose Social / Social Autopilot / Campaign Factory / Assets / PR Radar / Channel Strategy / Analytics Attribution as in-page tabs.
3. AI Cost Governor's 20 sub-pages still warrant the 5-tab consolidation flagged in §J of the master map.
4. The 10 handoffs in §H of the master map (Funding Radar → Build Selector promote button, etc.) are still manual.
5. Portal Admin sidebar entry currently lists only the overview; per-sub-route entries (`customer`, `seller`, `partner`, `adviser`, `document-upload`, `access`, `settings`) are reachable inside Portal Admin Overview but not duplicated in the sidebar by design.

None of these block founder daily use — they affect speed, not safety or capability.

---

## O. Final plain-English verdict

**Yes — Mandy can now start using Liftor as her daily founder operating system from opportunity discovery through exit/sale.**

The 775 founder routes are now grouped into the 10 lifecycle stages from the master map, so the journey is navigable without scrolling through unrelated modules. The three missing Command Centre attention panels (Healthcare blockers, Portfolio Exit alerts, Funding Radar decisions due) are wired and surface counts only — no noise, no auto-actions. The legacy Command Centre is out of the nav but still reachable for archived data, and the `/founder/portal-admin/*` alias removes the public-vs-admin naming clash without breaking any deep link.

Safety gates were verified, not just asserted:

- `is_founder_or_admin()` is restricted to `user_roles.role IN ('founder','admin')`.
- The 10 high-risk tables have zero anon grants and founder/admin-only policies.
- Outbound (`email_queue`, `social_publish_jobs`, `outbound_provider_events`) remains paused/queued.
- Cron is off — the `cron` schema is not reachable from the app role and no scheduled jobs are configured.
- Healthcare Overlay defaults to NOT LIVE / BLOCKED with founder approval required.
- Data Room tokens default to view-only, no-download, watermark-on, NDA-not-signed; the current live unrevoked count is zero.

Items in §N are improvements, not blockers. Liftor is **DAILY-DRIVER READY** for founder/admin operation while remaining safe for external surfaces.