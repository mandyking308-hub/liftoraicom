# Kindnesss Apollo retention — 25 Oct 2026

- Founder UI: `/founder/outreach/apollo` → **Kindnesss · Retained Apollo data**.
- Verified 10:10 UTC with authenticated founder access: 2,552 retained lead rows, 2,552 distinct Apollo person IDs, 109 emails.
- Initial private export audit: `d99a8e62-fdba-4199-8a3b-d31a067fb07d`; payload SHA-256 `21293a9ba3173e8cae73e33910fa844a84525ee7ff3056abe1f3a0561c3041e0`.
- One existing record was reimported for proof: run `db039a47-86fc-424f-ac71-6fc046deaa40`; 1 matched, 0 inserted, replay returned the existing run.
- Retained identity, names, title, company, email/status, qualification, suppression, lawful-basis, campaign-eligibility and do-not-contact export values stayed unchanged.
- Anonymous export/import requests were denied. A conflicting CSV email marked “verified” was only reported as a conflict.
- Paid enrichment and waterfall remained off. No Apollo calls, credits, sending, Smartlead changes or CRM promotion.
- Not verified: Apollo-side completeness against the external 1,893-contact list or 1,250-contact CSV; automatic Apollo UI-to-Liftor sync.

## Operator steps — external Apollo enrichment

1. Finish the current import in Apollo. Export the full Kindnesss October list and the additional dataset, including **Apollo person ID**, work email and supplied email status. Use separate files if needed; maximum 10,000 rows / 10 MB per upload.
2. Open the existing founder Apollo page in the Lovable preview at `/founder/outreach/apollo`. Select the Apollo export CSV. Preview reports existing matches, new identities and conflicting addresses. Confirm only after reviewing these counts.
3. Import is atomic and serialized; a server-computed content hash detects repeated normalized batches. The supplied original file hash is retained as provenance, not treated as proof of content or verification. Repeated import returns the same run without another write.
4. Existing nonempty emails are never replaced by CSV. New work-email/status claims are retained with `supplied_claim_not_independently_verified`; missing enrichment dates remain unknown. Conflicting addresses are retained in import evidence, not substituted into the lead email.
5. Download **all retained leads**, not an outreach-ready send list. It includes IDs, runs, source timestamps when known, import history, supplied email status and available linked suppression/compliance state. Unknown linked controls are blank, never clearance. Each download creates an audit record with count, actor, timestamp and server payload checksum; the UI also reports the actual CSV checksum. No public storage or download endpoint.
6. Compare the preview and post-import export against the external CSV IDs to establish completeness. The current 2,552 count cannot establish the union of the 1,893 list and 1,250 import because overlap is unknown. A CSV without person IDs is rejected: do not use name-only matching.

## Retention audit and scope

- `apollo_raw_leads` is a security-invoker **view** over retained leads/quality profiles, not a second copy or backup.
- Existing generic outreach import keeps raw input but promotes a narrower set of fields into CRM; it is deliberately not used for this Apollo retention task because it can create CRM records. No CRM contacts/relationships were inserted or changed here.
- Existing legacy enrichment code could replace nonempty lead emails with null/unsuitable results. The Kindnesss-specific trigger now preserves nonempty emails and their existing enrichment context; attempts to delete these leads (including cascading run/segment cleanup) fail instead of silently losing source data. Original lead/run IDs remain unchanged.
- Existing search/enrichment payloads are preserved in the database; export selects explicit lead/provenance/control fields, not arbitrary provider payloads. Future CSV source evidence is append-only in the existing `search_payload.retention_history`; import outcomes are stored there and counted in existing sync runs/activity log.
- No automatic Apollo polling or paid-enrichment path was enabled. The verified route for enrichment done in Apollo UI is this explicit CSV workflow; API list/contact sync was not probed or claimed operational.
- No persistent storage-bucket snapshot was created. The authenticated 2,552-row export was tested, counted/checksummed, then temporary local copies were removed. The founder can download the audited CSV now in preview; database snapshots/exports do not cover storage files.

## Validation and release

- Authenticated browser flow verified the download (2,552 unique persons / 109 emails), CSV preview, confirm and idempotent replay.
- Actual CSV SHA-256 for the browser verification export: `116537df0be54e9c0ae64f4a63cd30ca1b7fd10cb2fe50c21e447c23c0290e1f` (timestamps/history mean later exports may differ).
- 17 focused retention/credit-firewall tests passed; focused lint passed; automatic compilation reported **build OK**.
- Browser verification initially encountered a stale preview server dependency. Restarting the supervised preview fixed it; no unrelated source/configuration change was required.
- Starting HEAD: `8ea8a53e8d5d73c8dd21d35609809ab47fa5427f`. Source changes: retention helper/tests, new founder panel and its import into the existing Apollo page, AGENTS/roadmap and this note. Additive database function/trigger migrations: `0014_kindnesss_apollo_retention` and `0015_kindnesss_apollo_retention_integrity`; existing generated types refreshed automatically.
- Backend RPCs are applied; the founder UI is verified in preview, **not published**. No provider deployments, external API actions, email, payment, mailbox or other-business changes.