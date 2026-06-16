# Project Memory

## Core
Dark theme on near-black navy background; semantic HSL tokens only — never hex/RGB or `text-white`/`bg-black` in components.
Liftor AI is an AI systems engineering company; never use studio/agency/consultancy.
Backend = Lovable Cloud (Supabase under the hood) — never expose Supabase to users.
Founder console at `/founder/*` with FounderRoute guard; client portal at `/portal/*`; supplier at `/supplier/*`; partner at `/partner/*`.
System runs in `system_mode='test'` by default — no real outbound sends until flipped to live.

## Memories
- [Full System Mirror](mem://features/full-system-mirror) — Auto-generated mirror of pages/content/backend/workflows/rules/integrations/flows with coverage validation and rebuild functions.
- [Strategic Upgrades](mem://features/strategic-upgrades) — Inbox scaling, contact enrichment, intent scoring, proposal/AI quality control, retry hardening, supplier load balancing, integrity checks, expanded health metrics, test/live mode flag.
- [Oversight Engine](mem://features/oversight-engine) — Anomaly detection, retry queue, escalations, system health snapshots, oversight UI.
- [CRM & Sanity Layer](mem://features/crm-sanity-layer) — Contacts, inboxes, communications, email events, outreach sanity gate.
- [Validation Suite](mem://features/validation-suite) — Platform Sandbox Mode and automated end-to-end diagnostics.
- [AI Conversation Engine](mem://features/ai-conversation-engine) — AI reply generation for inbound conversations.
- [Inbox AI Instructions](mem://features/inbox-ai-instructions) — Per-inbox brand AI reply instructions (NeonCandy seeded) injected into the AI engine system prompt with `escalate` classification.
- [Compliance Engine](mem://features/compliance-engine) — Compliance rules, events, scoring.
- [Finance System](mem://features/finance-system) — Deals, invoices, payments, targets.
- [Outreach Engine](mem://features/outreach-engine) — Campaigns, queue, sending health.
- [Procurement Engine](mem://features/procurement-engine) — Suppliers, assignments, load balancing.
- [Proposal & Demo Engine](mem://features/proposal-demo-engine) — Internal proposals, demo access, intent.
- [Execution Modes](mem://features/execution-modes) — Per-business gating of proposals/deals/invoicing/suppliers/outreach/demos via sales/outreach/hybrid modes.
- [Searchable Video Library](mem://features/searchable-video-library) — Transcript-indexed video module at /founder/video-library with hybrid (keyword+semantic) search, ask-this-video Q&A, and redaction/access governance; external hosts only (Loom/Zoom/Panopto/Vimeo/YouTube), Liftor owns the intelligence layer.
- [Healthcare Overlay Pack](mem://features/healthcare-overlay-pack) — Founder/admin governance layer for credentialing, safeguarding, clinical incidents, regulatory evidence; not a live clinical system
