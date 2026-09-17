# Section M — Business lifecycle

Liftor onboards and operates many businesses through one fixed chain. Each stage writes a record; no stage may be skipped, and every stage can fail closed.

```text
Business Setup Tunnel
  → Knowledge capture & fidelity scoring
  → Execution Starter Pack (generated)
  → Starter Pack Materialiser
  → Internal Activation (internal-only actions, no external reach)
  → Daily / Weekly Operating Loops
  → External Activation Readiness (per-channel checks)
  → Micro-Batch Preparation & Approval
  → Channel execution gates (Section J)
```

| Stage | Primary tables | Primary engine |
|---|---|---|
| Setup tunnel | `business_setup_*`, `businesses`, `business_operating_profiles` | `src/lib/businessSetupTunnel.ts` |
| Archetype fit | `business_archetypes`, `business_archetype_questions`, `business_archetype_assignments` | `businessArchetypeEngine.ts` |
| Knowledge | `business_knowledge_profiles`, `business_knowledge_assets`, `business_knowledge_uploads` | knowledge/fidelity engines |
| Starter pack | `business_execution_starter_packs` | `businessTemplateFactory.ts` |
| Onboarding factory | `business_onboarding_factory_runs` | lifecycle engines |
| Internal activation | `business_internal_activation_records`, `business_internal_daily_actions` | `businessActivationControl.ts` |
| Operating loops | `business_daily_operating_runs`/`_outputs`, `business_operating_runbooks`/`_items`, `business_operating_standards` | operating-loop engines |
| External readiness | `business_external_activation_plans`, `business_external_activation_readiness_runs`, `business_external_activation_channel_checks` | readiness engines |
| Micro-batch | `business_micro_batch_preparation_runs`, `business_micro_batch_candidates`, `business_micro_batch_approval_packets` | micro-batch engine |
| Lifecycle state | `business_lifecycle_stages`, `business_lifecycle_assignments` | `businessLifecycleEngine.ts` |
| Launch checklist | `business_launch_checklist_items`, `business_launch_plans`, `business_launch_profiles` | `smartleadActivationChecklist.ts` (12 canonical keys) |
| Wind-down | `winddown_*` | wind-down engine |

Supporting: `business_autopilot_settings`, `autopilot_activation_gates`, `autopilot_runs`, `business_compliance_profiles`/`_rules`, `business_context_envelopes` (cross-contamination guard), `business_autopsies` (post-mortems), `business_feature_overrides`.

## M1. Non-negotiables

- **Internal activation before external.** A business must complete internal activation and produce daily internal actions before any external readiness run counts for anything.
- **Readiness is computed, never asserted.** Channel checks write explicit per-check rows; a missing check is a failure, not a pass.
- **Micro-batch before scale.** The first external proof for any business is a micro-batch of ≤5 recipients with an approval packet, not a campaign.
- **Founder approval is separate** from technical readiness and is recorded independently.
- The lifecycle pages are `LOCKED_BY_DESIGN`: they will not present a live-first path. Any older manual wording describing a "live-first, no readiness gate" flow is stale and is superseded by this section.
