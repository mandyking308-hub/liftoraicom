# Next-Generation Wealth & Philanthropy Network Registry

## Purpose

Liftor now maintains a founder-only research register of organisations that can provide institutional or relationship routes into next-generation wealth holders, inheritors, family offices, philanthropic families, donor communities and impact investors.

This is an **intelligence layer, not an outreach permission list**. A high priority score means a network is strategically relevant to GHAT; it does not mean the organisation or its members permit unsolicited fundraising.

## Live data — 22 August 2026

The live `public.philanthropy_network_registry` contains **141 active network records** from the initial global mapping pass:

- Tier 1: 42
- Tier 2: 79
- Tier 3: 20
- Inheritor-focus: 45
- Next-generation-focus: 43
- Family-office-focus: 53
- Impact-investing-focus: 52
- Official-site-checked: 70
- Explicitly marked needs-verification: 11

The initial research sweep used official organisation sites where available, plus a current maintained family-office network directory and the Young Donor Network's historical youth-philanthropy map. Historical directory entries are deliberately marked for refresh rather than treated as current facts.

## Priority tiers

### Tier 1 — core routes
Directly relevant to inheritors, rising-generation family wealth, major philanthropic families, private impact capital or GHAT-aligned donor communities. Examples include Generation Pledge, Resource Generation, NEXUS Global, NxGeN, FBN NxG, GFOC Global Next Gen Community, The ImPact, Giving Pledge, Solidaire Network, Threshold Foundation, Toniic, PYM, African Philanthropy Forum, AVPA, Philanthropy Asia Alliance and Asia Philanthropy Circle.

### Tier 2 — strategic ecosystem
Family-office associations, family-business networks, funder networks, impact-investing communities, philanthropy infrastructure organisations and regional donor ecosystems that can provide credible relationship or institutional pathways.

### Tier 3 — outer ring / connector layer
Broader wealth-peer networks, professional/advisory ecosystems, platforms and communities that may contain relevant principals or intermediaries but require qualification before time is invested.

## Source states

- `official_site_verified` — existence/current proposition was checked against the organisation's own site during the research pass. This does **not** verify permission to approach members.
- `reputable_directory_current` — present in a current maintained ecosystem directory; official route should still be checked before action.
- `historical_directory_needs_refresh` — came from an older youth-philanthropy map and must be refreshed before being treated as current.
- `needs_verification` — plausible/relevant record retained for research, but current public details need a dedicated verification pass.

## Access and outreach boundary

`access_mode` records what is known about membership/application/invitation access. Unknown values remain `unknown_requires_verification`.

Before any external approach Liftor must separately verify:

1. the network is still active;
2. the current public/institutional route;
3. membership and event access rules;
4. any explicit no-solicitation or no-fundraising restriction;
5. the relevance of the proposed GHAT work;
6. whether outreach has been explicitly approved under Liftor's existing outreach controls.

No private emails, phone numbers, addresses or inferred personal contact details were created in this mapping pass.

## UI

`src/components/founder/billionaire/NetworkRegistryTab.tsx` contains the founder UI for the register: summary counts, tier/source/focus filters, GHAT route notes and source links. It is intentionally read-only and displays an outreach-safety banner. Integration into the existing Billionaire Intelligence tab strip remains a small wiring change if the app builder is unavailable.

## Database

Live table: `public.philanthropy_network_registry`

Key fields include network name, category, priority tier, region, audience, website/source URLs, source status, access mode, inheritor/next-gen/family-office/philanthropy/impact flags, membership-size notes, GHAT route notes, status and verification timestamps.

RLS is enabled. `authenticated` users have table privileges but the row policy restricts access to founder/admin roles using the project's existing `has_role` convention. `service_role` retains full access.
