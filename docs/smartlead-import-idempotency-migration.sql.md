# Smartlead import idempotency migration

The earlier standalone SQL proposal is superseded by:

`supabase/migrations/20260908124846_smartlead_outreach_wiring.sql`

Apply that versioned migration as part of the [Smartlead rollout](smartlead-outreach-rollout.md), rather than applying the old snippet separately. It includes normalized email identity, provider lead identity, the `imported_from_provider` status, merge RPCs that preserve suppression, and the transfer/event tables and functions.

The migration checks existing duplicate identities and aborts if conflicts require review. It does not delete or merge existing records. It has been exercised against a representative PGlite schema, but has **not** been applied to Liftor's production database because this connection does not have access to that project.
