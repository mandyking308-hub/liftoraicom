---
name: Searchable Video Library
description: Liftor module that turns SOP/training/walkthrough/customer-onboarding videos into searchable, auditable operational memory with timecoded transcripts, hybrid (keyword + semantic) search, jump-to-timestamp links, and ask-this-video Q&A.
type: feature
---

**Purpose:** Own the intelligence/workflow/transcript-index/permissions layer on top of external hosting (Loom, Zoom, Panopto, Vimeo, YouTube unlisted, Guidde, HeyGen, Synthesia, Elai). Liftor does NOT replicate enterprise CDN/hosting.

**Route:** `/founder/video-library` (FounderRoute guarded).

**Tables (all founder/admin RLS):**
- `video_library_items` — videos (title, description, source_type, external_provider, external_url, duration, status, visibility, module_coverage, tags, redaction_status, transcript_segment_count).
- `video_transcript_segments` — timecoded segments with `text_tsv` (GIN) + `embedding vector(1536)` (HNSW cosine).
- `video_library_chapters`, `video_library_access_grants`, `video_library_training_assignments`, `video_library_qa_log`, `video_library_redaction_reviews`, `video_library_search_audit`, `video_library_export_packs`.

**Embeddings:** `openai/text-embedding-3-small` @ 1536 dims via Lovable AI Gateway. Q&A uses `google/gemini-3-flash-preview`. All AI calls server-side via edge functions.

**Edge functions:**
- `vid-ingest-transcript` — parses VTT/SRT/JSON, batch-embeds (32 at a time), writes segments, updates video status to `ready`. Max 5000 segments / 2MB.
- `vid-search` — embeds query (unless mode=keyword), calls `match_video_segments` RPC (hybrid weighted), logs to `video_library_search_audit`.
- `vid-ask` — retrieves top 8 transcript segments and asks LLM with strict "answer only from snippets" system prompt; returns answer + numbered citations with timestamps.

**RPC:** `public.match_video_segments(query_text, query_embedding, match_count, video_filter, business_filter, semantic_weight)` returns hybrid-ranked segments (semantic + keyword fused).

**Hosting model:** External video URLs only; Liftor never re-hosts media. Jump-to-timestamp URLs auto-built for YouTube/Vimeo/Loom.

**Privacy:** Founder/admin gated by default. `contains_sensitive_info` + `redaction_required` + `redaction_status` flow before any wider visibility. Every search and Q&A is audited.