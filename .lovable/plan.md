# Apollo read-only mirror: feasibility findings and next step

## Result: NOT feasible today (blocked on credentials)
No working, authenticated Apollo connection can currently read the Kindnesss saved list.

## What was checked (read-only, no credentials printed, no paid calls)
1. Workspace connector "Mandy's Apollo.io" (API-key, gateway-backed): NOT linked to this project. A single free read (list saved lists) returned **401 – API key not valid**. The key has been revoked or replaced in Apollo.
2. Liftor's own stored Apollo keys (encrypted): only two rows, **Neon Candy** (verified 1 May) and **Liftor AI** (verified 5 Oct). There is **no Kindnesss key**. Using the Neon Candy key for Kindnesss would break business separation, so it must not be used. Whether the Liftor AI key still works or can see the Kindnesss list is unverified (testing it means decrypting it on the server).
3. Existing code: `apollo-sync-search` already supports a "saved list" mode (saved contacts search filtered by list). But it **forces `verified email only`**, so it would skip the ~4,494 people without email, and it writes into the older lead tables, not the new archive. It is the closest base, but it cannot be used for a full mirror as written.

## Exact blockers
- B1: No valid Apollo key. The workspace connector returns 401; there is no Kindnesss key in Liftor.
- B2: The Kindnesss list ID and list membership have not been confirmed. That needs B1 fixed first.
- B3: The existing sync filters out no-email people and targets the wrong tables.
- B4: Unverified: whether Apollo's saved-contacts search is free on this plan, and whether it returns all 7,022 (100 per page, about 71 pages, within Apollo's page cap).

## API fields vs the original CSV (7,046 rows, 75 columns)
- Apollo contact records (API) normally include: Apollo contact id, person id, account/organization id, name, title, seniority, departments, email plus email status, LinkedIn, city/state/country, organization (name, website, industry, employees, phone), phone numbers on record, list ids, owner, stage, timestamps, and custom fields.
- Usually missing or different in the API: the CSV's display wording; "Lists" as names (the API gives list ids); secondary/tertiary email source/status/verification columns; intent topic/score; the custom columns "Music Distribution Fit…" and "Qualify Contact" (they may only appear as custom field ids); and Email Sent/Open/Bounced/Replied/Demoed rollups.
- Row counts differ: CSV 7,046 vs live list 7,022. 24 people are in the CSV but not the live list (deleted or moved). An API mirror cannot recover them. **The CSV stays the authoritative original**, and an API pull would be an additional dated snapshot.
- These field details are from Apollo's general API shape. Nothing here was confirmed against your account (the key is invalid).

## Alternate full-file path (no browser upload needed)
Yes. You can attach the CSV directly in **this Lovable chat**. Attached files arrive in a private, read-only area of the build environment, never in the code. I could then run the existing founder-only import against the new archive, signed in as your founder account from a temporary script. The import keeps the 200-row steps, the check against the file's fingerprint and the reconciliation. Nothing goes into the code, logs or the public site. The attachment size limit was not verified. The upload page at /founder/outreach/apollo stays the primary path.

## Recommended next step (choose one; nothing is built until approved)
- A. Attach the original 7,046-row CSV here and approve a one-time import into the archive (fastest, lossless, all 75 columns).
- B. Replace the Apollo key in workspace Connectors, or add a Kindnesss-specific key. I then confirm with free reads only: the list ID, the total count and a 1-record field sample. After that I can plan a separate read-only "API snapshot" mirror into the archive, with the email filter removed, stored alongside the CSV originals and never overwriting them.

## Technical notes
- Connector: std connection is api_key, gateway, unlinked. The 401 came from a GET to `/api/v1/labels`.
- `apollo_connections`: rows only for Neon Candy and Liftor AI; Kindnesss is missing.
- `apollo-sync-search` saved_list branch: `label_ids=[saved_list_id]` with a hard-coded `contact_email_status=['verified']`.
- No switches, imports, sends or project changes were made.
