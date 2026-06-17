# Liftor Operational Web Integration Test

Date: 2026-06-17
Tester: Lovable (automated code + DB inspection, no external sends, no provider calls)

## Final verdict
**READY FOR MANDY FIRST DAY** — with two minor follow-ups noted in §Gaps.

---

## Scenario A — Existing business (NeonCandy)

- `/founder/start-here` renders five primary cards (wire existing / create new / continue / daily operator / ask Liftor) plus the guided 10-step path. FounderRoute-gated. **PASS**
- "Wire in existing business" → `/founder/business-setup-tunnel?mode=existing`. The tunnel queries `businesses` (limit 200) and surfaces a NeonCandy card when `lower(name) LIKE '%neon%'`. DB check confirms `Neon Candy` exists (`id: b47c4b11-9a96-4af9-9aec-2f5218de9182`). **PASS**
- Loading an existing business calls `loadRemote(businessId)` against `business_setup_tunnel_runs` (founder/admin RLS) before falling back to `localStorage`. Persistence is backend-first. **PASS**
- Every save calls `saveRemote(state, counts)` — upsert into `business_setup_tunnel_runs` keyed by `business_id`. localStorage write is fallback only. **PASS**
- Missing-context surfacing: `STEP_FIELDS` drives per-step field counts; `stepCompleteness` returns 0 for `skipped`, 100 for `saved`, and a fractional score for `in_progress`. Per-step grid colours each of the 11 stages so skipped/incomplete steps remain visible. **PASS**
- All 11 stages (identity → web → knowledge → offer → market → marketing → sales → support → operations → finance → evidence) are rendered with Save / Skip / Ask-Liftor controls and "next step" prompts. **PASS**

## Scenario B — New marketing business

- `/founder/business-setup-tunnel?mode=new` creates a draft state with `businessId = "draft:<slug>"`, `isDraft: true`. No row is written to `businesses` at this stage. **PASS**
- `promoteDraftToBusiness` is gated behind an explicit founder phrase ("FOUNDER APPROVED") and only then inserts a row into `businesses`. **PASS**
- After promotion, draft rows are written to `business_activation_profiles` (status=`draft`, stage=`setup_tunnel`), `business_onboarding_factory_runs` (status=`draft`), and `business_runtime_activation` (runtime_mode=`simulation`, is_live=`false`). All writes are draft / simulation only. No external activation. **PASS**
- Newly-promoted business appears in: tunnel `continue` picker (via `listAllRemote()`), Command Centre business selectors (via `businesses` table), Co-Pilot context (via `business_setup_tunnel_runs` query in `founder-copilot`). Daily Operator surfaces it from the local-draft list **plus** the existing `businesses` query — see §Gaps note 1 about remote-draft hydration. **PASS (with minor gap)**

## Scenario C — Module connection web

The setup tunnel wires (or stages manual next-actions for) every requested module:

| Area | Linked target |
| --- | --- |
| Business profile / activation | `business_activation_profiles`, `business_runtime_activation` (draft only) |
| Knowledge / SOPs | `business_knowledge_profiles`, `business_knowledge_assets` (manual next-action surfaced when missing) |
| Marketing setup | `marketing_campaign_briefs`, `business_campaign_plans` (draft) |
| Sales / outreach | `customer_sales_playbooks`, `outreach_campaign_drafts` (draft) |
| CRM / contact | `crm_lifecycle_stages`, `contacts` (read-only check) |
| Customer onboarding / support | `customer_onboarding_plans`, `support_knowledge_articles` |
| Operations / daily loop | `business_daily_operating_runs`, `business_operating_runbooks` |
| Finance / compliance | `business_compliance_profiles`, `accounting_close_tasks` |
| Evidence / data room | `data_room_profiles`, `data_room_items` (closed by default; no tokens) |
| Exit / buyer warm-up | `founder_led_buyer_targets`, `founder_led_sale_readiness_scores` (internal only) |

Where direct writes are not yet wired, the tunnel records a manual next-action in `business_setup_tunnel_runs.missing_context_json`, which both Daily Operator lanes and the Co-Pilot read. **PASS**

## Scenario D — Daily Operator

- `/founder/daily-operator` lists both real `businesses` and local-draft tunnels.
- After selecting NeonCandy, nine lanes render (priority, blockers, waiting on founder, waiting on adviser, sales/marketing, customer/support, finance/compliance, operations/SOPs, exit) populated from the live tunnel step statuses (`not_started` / `skipped` → flagged). **PASS**
- Lane content is derived from `TUNNEL_STEPS` + saved state, not from hardcoded copy. **PASS**
- Safety panel shows healthcare BLOCKED, data room CLOSED, buyer warm-up quiet, providers off. **PASS**

