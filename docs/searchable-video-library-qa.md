# Searchable Video Library — QA Self-Check Report
Date: 2026-06-16

## A. Overall status
**PARTIAL — usable for founder/admin review, missing a few items called out in the spec.**
The core promise (search a transcript, see timestamped snippets, jump into the external video, ask-this-video) is implemented end-to-end. Several spec items (segment-range assignment storage, completion evidence wiring, full audience/provider/approval filter UI, native upload/transcription) are partially implemented or absent.

## B. What is already working
- Route `/founder/video-library` registered in `src/App.tsx` (FounderRoute wrapped), reachable from Video SOP Factory header link (`src/pages/founder/VideoSopFactory.tsx:329`).
- Tabs: Library, Search, Ask, Coverage, Assignments, Privacy, Buyer/Adviser, Governance.
- DB schema in two migrations (`20260616094212…`, `20260616095512…`):
  - `video_library_items` with title, description, source_type, external_provider, external_url, duration_seconds, status, visibility, module_coverage, tags, business_id, video_type, audience_type, dashboard_area, asset_id (FK → video_sop_assets), approval_status, transcript_status, privacy_status, approved_by/at, buyer_handover_ready, redaction_*, embedding_model, metadata, created_by/at.
  - `video_transcript_segments` with video_id, business_id, segment_index, start/end_seconds, speaker, text, text_tsv (GIN), embedding vector(1536) (HNSW cosine), privacy_flags jsonb, keywords text[].
  - Supporting tables: `video_library_chapters`, `video_library_access_grants`, `video_library_training_assignments`, `video_library_qa_log`, `video_library_redaction_reviews`, `video_library_search_audit`, `video_library_export_packs`, `video_library_audit_events`.
  - All tables RLS-enabled, founder/admin-only policies, GRANTs to authenticated + service_role.
  - Hybrid search RPC `match_video_segments` (semantic + keyword fused).
- Edge functions (founder/admin gated, JWT-validated):
  - `vid-ingest-transcript` — parses VTT/SRT/JSON, embeds via Lovable AI Gateway `openai/text-embedding-3-small` (1536d), batched 32, max 5000 segs / 2MB, writes audit event.
  - `vid-search` — embeds query (unless mode=keyword), calls RPC, joins titles, writes search audit.
  - `vid-ask` — retrieves top 8, calls `google/gemini-3-flash-preview` with strict snippet-only system prompt, returns timestamped citations, logs to `video_library_qa_log`.
  - `vid-privacy-scan` — regex+keyword scan; writes per-segment `privacy_flags`, flips video `privacy_status`, audits.
- Jump-to-timestamp helper supports YouTube/Vimeo/Loom natively; generic fallback appends `#t=<sec>` for any other provider (Panopto, Zoom, Guidde, manual external URL).
- Privacy review tab can move a video to approved_internal / approved_customer / approved_buyer / blocked and writes audit.
- Buyer/Adviser tab gates handover-ready on transcript + external_url + approved privacy + module/area coverage.
- Coverage tab groups by business × area, surfaces missing-transcript / privacy-blocked / buyer-ready counts.

## C. What is missing
- **Filters in search UI are incomplete.** Backend RPC supports `video_filter` and `business_filter`. The UI only exposes `mode` and a single-video filter. No UI filters for module/dashboard area, video_type, audience_type, provider, approval_status or privacy_status (must filter mentally in results).
- **Assignment segment range is not persisted.** UI form has `start_seconds`/`end_seconds` inputs and inserts them, but `video_library_training_assignments` has no such columns (`required_sections jsonb` instead). Insert with those fields will be rejected by PostgREST.
- **Completion evidence not wired.** No UI to mark `completed_at`, no linked checklist/quiz, no per-user assignment (only role).
- **No native video upload or audio transcription.** External link only; manual VTT/SRT/JSON upload only. (Accepted per the original brief — flagged explicitly here.)
- **Privacy scan does not flag personal names or generic "customer identifiers"** — only the listed regex/keyword categories. Names require an NER step that is not implemented.
- **Buyer-readiness flag (`buyer_handover_ready`) is computed from criteria in the UI but never written back to the column.** The column exists but no code sets it.
- **No founder approval workflow UI for `approval_status`** (draft/approved). Column exists; only privacy_status is interactively managed.
- **`vid-ask` model id** is set to `google/gemini-3-flash-preview` (unverified). If the upstream alias is wrong it will fail at runtime with a 4xx surfaced as `ai_call_failed`. Low-risk to swap to a known model.

