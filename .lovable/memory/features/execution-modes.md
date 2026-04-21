---
name: Execution Mode System
description: Global modularity layer that gates core workflows (proposals, deals, invoicing, suppliers, outreach, demos) per business via execution modes (sales, outreach, hybrid).
type: feature
---

**Tables (founder-only RLS):**
- `system_execution_modes` — mode_name (sales/outreach/hybrid), description, is_default (only one allowed via partial unique index).
- `system_feature_flags` — feature_name, enabled, execution_mode_id; unique on (mode, feature).
- `businesses` — name + nullable `execution_mode_id` for per-business overrides.

**Resolution:**
- `get_active_execution_mode(_business_name)` — returns business override OR default mode id.
- `is_feature_enabled(_feature, _business_name)` — returns boolean; **defaults to true** if no mode configured (preserves existing behaviour).

**Gating triggers (BEFORE INSERT, raise P0001 if disabled):**
- `guard_deal_creation` on `deals` (feature: deals)
- `guard_proposal_creation` on `internal_proposals` (resolves business via contact)
- `guard_demo_creation` on `demo_access`
- `guard_assignment_creation` on `assignments` (feature: suppliers)
- `handle_deal_won` rewritten to check `invoicing` and `suppliers` flags before auto-creating invoice / picking supplier; logs `feature_disabled` to `activity_log` when skipped.

**Defaults:**
- sales = all features on. outreach = only outreach + demos (system default). hybrid = outreach + proposals + demos.
- Velocity → sales, FutureCandy → outreach.

**UI:** `/founder/system/modes` — toggle flags per mode, set default mode, assign mode per business.

**Logging:** all skipped actions write `activity_log` rows with `event_type='feature_disabled'` via `log_feature_skip()`.