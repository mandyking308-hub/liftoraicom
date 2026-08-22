# Wealth Intelligence — Next-Generation Wealth & Philanthropy Networks

## Purpose

Liftor maintains a founder-only **Wealth Intelligence** research layer for organisations that provide institutional or relationship routes into next-generation wealth holders, inheritors, family offices, philanthropic families, donor communities and impact investors.

This is intentionally reusable across **GHAT, HNW research, philanthropy, family-office work and future portfolio initiatives**. It is not a GHAT-only donor list and it is **not CRM inventory**.

A high priority score means a network is strategically relevant; it does not mean the organisation or its members permit unsolicited fundraising.

## Architecture — deliberately outside CRM and Billionaire Intelligence

The ecosystem is stored independently:

1. `public.philanthropy_network_registry` — organisation/network records.
2. `public.philanthropy_network_contacts` — public institutional routes, named public professional contacts, shared inboxes, public phones and contact/application pages, each with evidence.
3. `public.philanthropy_network_research_queue` — research lifecycle and periodic re-verification queue.

All records are stamped `data_domain = 'wealth_intelligence'`.

The network and contact tables have `crm_sync_allowed = false` plus database CHECK constraints that reject attempts to change that flag. Research intelligence therefore cannot be silently promoted into `contacts`, lead tables, CRM interaction ledgers, outbound systems or sales pipelines.

If a real relationship later exists, a **separate CRM record must be deliberately created** with its own relationship evidence and consent/compliance state. The Wealth Intelligence source record remains unchanged.

There is also **no automatic foreign key from these three tables into `billionaire_intelligence`**. If a public member identity is later evidenced and safely matched, cross-over must happen through explicit evidence/link tables such as `philanthropy_network_members` and `billionaire_network_links`, preserving provenance and confidence.

## Intended uses

Registry records default to GHAT, HNW intelligence, philanthropy intelligence and family-office intelligence. The same research asset can therefore support multiple founder workstreams without duplicating people into operational CRMs.

## Completion state — 22 August 2026

The global mapping/enrichment pass is complete.

- **141 / 141 registry records resolved**
- **138 active organisations/platforms**
- **1 historical record** — Ask the Circle
- **1 merged record** — Beacon Collaborative, merged into NPC in May 2025
- **1 probable duplicate retained for audit** — Single Family Office Association Hong Kong (SFOAHK), not independently verified as distinct from FOAHK
- **143 contact/evidence rows covering all 141 registry records**
- **141 / 141 research-queue records complete; 0 pending**
- **141 / 141 have a public web/contact/successor/historical evidence route**
- **106 networks have a public email route**
- **92 networks have a named public professional contact**
- **63 networks have a public phone route**
- **128 networks have at least one official-site-verified contact/evidence record**
- **0 registry records and 0 contact records are CRM-syncable**

Tier counts remain 42 Tier 1, 79 Tier 2 and 20 Tier 3. Tier 1 has public-route coverage for 42 / 42.

A resolved record does not imply an email exists. Some private family-office communities deliberately expose only vetted applications, member-office introductions or restricted forms. Those are recorded as the valid access mechanism instead of inventing contact details.

## Lifecycle/data-quality rules

Records are retained rather than deleted when they become inactive, merged or duplicated. Lifecycle state and successor/canonical-route evidence are stored so historical research remains auditable.

Examples from this pass:

- Beacon Collaborative is retained as `merged` with NPC as successor.
- Ask the Circle is retained as `historical`; no current public operating route was verified.
- SFOAHK is retained as `duplicate_unverified` with FOAHK recorded as the probable canonical Hong Kong association.
- ALIGN is retained but reclassified as a family-office conference series rather than an independent membership network.

Missing personal emails are never guessed. Shared inboxes are labelled as shared. Form-only and invitation-only routes remain form-only. No-solicitation, privacy, confidentiality and no-unsolicited-funding restrictions are preserved as intelligence.

## GitHub data and schema

- `data/philanthropy-network-registry-2026-08-22.jsonl` — original organisation snapshot / audit seed.
- `data/philanthropy-network-contacts-2026-08-22.jsonl` — dated contact-evidence snapshot from the enrichment run.
- `data/wealth-intelligence-completion-2026-08-22.json` — final completion/validation manifest.
- `supabase/migrations/20260822093600_philanthropy_network_intelligence.sql` — registry/contact/research schema and RLS.
- `supabase/migrations/20260822104000_wealth_intelligence_crm_firewall.sql` — hard Wealth Intelligence domain / CRM firewall.

The **live Supabase database is the authoritative dataset**. Dated GitHub files are audit snapshots; they are not used as CRM inputs.

## Evidence and outreach boundary

Every contact record carries its own `verification_status`, `source_url`, `last_verified_at`, route type and notes. Organisation verification is never treated as verification of a specific person or email.

Before any external approach Liftor must separately verify current access rules, relevance, restrictions and outreach approval. No-solicitation, privacy, invitation-only and no-unsolicited-funding rules must be respected.

No private addresses or inferred private contact details are created. Only public professional/institutional routes are stored.

## UI

`src/components/founder/billionaire/NetworkRegistryTab.tsx` provides the current read-only interface. The data domain itself is independent of Billionaire Intelligence; it should ultimately sit under a broader Founder **Wealth Intelligence** surface rather than CRM.

No send action is implemented in this view.

## Security

All three tables use founder/admin RLS. `service_role` retains full access for controlled system operations. There are no triggers from these tables into CRM, lead or outbound tables.