## D. Bugs / risks found
1. **P0 — Assignment insert will fail** when a founder enters a timestamp range, because `start_seconds`/`end_seconds` columns are absent on `video_library_training_assignments`. Either drop those inputs or migrate the column / move to `required_sections`.
2. **P1 — `vid-search` and `vid-ingest-transcript` accept `business_id` but UI never sets it** when registering a video; coverage/business filter is therefore unusable until a business picker is added.
3. **P1 — Privacy scan keywords are case-insensitive but credit-card / phone regexes are broad** — false positives are likely (e.g. any long digit run trips credit_card). Flagged for tuning.
4. **P2 — `vid-ask` model alias unverified** (see C).
5. **P2 — Search audit and QA log are inserted via service-role from the edge function** — fine, but no founder UI surfaces them yet.
6. **P2 — `buyer_handover_ready` never written** (see C).

## E. Files inspected
- `src/App.tsx` (route registration)
- `src/pages/founder/VideoLibrary.tsx`
- `src/pages/founder/VideoSopFactory.tsx`
- `supabase/functions/vid-ingest-transcript/index.ts`
- `supabase/functions/vid-search/index.ts`
- `supabase/functions/vid-ask/index.ts`
- `supabase/functions/vid-privacy-scan/index.ts`
- `supabase/migrations/20260616094212_…sql`
- `supabase/migrations/20260616095512_…sql`
- `supabase/config.toml`
- `docs/searchable-video-library.md`
- `.lovable/memory/features/searchable-video-library.md`

## F. Files changed
- `docs/searchable-video-library-qa.md` (this report). No code changes in this self-check pass.

## G. Database / migration status
Two migrations applied. Schema matches the implementation; pgvector + pg_trgm enabled; HNSW index on embeddings; tsvector GIN index on text. All public tables have GRANTs and RLS. No migration consistency issues detected.

## H. AI Gateway status
- Embeddings: `openai/text-embedding-3-small`, 1536 dims, server-side only.
- Chat (Ask): `google/gemini-3-flash-preview`, temperature 0.2, snippet-only system prompt. **Model alias not verified — see D.4.**
- All AI calls go through `https://ai.gateway.lovable.dev/v1/{embeddings,chat/completions}` with `LOVABLE_API_KEY`. No AI calls from the client.
- 402 / 429 are caught and surfaced in `vid-ask`.
- AI usage is NOT yet logged into the global `ai_usage_ledger` (P2 — would unify cost tracking).

## I. Security / RLS status
- All nine new tables RLS-enabled, founder/admin-only policies via `public.has_role`.
- All three edge functions validate JWT, then re-check role server-side via service-role client; reject 403 otherwise.
- Service-role key only used inside edge functions; never exposed.
- No cross-business leakage path identified — RPC filters by business; queries default to founder-only.
- Public exposure: none — no anon grants, no public routes.
- No automatic external publishing, no automatic sharing, no paid provider activation, no deletion of existing Video SOP Factory data.

## J. Recommended next fixes
**P0 (blocking the assignments UI from working as built)**
- Either remove start/end_seconds inputs from the Assignments form, or add a migration adding `start_seconds NUMERIC, end_seconds NUMERIC` columns to `video_library_training_assignments` (and a "mark complete" action that sets `completed_at`).

**P1**
- Add a business picker (and module/area, video_type, audience, provider, approval, privacy filters) to the search panel and feed them into the RPC.
- Wire `buyer_handover_ready` to be set when all criteria in EvidencePanel pass (button or trigger).
- Add an Approval workflow tab/control to flip `approval_status`.
- Verify the `google/gemini-3-flash-preview` alias against the AI Gateway and swap if needed.

**P2**
- Surface `video_library_search_audit` and `video_library_qa_log` in the Governance tab.
- Tighten privacy regex (Luhn-check for credit cards, country-aware phone) and add basic name detection (optional NER).
- Log AI usage into `ai_usage_ledger` for unified cost tracking.
- Add per-user assignment + completion-evidence UI (quiz/checklist link).

## K. Final plain-English answer
Liftor now has a genuine Panopto-style searchable video library *for founders/admins*. A user can register an externally-hosted video, upload a VTT/SRT/JSON transcript, search across all transcripts by keyword / semantic / hybrid, see matching timestamped snippets, jump to that exact moment in YouTube / Vimeo / Loom (and a `#t=` fallback for Panopto/Zoom/Guidde/other), and ask the video questions that are answered only from transcript evidence with timestamped citations. Privacy scanning and buyer-handover readiness checks are in place.

What is still missing before this is truly Panopto-comparable: native video/audio capture + AI transcription, richer search filters in the UI, segment-range assignment storage with completion evidence, a founder approval workflow, name-level PII detection, and writing the buyer-ready flag back to the database. None of those gaps block the core "search and jump to the right moment" capability today — they block the broader operator-training and buyer-handover workflows from being fully self-serve.
