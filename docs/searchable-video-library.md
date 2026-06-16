# Searchable Video Library

Liftor's transcript-indexed video intelligence layer. External tools (Loom, Zoom, Panopto, Vimeo, YouTube unlisted, Guidde, HeyGen, Synthesia, Elai) handle capture/hosting. Liftor owns transcripts, search, privacy review, assignments and handover evidence.

## Why it matters
One long training, dashboard walkthrough, SOP recording or customer onboarding video becomes searchable operational memory — operators, customers, advisers and future buyers can jump to the exact moment they need.

## How to add a video
1. Open **Founder → Video Library** (or click "Searchable Video Library" from the Video SOP Factory).
2. Click **New video**. Fill in title, provider, external URL, video type, audience, dashboard area, tags and modules.
3. Click **Register**. The video is created in `draft` with `transcript_status = missing`.

## Adding / generating a transcript
- Click **Transcript** on the video row.
- Upload or paste a VTT / SRT / JSON transcript.
- The `vid-ingest-transcript` edge function parses segments, embeds each one via the Lovable AI Gateway (`openai/text-embedding-3-small`, 1536 dims) and writes to `video_transcript_segments`.
- The video flips to `status=ready`, `transcript_status=indexed`.
- An audit event `transcript_ingested` is written.

## Search by word or phrase
- Go to **Search**. Pick mode: hybrid / semantic / keyword.
- Filter by video. Results show timestamped snippets, semantic + keyword + combined scores, and "Jump to MM:SS" links that build provider-aware timestamped URLs (YouTube `?t=`, Vimeo `#t=`, Loom `?t=`).
- Every query is logged to `video_library_search_audit`.

## Ask this video
- Founder/admin only. Pick a video, ask a question.
- The `vid-ask` edge function retrieves the top transcript segments and calls `google/gemini-3-flash-preview` with a strict "answer only from snippets" prompt.
- The answer is shown with numbered citations + jump-to-timestamp links. If the transcript does not contain enough information, the model says so.
- Q&A is logged to `video_library_qa_log`.

## Privacy review
- Click **Privacy scan** on a video row. The `vid-privacy-scan` edge function regex-scans every segment for emails, phone numbers, payment card patterns, IBANs, JWTs, API keys, SSNs, and health/financial/confidential keywords.
- Flags are written to `video_transcript_segments.privacy_flags`. The video `privacy_status` flips to `flagged` (if any flags) or `approved_internal`.
- The **Privacy** tab lets a founder/admin approve internally, for customer, for buyer, or block. Every decision is audited.
- A video is blocked from wider visibility until privacy is approved for that audience.

## Coverage map
- The **Coverage** tab groups videos by `business_id` × `dashboard_area`/`module_coverage`.
- It surfaces: areas covered, missing-transcript count, privacy-blocked count, buyer-handover-ready count.

## Assignments
- The **Assignments** tab assigns a whole video or a timestamp range to operator/oversight/customer/buyer/adviser roles with optional due dates.
- Stored in `video_library_training_assignments`. Completion timestamps are tracked.

## Buyer / adviser handover evidence
- A video qualifies as handover evidence when: searchable transcript exists, approved external link exists, privacy is approved, and module/area coverage is mapped.
- The **Buyer / Adviser** tab lists ready vs blocked videos with the specific blockers.

## Safety guarantees
- No automatic external publishing. No automatic customer/buyer sharing. No outbound emails. No paid provider activation. No deletion of existing video SOP data.
- All edge functions and all tables are founder/admin gated.
- Privacy review must pass before any audience wider than founder/admin sees a video.