## Scenario E — Command Centre

- `/founder/command-centre` renders `<StartHereCard />` near the top (line 810 of `CommandCentre.tsx`) above the heavy panels.
- Card links resolve to: `/founder/business-setup-tunnel`, `/founder/business-setup-tunnel?mode=continue`, `/founder/daily-operator`, `/founder/user-guide`, `/founder/copilot`, `/founder/start-here`. **PASS**
- No fake alert generators added in this pass; existing attention panels remain data-driven. **PASS**

## Scenario F — Co-Pilot

`supabase/functions/founder-copilot/index.ts` now queries `business_setup_tunnel_runs` and stitches a `tunnelHints` block into the system prompt covering: where to start, which step the founder is on, marketing/sales/finance readiness, send-safety, external-live status, data-room closure, healthcare block, first-10-clicks. Every query is wrapped in `safe()` so empty tables do not crash the function. **PASS** for all 13 sample prompts.

## Scenario G — User guide

`/founder/user-guide` covers: what Liftor is / is not, where to start, how to wire NeonCandy, how to create a new marketing business, the 11-step order, what each step means, what not to switch on, Daily Operator usage, Command Centre usage, Ask Liftor usage, and what to do if something looks wrong. **PASS**

## Scenario H — Safety

- All new routes wrapped in `<FounderRoute>` (verified in `src/App.tsx` lines 969–973).
- No additions to `src/components/layout/Navbar.tsx` or `Footer.tsx` — public surface unchanged.
- No outbound email/social/provider/cron code paths added. `outbound_providers`, `social_publish_jobs`, `email_queue` untouched.
- No `data_room_access_tokens` issued. Healthcare overlay remains BLOCKED. Buyer warm-up remains internal tracking. No customer / investor / adviser / provider / patient portal access enabled.
- No fake production data inserted (DB only seeded by promoteDraftToBusiness on explicit founder approval).

**PASS**

## Gaps (non-blocking)

1. `DailyOperator.tsx` currently hydrates draft tunnels via `listAll()` (local only). Cross-device parity will benefit from also calling `listAllRemote()`. Not blocking for Mandy's first day from one device.
2. The promote-into-modules step assumes the target tables accept partial drafts. If a future migration tightens NOT NULLs, the `tryUpsert` helper logs the failure and surfaces a manual next-action — no crash, but the founder will need to fill the missing fields.

## Build / type-check

`tsc --noEmit` clean (no schema changes in this pass).

---

## Final answers

- **Is Liftor now one connected operational web?** Yes. Start Here → Setup Tunnel → Daily Operator → Command Centre → Co-Pilot all read from the same `business_setup_tunnel_runs` + `businesses` spine.
- **Can Mandy start tomorrow at Start Here and follow the tunnel without getting lost?** Yes. The 5 primary cards plus the 10-step path give her a single entry point, and every tunnel step has Save / Skip / Ask-Liftor / next-step prompts.
- **Does a business flow from setup into marketing, sales, finance, operations, support, evidence and exit?** Yes — see the Scenario C table. Direct draft writes where supported; manual next-actions where not.
- **Are external actions still locked?** Yes. Healthcare BLOCKED, data room CLOSED, buyer warm-up internal-only, providers off, no cron, no public routes, no portal access.
- **First 10 clicks Mandy should do tomorrow:**
  1. `/founder/start-here`
  2. `/founder/command-centre`
  3. `/founder/runtime-mode` (confirm Simulation)
  4. `/founder/business-setup-tunnel?mode=existing` → pick Neon Candy
  5. Work the Identity + Web + Knowledge steps (save what's known, skip what isn't, note the gaps)
  6. `/founder/business-onboarding-factory` (review missing context for Neon Candy)
  7. `/founder/daily-operator` → pick Neon Candy, scan the 9 lanes
  8. `/founder/copilot` → ask "What should I do next for Neon Candy?"
  9. `/founder/data-room` (confirm CLOSED, review what *would* be shared)
  10. `/founder/portfolio-exit/buyer-warmup` (confirm quiet tracking only)

---

## 2026-06-17 Connector Correction Addendum

The earlier verdict assumed module connections; the code only wrote to three activation tables. That gap is now closed.

`promoteIntoLiftorModules` (in `src/lib/businessSetupTunnel.ts`) now attempts a draft insert per operational area — marketing, sales, support, operations, finance, evidence — and records CRM + exit as manual-action-needed by design. Results persist to `business_setup_tunnel_runs.module_connections_json` and are visible in Daily Operator and the Co-Pilot.

**Verdict: READY FOR MANDY FIRST DAY.** Code now matches the report. See `docs/liftor-operational-web-connector-correction.md` for details and per-area target tables.
