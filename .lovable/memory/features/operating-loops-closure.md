---
name: Operating Loops Closure Pack
description: Founder/admin-only closed-loop workflows for insurance claims, statutory filings, corporate secretarial, international expansion, investor data room hardening, release workflow, and portfolio FX consolidation
type: feature
---

Seven modules under `/founder/*` with per-module audit event tables. Tracking-only — no external sends, no cron, no automated legal/tax/insurance/clinical/investment decisions.

Routes: `/founder/insurance-claims`, `/founder/statutory-filings`, `/founder/corporate-secretarial`, `/founder/international-expansion`, `/founder/data-room`, `/founder/release-workflow`, `/founder/portfolio-fx`.

Command Centre attention card: `OperatingLoopsAttentionPanel` — surfaces claims needing action, filings overdue/30d, secretarial items due, expansion blockers, data room approvals pending, releases for review, FX warnings.

RLS: all tables founder/admin via `is_founder_or_admin(auth.uid())`, no anon access.
