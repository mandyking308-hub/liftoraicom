# Next-Generation Wealth & Philanthropy Network Registry

## Purpose

Liftor maintains a founder-only research register of organisations that can provide institutional or relationship routes into next-generation wealth holders, inheritors, family offices, philanthropic families, donor communities and impact investors.

This is an **intelligence layer, not an outreach permission list**. A high priority score means a network is strategically relevant to GHAT; it does not mean the organisation or its members permit unsolicited fundraising.

## Architecture — deliberately separate from Billionaire Intelligence

The network ecosystem is stored independently from the billionaire universe:

1. `public.philanthropy_network_registry` — organisation/network records.
2. `public.philanthropy_network_contacts` — public institutional routes, named public professional contacts, shared inboxes, public phones and contact/application pages, each with its own evidence source.
3. `public.philanthropy_network_research_queue` — the enrichment backlog for missing website/contact/person/email/route evidence.

There is **no automatic foreign key from these three tables into `billionaire_intelligence`**. A network or contact does not become a billionaire record. If a public member identity is later evidenced and safely matched, cross-over must happen through explicit evidence/link tables such as `philanthropy_network_members` and `billionaire_network_links`, preserving provenance and confidence.

## Live data — 22 August 2026

The live `public.philanthropy_network_registry` contains **141 active network records**:

- Tier 1: 42
- Tier 2: 79
- Tier 3: 20
- Inheritor-focus: 45
- Next-generation-focus: 43
- Family-office-focus: 53
- Impact-investing-focus: 52
- Official-site-checked: 70
- Explicitly marked needs-verification: 11

The contact-enrichment layer currently contains **18 verified public contact records across 17 Tier-1 networks**. At this pass:

- 8 networks meet the full working standard of named person + public email/shared institutional inbox + contact page;
- 9 networks have a verified route but still have at least one missing person/email field and remain `needs_manual_review`;
- 124 networks remain queued for enrichment.

Missing personal emails are never guessed. Where an organisation only publishes a form, the form is stored. Where an inbox is shared, it is explicitly labelled as a shared inbox rather than represented as the named person's personal email.

The initial research sweep used official organisation sites where available, plus a current maintained family-office network directory and the Young Donor Network's historical youth-philanthropy map. Historical directory entries are deliberately marked for refresh rather than treated as current facts.

## GitHub data snapshots

The repository carries portable snapshots as well as the live database:

- `data/philanthropy-network-registry-2026-08-22.jsonl` — all 141 organisation records, one JSON object per line.
- `data/philanthropy-network-contacts-2026-08-22.jsonl` — current verified public contact evidence.
- `supabase/migrations/20260822093600_philanthropy_network_intelligence.sql` — reproducible founder-only registry/contact/research-queue schema and RLS.

The live database remains the working source of truth; dated GitHub data files are auditable snapshots.

## Priority tiers

### Tier 1 — core routes
Directly relevant to inheritors, rising-generation family wealth, major philanthropic families, private impact capital or GHAT-aligned donor communities. Examples include Generation Pledge, Resource Generation, NEXUS Global, NxGeN, FBN NxG, GFOC Global Next Gen Community, The ImPact, Giving Pledge, Solidaire Network, Threshold Foundation, Toniic, PYM, African Philanthropy Forum, AVPA, Philanthropy Asia Alliance and Asia Philanthropy Circle.

### Tier 2 — strategic ecosystem
Family-office associations, family-business networks, funder networks, impact-investing communities, philanthropy infrastructure organisations and regional donor ecosystems that can provide credible relationship or institutional pathways.

### Tier 3 — outer ring / connector layer
Broader wealth-peer networks, professional/advisory ecosystems, platforms and communities that may contain relevant principals or intermediaries but require qualification before time is invested.

## Source states

- `official_site_verified` — current information checked against the organisation's own site. This does **not** verify permission to approach members.
- `reputable_directory_current` — present in a current maintained ecosystem directory; official route should still be checked before action.
- `historical_directory_needs_refresh` — came from an older youth-philanthropy map and must be refreshed before being treated as current.
- `needs_verification` — plausible/relevant record retained for research, but current public details need a dedicated verification pass.

Contact records separately carry their own `verification_status`, `source_url`, `last_verified_at` and notes. This prevents an organisation-level verification from being misread as verification of a specific email or person.

## Access and outreach boundary

`access_mode` records what is known about membership/application/invitation access. Unknown values remain `unknown_requires_verification`.

Before any external approach Liftor must separately verify:

1. the network is still active;
2. the current public/institutional route;
3. membership and event access rules;
4. any explicit no-solicitation or no-fundraising restriction;
5. the relevance of the proposed GHAT work;
6. whether outreach has been explicitly approved under Liftor's existing outreach controls.

Restrictions are preserved as data. Examples include NEXUS's no-solicitation boundary, Threshold's no-unsolicited-funding-request boundary and Resource Generation's member-confidentiality/privacy considerations.

No private addresses or inferred private contact details are created. Only public professional/institutional routes are stored.

## UI

`src/components/founder/billionaire/NetworkRegistryTab.tsx` is contact-aware and remains read-only. It displays:

- network/tier/region/focus;
- website and evidence state;
- named contact and role where verified;
- public email/shared inbox or contact form;
- contact-coverage filters;
- GHAT route notes and access restrictions.

The component still requires its small parent-tab wiring/publish step if it is not already mounted in the founder Billionaire Intelligence view. No send action is implemented here.

## Security

All three network-intelligence tables have RLS enabled. `authenticated` receives table privileges, while row policies restrict access to founder/admin roles using Liftor's existing `has_role` convention. `service_role` retains full access.
