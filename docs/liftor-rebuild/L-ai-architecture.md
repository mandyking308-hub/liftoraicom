# Section L — AI architecture

## L1. One gateway, one door

Every model call goes through `supabase/functions/_shared/aiGateway.ts`, which posts to `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY`. Direct `fetch` to the gateway URL is permitted **only** inside that module; the rule is stated at the top of the file. No AI provider key reaches the browser.

Call path:

```text
caller function
  → resolve agent (ai_agent_registry: status, primary_model, fallback_model, max_concurrency)
  → acquireLease (acquire_ai_lease RPC → ai_concurrency_leases)
  → gateway call (primary model, fallback model on failure)
  → cost basis lookup (ai_provider_pricing, USD→GBP fallback)
  → ai_usage_ledger + ai_gateway_requests written
  → releaseLease(request_id, ok)
```

`cleanup_stale_ai_leases` reclaims leases from crashed runs, so a failed function cannot permanently consume concurrency.

## L2. Governance tables

| Concern | Tables |
|---|---|
| Registry & roles | `ai_agent_registry`, `ai_agents`, `ai_agent_roles`, `agent_registry`, `agent_capabilities` |
| Permissions & boundaries | `ai_agent_permissions`, `agent_module_permissions`, `agent_prohibited_actions`, `agent_boundary_violations`, `agent_approval_requirements`, `agent_escalation_triggers` |
| Work queue | `ai_agent_task_queue`, `ai_agent_task_types`, `ai_action_queue`, `ai_actions`, `ai_workflow_runs`, `ai_workflow_steps` |
| Cost & budget | `ai_usage_ledger`, `ai_gateway_requests`, `ai_provider_pricing`, `ai_business_budgets`, `ai_agent_cost_controls`, `ai_cost_alerts`, `ai_roi_snapshots` |
| Throughput | `ai_concurrency_leases`, `ai_rate_limits`, `ai_model_routing_rules` |
| Safety | `ai_kill_switch_state`, `autonomy_levels`, `autonomy_policies`, `autonomy_action_audit`, `agent_action_audit_log` |
| Quality | `ai_quality_scores`, `ai_draft_quality_reviews`, `ai_conversation_draft_reviews`, `ai_eval_test_suites`/`_test_cases`/`_runs`/`_results`, `ai_sandbox_runs` |
| Oversight | `ai_human_oversight_records`, `ai_drafts`, `ai_compliance_systems`, `ai_compliance_evidence_items`, `ai_compliance_gap_actions`, `ai_data_flow_records`, `ai_go_live_readiness` |
| Prompts | `ai_prompt_registry`, `ai_prompt_templates`, `ai_cached_context_blocks`, `ai_reply_tone_profiles` |

## L3. Kill switch

`ai_kill_switch_state` is a singleton: `global_ai_paused`, `paused_business_ids`, `paused_agent_ids`, `paused_campaign_ids`, `pause_reason`, `simulation_mode`, `simulation_label`. Current live values: `global_ai_paused = false`, `simulation_mode = false`. Pausing is scoped — a single business, agent or campaign can be stopped without stopping the platform.

## L4. Human-in-the-loop

AI never sends. It drafts. `ai_drafts` + `ai_conversation_draft_reviews` + `ai_human_oversight_records` hold the approval record, `evaluate_ai_reply` scores a reply before a human sees it, and every outbound path still hits the Section J gates. Environment flags `AI_DRAFT_SAVE_ENABLED` and `AI_AGENT_TASK_QUEUE_ENABLED` must be explicitly on for drafts to persist or the queue to run.

Frontend-side governance: `src/services/aiUsageLogger.ts` with adversarial tests in `src/services/__tests__/aiGovernor*.test.ts`.

## L5. Known limitations

- Live usage is tiny: 6 rows in `ai_gateway_requests`. The architecture is far ahead of the traffic; throughput, cost and eval behaviour are effectively unproven at scale.
- Some historical acceptance functions still mention `OPENAI_API_KEY` cosmetically; the runtime path is gateway-only.
- Eval suites exist but a current pass/fail record is not maintained as a release gate.
