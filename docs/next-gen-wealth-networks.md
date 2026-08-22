# Wealth Intelligence — Next-Generation Wealth & Philanthropy Networks

## Purpose

Liftor maintains a founder-only **Wealth Intelligence** research layer for organisations that provide institutional or relationship routes into next-generation wealth holders, inheritors, family offices, philanthropic families, donor communities and impact investors.

This is intentionally reusable across **GHAT, HNW research, philanthropy, family-office work and future portfolio initiatives**. It is not a GHAT-only donor list and it is **not CRM inventory**.

A high priority score means a network is strategically relevant; it does not mean the organisation or its members permit unsolicited fundraising.

## Architecture — deliberately outside CRM and Billionaire Intelligence

The ecosystem is stored independently:

1. `public.philanthropy_network_registry` — organisation/network records.
2. `public.philanthropy_network_contacts` — public institutional routes, named public professional contacts, shared inboxes, public phones and contact/application pages, each with evidence.
3. `public.philanthropy_network_research_queue` — enrichment backlog for missing website/contact/person/email/route evidence.

All records are stamped `data_domain = 'wealth_intelligence'`.

The network and contact tables have `crm_sync_allowed = false` plus database CHECK constraints that reject attempts to change that flag. Research intelligence therefore cannot be silently promoted into `contacts`, lead tables, CRM interaction ledgers, outbound systems or sales pipelines.

If a real relationship later exists, a **separate CRM record must be deliberately created** with its own relationship evidence and consent/compliance state. The Wealth Intelligence source record remains unchanged.

There is also **no automatic foreign key from these three tables into `billionaire_intelligence`**. If a public member identity is later evidenced and safely matched, cross-over must happen through explicit evidence/link tables such as `philanthropy_network_members` and `billionaire_network_links`, preserving provenance and confidence.

## Intended uses

Registry records default to:

- GHAT
- HNW intelligence
- philanthropy intelligence
- family-office intelligence

This lets the same research asset support multiple founder workstreams without duplicating people into operational CRMs.

## Live data — 22 August 2026

The live registry retains **141 total network records**: **140 active** and **1 merged/historical**. The merged record is Beacon Collaborative, retained with provenance after its May 2025 merger into NPC rather than being deleted.

- Tier 1: 42
- Tier 2: 79
- Tier 3: 20
- Inheritor-focus: 45
- Next-generation-focus: 43
- Family-office-focus: 53
- Impact-investing-focus: 52

Tier 1 has public route coverage for **42 / 42 networks**.

Current enrichment coverage:

- **67 networks** have public contact intelligence stored.
- **51** meet the current completion standard: named public professional contact plus a usable public email or contact route and source evidence, or an explicitly resolved lifecycle state.
- **17** have partial/public-route intelligence and remain under manual review.
- **73** remain pending for enrichment.
- Tier 2 currently has contact coverage for **25 / 79 networks** and is the active research pass.

Missing personal emails are never guessed. Where an organisation only publishes a form, the form is stored. Where an inbox is shared, it is explicitly labelled as a shared institutional inbox rather than represented as a named person's personal email.

## GitHub data and schema

- `data/philanthropy-network-registry-2026-08-22.jsonl` — organisation snapshot.
- `data/philanthropy-network-contacts-2026-08-22.jsonl` — dated public-contact evidence snapshot; the live database is authoritative while enrichment is in progress.
- `supabase/migrations/20260822093600_philanthropy_network_intelligence.sql` — registry/contact/research schema and RLS.
- `supabase/migrations/20260822104000_wealth_intelligence_crm_firewall.sql` — hard Wealth Intelligence domain / CRM firewall.

The live database is the working source of truth; dated GitHub files are portable audit snapshots.

## Priority tiers

### Tier 1 — core routes
Directly relevant to inheritors, rising-generation family wealth, major philanthropic families, private impact capital or highly aligned donor communities.

### Tier 2 — strategic ecosystem
Family-office associations, family-business networks, funder networks, impact-investing communities, philanthropy infrastructure organisations and regional donor ecosystems.

### Tier 3 — connector layer
Broader wealth-peer networks, professional/advisory ecosystems and communities requiring qualification before time is invested.

## Evidence and outreach boundary

Every contact record carries its own `verification_status`, `source_url`, `last_verified_at`, route type and notes. Organisation verification is never treated as verification of a specific person or email.

Before any external approach Liftor must separately verify current access rules, relevance, restrictions and outreach approval. No-solicitation, privacy, invitation-only and no-unsolicited-funding rules are stored as intelligence and must be respected.

No private addresses or inferred private contact details are created. Only public professional/institutional routes are stored.

## UI

`src/components/founder/billionaire/NetworkRegistryTab.tsx` currently provides the read-only network interface. The data domain itself is independent of Billionaire Intelligence; the component location is presentation only and should ultimately sit under a broader Founder **Wealth Intelligence** surface rather than CRM.

No send action is implemented in this view.

## Security

All three tables use founder/admin RLS. `service_role` retains full access for controlled system operations. There are no triggers from these tables into CRM, lead or outbound tables.
