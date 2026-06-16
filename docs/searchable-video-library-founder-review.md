# Searchable Video Library — Controlled Founder Review Test
Date: 2026-06-16

## A. Overall verdict
**READY FOR MANDY UI REVIEW** (founder/admin only, single controlled test record).
The module is reachable, all primary flows (register → transcript → search → jump → ask → approval → privacy → assignments → buyer-ready) are wired to live tables and edge functions. No fake business data was created during this review; Mandy provides the one test record herself per the checklist below.

## B. Exact URL/page Mandy should open
- Primary: `/founder/video-library`
- Alt entry: `/founder/video-sop-factory` → header button **“Searchable Video Library”**

Sign in as `mandyking308@gmail.com` (founder). Non-founder users are redirected by `FounderRoute`.

## C. What she should click first
1. Open `/founder/video-library`.
2. Tab **Library** → button **New video**.

## D. Test data Mandy needs to provide
Use a **non-sensitive internal recording** only (e.g. an internal Liftor walkthrough she already owns). Do **not** use customer or healthcare-marketplace footage for this first pass.

Provide:
| Field | Suggested test value |
|---|---|
| Title | `Liftor internal test — video library smoke` |
| Provider | `loom` / `youtube` / `vimeo` (whichever she has an unlisted URL for) |
| External URL | her own unlisted video URL |
| Video type | `walkthrough` |
| Audience type | `internal` |
| Dashboard area | `video-library` |
| Modules | `["test"]` |
| Approval status | leave `draft` |
| Privacy status | leave `unchecked` |
| Transcript | a short VTT or SRT (10–30 segments) matching the video, OR paste JSON `[{start,end,text}]`. Must contain at least one distinctive word she can search for (e.g. `“handover”`). |

If she does not have a real video+transcript pair to hand, she can still validate UI shape using a 3-segment JSON transcript and any unlisted URL — but Ask-this-video answers will only be meaningful with a real transcript.

## E. End-to-end test result (against current build)

| Step | Wired? | Notes |
|---|---|---|
| Navigation (SOP Factory → library, `/founder/video-library`) | ✅ | Route registered in `src/App.tsx`; link in `VideoSopFactory.tsx` header |
| Add video record (all fields above) | ✅ | `New video` dialog inserts into `video_library_items` and writes `video_library_audit_events` (`register`) |
| Add transcript (VTT/SRT/JSON) | ✅ | `vid-ingest-transcript` parses, embeds via Lovable AI Gateway (`openai/text-embedding-3-small`), writes `video_transcript_segments`, flips `status=ready`, `transcript_status=indexed`, logs `transcript_ingested` |
| Search by transcript word | ✅ | `vid-search` → `match_video_segments` RPC. Results show title, MM:SS, snippet, provider, approval + privacy status, jump action. Logged to `video_library_search_audit` |
| Timestamp jump | ✅ where provider supports it (YouTube `?t=`, Vimeo `#t=`, Loom `?t=`). Other providers: fallback shows open-link + timestamp text |
| Ask This Video | ✅ | `vid-ask` retrieves top 8 segments, calls `google/gemini-2.5-flash` with strict “answer only from snippets” prompt, returns numbered citations + jumps, logs to `video_library_qa_log`. Says insufficient evidence when transcript doesn’t cover the question |
| Filters (business/area/module/video type/audience/provider/approval/privacy) | ✅ | All eight dropdowns exposed in Search tab; backend honours each |
| Approval workflow (draft → review_required → approved → archived) | ✅ | Approval tab gated: cannot move to `approved` while privacy is `unchecked`, `flagged`, or `blocked`. Every change writes audit event |
| Privacy scan | ✅ | `vid-privacy-scan` regex scan for emails/phones/cards/IBAN/JWT/API keys + health/financial keywords. Flags written to segment `privacy_flags`; video `privacy_status` → `flagged` or `approved_internal` |
| Assignments (full video / range / segment / mark complete) | ✅ | After P0 fix migration: `start_seconds`, `end_seconds`, `segment_id`, `notes`, `completed_at` all persist |
| Buyer/adviser evidence | ✅ | `recompute_video_buyer_handover_ready(uuid)` SECURITY DEFINER RPC writes `buyer_handover_ready` and the Buyer/Adviser tab lists blockers (no transcript / not approved / no module mapping / privacy not approved) |
| Audit events (register, ingest, privacy scan, approval, assignment, buyer-ready) | ✅ | All write to `video_library_audit_events`; search → `video_library_search_audit`; Q&A → `video_library_qa_log` |
| RLS / founder-only | ✅ | `FounderRoute` guards UI. All 9 video_library_* tables + `video_transcript_segments` restricted to founder/admin. No anon grants. No customer/buyer/adviser path enabled by default |

## F. Remaining bugs
None blocking for founder UI review. Pre-existing linter warnings on unrelated functions are out of scope.

## G. Limitations vs Panopto
- No native video upload or audio capture — external links only (by design).
- No automatic speech-to-text — transcripts must be provided as VTT/SRT/JSON.
- Privacy scan is regex/keyword; no named-entity recognition (won’t catch personal names).
- No quizzes / SCORM / LMS exports.
- No org-wide viewer analytics (search + Q&A are audited; per-viewer watch heatmaps are not).
- `ai_usage_ledger` not yet written from `vid-search` / `vid-ask` (cost telemetry gap).
- Founder/admin only — no customer/buyer/adviser portal surface yet (intentional safety gate).

## H. Final plain-English answer
**Yes — Mandy can now test Panopto-style searchable video inside Liftor.** She opens `/founder/video-library`, clicks **New video**, registers one non-sensitive internal recording, uploads a short VTT/SRT/JSON transcript, then exercises Search → Jump → Ask This Video → Privacy scan → Approval → Assignment → Buyer-ready recompute. Everything is founder/admin gated, audited, and no customer/buyer/adviser visibility is enabled by default. The main thing Liftor doesn’t do that Panopto does is host the video itself or auto-transcribe audio — that stays with external tools.