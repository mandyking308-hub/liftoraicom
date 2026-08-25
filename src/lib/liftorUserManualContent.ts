// Liftor User Manual — plain-English operating guide (separate from Founder/Technical Manual)

export const LIFTOR_USER_MANUAL_VERSION = "1.6 — August 2026 Architecture Reconciliation (25 August 2026)";

export interface ManualSection {
  number: number;
  key: string;
  title: string;
  body: string;
  anchor?: string;
}

export const LIFTOR_SIMPLE_GUIDE: ManualSection[] = [
  { number: 1, key: "what-liftor-is", title: "What Liftor is", body: "Liftor is your AI operating brain for running 25+ businesses. It watches, drafts, prepares, and waits for your approval. It never sends, posts, charges or files anything without you saying yes." },
  { number: 2, key: "one-rule", title: "The one rule: start in the Command Centre", body: "Always start at /founder/command-centre. Everything you need is there: alerts, business selector, today's actions, agents, journey map, manual." },
  { number: 3, key: "choose-business", title: "How to choose a business", body: "Use the Business Selector at the top. Neon Candy is the active test business. Switching changes every panel below to that business." },
  { number: 4, key: "alert-strip", title: "What the alert strip means", body: "Red = act today. Amber = review this week. Green = healthy. The strip never auto-resolves — you mark items read or resolved." },
  { number: 5, key: "todays-actions", title: "How to read 'What should Mandy do now?'", body: "A short list of the top 5–10 actions ordered by risk and urgency. Each action shows reason, owner, business, and whether it's internal or needs founder approval." },
  { number: 6, key: "journey-flow", title: "How to use the Customer Journey Flow", body: "Read it left to right: prospecting → CRM → outreach → reply → AI draft → approval → proposal → demo → deal → invoice → supplier → onboarding → support → surveys → complaints → quarterly report → renewal → win-back → retention. Click a stage to drill in." },
  { number: 7, key: "human-layer", title: "How to use the Human Layer", body: "Shows customers needing onboarding, bedding-in, low-CSAT, open complaints, surveys due, retention risks, win-back plans and upsell opportunities." },
  { number: 8, key: "agents", title: "How to check agents", body: "Open AI Agents card. Each agent shows status, last run, queue, and handover state. Safe internal jobs run on demand; external jobs need approval." },
  { number: 9, key: "approvals", title: "How to review approvals", body: "Founder Approvals shows everything waiting for a yes/no. Approve, reject, or send back for revision." },
  { number: 10, key: "external-locked", title: "How to keep external actions locked", body: "auto_send is OFF. Outbound cron is OFF. External gates show LOCKED badges. Don't unlock unless the business is fully ready." },
  { number: 11, key: "add-business", title: "How to add a new business", body: "Open Business Activation Wizard → create or pick the business → Dry-run checklist → Create checklist → upload knowledge → run training → generate starter pack → approve templates → run readiness test." },
  { number: 12, key: "what-to-upload", title: "What to upload for a new business", body: "Technical manual, user manual, website URL, brand guide, offer/pricing sheet, customer list, conversation history, social/content assets, policies, contracts, sales scripts, marketing plan, FAQs." },
  { number: 13, key: "how-it-learns", title: "How Liftor learns a business", body: "Open Business Knowledge Upload card → register each source → click Run training. Liftor reads everything and produces summaries for brand voice, customers, offers, operating rules, support style, marketing, risks." },
  { number: 14, key: "emails-marketing", title: "How Liftor prepares emails and marketing", body: "After training, click Generate starter pack. Liftor creates first/follow-up email templates, social pack, marketing assets list, proposal outline, onboarding flow, surveys, FAQs, complaints flow, prospecting targets — all internal until you approve." },
  { number: 15, key: "customers", title: "How Liftor handles customers", body: "CRM Total Memory keeps every interaction. Agents draft replies; founder approval required before send while gates are LOCKED." },
  { number: 16, key: "complaints-winback", title: "How Liftor handles complaints and win-back", body: "Complaints, disputes and win-back drafts appear in the Human Layer. Each draft is reviewable; nothing is sent until you approve." },
  { number: 17, key: "proposals-deals", title: "How Liftor handles proposals, demos, invoices, suppliers", body: "Revenue Layer shows proposals, demos, deals, invoices, payments, subscriptions, renewals, supplier delivery and revenue risks. Sends are gated." },
  { number: 18, key: "social-content", title: "How Liftor handles social, content and marketing", body: "Social Media Brain + Content Factory generate captions, posts and asset briefs. Publishing is gated." },
  { number: 19, key: "daily", title: "How to run daily checks", body: "Open Command Centre → Alert Strip → pick business → work Today's Actions → scan Journey Map → check Human Layer → approve pending items → run safe internal agents → glance at Revenue + Risk." },
  { number: 20, key: "weekly", title: "How to run weekly checks", body: "Performance scorecard, retention risks, prospecting list, social/content plan, finance/cashflow, complaints/disputes, supplier risks, system health." },
  { number: 21, key: "ready-go-live", title: "How to know if a business is ready to go live", body: "Activation Wizard shows readiness ≥ 90% with zero blockers. Approve go-live opens 'founder_approved_live' mode — gates remain LOCKED until you choose 'limited_external_live'." },
  { number: 22, key: "do-not-click", title: "What not to click unless ready", body: "Anything with a red 'External' or 'Locked' badge: Smartlead lead push, Apollo reveal, native email send, social publish, DM send, proposal/invoice/survey/onboarding share, payments, filings, exports." },
  { number: 23, key: "emergency-pause", title: "Emergency pause / stop", body: "Activation Wizard → Pause business. This sets activation_status=paused, go_live_allowed=false, mode=sandbox. No data deleted, no external notification." },
  { number: 24, key: "first-10", title: "First 10 things to do when opening Liftor", body: "1) /founder/command-centre. 2) Read Alert Strip. 3) Pick business. 4) Work Today's Actions. 5) Scan Journey Map. 6) Check Human Layer. 7) Approvals. 8) Run safe internal agents. 9) Revenue/Risk glance. 10) Refresh Usability Report." },
  { number: 25, key: "liftor-brain", title: "Liftor Brain / Mandy Co-Pilot", body: "The Liftor Brain is the central AI co-pilot at /founder/brain and inside Command Centre. It reads Command Centre, manuals, business knowledge, CRM, approvals, revenue, social, support, customer success, diagnostics and gates. It answers founder questions, explains blockers, suggests next actions, and drafts internal plans, replies, social content, support responses and revenue actions — and inbound email replies. It NEVER sends emails, publishes posts, calls Apollo, calls Smartlead, charges customers, creates portal accounts, or sends surveys/reports. Drafts always remain internal (external_send_allowed=false). OPENAI_API_KEY must be configured as a Supabase Edge Function secret for live answers; the key is never displayed in Liftor. Daily use: /founder/command-centre → 'What should I do now?' → review suggested actions → approve or edit in Founder Approval Console. Inbound reply use: open a conversation, click 'Draft reply with Liftor Brain', review source / missing context / risk, save internal draft with confirmation phrase, review and send only via correct external gate." },
  { number: 26, key: "business-onboarding-brain", title: "Adding a business with Liftor Brain", body: "When adding a new business: 1) Create or select the business. 2) Upload knowledge — technical manual, user manual, website copy, brand guide, offer/pricing, policies, FAQs, sales scripts, customer notes, social/content assets, operating instructions. 3) Open Command Centre → 'Business Onboarding Brain' card → select business → 'Preview starter pack'. 4) Review readiness score (0–100) and missing-context list — fill genuine gaps in the knowledge upload area, never invent facts. 5) When ready, type the exact phrase CREATE BUSINESS STARTER PACK and click 'Create starter pack' to save an internal versioned starter pack with email/follow-up templates, social/content plan, support FAQs, customer success flow, proposal outline and revenue activity plan. 6) A founder approval item is created automatically — review drafts in the Founder Approval Console. 7) Nothing is sent, published, scheduled, charged or invited externally. External go-live still requires the separate controlled external gates and remains LOCKED_BY_DESIGN. 8) The Brain runs in deterministic shell mode if OPENAI_API_KEY is missing — it will still report missing context and readiness but will not generate AI-written templates until the provider secret is added." },
  { number: 27, key: "starter-pack-materialiser", title: "Turning a starter pack into working drafts", body: "After Liftor saves a starter pack, open Command Centre → 'Starter Pack Materialiser' card (or /founder/starter-pack-materialiser). 1) Select the business and (optionally) the saved starter pack — defaults to the latest. 2) Toggle which sections to materialise: outreach/email templates, social content, support FAQs, customer success/onboarding, proposal outline, demo notes, revenue activity, supplier/delivery needs. 3) Click 'Preview materialisation' to see exactly which internal draft items will be created — counts, types, titles, missing context and risk warnings. 4) When ready, type the exact phrase MATERIALISE BUSINESS STARTER PACK and click 'Materialise starter pack'. Liftor writes each item as an internal draft (item_status = needs_review) into the materialised items store, skips duplicates from previous runs (idempotent), and creates a 'Starter Pack Materialisation Review' approval item for you. 5) Nothing is sent, published, scheduled, charged, invited or filed. external_send_allowed is false on every row. External go-live remains LOCKED_BY_DESIGN. 6) Re-running the same materialisation only adds items that did not already exist — repeat runs are safe." },
  { number: 28, key: "business-onboarding-factory", title: "Business Onboarding Factory (end-to-end internal drill)", body: "When you want a single button that runs the full onboarding for a business, open Command Centre → 'Business Onboarding Factory' card (or /founder/business-onboarding-factory). 1) Pick an existing business OR type a new business name and brief for a virtual preview (no real business created). 2) Paste any knowledge you have — manuals, website text, brand notes, offer/pricing, policies, customer notes. 3) Click 'Dry-run factory' to see readiness (0–100), missing context, risks and what will be created without saving anything. 4) To actually save outputs, type the exact phrase RUN BUSINESS ONBOARDING FACTORY and click 'Run & save factory'. Liftor will (a) call the Business Onboarding Brain to generate/save the understanding profile and starter pack, (b) call the Starter Pack Materialiser to create internal drafts, (c) create a 'Business Onboarding Factory Review' approval item, (d) log the run in the factory history. 5) Tick 'Create a real test business when saving' only when you want a real row added — names are forced to include '[Test]' and is_test_data=true. 6) Nothing is sent, published, scheduled, charged, invited or filed. external_ready is always false from this panel. External go-live remains LOCKED_BY_DESIGN and requires the separate controlled external gates." },
  { number: 29, key: "business-internal-activation", title: "Activating a business internally", body: "Once a business has knowledge, an understanding profile, a starter pack, materialised drafts and a factory run, you can move it into INTERNAL operating mode (not external go-live). 1) Open Command Centre → 'Business Internal Activation' card (or /founder/business-internal-activation). 2) Select the business and the activation mode (sandbox, internal_only, founder_review, limited_external_locked, paused). 3) Click 'Preview internal activation' to see readiness (0–100), missing context, blockers, risks, the operating runbook and the first 7-day daily action plan — nothing is saved. 4) When ready, type the exact phrase ACTIVATE BUSINESS INTERNAL MODE and click 'Activate internal mode'. Liftor creates (a) one business_internal_activation_records row, (b) ~20 operating runbook items (daily/weekly/event-based), (c) ~14 internal daily actions across 7 days, (d) one 'Business Internal Activation Review' approval item. 5) Work the daily actions and follow the runbook. 6) Nothing is sent, no DMs, no posts, no Apollo, no Smartlead, no Metricool, no ManyChat, no payments, no portal invites, no surveys, no reports. external_ready is hard-locked to false at the database level. auto_send_enabled and cron_enabled are hard-locked to false. External go-live remains LOCKED_BY_DESIGN and requires the separate controlled external gates." },
  { number: 30, key: "business-daily-operating-loop", title: "Running the daily business operating loop", body: "Once a business is internally activated, run its daily internal operating cycle. 1) Open Command Centre → \"Today's Business Operating Loop\" card (or /founder/business-daily-operating-loop). 2) Select the business — the panel shows the latest activation status and readiness. 3) Click 'Preview today's internal loop' to see today's loaded daily actions, open runbook items, missing context, risks, the planned classification (ready_to_work / needs_founder_review / missing_context / blocked_external / parked) and the planned internal outputs (daily summary, recommendations, draft reviews, knowledge gaps, compliance warnings, diagnostic notes). Nothing is saved. 4) When ready, type the exact phrase RUN BUSINESS DAILY OPERATING LOOP and click 'Run today's internal loop'. Liftor creates one business_daily_operating_runs row, writes the planned outputs into business_daily_operating_outputs (all internal, requires_founder_review=true, external_action_blocked=true), safely moves daily actions (open→done only for diagnostics, open→blocked for external-required, open→parked for missing context), and creates one 'Business Daily Operating Review' approval item. 5) Review the outputs and approval item in /founder/business-daily-operating-loop and the Founder Approval Console. 6) Nothing is sent, published, scheduled, charged, invited or filed. The loop never marks anything externally live and never enables auto-send or cron — both are hard-locked false at the database level. External go-live remains LOCKED_BY_DESIGN." },
  { number: 31, key: "business-weekly-review", title: "Running the weekly business review (learning loop)", body: "After a few daily operating loops, run the weekly internal review for each business. 1) Open Command Centre → 'Weekly Business Review / Learning Loop' card (or /founder/business-weekly-review). 2) Select the business and (optionally) adjust the week range — defaults to the last 7 days. 3) Click 'Preview weekly review' to see the deterministic scorecard (overall, readiness, knowledge, content, customer, revenue, operations — each 0–100), repeated missing context, risk warnings and the full set of planned internal outputs (weekly summary, next-week plan, knowledge gaps, readiness gaps, revenue/social/support/customer-success/CRM recommendations, compliance warnings, founder decision needed). Nothing is saved. 4) When ready, type the exact phrase RUN BUSINESS WEEKLY REVIEW and click 'Run weekly review'. Liftor creates one business_weekly_review_runs row, writes the planned outputs into business_weekly_review_outputs (all internal, requires_founder_review=true, external_action_blocked=true), and creates one 'Business Weekly Review' approval item. 5) Use the next-week plan internally to raise readiness toward ≥80 before any controlled external activation. 6) Nothing is sent, published, scheduled, charged, invited or filed. The weekly review never marks anything externally live; external_ready and external_actions_locked are hard-constrained at the database level. External go-live remains LOCKED_BY_DESIGN." },
  { number: 32, key: "controlled-external-activation-readiness", title: "Preparing for controlled external activation", body: "Once a business has internal activation, daily and weekly reviews, prepare for future controlled external activation (this is NOT go-live). 1) Open Command Centre → 'Controlled External Activation Readiness' card (or /founder/external-activation-readiness). 2) Select the business. 3) Click 'Preview external readiness' to see the deterministic readiness score (0–100), recommended mode (do_not_activate_yet / internal_only / ready_for_founder_review / ready_for_controlled_micro_batch_later / blocked), the per-channel readiness table (Smartlead cold outreach, native email, Apollo candidate pull/reveal, Metricool, ManyChat, proposal/invoice/payment, customer onboarding/report share, support reply, winback, portal invite, survey), the controlled micro-batch activation plan (sequence, founder decisions, provider setup, compliance/CRM fixes, draft reviews, max first batch, rollback plan, stop conditions, success metrics), blockers and warnings. Nothing is saved. 4) When ready, type the exact phrase RUN EXTERNAL ACTIVATION READINESS CHECK and click 'Save readiness plan'. Liftor creates one business_external_activation_readiness_runs row, per-channel rows in business_external_activation_channel_checks, one business_external_activation_plans row (plan_status='needs_review'), and one 'Controlled External Activation Readiness Review' founder approval item. 5) Do not enable any external gate from this panel — gate enables happen in a separate, channel-specific future prompt. 6) Nothing is sent, no DMs, no posts, no Apollo calls, no Apollo credits spent, no Smartlead POST, no Smartlead campaign start, no Metricool/ManyChat mutation, no payment created, no portal invite, no survey/report, no SMTP/native send, no email_queue send row, no auto-send, no cron. external_activation_allowed, external_ready and external_action_blocked are hard-constrained at the database level; secret_value_returned is hard-locked to false. External go-live remains LOCKED_BY_DESIGN." },
  { number: 33, key: "controlled-micro-batch-preparation", title: "Preparing a controlled micro-batch", body: "After the external activation readiness check has produced a plan for a business, you can prepare a tiny controlled micro-batch for ONE selected channel only. This is NOT execution and never sends, publishes, calls a provider, spends credits, charges, invites or shares anything. 1) Open Command Centre → 'Controlled Micro-Batch Preparation' card (or /founder/micro-batch-preparation). 2) Select the business and ONE channel (e.g. smartlead_cold_outreach, native_email, metricool_social_schedule, proposal_send, etc.). 3) Choose a desired batch size — anything above the per-channel cap is reduced automatically (Smartlead cold outreach ≤5, Apollo reveal ≤3, Metricool ≤3, everything else ≤1) and a warning is added. 4) Click 'Preview micro-batch' to see candidates pulled from materialised drafts, per-candidate compliance/CRM/provider/gate evidence, blockers and warnings, the approval packet preview and the future channel-specific execution phrase (e.g. EXECUTE SMARTLEAD MICRO BATCH, EXECUTE NATIVE EMAIL MICRO PROOF, SCHEDULE METRICOOL MICRO BATCH). Nothing is saved. 5) When ready, type the exact phrase PREPARE CONTROLLED MICRO BATCH and click 'Create approval packet'. Liftor creates one business_micro_batch_preparation_runs row, one business_micro_batch_candidates row per item, one business_micro_batch_approval_packets row (packet_status='needs_founder_review' or 'blocked') and one 'Controlled Micro-Batch Packet Review' founder approval item. 6) Review the packet — do NOT execute from this panel. Execution happens in a future channel-specific prompt and requires the channel's confirmation phrase. 7) execution_allowed is hard-locked to false, external_action_blocked is hard-locked to true and every external action gate remains locked at the database level. No emails, DMs, posts, Apollo calls/credits, Smartlead POST/campaign start, Metricool/ManyChat mutations, payments, portal invites, surveys, reports, SMTP/native sends, email_queue rows, auto-send or cron are ever created. External go-live remains LOCKED_BY_DESIGN." },
  { number: 34, key: "current-liftor-state-end-of-build-phase", title: "Current Liftor state — end of build phase (21A–22J)", body: "Liftor is the central AI operating brain for multiple businesses. It can onboard businesses internally, create starter packs, materialise drafts, activate businesses internally, run daily and weekly internal loops, prepare external readiness plans and prepare micro-batch approval packets. It does NOT send, publish or spend without a separate future controlled activation prompt. Mandy should start in the Command Centre. After Athens (post 28 May 2026), start with NeonCandy execution readiness (Prompt 23A). To run a closeout snapshot at any time: open Command Centre → 'Liftor Build Phase Closeout' card (or /founder/build-phase-closeout) and click 'Run closeout'. The closeout records classification, the latest acceptance summary, and the new-chat handover text. External go-live remains LOCKED_BY_DESIGN. No emails, DMs, posts, Apollo calls/credits, Smartlead POST/campaigns, Metricool/ManyChat/ad/payment mutations, portal accounts/invites, surveys/reports, auto-send or cron are enabled. OpenAI calls happen server-side only via the Brain, internal only. Build Phase 21A–22J closeout: functions include liftor-build-phase-closeout; tables include liftor_build_phase_closeout_records (founder/admin RLS only); components include LiftorBuildPhaseCloseoutPanel; routes include /founder/build-phase-closeout. Acceptance functions include liftor-brain-full-acceptance, business-onboarding-brain-acceptance, starter-pack-materialiser-acceptance, business-onboarding-factory-acceptance, business-internal-activation-acceptance, business-daily-operating-loop-acceptance, business-weekly-review-acceptance, business-external-activation-readiness-acceptance, business-micro-batch-preparation-acceptance, command-centre-usability-acceptance, command-centre-full-link-check, manual-closeout-acceptance, liftor-final-go-to-use-acceptance. Return-to-execution plan: 23A readiness → 23B Smartlead setup (no send) → 23C first micro-batch packet → 23D first controlled tiny send → 23E reply capture → 23F commercial handoff → 23G second business through factory." },
  { number: 35, key: "manual-source-hierarchy", title: "Manual source hierarchy and self-updating manuals", body: "Liftor preserves three manual layers plus supporting sources, with strict source priority used by the Brain context builder. 1) Slim Mandy Manual — short portable manual Mandy can download/upload to ChatGPT or advisers; gives current state, safety rules and next actions. Download it from Command Centre → 'Manuals — three-layer hierarchy' card or /founder/manuals-hub. It is NOT the technical source of truth. 2) User Manual — plain-English operator guide inside Liftor (/founder/user-manual). Explains what to click and what not to touch. 3) Full Technical / Kitchen-Sink Manual — canonical internal source of truth at /founder/founder-manual: routes, tables, edge functions, workflows, gates, agents, acceptance tests, hidden panels, diagnostics, legacy decisions, parked work, safety rules. Must not be overwritten by the slim manual. Indexed for retrieval by route, table, function, module, business, risk type and task type. 4) Build Log — historical decisions and acceptance runs (/founder/build-log). 5) Business Manuals — per-business tone, offer, rules and assets, selected business scope only. Source priority used by the Liftor Brain context builder: (a) Command Centre Truth Sync for current live state, (b) Full Technical Manual for architecture and system behaviour, (c) User Manual for operator instructions, (d) Build Log for historical decisions and deferred work, (e) selected Business Manuals for tone/offer/rules/assets, (f) Slim Mandy Manual for portable external handover only. The Brain does NOT pass the whole full manual into every AI request — it uses targeted chunk retrieval. Self-updating contract: build changes create rows in manual_update_drafts (status=draft → needs_review → approved/rejected → merged); major changes require founder review; manuals show version/date/source; old manual content is never silently deleted; the full technical manual remains canonical. Tables: manual_source_layers (the registry of layers with retrieval_priority and is_portable flag), manual_update_drafts (versioned drafts with founder review), manual_pages, manual_versions, build_log_entries. Acceptance function: manual-source-hierarchy-acceptance. Safety: no external action, no secrets exposed, no data deleted, no manual overwrites another manual." },
];

export const LIFTOR_FULL_GUIDE: ManualSection[] = [
  { number: 1, key: "intro", title: "Introduction: what Liftor does", body: "Liftor is the operating brain across all your businesses. It reads, learns, drafts, schedules and prepares — but never acts externally without founder approval." },
  { number: 2, key: "command-centre", title: "The Command Centre as the control room", body: "/founder/command-centre is the single source of truth. Every other founder page is reachable from it." },
  { number: 3, key: "business-selector", title: "Business selector and 25-business operating model", body: "Liftor scales to 25+ businesses. The selector switches scope. Modules show per-business readiness." },
  { number: 4, key: "alert-strip", title: "Founder Alert Strip", body: "Aggregates urgent customer issues, approvals due, cash/revenue/risk alerts, security warnings. Locked-external badge always visible." },
  { number: 5, key: "todays-actions", title: "Today's Actions panel", body: "Top 5–10 prioritised actions with reason, module, owner agent, business, risk level, internal/external flag and disabled-reason if blocked." },
  { number: 6, key: "journey", title: "Customer Journey Flow Map", body: "End-to-end stages from prospecting to retention. Stuck cards surface here." },
  { number: 7, key: "human-layer", title: "Human Layer / Customer Success", body: "Onboarding, bedding-in, complaints, disputes, low CSAT, surveys due, quarterly reports due, retention risks, win-back, upsell, next human touch." },
  { number: 8, key: "crm", title: "CRM Total Memory", body: "Every interaction across email, chat, social, calls is stored and searchable per customer." },
  { number: 9, key: "agents", title: "AI agents and what each one does", body: "Outreach, Reply, Draft, Proposal, Demo, Onboarding, Support, Complaint, Survey, Win-Back, Retention, Prospecting, Social, Content, Finance, Supplier, Risk, Governance — each with a single purpose, owner and gate." },
  { number: 10, key: "handovers", title: "Agent handovers", body: "When an agent finishes its job it hands off to the next agent or to founder approval. Handover queue is visible." },
  { number: 11, key: "approvals", title: "Founder approvals", body: "Anything that touches a customer, account, money, supplier or filing requires explicit founder approval." },
  { number: 12, key: "gates", title: "External gates and locked actions", body: "auto_send=false, outbound_cron=off, external_gate_locked=true on every business until founder explicitly chooses limited_external_live." },
  { number: 13, key: "activation", title: "Business Activation Wizard", body: "Single panel to plug a business in. Status, mode, readiness, checklist, integrations, imports, templates, blockers, next 10 actions, go-live and pause buttons." },
  { number: 14, key: "add-business", title: "Adding a new business", body: "Use the wizard, then upload knowledge, run training, generate starter pack, approve templates, run readiness test." },
  { number: 15, key: "upload-tech-manual", title: "Uploading a business technical manual", body: "Knowledge Upload card → upload_type=technical_manual → file or pasted text → register. Founder review required before training uses it." },
  { number: 16, key: "upload-user-manual", title: "Uploading a business user manual", body: "Same panel, upload_type=user_manual. Used to teach Liftor the business operating instructions and tone." },
  { number: 17, key: "upload-website", title: "Uploading or connecting website / public brand information", body: "Add the URL with source_kind=website_url. Crawl only happens after founder confirms 'REGISTER WEBSITE KNOWLEDGE SOURCE'." },
  { number: 18, key: "upload-offers", title: "Uploading offers, pricing and packages", body: "upload_type=offer_sheet or pricing_sheet. Drives proposal templates and pricing logic." },
  { number: 19, key: "upload-customers", title: "Uploading customer records", body: "upload_type=customer_list. Goes into CRM Total Memory after privacy review." },
  { number: 20, key: "upload-conversations", title: "Uploading existing conversations / emails", body: "upload_type=email_history. Trains tone of voice and reply style." },
  { number: 21, key: "upload-social", title: "Uploading social / content assets", body: "upload_type=social_assets. Used by Social Media Brain and Content Factory." },
  { number: 22, key: "upload-policies", title: "Uploading policies, contracts and legal documents", body: "upload_type=contracts / compliance_policy / support_policy / complaints_policy. Stored in data room with privacy_level." },
  { number: 23, key: "training", title: "How Liftor trains on a business", body: "Run business-training-run with the selected upload IDs. Confirmation phrase: TRAIN BUSINESS KNOWLEDGE." },
  { number: 24, key: "knowledge-brain", title: "How Liftor creates the business knowledge brain", body: "Training produces business / brand / customer / offer / operating / marketing / support / risk summaries plus templates and trained agent list." },
  { number: 25, key: "templates", title: "How Liftor creates templates", body: "Templates land in approved_template_library at approval_status=draft. Founder approves and flags approved_for_external_use." },
  ...[
    "How Liftor creates emails","How Liftor creates social media packs","How Liftor creates marketing and funnel material",
    "How Liftor creates proposals","How Liftor creates onboarding material","How Liftor creates surveys","How Liftor handles support",
    "How Liftor handles complaints and disputes","How Liftor handles customer recovery","How Liftor handles win-back",
    "How Liftor creates quarterly customer reports","How Liftor manages recurring revenue and renewals",
    "How Liftor manages prospecting and target accounts","How Liftor manages Smartlead scale outreach",
    "How Liftor manages native email","How Liftor manages Apollo sourcing","How Liftor manages social/content/ManyChat/Metricool",
    "How Liftor manages proposals/demos/deals","How Liftor manages invoices/payments","How Liftor manages suppliers/delivery",
    "How Liftor manages group HQ/entities","How Liftor manages treasury/cashflow","How Liftor manages accounting tasks",
    "How Liftor manages contracts/procurement","How Liftor manages people/access/training","How Liftor manages risk/insurance/incidents",
    "How Liftor manages product roadmap/QA/releases","How Liftor manages privacy/DSAR","How Liftor manages IP/rights",
    "How Liftor manages meetings/calls","How Liftor manages knowledge truth","How Liftor manages data room/documents",
    "How Liftor manages funding/exit readiness","How Liftor manages PR/reputation","How Liftor manages KPI/OKR/performance",
    "How Liftor manages partnerships/referrals",
    "How to run daily operations","How to run weekly operations","How to run monthly operations","How to run quarterly operations",
    "How to onboard another operator/helper","How to use Liftor safely","How to pause a business",
    "How to check if something is live or locked","How to run tests before go-live",
    "Glossary of Liftor terms in plain English","Troubleshooting guide",
    "First business activation checklist","New business upload checklist","What to do when something looks wrong",
  ].map((title, i) => ({
    number: 26 + i,
    key: title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g,""),
    title,
    body: `Plain-English guidance for "${title}". Open the matching Command Centre card, follow the safe internal action, and request founder approval before any external action. External gates remain LOCKED by default.`,
  })),
];

/**
 * Control Fabric — cross-cutting operating layer across all 15 control modules.
 * Plain-English summary used by the User Manual and surfaced on the Command Centre.
 */
export const LIFTOR_CONTROL_FABRIC_GUIDE: ManualSection = {
  number: 999,
  key: "control-fabric",
  title: "Control Fabric — one place to see every cross-cutting control",
  body:
    "The Control Fabric integrates the 15 cross-cutting control modules across Liftor: " +
    "Master Work Queue / Portfolio PMO, Unified Notifications & Escalations, " +
    "Role-Based Access & Delegation, Reporting Truth Layer, External Portals, " +
    "Bank/Payment/Payout Reconciliation, Multi-Currency / Jurisdiction / Tax Tracker, " +
    "E-commerce / Inventory / Returns, Booking / Scheduling, Document Vault / Evidence / Data Room, " +
    "AI Evaluation & Regression Testing, SOP & Playbook Version Control, " +
    "Backup / Export / Recovery, Founder Decision Register and Portfolio Memory / Handover. " +
    "Open Command Centre → 'Control Fabric' to see one line per module with the live open " +
    "count and a direct link. Counts are read-only — every external action (invites, exports, " +
    "data room shares, payouts, restores, irreversible decisions) stays approval-gated inside " +
    "the module that owns it. Nothing on this card sends, publishes, charges, files or shares.",
};

export const NEW_BUSINESS_OPERATING_FLOW: string[] = [
  "Create or select the business in the Activation Wizard.",
  "Upload the business technical manual if available.",
  "Upload the business user manual / operating instructions.",
  "Add the website / public brand URL (founder confirms intake).",
  "Upload offers, pricing and packages.",
  "Upload customer / support / operations documents.",
  "Run business training (confirmation phrase: TRAIN BUSINESS KNOWLEDGE).",
  "Review the business summary, brand voice, customer summary and risk summary.",
  "Generate the execution starter pack (CREATE BUSINESS STARTER PACK).",
  "Approve tone and templates in approved_template_library.",
  "Check Command Centre readiness in the Activation Wizard.",
  "Run safe internal agents only.",
  "Generate emails / social / marketing / proposals internally.",
  "Review external action gates — they remain LOCKED.",
  "Approve limited go-live only when readiness ≥ 90% and zero blockers.",
];

export const REHEARSAL_FLOW: ManualSection = {
  number: 76,
  key: "rehearsal",
  title: "How to rehearse a business before go-live",
  body: [
    "1) Select the business in the Business Selector.",
    "2) Open Business Activation → Business Rehearsal · Simulation · Operator Training.",
    "3) Pick rehearsal type (start with full_customer_journey) and click Dry-run, then Create rehearsal (CREATE BUSINESS REHEARSAL).",
    "4) Run internal-only rehearsal: Dry-run latest, then Run latest (RUN BUSINESS REHEARSAL). No external send / publish / push occurs.",
    "5) Read the scenario list — anything 'blocked' shows the missing prerequisite.",
    "6) Fix blockers: upload missing brand/offer/pricing sources, run training, generate starter pack, approve templates.",
    "7) Generate operator checklist for each training area (CREATE OPERATOR TRAINING CHECKLIST).",
    "8) Train helper / operator using the checklist.",
    "9) Re-run rehearsal until score ≥ 80% with zero blockers.",
    "10) Only then consider go-live gates (Approve go-live → still LOCKED until 'limited_external_live' is explicitly chosen).",
  ].join(" "),
};

// Append rehearsal section so it appears in the Full Guide listing
LIFTOR_FULL_GUIDE.push(REHEARSAL_FLOW);

export const REHEARSAL_RESET_FLOW: ManualSection = {
  number: 77,
  key: "rehearsal-reset",
  title: "Resetting after rehearsal before real use",
  body: [
    "1) Run rehearsal (CREATE BUSINESS REHEARSAL → RUN BUSINESS REHEARSAL).",
    "2) Review the scenario results and fix any blockers.",
    "3) Open Business Rehearsal panel → Rehearsal reset · Clean Real Mode.",
    "4) Click 'Reset preview' — confirm the list contains ONLY rehearsal_run / rehearsal_scenario / operator_training rows. If anything else appears, stop.",
    "5) Click 'Apply reset' — confirmation phrase RESET REHEARSAL DATA. Real customer / CRM / proposal / invoice / payment / supplier records are protected and refused by the safe-tables allow-list.",
    "6) Click 'Cleanliness check' — verifies no test/simulation data remains and the business is back in sandbox mode.",
    "7) Confirm the 'Clean Real Mode' badge is green in the Rehearsal panel.",
    "8) Only then unblock go-live in the Business Activation Wizard. Go-live is automatically blocked while test data remains.",
    "9) External gates (send / publish / push / charge / file) stay LOCKED until founder explicit approval.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(REHEARSAL_RESET_FLOW);

export const PRE_LIVE_BASELINE_FLOW: ManualSection = {
  number: 78,
  key: "pre-live-baseline",
  title: "Final pre-live baseline",
  body: [
    "1) Run rehearsal (CREATE BUSINESS REHEARSAL → RUN BUSINESS REHEARSAL).",
    "2) Reset rehearsal data (RESET REHEARSAL DATA) and run cleanliness check until 'Clean Real Mode' is green.",
    "3) Open Pre-Live Baseline panel → Operating standards → Dry-run, then Create standards (CREATE BUSINESS OPERATING STANDARDS).",
    "4) Review service / complaint / onboarding / renewal / win-back standards and escalation rules.",
    "5) Click Dry-run baseline to see readiness score and blockers.",
    "6) Fix any blockers (training, starter pack, approved templates, integrations).",
    "7) Click Create baseline (CREATE PRE LIVE BASELINE) when readiness is ≥ 90% and zero blockers.",
    "8) Confirm external gates remain LOCKED — they do not unlock automatically.",
    "9) Only then approve internal live use in the Activation Wizard. Go-live is auto-blocked without a baseline.",
    "10) Use rollback preview/apply (APPLY SAFE BUSINESS ROLLBACK) ONLY for safe internal config issues — real customer, CRM, communications, proposals, deals, invoices, payments, suppliers and documents are protected and never rolled back.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(PRE_LIVE_BASELINE_FLOW);

export const REVENUE_TARGET_FLOW: ManualSection = {
  number: 79,
  key: "revenue-target",
  title: "Setting a revenue target",
  body: [
    "1) Open Command Centre.",
    "2) Select the business in the Business Selector.",
    "3) Open the Revenue Target Operating Mode panel.",
    "4) Set target name, type (e.g. new_subscriptions), amount (e.g. £1,000) and the period (this month).",
    "5) Optionally set a target count (e.g. 10 new customers).",
    "6) Click 'Dry-run plan' to see required prospects, outreach, social actions, proposals, demos and upsells.",
    "7) Review the assumptions and risk flags. If history is missing, Liftor uses conservative placeholders and tells you.",
    "8) Click 'Create target + plan' (confirmation phrase CREATE REVENUE TARGET PLAN) to save it.",
    "9) Click 'Dry-run pace monitor' to see ahead / on_track / slightly_behind / behind / critical.",
    "10) Click 'Write progress snapshot' (CREATE REVENUE GOAL ACTIONS) when you want a saved checkpoint.",
    "11) Review recommended agent actions and recommended founder actions.",
    "12) Keep external sends and credit spend LOCKED until you approve them per item.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(REVENUE_TARGET_FLOW);

export const REVENUE_GOAL_AGENT_FLOW: ManualSection = {
  number: 80,
  key: "revenue-goal-agent",
  title: "How Liftor works toward a target",
  body: [
    "Liftor does not magically sell — it works backwards from your goal.",
    "The Revenue Goal Agent watches each active target and calculates the activity needed to hit it: prospecting volume, outreach drafts, social/content, follow-ups, proposals, demos, upsells, retention and win-back.",
    "It tracks pace daily and labels you ahead / on_track / slightly_behind / behind / critical.",
    "If you are behind, it recommends increasing prospecting, generating more content, running win-back drafts, following up open proposals, creating upsell offers, reviewing pricing, improving onboarding/retention or chasing renewals.",
    "All of this is internal until you approve. No emails, posts, DMs, Apollo calls, Smartlead pushes, money movement or filings happen without explicit founder approval.",
    "Hand-overs: revenue_target_behind → prospecting / social / outreach / customer_success / winback agents; proposal_gap → proposal agent; renewal_gap → customer_success agent; subscription_gap → revenue_goal_agent.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(REVENUE_GOAL_AGENT_FLOW);

export const NEW_BUSINESS_ONBOARDING_FLOW: ManualSection = {
  number: 81,
  key: "new-business-onboarding",
  title: "New business onboarding flow",
  body: [
    "1) Create/select business.",
    "2) Upload technical manual.",
    "3) Add website / public brand source.",
    "4) Upload user manual / operating instructions.",
    "5) Upload offers, pricing and packages.",
    "6) Upload customer / support / operations documents.",
    "7) Run Business Training (TRAIN BUSINESS KNOWLEDGE).",
    "8) Review business summary, brand voice, customer summary, risk summary.",
    "9) Generate Execution Starter Pack (CREATE BUSINESS STARTER PACK).",
    "10) Approve tone and templates.",
    "11) Run Business Activation checklist.",
    "12) Run Rehearsal (CREATE / RUN BUSINESS REHEARSAL).",
    "13) Reset rehearsal data (RESET REHEARSAL DATA).",
    "14) Confirm Clean Real Mode badge is green.",
    "15) Generate Operating Standards (CREATE BUSINESS OPERATING STANDARDS).",
    "16) Create Pre-Live Baseline (CREATE PRE LIVE BASELINE).",
    "17) Run Final Go-To-Use Readiness.",
    "18) Start internal use.",
    "19) Approve external actions only when ready, channel-by-channel.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(NEW_BUSINESS_ONBOARDING_FLOW);

export const AUTOPILOT_ROADMAP: ManualSection = {
  number: 82,
  key: "autopilot-roadmap",
  title: "Future Autopilot Levels",
  body: [
    "Liftor's autonomy grows in levels — module-by-module and business-by-business. Pause buttons stay available at every level.",
    "Level 0 — Locked / Manual: Liftor watches and reports only. Nothing acts.",
    "Level 1 — Draft Only: Liftor creates drafts (emails, posts, proposals, replies) but does not act.",
    "Level 2 — Internal Autopilot: Liftor updates CRM, creates tasks, scores prospects and prepares reports — no customer contact.",
    "Level 3 — Approved External Actions: Liftor executes only after founder approval per item.",
    "Level 4 — Limited Autopilot: Liftor can act within strict approved rules and caps (e.g. send up to N approved emails per day).",
    "Level 5 — Full Business Autopilot: Liftor runs large parts of the business while Mandy monitors exceptions.",
    "Always gated regardless of level: legal, finance, privacy, complaints, money movement, filings, deletions, exports of private data and any high-risk action.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AUTOPILOT_ROADMAP);

export const NEON_CANDY_FIRST_BUSINESS: ManualSection = {
  number: 83,
  key: "neon-candy-first-business",
  title: "First business under test: Neon Candy",
  body: [
    "Business: Neon Candy. Sender: hello@neoncandy.online.",
    "Smartlead API connected. Smartlead mailbox connected.",
    "Smartlead campaign creation/mapping and warm-up still need to be confirmed in Command Centre unless already completed.",
    "Native IONOS lane is safe-blocked. auto_send is disabled. Outbound cron is disabled.",
    "Smartlead scale lane is the intended future outreach path.",
    "All external actions remain gated. Activation/readiness must be checked from Command Centre.",
    "Secrets and passwords are never displayed in this manual.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(NEON_CANDY_FIRST_BUSINESS);

export const DAILY_WEEKLY_MONTHLY_QUARTERLY_EMERGENCY: ManualSection = {
  number: 84,
  key: "operating-checklists",
  title: "Daily / weekly / monthly / quarterly / emergency checklists",
  body: [
    "Daily: open Command Centre, clear Founder Alert Strip, select business, work Today's Actions top-to-bottom, scan Customer Journey for stuck stages, review Human Layer (onboarding/complaints/CSAT), approve / reject in Founder Approvals, run safe internal agents only, check Revenue Target pace.",
    "Weekly: performance scorecard, retention risks, prospecting list, social/content plan, finance & cashflow, open complaints/disputes, supplier risks, system health, revenue pace + plan adjustments.",
    "Monthly: customer quarterly reports prep, governance review, cashflow / accounting close, KPI/OKR review, board / founder report, data room check, entity obligations, renewal / churn / upsell review, revenue snapshot.",
    "Quarterly: customer quarterly reports send (after approval), strategic review, exit-readiness check, contract renewals, security & privacy review, compliance filings (after approval), pricing & offer review.",
    "Emergency: open Founder Alert Strip → escalate critical alert; pause affected business in Activation Wizard; lock outbound cron and auto_send; open complaint/incident in Risk panel; notify legal/insurance if needed; do not delete real data; capture timeline in Build Log.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(DAILY_WEEKLY_MONTHLY_QUARTERLY_EMERGENCY);

export const FIRST_TEN_ACTIONS: ManualSection = {
  number: 85,
  key: "first-10-actions",
  title: "First 10 actions Mandy should take now",
  body: [
    "1) Open /founder/command-centre and select Neon Candy.",
    "2) Run Final Go-To-Use Readiness → 'Run final acceptance'.",
    "3) Open Business Rehearsal · Reset · Clean Real Mode → confirm green Clean Real Mode badge (or RESET REHEARSAL DATA).",
    "4) Open Pre-Live Baseline → Dry-run baseline → fix blockers → CREATE PRE LIVE BASELINE.",
    "5) Open Revenue Target Operating Mode → set £1,000 new subscriptions this month → Dry-run plan.",
    "6) Review activity plan + risk flags → CREATE REVENUE TARGET PLAN.",
    "7) Click Dry-run pace monitor → review recommendations.",
    "8) Write first progress snapshot (CREATE REVENUE GOAL ACTIONS).",
    "9) Review Today's Actions and Founder Approval Console.",
    "10) Keep all external gates LOCKED — approve agent drafts internally only.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(FIRST_TEN_ACTIONS);

export const GLOSSARY: ManualSection = {
  number: 86,
  key: "glossary",
  title: "Glossary in plain English",
  body: [
    "Command Centre: the one screen where Mandy operates Liftor.",
    "Business: a company Liftor runs (e.g. Neon Candy). Each business has its own data, agents and gates.",
    "Agent: a specialised AI worker (prospecting, outreach, social, proposal, customer success, win-back, revenue goal, etc).",
    "Draft: something an agent has prepared but not sent. All drafts are internal until approved.",
    "Approval: Mandy says yes/no on an action before anything external happens.",
    "Gate: a lock that prevents an external action (send, publish, push, charge, file).",
    "Rehearsal: simulated customer journey using test data, no external actions.",
    "Clean Real Mode: confirmation that all rehearsal/test data has been removed.",
    "Pre-Live Baseline: a snapshot of what is real / locked / approved before going live.",
    "Operating Standards: the cadences/rules Liftor follows for service, support, complaints, onboarding, renewals.",
    "Revenue Target: a £/count goal for a period that the Revenue Goal Agent works backwards from.",
    "Pace status: ahead, on_track, slightly_behind, behind, critical.",
    "Autopilot Level: how much Liftor is allowed to do without asking (L0–L5).",
    "Build Log: append-only history of platform changes.",
    "External lane: any channel that contacts a real person or system (email, social, DM, Apollo, Smartlead, payments, filings).",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(GLOSSARY);

export const TROUBLESHOOTING: ManualSection = {
  number: 87,
  key: "troubleshooting",
  title: "Troubleshooting",
  body: [
    "Go-live blocked: check Pre-Live Baseline status; run Cleanliness Check; resolve any test data with RESET REHEARSAL DATA.",
    "Revenue target won't save: confirm period_start ≤ period_end and target amount > 0; check you have founder/admin role.",
    "Pace shows critical: open recommendations, increase prospecting/content/follow-ups; review pricing/offer with founder.",
    "Agent stuck: open AI Agents card, check last run + queue; re-run; if still stuck, escalate via Founder Alert Strip.",
    "Smartlead campaign missing: confirm in Smartlead panel; do NOT push leads or start campaign without explicit approval.",
    "External send blocked: this is correct — gates remain LOCKED until per-channel founder approval is recorded.",
    "Lost a page: every major function is reachable from Command Centre cards. Use the sticky nav and the Manual / Build Log card.",
    "Suspected secret leak: never paste secrets into manuals or Build Log; rotate via Lovable Cloud connectors.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(TROUBLESHOOTING);

export const COMMAND_CENTRE_MANUAL_LINKS: Record<string, string> = {
  "Business Activation": "new-business-onboarding",
  "Business Knowledge Upload": "how-it-learns",
  "User Manual": "what-liftor-is",
  "Revenue Target": "revenue-target",
  "Customer Journey": "journey-flow",
  "Human Layer": "human-layer",
  "Prospecting": "new-business-onboarding",
  "Smartlead": "neon-candy-first-business",
  "CRM Memory": "customers",
  "Surveys": "operating-checklists",
  "Onboarding": "operating-checklists",
  "Complaints": "complaints-winback",
  "Win-Back": "complaints-winback",
  "Quarterly Reports": "operating-checklists",
  "Social / Content": "emails-marketing",
  "Proposals / Demos / Deals": "proposals-deals",
  "Invoices / Payments": "proposals-deals",
  "Suppliers": "proposals-deals",
  "Group HQ": "operating-checklists",
  "Treasury / Cashflow": "operating-checklists",
  "Contracts / Legal": "operating-checklists",
  "People / Access": "operating-checklists",
  "Risk / Insurance": "operating-checklists",
  "Product / QA": "operating-checklists",
  "AI Governance": "external-locked",
  "Privacy": "external-locked",
  "IP / Rights": "operating-checklists",
  "Data Room": "operating-checklists",
  "KPI / OKR": "operating-checklists",
  "Alerts": "alert-strip",
  "Rehearsal": "rehearsal",
  "Clean Real Mode": "rehearsal-reset",
  "Pre-Live Baseline": "pre-live-baseline",
};

export const BUILD_LOG_CLOSEOUT = {
  title: "Liftor Build Closeout — Go-To-Use Manuals and Operating System Finalisation",
  date: "15 May 2026",
  notes: [
    "90+ prompt build sequence completed.",
    "Command Centre consolidated.",
    "User Manual created and bumped to v1.0 — Operator Go-To-Use Edition.",
    "Technical Manual updated to v5.2 — Build Closeout / Go-To-Use Edition.",
    "Business onboarding/training model documented.",
    "Rehearsal / reset / Clean Real Mode / baseline model documented.",
    "Revenue target operating mode documented.",
    "Autopilot roadmap (L0–L5) documented.",
    "First business Neon Candy readiness path documented.",
    "External actions remain gated.",
    "Ready to move from build phase to internal use phase, subject to final acceptance results.",
  ],
};

export const BUILD_LOG_HARDENING = {
  title: "Final Hardening Pass — Liftor Ready for Internal Use Review",
  date: "15 May 2026",
  notes: [
    "Command Centre hardened — Final Hardening Status panel mounted top of Command Centre, Testing, User Manual and System Health.",
    "Manuals checked — Technical v5.2 and User v1.0 both present and rendered.",
    "Safety gates checked — auto_send disabled, outbound cron disabled, all external lanes default LOCKED with confirmation phrases.",
    "External actions confirmed locked — no emails, posts, DMs, Apollo calls/credits, Smartlead pushes/campaigns, proposal/invoice/survey/report sends, money movement or filings occurred.",
    "First business (Neon Candy) readiness checked via liftor-final-go-to-use-acceptance.",
    "Revenue Target Operating Mode checked — tables, plan + monitor functions and panel verified.",
    "Rehearsal / Reset / Clean Real Mode / Pre-Live Baseline pipeline verified.",
    "No forbidden actions occurred during this pass.",
    "Remaining blockers (if any) surface in Final Hardening Status panel as 'Blockers'.",
    "Next phase: internal use from Command Centre — external go-live remains gated until per-channel founder approval.",
  ],
};

export const UNDERSTANDING_BUSINESS_VALUATION = {
  title: "Understanding Business Valuation",
  summary:
    "Liftor calculates indicative internal valuation ranges for each business across pre-revenue, post-revenue, profit, recurring revenue, asset-based, strategic-buyer, exit-readiness and group-portfolio stages. All outputs are internal only and require adviser review.",
  plain_english: [
    "Pre-revenue valuation is based on potential and assets — IP, audience, automation, strategic value, cost to recreate.",
    "Post-revenue valuation is based on actual sales — revenue, growth, recurring percentage and sector multiples.",
    "Profit valuation is stronger because it shows money left over (EBITDA / SDE × multiple, reduced for owner dependency).",
    "Recurring revenue improves valuation — ARR × multiple, adjusted for churn and gross margin.",
    "Strategic buyer valuation adds a premium for synergies; exit-readiness scores transferability and clean records.",
    "Group portfolio valuation aggregates all businesses with a group-risk discount and a shared-infrastructure premium.",
    "Valuation is only indicative until reviewed by qualified advisers, accountants or buyers.",
    "Liftor improves valuation by improving revenue, profit, retention, records, systems, automation and proof.",
  ],
  safety: [
    "Indicative internal estimate only. Not financial advice.",
    "Adviser review required before relying on valuation for investment, sale, tax, lending or legal decisions.",
    "No external disclosure. No publish. No automatic share with investors, buyers or advisers.",
  ],
  technical: {
    tables: ["business_valuation_snapshots", "business_valuation_assumptions"],
    functions: ["business-valuation-preview", "business-valuation-acceptance"],
    panel: "BusinessValuationIntelligencePanel (Command Centre · Daily Operator View)",
    safety_limits: [
      "founder role required to invoke preview function",
      "adviser_review_required defaults to true on every snapshot",
      "no external transmission of valuation numbers",
    ],
  },
};
export const USING_SOCIAL_AUTOPILOT = {
  title: "Using Social Autopilot",
  summary:
    "Social Autopilot is the multi-business social media spine. It is the same engine across every business added to Liftor. Neon Candy is just the first test case.",
  how_it_works: [
    "Per business, Liftor reads the uploaded technical manual, user manual, website, brand rules, offer/pricing sheet, customer profile, policies, FAQs, sales scripts and social/content assets.",
    "From those inputs it builds the social operating profile, content plan, calendar, approval flow, publishing queue, inbox capture, reply drafts and CRM-linked engagement.",
    "Everything stays internal until the founder configures provider gates and approves go-live.",
  ],
  what_is_locked_in_v1: [
    "No posts are published.",
    "No DMs are sent.",
    "No comments are sent.",
    "No Instagram / Facebook / TikTok / YouTube / LinkedIn / X / Metricool / Buffer / Hootsuite / ManyChat API call is made.",
    "Provider execution is fail-closed across the publish queue and the reply queue.",
  ],
  where_to_look: [
    "Daily Operator View shows the Social Autopilot block with automation mode, accounts, assets, drafts, blocked jobs, inbox and reply drafts.",
    "Full Diagnostic View shows the provider adapter capability matrix, queue health and rehearsal/test data counts.",
    "Open `/founder/social-autopilot` for the full Social Autopilot console.",
  ],
  before_go_live: [
    "Purge all rehearsal/test data via Social Autopilot → Settings → Rehearsal Purge.",
    "Confirm automation_mode = approval_required (default).",
    "Register at least one social account per platform per business.",
    "Approve content drafts and reply drafts individually before any send is enabled.",
  ],
};

export const USING_SOCIAL_CALENDAR = {
  title: "Using the Social Calendar",
  summary:
    "The Social Calendar turns approved or draft content packs, campaigns, revenue strategies and platform/cadence rules into a planned schedule. It supports day, week and month views. It remains internal only — Liftor does not post or schedule with any external provider from this layer.",
  views: [
    "Day view — slots by time with platform, status, asset and approval markers.",
    "Week view — 7-day grid with per-day platform counts and blocked markers.",
    "Month view — month grid with gap and blocked markers.",
    "Calendar types: 7, 14, 30, 90 day, plus campaign, revenue_goal, evergreen, launch, retention, custom.",
  ],
  safety: [
    "No posts published from the calendar.",
    "No external scheduling, no Metricool/Buffer/Hootsuite/ManyChat/IG/TikTok/FB/YT/LinkedIn/X API calls.",
    "No cron, no auto_send, no provider scheduled jobs.",
    "Blocked items must have assets/compliance/approval resolved before they can move to the publishing queue (later prompt).",
  ],
  flow: [
    "Generate cadence rules per business and platform (CREATE SOCIAL CADENCE RULES).",
    "Preview calendar from a content pack / campaign / revenue strategy.",
    "Create calendar with confirmation phrase CREATE SOCIAL CALENDAR.",
    "Run readiness check (SAVE SOCIAL CALENDAR READINESS REVIEW) and gap analysis (SAVE SOCIAL CALENDAR GAPS).",
    "Reschedule internally with APPLY SOCIAL CALENDAR RESCHEDULE — no external schedules are touched.",
    "Purge test calendars with PURGE SOCIAL CALENDAR TEST DATA before real use.",
  ],
  technical: [
    "Tables: social_calendars, social_calendar_items, social_calendar_generation_runs, social_calendar_cadence_rules, social_calendar_gap_reviews.",
    "Extended: social_content_items.calendar_id/calendar_item_id/planned_at/calendar_status; social_content_packs.calendar_id/calendar_generation_status.",
    "Edge functions: social-calendar-preview, -create, -day-view, -week-view, -month-view, -cadence-generate, -readiness-check, -gap-analysis, -reschedule-preview, -reschedule-apply, -healthcheck, -rehearsal-purge, -acceptance.",
    "Command Centre: Daily Operator View shows the Calendar tile (calendars, items, blocked, queue ready, cadence rules, open gaps, next action). Full Diagnostic View shows raw calendar diagnostics.",
    "Safety rule: no external scheduling, no provider API calls, no real-data deletion (purge gated to is_test_data=true).",
  ],
};

export const APPROVING_SOCIAL_CONTENT = {
  title: "Approving Social Content",
  summary:
    "Founder approval is required before any social content, calendar item, reply or campaign can move forward. Approval is internal only — it does not publish, schedule externally, or send anything.",
  rules: [
    "Social Autopilot drafts content first; nothing moves without founder approval.",
    "Approval does not publish, schedule, or DM.",
    "Compliance-blocked, rights-blocked, or asset-blocked items cannot be approved until fixed.",
    "Critical-risk items require the explicit phrase APPROVE HIGH RISK SOCIAL ITEM.",
    "Batch approval only applies to safe, low/normal-risk items; high/critical/blocked items are excluded and must be reviewed individually.",
    "Approved items become ready_for_queue but are not added to any publishing queue in this sprint.",
  ],
  technical: [
    "Tables: social_approval_reviews, social_approval_decisions, social_approval_batches, social_approval_batch_items, social_approval_rules.",
    "Extended: social_content_items/_variants/_packs and social_calendars/_calendar_items with founder_approval_review_id, approval_decision_at, approval_blockers, ready_for_queue_at.",
    "Edge functions: social-approval-queue-preview, -review-create, -decision-preview, -decision-apply, -batch-preview, -batch-create, -batch-decision-apply, -rules-generate, -healthcheck, -rehearsal-purge, -flow-acceptance.",
    "Confirmation phrases: CREATE SOCIAL APPROVAL REVIEWS / APPLY SOCIAL APPROVAL DECISION / APPROVE HIGH RISK SOCIAL ITEM / CREATE SOCIAL APPROVAL BATCH / APPLY SOCIAL BATCH APPROVAL / CREATE SOCIAL APPROVAL RULES / PURGE SOCIAL APPROVAL TEST DATA.",
    "Command Centre Daily Operator View shows the Approval tile; Full Diagnostic View shows raw reviews, decisions, batches, rules.",
    "Integrates with founder_approval_items via the founder_approval_item_id foreign key for cross-console visibility.",
    "Safety: no provider API call, no publish job creation, no DM/comment, no external scheduling, no real-data deletion (purge gated to is_test_data=true).",
  ],
};

export const SOCIAL_PUBLISHING_QUEUE = {
  title: "Publishing Queue (Provider Execution Locked)",
  summary:
    "Approved content and approved calendar items can be turned into internal publish jobs. Publish jobs are NOT publishing — they are a queue Liftor manages internally. Provider execution (Meta/TikTok/YouTube/LinkedIn/X/Metricool/Buffer/Hootsuite) is fail-closed in this sprint.",
  rules: [
    "Only approved-internal items become publish jobs.",
    "Every publish job is created with execution_gate_status=locked, founder_final_approval_required=true.",
    "No external scheduling, no DMs, no comments, no provider API calls.",
    "Manual/operator exports are allowed (Metricool/Buffer/Hootsuite CSV format) and are internal-only payloads — no file is sent externally.",
    "Provider connections are registered without storing raw tokens (token_reference only).",
    "Every provider execution attempt is logged and blocked with reason 'provider_execution_not_enabled'.",
  ],
  steps: [
    "Open Social Autopilot → Publishing Queue + Fail-Closed Provider Layer.",
    "Preview eligibility from approved content or approved calendar items.",
    "Create internal publish jobs with the phrase CREATE SOCIAL PUBLISH JOBS.",
    "Group jobs into a queue batch with the phrase CREATE SOCIAL PUBLISH BATCH.",
    "Generate a manual/operator export with the phrase CREATE SOCIAL MANUAL EXPORT.",
    "Cancel jobs with the phrase CANCEL SOCIAL PUBLISH JOB. Purge test data with PURGE SOCIAL PUBLISHING TEST DATA.",
  ],
  technical: [
    "Tables: social_publish_jobs (extended), social_provider_connections, social_provider_execution_gates, social_publish_queue_batches, social_publish_queue_audit, social_manual_export_batches.",
    "Edge functions: social-publish-queue-preview, -job-create, -batch-preview, -batch-create, social-provider-router-preview, -execution-gate-check, -execution-attempt (always blocked), social-manual-export-preview, -create, social-publish-job-cancel, social-publishing-healthcheck, -rehearsal-purge, -queue-acceptance.",
    "Idempotency: deterministic key per business/content/calendar/platform/provider/scheduled_for/job_type.",
    "Command Centre publishes a Daily Operator View tile with job counts and the next recommended action; provider_calls_total and posts_published_total remain 0 by policy.",
  ],
};

export const SOCIAL_SCHEDULER_BRIDGE = {
  title: "Scheduler Export / Metricool Bridge",
  summary:
    "Liftor can prepare a Metricool-ready / operator-check CSV (and Buffer/Hootsuite/Generic CSV, plus an Operator Pack and a Manual Copy Pack) from approved internal publish jobs. This sprint does NOT call Metricool, Buffer, Hootsuite or any social provider API. A human operator uploads the file manually, then confirms it back inside Liftor.",
  rules: [
    "No external API call. No external publish. No external schedule. No DM, no comment.",
    "Only approved-internal publish jobs become export rows. Blocked/cancelled/compliance-blocked/rights-blocked items are excluded.",
    "Manually scheduled means a human uploaded it to a scheduler — it does NOT mean published.",
    "Provider APIs (Metricool/Buffer/Hootsuite/Meta/etc.) can be wired later in a future prompt.",
    "All actions write to social_scheduler_export_audit with provider_calls=0 and posts_scheduled_externally=0.",
  ],
  steps: [
    "Open Social Autopilot → Scheduler Bridge / Metricool + Operator Export.",
    "Preview export from publish jobs / queue batches / calendar.",
    "Create the export batch with the phrase CREATE SOCIAL SCHEDULER EXPORT.",
    "Validate the batch with the phrase VALIDATE SOCIAL SCHEDULER EXPORT.",
    "Generate the CSV with the phrase GENERATE SOCIAL SCHEDULER CSV, then download it.",
    "Create an operator pack with the phrase CREATE SOCIAL OPERATOR PACK to assign the manual upload checklist.",
    "After the operator uploads externally, confirm with CONFIRM SOCIAL MANUAL SCHEDULING. Use MARK SOCIAL EXPORT DOWNLOADED to track download handoff.",
    "Purge test data only with PURGE SOCIAL SCHEDULER EXPORT TEST DATA.",
  ],
  technical: [
    "Tables: social_manual_export_batches (extended with date_range, timezone, validation, manual_scheduling, csv_text, download_ready, confirmation), social_scheduler_export_rows, social_scheduler_export_templates (Metricool/Generic/Operator/Manual Copy seeded), social_operator_scheduling_tasks, social_scheduler_export_audit.",
    "Edge functions: social-scheduler-export-preview, -create, -validate, social-scheduler-csv-generate, social-operator-pack-create, social-manual-copy-pack-preview, social-export-mark-downloaded, social-manual-scheduling-confirm, social-scheduler-export-healthcheck, -rehearsal-purge, social-scheduler-bridge-acceptance.",
    "CSV labels: 'Metricool-ready export — operator must verify import columns before upload.' Generic, Operator and Manual Copy packs use their own column/grouping conventions.",
    "Command Centre Daily Operator View renders a Scheduler/Export tile showing batches, rows, ready, downloaded, manually scheduled, blocked rows, validation failures, operator tasks open, provider calls=0 and external schedules=0.",
  ],
};

export const SOCIAL_ENGAGEMENT_FLOW_PLANNER = {
  title: "Comment Keywords and DM Flow Planning",
  summary:
    "Liftor can plan keyword triggers (e.g. CANDY, BOOK, DEMO, QUOTE, GUIDE, HELP) and design the public reply + DM flow that goes with them. This sprint does NOT connect to ManyChat, Meta, Instagram, TikTok, YouTube, LinkedIn or X — and Liftor never sends DMs or comments. A human operator must configure the flow manually in ManyChat (or chosen tool) and then confirm it back in Liftor.",
  rules: [
    "No DMs sent. No comments sent. No ManyChat API call. No Meta/Instagram/TikTok/YouTube/LinkedIn/X API call.",
    "No external flow created. No external publish. No external schedule. No Apollo / Smartlead POST / email send.",
    "Liftor only stores internal blueprints, exports and operator checklists. No raw provider tokens.",
    "Manually live means a human/operator confirmed the flow was set up outside Liftor — it does NOT mean Liftor sent anything.",
    "Every business has its own keyword rules and DM flows.",
  ],
  steps: [
    "Open Social Autopilot → Engagement.",
    "Create a keyword trigger rule with the phrase CREATE SOCIAL KEYWORD RULE.",
    "Use the DM Flow Planner to preview a blueprint, then create it with CREATE SOCIAL DM FLOW BLUEPRINT.",
    "Validate the flow (public reply, DM opening, button, follow-up, escalation, opt-out).",
    "Create the ManyChat manual setup export with CREATE MANYCHAT MANUAL SETUP EXPORT.",
    "Operator configures the flow manually in ManyChat (or chosen tool) using the copy blocks and checklist.",
    "Confirm with CONFIRM MANYCHAT MANUAL SETUP. To mark live, also use CONFIRM MANYCHAT FLOW IS LIVE.",
    "Purge test data only with PURGE SOCIAL ENGAGEMENT FLOW TEST DATA.",
  ],
  technical: [
    "Tables: social_keyword_trigger_rules, social_dm_flow_blueprints, social_dm_flow_steps, social_manychat_manual_exports, social_engagement_flow_audit. Engagement fields added to social_campaign_plans, social_content_items and social_calendar_items.",
    "Edge functions: social-keyword-rule-preview, social-keyword-rule-create, social-dm-flow-preview, social-dm-flow-create, social-dm-flow-validate, social-manychat-manual-export-preview, social-manychat-manual-export-create, social-manychat-manual-setup-confirm, social-engagement-flow-healthcheck, -rehearsal-purge, social-engagement-flow-acceptance.",
    "NeonCandy CANDY example is a seed only: keyword CANDY → public reply 'Nice — sent you the NeonCandy link 🍭' → DM opening with neoncandy.net/music → button 'Send me the link' → follow-up 'Which drop are you feeling most?'. Same engine supports lead magnet, booking, demo, quote, support, onboarding, upsell, win-back and FAQ flows.",
    "Command Centre Daily Operator View renders an Engagement/ManyChat tile with keyword rules, DM flows, manual exports, manually configured/live counts, validation failures, blocked flows and provider_calls=0, dms_sent=0, comments_sent=0.",
  ],
};

export const SOCIAL_ENGAGEMENT_INBOX = {
  title: "Social Engagement Inbox",
  summary:
    "Liftor captures comments, DMs, keyword events and other social engagement signals — manually entered, imported (CSV/operator) or via the future fail-closed provider receiver. It classifies intent/sentiment/urgency/risk, tries to match the person to CRM memory, and drafts internal replies. Liftor never sends DMs or comments and never calls ManyChat/Meta/TikTok/YouTube/LinkedIn/X APIs.",
  rules: [
    "No DMs sent. No comments sent. No auto-replies. No provider API calls. No external publishing or scheduling.",
    "No real CRM contact is created from a social handle alone — possible matches go to founder review.",
    "Complaints, support requests and high-value creator/press/licensing signals are escalated internally to the right human/agent layer.",
    "Test engagement (is_test_data=true) must be purged before real use via PURGE SOCIAL ENGAGEMENT TEST DATA.",
    "Each business has its own engagement inbox.",
  ],
  steps: [
    "Open Social Autopilot → Inbox.",
    "Capture a single event (CAPTURE SOCIAL ENGAGEMENT) or import a batch (IMPORT SOCIAL ENGAGEMENT).",
    "Run Classification preview, then save with CLASSIFY SOCIAL ENGAGEMENT.",
    "Preview CRM matches; apply safe matches with APPLY SOCIAL CRM MATCH (unmatched/possible go to founder review).",
    "Preview a reply draft and save with CREATE SOCIAL REPLY DRAFT (external send stays disabled).",
    "Escalate complaints/support/leads with CREATE SOCIAL ENGAGEMENT ESCALATION.",
  ],
  technical: [
    "Tables: social_engagement_events (extended), social_engagement_classifications, social_engagement_crm_matches, social_engagement_reply_drafts, social_engagement_escalations, social_engagement_import_batches, social_engagement_audit. Counters added to keyword rules, DM flows, content items and calendar items.",
    "Edge functions: social-engagement-capture-preview/-create, -import-preview/-create, -classify-preview/-create, -crm-match-preview/-apply, -reply-draft-preview/-create, -escalation-create, -provider-event-receiver (fail-closed), -inbox-healthcheck, -rehearsal-purge, -inbox-acceptance.",
    "Command Centre Daily Operator View renders an Engagement Inbox tile with events, unclassified, unmatched, possible CRM matches, drafts, escalations, complaints/support/creator/lead/spam counts and provider_calls=0, dms_sent=0, comments_sent=0, external_actions=0.",
  ],
};

export const SOCIAL_ANALYTICS_LEARNING = {
  title: "Social Analytics & Learning Signals",
  summary:
    "Liftor can learn from manually imported or pasted social performance data (Metricool/platform exports, operator entry). It never connects to social APIs, never scrapes, never invents performance, and never auto-changes live strategy. Learning signals and strategy recommendations are suggestions only and require founder approval.",
  rules: [
    "No Metricool/Buffer/Hootsuite/Meta/TikTok/YouTube/LinkedIn/X API calls. No scraping.",
    "No fake metrics, revenue or conversions. Revenue/conversion attribution is unverified unless manually confirmed or system-matched.",
    "No automatic strategy changes — all recommendations need founder approval.",
    "Test analytics (is_test_data=true) must be purged before real use via PURGE SOCIAL ANALYTICS TEST DATA.",
  ],
  steps: [
    "Open Social Autopilot → Analytics.",
    "Preview an import (paste CSV/TSV) then commit with IMPORT SOCIAL PERFORMANCE METRICS.",
    "Or add one metric with CREATE SOCIAL MANUAL METRIC.",
    "Match metrics to content/campaign/asset with APPLY SOCIAL PERFORMANCE MATCH.",
    "Generate summaries with GENERATE SOCIAL PERFORMANCE SUMMARY.",
    "Preview learning signals → save with CREATE SOCIAL LEARNING SIGNALS.",
    "Preview strategy recommendations → save with CREATE SOCIAL STRATEGY RECOMMENDATIONS.",
    "Approve/reject/action with APPLY SOCIAL ANALYTICS DECISION.",
  ],
  technical: [
    "Tables: social_performance_import_batches, social_performance_metrics (extended), social_content_performance_summaries, social_learning_signals, social_strategy_recommendations, social_analytics_audit. Performance fields added to social_content_items/_variants/_campaign_plans/_assets.",
    "Edge functions: social-performance-import-preview/-create, social-manual-metric-create, social-performance-match-preview/-apply, social-performance-summary-generate, social-learning-signals-preview/-create, social-strategy-recommendations-preview/-create, social-analytics-recommendation-decision, social-analytics-healthcheck, social-analytics-provider-sync-placeholder (fail-closed), social-analytics-rehearsal-purge, social-analytics-learning-acceptance.",
    "Command Centre Daily Operator View renders an Analytics/Learning tile with imports, metrics, unmatched, summaries, signals/recs needing review, top platform/content type, data quality score and provider_calls=0, scraped_pages=0, fake_metrics_created=0.",
  ],
};

export const SOCIAL_COMPETITOR_TREND = {
  title: "Competitor Watch and Trend Learning",
  summary:
    "Liftor can store manual competitor and trend observations per business, infer patterns, generate positioning reviews and market learning signals, and propose strategy recommendations. It never scrapes, never calls social/Metricool/Buffer/Hootsuite/Meta/TikTok/YouTube/LinkedIn/X APIs, never publishes competitor claims and never copies competitor wording, designs or assets. All recommendations require founder approval.",
  rules: [
    "No scraping. No social/search/Apollo/Smartlead API calls. No publish, schedule, DM, comment or email send.",
    "Competitor notes are evidence-limited (manual_unverified) until founder marks them checked.",
    "Liftor produces legally distinct adaptations only — no copied wording, captions, scripts, visuals or assets.",
    "No automatic strategy change — every market learning signal and recommendation needs founder approval.",
    "Test data (is_test_data=true) must be purged before real use via PURGE SOCIAL COMPETITOR TREND TEST DATA.",
  ],
  steps: [
    "Open Social Autopilot → Competitor Watch + Trend Intelligence.",
    "Add competitor profile with CREATE SOCIAL COMPETITOR PROFILE.",
    "Capture observations manually with CREATE SOCIAL COMPETITOR OBSERVATION (paste only — never copyrighted assets).",
    "Add trend signals with CREATE SOCIAL TREND SIGNAL.",
    "Generate patterns with GENERATE SOCIAL COMPETITOR PATTERNS.",
    "Generate positioning review with GENERATE SOCIAL MARKET POSITIONING REVIEW.",
    "Preview & save market learning signals with CREATE SOCIAL MARKET LEARNING SIGNALS.",
    "Preview & save strategy recommendations with CREATE SOCIAL MARKET RECOMMENDATIONS.",
    "Approve/reject/park/archive with APPLY SOCIAL MARKET LEARNING DECISION.",
  ],
  technical: [
    "Tables: social_competitor_profiles, social_competitor_accounts, social_competitor_observations, social_competitor_content_patterns, social_trend_signals, social_market_positioning_reviews, social_market_learning_signals, social_competitor_trend_audit. Extensions on social_content_packs/_items, social_campaign_plans, social_strategy_recommendations.",
    "Edge functions: social-competitor-profile-create, social-competitor-observation-preview/-create, social-trend-signal-preview/-create, social-competitor-patterns-generate, social-market-positioning-review-generate, social-market-learning-signals-preview/-create, social-market-recommendations-preview/-create, social-market-learning-decision, social-competitor-trend-healthcheck, social-competitor-external-research-placeholder (fail-closed), social-competitor-trend-rehearsal-purge, social-competitor-trend-acceptance.",
    "Command Centre Daily Operator View renders a Competitor/Trend tile with provider_calls=0, scraped_pages=0, competitor_claims_published=0, copied_assets_created=0.",
  ],
};

export const USING_SOCIAL_BRAIN_CONNECTOR = {
  title: "Business Knowledge → Social Brain",
  summary:
    "Each business in Liftor gets its own Social Brain, generated from its uploaded manuals, brand guide, FAQs and other knowledge sources. NeonCandy is only the first example.",
  steps: [
    "Register business knowledge sources (manuals, website, brand guide, offer sheet, customer profile, FAQs, sales scripts, marketing plan, founder notes).",
    "Approve each source for social training.",
    "Run extraction preview to see inferred voice, audience, offers, CTAs, pillars, platform rules, forbidden claims and compliance notes.",
    "Save extraction, then Generate Social Brain profile (draft).",
    "Review and Approve the profile. Sensitive sectors (health/finance/legal/children/property/charity/medical/employment) default to extra caution.",
    "Apply the approved profile to social_automation_settings. Auto-publish, auto-reply and cold DM stay locked off.",
    "Only then proceed to content pack generation (Prompt 3).",
  ],
  safety: [
    "No posts, DMs, comments or provider API calls.",
    "No auto-crawl of websites.",
    "Approved profiles cannot be overwritten without an explicit regeneration phrase.",
    "social_automation_mode stays approval_required.",
  ],
};

export const USING_SOCIAL_OPERATING_PROFILE = {
  title: "Social Operating Profile",
  summary:
    "Each business gets its own Social Operating Profile — content pillars, platform rules, offer→content mappings, risk flags and a confidence score — generated from the Social Brain plus uploaded knowledge. Liftor reviews the profile before any content pack is trusted.",
  steps: [
    "Open Social Autopilot → select business → Social Operating Profile section.",
    "Run the generator preview to see inferred business type, pillars, platform rules, offers and risks.",
    "Save profile (founder confirmation required). Replacing an approved profile requires the explicit replace phrase.",
    "Review content pillars and approve the ones that fit (target 5–9 approved pillars).",
    "Activate the platform rules that fit the business; deactivate any you do not want Liftor to suggest content for.",
    "Check offer mappings — add missing pricing/proof/CTAs so revenue-led content is grounded.",
    "Run the risk scan — acknowledge or mitigate flagged risks. Regulated sectors (health/finance/legal/children/property/charity) need extra caution and may require legal review.",
    "Use Snapshot to keep a version every time you make a meaningful change.",
  ],
  scoring: [
    "0–30 = poor / not enough knowledge — keep registering sources.",
    "31–60 = draft usable with founder review.",
    "61–80 = good internal draft.",
    "81–95 = strong profile — still needs founder approval to count as ready.",
    "Sensitive sectors automatically lower confidence and raise approval requirements.",
  ],
  safety: [
    "Internal only — no publish, no DM, no comments, no provider API calls.",
    "auto_publish_allowed / auto_reply_allowed / cold_dm_allowed stay locked off.",
    "Approved profile cannot be overwritten without explicit replace phrase.",
    "Risk flags must be acknowledged or mitigated before downstream content generation is considered ready.",
  ],
};

export const TECHNICAL_SOCIAL_OPERATING_PROFILE = {
  title: "Social Operating Profile — Technical",
  summary: "Generator architecture, scoring, platform suitability, risk scan, versioning, Command Centre integration.",
  tables: [
    "business_social_content_pillars — pillars with funnel_stage, recommended_platforms, approval_status.",
    "business_social_platform_rules — per-platform rules (unique per business_id+platform).",
    "business_social_offer_mappings — offer→content map with pains, value props, proof, CTAs.",
    "business_social_risk_flags — sensitive sector / compliance flags with risk_level and guardrails.",
    "business_social_profile_versions — JSON snapshots with version_number history.",
  ],
  functions: [
    "social-profile-generator-preview — dry-run build of full Social Operating Profile.",
    "social-profile-generator-save — persists pillars, platform rules (upsert by platform), offers, risks + version snapshot. Requires SAVE SOCIAL OPERATING PROFILE (or REPLACE APPROVED SOCIAL OPERATING PROFILE).",
    "social-profile-version-create — manual snapshot, requires CREATE SOCIAL PROFILE VERSION.",
    "social-profile-readiness-check — read-only readiness counters + ready_for_content_generation / calendar / reply drafting.",
    "social-profile-risk-scan — dry-run or save flags with SAVE SOCIAL RISK FLAGS.",
    "social-profile-generator-acceptance — table + safety acceptance test.",
  ],
  scoring_logic:
    "brain_score (0–60) + source_score (0–30) + base 20 − missing_inputs penalty − sensitive_sector penalty, capped at 95.",
  platform_logic:
    "Business type inferred from corpus (music/saas/ecommerce/service/charity/health/finance/property/education/generic) → per-type platform suitability map with score, content types and risk notes.",
  versioning:
    "Every save inserts a new business_social_profile_versions row. Manual snapshots also allowed. No destructive deletes — archived only.",
  command_centre:
    "Daily Operator View shows Social Operating Profile summary (confidence, approved pillars, active platforms, offers, open/critical risks, ready-for-content, next action). Full editing happens on /founder/social-autopilot.",
};

export const socialContentFactoryUserManual = {
  title: "Creating Social Content Packs",
  what_it_does:
    "The Content Factory generates 7/14/30/90-day social packs per business from the Social Brain, content pillars, platform rules, offers, asset library and hook/caption bank. All output is internal draft only — nothing publishes, schedules or DMs.",
  how_to_use: [
    "Select the business and make sure its Social Brain and Social Operating Profile are approved.",
    "Register social assets so rights/consent can be checked (missing assets are flagged, not auto-filled).",
    "Open Social Autopilot → Content. Choose days (7/14/30/90), platforms, goal and start date. Click Preview.",
    "Review proposed posts, variants, missing-asset list and compliance warnings.",
    "Type CREATE SOCIAL CONTENT PACK to save the draft pack. Items are draft / not_queued / not_ready by default.",
    "Run Content Quality Check on each item. Approve only after founder review. Publishing queue and calendar are handled in later prompts.",
  ],
  safety:
    "No external publish, no provider API call, no DM/email/comment send, no auto_send, no cron. Sensitive sectors (health/finance/legal/education/property) auto-flag for founder/legal review.",
};

export const socialContentFactoryTechnicalManual = {
  title: "Content Factory — Technical",
  tables: [
    "social_content_packs — pack header, status, days, platforms, risk, warnings.",
    "social_content_pack_items — links posts to packs with day/order/platform/asset.",
    "social_content_generation_runs — audit of every preview/save with source/output summaries and confidence.",
    "social_content_variants — per-platform variations (hook/caption/script/carousel/hashtags/CTA).",
    "social_content_quality_reviews — quality/brand/compliance/asset readiness scores + issues/recs.",
    "social_content_items extended with hook, script, carousel_outline, content_goal, target_audience, content_pillar_id, offer_mapping_id, pack_id, quality_status, asset_readiness_status, compliance_status, publish_readiness.",
  ],
  functions: [
    "social-content-pack-preview / social-content-pack-create (CREATE SOCIAL CONTENT PACK)",
    "social-platform-variants-preview / social-platform-variants-create (CREATE SOCIAL PLATFORM VARIANTS)",
    "social-hooks-captions-generate (SAVE GENERATED SOCIAL COPY)",
    "social-reel-script-generate (SAVE SOCIAL REEL SCRIPTS)",
    "social-carousel-outline-generate (SAVE SOCIAL CAROUSEL OUTLINES)",
    "social-content-quality-check (SAVE SOCIAL CONTENT QUALITY REVIEW)",
    "social-content-factory-healthcheck — read-only summary.",
    "social-content-pack-rehearsal-purge (PURGE SOCIAL CONTENT TEST DATA) — test-data only.",
    "social-content-factory-acceptance — verifies tables/columns/functions.",
  ],
  asset_readiness:
    "Items with no usable asset → asset_readiness_status=missing_asset / publish_readiness=not_ready. Unknown rights → rights_review_required / blocked. Blocked assets never marked ready.",
  safety:
    "All confirmation-phrase gated. No provider calls. RLS founder/admin-only. is_test_data flag isolates rehearsal data; purge only removes is_test_data=true rows.",
  command_centre:
    "Daily Operator View Social Autopilot block shows Content Factory tiles (packs, drafts, need-review, blocked, missing assets, variants, hooks, quality warnings, ready→calendar) and the next action.",
};

export const WEBSITE_FUNNEL_ENGINE = {
  title: "Website, Funnels and Lead Magnets",
  summary:
    "Liftor drafts internal funnel strategy, landing pages, lead magnets, CTA maps and operator/builder export packs for any business. It does NOT publish pages, deploy websites, edit Shopify/Lovable/Wix/Webflow/WordPress, create live forms, create payment links, charge customers, or send emails. A human/founder must build or publish externally and then manually confirm 'manually built' or 'live'. Test funnel data must be purged before real use.",
  tables: [
    "website_funnel_strategies, website_landing_page_drafts, website_page_sections, lead_magnet_assets, conversion_cta_maps, conversion_asset_packs, website_funnel_gap_reviews, website_funnel_audit.",
    "social_campaign_plans / social_content_items / social_calendar_items / social_strategy_recommendations extended with funnel_strategy_id / cta_map_id / funnel_status / funnel_destination_status fields.",
  ],
  functions: [
    "website-funnel-strategy-preview/create (CREATE WEBSITE FUNNEL STRATEGY)",
    "website-landing-page-preview/create (CREATE WEBSITE LANDING PAGE DRAFT)",
    "website-lead-magnet-preview/create (CREATE WEBSITE LEAD MAGNET)",
    "conversion-cta-map-preview/create (CREATE CONVERSION CTA MAP)",
    "conversion-asset-pack-preview/create (CREATE CONVERSION ASSET PACK)",
    "website-builder-export-preview/create (CREATE WEBSITE BUILDER EXPORT)",
    "website-funnel-readiness-check (SAVE WEBSITE FUNNEL READINESS REVIEW)",
    "website-funnel-gap-analysis (SAVE WEBSITE FUNNEL GAP ANALYSIS)",
    "website-live-confirmation-record (CONFIRM WEBSITE ASSET MANUALLY BUILT / CONFIRM WEBSITE ASSET IS LIVE)",
    "website-funnel-healthcheck (read-only).",
    "website-external-publish-placeholder — fails closed (403).",
    "website-funnel-rehearsal-purge (PURGE WEBSITE FUNNEL TEST DATA).",
    "website-funnel-engine-acceptance — verifies schema/extensions/functions.",
  ],
  safety:
    "No publish, no deploy, no provider/builder API, no payment links, no live forms, no emails. external_api_calls/pages_published/live_forms_created/payments_created/emails_sent always 0. RLS founder/admin-only. Confirmation-phrase gated.",
  command_centre:
    "Daily Operator View Social Autopilot block shows Website/Funnel tile: strategies, approved, pages, lead magnets, CTA maps, asset packs, open gaps, content w/o CTA, campaigns w/o funnel, export-ready, manually built, live confirmed, and next action.",
};

export const CUSTOMER_SUCCESS_PORTAL_ENGINE = {
  title: "Client Portal, Onboarding and Customer Success",
  summary:
    "Liftor drafts internal customer success profiles, onboarding plans, welcome packs, client portal blueprints and content packs, bedding-in reviews, check-ins, satisfaction surveys, quarterly reports, renewal reviews, retention risk reviews, upsell opportunities, win-back plans and manual export packs for any business. Liftor does NOT create portal accounts, send portal invitations, send customer messages, send surveys, share quarterly reports, charge customers, change subscriptions or call Stripe/Paddle/GoCardless/Intercom/Zendesk/HubSpot. Customer-facing actions require founder approval and manual external action, recorded back into Liftor as manual confirmations. Customer health and retention signals are internal guidance only — Liftor does not invent satisfaction, results, revenue, usage or renewal probability. Test customer success data must be purged before real use.",
  tables: [
    "customer_success_profiles, customer_onboarding_plans, customer_welcome_packs, client_portal_blueprints, client_portal_content_packs, customer_bedding_in_reviews, customer_success_checkins, customer_satisfaction_surveys, customer_quarterly_reports, customer_renewal_reviews, customer_retention_risk_reviews, customer_upsell_opportunities, customer_winback_plans, customer_success_manual_export_packs, customer_success_audit.",
    "contacts, customer_retention_scores, support_question_intake, support_escalations, invoices, payments, deals, internal_proposals extended with customer success / onboarding links.",
  ],
  functions: [
    "customer-success-profile-preview/create (CREATE CUSTOMER SUCCESS PROFILE)",
    "customer-onboarding-plan-preview/create (CREATE CUSTOMER ONBOARDING PLAN)",
    "customer-welcome-pack-preview/create (CREATE CUSTOMER WELCOME PACK)",
    "client-portal-blueprint-preview/create (CREATE CLIENT PORTAL BLUEPRINT)",
    "client-portal-content-pack-preview/create (CREATE CLIENT PORTAL CONTENT PACK)",
    "customer-bedding-in-review-generate (CREATE CUSTOMER BEDDING IN REVIEW)",
    "customer-success-checkin-create (CREATE CUSTOMER SUCCESS CHECKIN)",
    "customer-survey-draft-create (CREATE CUSTOMER SURVEY DRAFT)",
    "customer-survey-response-record (RECORD CUSTOMER SURVEY RESPONSE — verbatim only)",
    "customer-quarterly-report-preview/create (CREATE CUSTOMER QUARTERLY REPORT)",
    "customer-renewal-review-generate (CREATE CUSTOMER RENEWAL REVIEW)",
    "customer-retention-risk-review-generate (CREATE CUSTOMER RETENTION RISK REVIEW)",
    "customer-upsell-opportunity-generate (CREATE CUSTOMER UPSELL OPPORTUNITY)",
    "customer-winback-plan-generate (CREATE CUSTOMER WINBACK PLAN)",
    "customer-success-manual-export-preview/create (CREATE CUSTOMER SUCCESS MANUAL EXPORT)",
    "customer-success-manual-confirmation-record (CONFIRM CUSTOMER SUCCESS MANUAL ACTION)",
    "customer-success-healthcheck (read-only)",
    "customer-success-rehearsal-purge (PURGE CUSTOMER SUCCESS TEST DATA)",
    "customer-success-external-action-placeholder — fails closed (403)",
    "customer-success-backend-acceptance and customer-success-portal-acceptance — verify schema/functions/safety.",
  ],
  safety:
    "No customer messages, no portal accounts, no portal invites, no logins, no Auth admin customer creation, no surveys sent, no reports shared, no renewal/win-back emails, no payment links, no charges, no subscription changes, no Stripe/Paddle/GoCardless, no Intercom/Zendesk/HubSpot, no Apollo, no Smartlead POST, no social provider API, no auto_send, no cron. external_api_calls/customer_messages_sent/portal_accounts_created/portal_invites_sent/surveys_sent/reports_shared/payments_created/subscriptions_changed/fake_customer_data_created always 0. RLS founder/admin-only. Confirmation-phrase gated. Fake/test customers must carry is_test_data=true and be purged before real use.",
  command_centre:
    "Daily Operator View Customer Success / Portal / Retention block shows profiles, onboarding needing review, welcome packs, portal blueprints, content packs, bedding reviews due, check-ins due, surveys awaiting, quarterly reports needing review, renewals due in 60 days, high-risk customers, upsells, win-backs, manual exports ready, hard-zero send/invite/charge counters, and a single next recommended action. Full Diagnostic View shows raw table counts, external action placeholder status, acceptance result and test-data purge control.",
};

export const LIFTOR_FINAL_HANDOVER = {
  title: "Final Handover — Liftor Ready for Internal Daily Use",
  classification: "READY_FOR_INTERNAL_DAILY_USE",
  external_go_live: "LOCKED_BY_DESIGN",
  summary:
    "Liftor's foundation build is complete. Every operating layer (Command Centre, business activation, knowledge/training, starter packs, CRM memory, outreach lanes, social autopilot, marketing/funnel/long-form, paid media, support, customer success/portal/retention, approvals, finance/supplier, group HQ, agents/autonomy, manuals) is mounted and visible. All external provider actions (email send, social publish, Metricool/ManyChat APIs, Apollo/Smartlead POST, ad platforms, Stripe/Paddle/GoCardless, portal account/invite creation, helpdesk APIs, filings) remain LOCKED BY DESIGN. Daily Operator View is calm; Full Diagnostic View carries raw diagnostics; Command Centre Truth Sync is the source of truth. Future external activation must go through separate, deliberately gated activation prompts.",
  first_15_actions: [
    "Open /founder/command-centre.",
    "Confirm Truth Sync says READY_FOR_INTERNAL_DAILY_USE and EXTERNAL_ACTIONS_LOCKED.",
    "Run Final Hardening checks.",
    "Run Final Go-To-Use readiness.",
    "Confirm Clean Real Mode (no test data lingering).",
    "Create or confirm Pre-Live Baseline.",
    "Set / review Revenue Target Operating Mode for the active business.",
    "Select the first real business (or create it via Business Activation).",
    "Upload business knowledge (manuals, brand, offers, customers, conversations, policies).",
    "Run knowledge training (dry-run first).",
    "Generate the starter pack (templates, social profile, content, funnel, support, customer success drafts).",
    "Review internal agent drafts and Founder Approvals queue.",
    "Confirm every External Gate badge still reads LOCKED.",
    "Run liftor-wide-final-acceptance and review the report.",
    "Begin operating Liftor internally — external sends remain off until controlled activation prompts are run.",
  ],
  weekly_rhythm: [
    "Monday: Truth Sync, alerts, approvals queue, weekly priorities.",
    "Tuesday-Thursday: knowledge updates, content/calendar drafts, CRM hygiene, support drafts, customer success check-ins.",
    "Friday: revenue target progress, retention/win-back review, manual export packs for any external work, baseline snapshot.",
    "Always: keep external gates locked unless a controlled activation prompt is being run.",
  ],
  do_not_touch_legacy: [
    "Legacy IONOS / Pooja loop panels in Full Diagnostic View are diagnostic-only and superseded by the current Operating Spine.",
    "Apollo legacy pool surfaces remain visible for audit but no calls or credits can be spent without a controlled activation prompt.",
    "Old reconciliation/registry dumps live in Full Diagnostic only; Truth Sync is authoritative.",
  ],
  intentional_locks: [
    "Smartlead campaign start, warmup, mapping push, webhook create.",
    "Apollo candidate pull, reveal, credit spend.",
    "Native email send. Proposal/invoice send. Customer onboarding/quarterly report share.",
    "Survey send, complaint/dispute/win-back send.",
    "Metricool schedule post, ManyChat live DMs, social publish.",
    "Paid media external launch, ad platform API.",
    "Support external reply, live chat API.",
    "Portal account/invite creation, customer success external action.",
    "Payment create, subscription change, filings/regulatory submission.",
    "High-risk autopilot — L5 never default.",
  ],
  acceptance_function: "liftor-wide-final-acceptance — read-only, founder-gated, verifies core tables, external placeholder fail-closed status, all per-layer acceptance functions, and no-forbidden-action audit counters.",
  wiring_matrix_function: "liftor-functional-wiring-matrix — read-only, founder-gated. Returns a per-layer status (WIRED / PARTIAL / BROKEN_FUNCTION / BACKEND_ONLY / FAIL_CLOSED_OK / BLOCKED) confirming every layer has a real table + edge function + fail-closed placeholder where external action exists. Mounted in Command Centre Full Diagnostic View as 'Functional Wiring Matrix'. Used to prove panels are not UI-only.",
  next_business_onboarding: [
    "Open Business Activation Wizard from Command Centre.",
    "Create or pick the business; mark as test (is_test_data=true) for rehearsal first.",
    "Upload knowledge sources; run training dry-run.",
    "Generate starter pack (internal drafts only).",
    "Run rehearsal and review readiness checks.",
    "Run pre-live baseline; keep external gates locked.",
    "When ready, purge the rehearsal test data with the confirmation phrase, then onboard the real business with the same flow.",
  ],
  recommendation:
    "Stop building core Liftor. Begin internal daily use. Future work should be controlled external activation prompts or per-business onboarding, not more foundation building.",
};

export const LIFTOR_COMMAND_CENTRE_PARITY = {
  title: "Command Centre ↔ Manual Parity Map (Prompt C)",
  updated: "2026-05-19",
  status: "PARITY_AUDITED",
  description:
    "Every operating route registered in the app router is reachable from the Daily Operator View or its in-section link grids. The Full Diagnostic View additionally exposes raw module registry, acceptance, wiring matrix, legacy panels and diagnostics. Truth Sync remains authoritative — any stale 'missing' wording in legacy panels is superseded by the per-layer wiring matrix.",
  reachable_from_command_centre: [
    "/founder/command-centre (canonical; /founder/command-center → 301 → /founder/command-centre)",
    "/founder/copilot, /founder/testing, /founder/system, /founder/system/health, /founder/system/events, /founder/system/modes, /founder/monitoring, /founder/activity, /founder/executions, /founder/priority, /founder/security, /founder/sending",
    "/founder/crm, /founder/crm/contacts, /founder/crm/inboxes, /founder/conversations, /founder/organisations",
    "/founder/outreach, /founder/outreach/queue, /founder/outreach/queue-audit, /founder/outreach/campaigns, /founder/outreach/imports, /founder/outreach/engagement, /founder/outreach/apollo, /founder/outreach/live-monitor, /founder/outreach/send-preview",
    "/founder/social, /founder/social-autopilot/*, /founder/assets, /founder/marketing",
    "/founder/support, /founder/support/knowledge-agent",
    "/founder/customer-success, /founder/clients",
    "/founder/proposals, /founder/internal-proposals, /founder/demos, /founder/pipeline",
    "/founder/revenue, /founder/finance, /founder/finance/targets, /founder/finance/deals, /founder/finance/invoices, /founder/finance/payments, /founder/analytics, /founder/optimisation",
    "/founder/suppliers, /founder/assignments, /founder/projects, /founder/deployments",
    "/founder/integrations, /founder/workflows, /founder/processes, /founder/architectures, /founder/templates, /founder/expansion",
    "/founder/compliance, /founder/compliance/events, /founder/compliance/rules, /founder/legal, /founder/access-control",
    "/founder/manual, /founder/manual/full, /founder/manual/user, /founder/build-log, /founder/knowledge, /founder/documents",
    "/founder/agents, /founder/brain, /founder/strategy, /founder/decisions",
  ],
  intentional_legacy_routes: [
    "/founder/command-center/legacy — kept for diagnostic comparison only; superseded by /founder/command-centre.",
  ],
  not_a_command_centre_concern: [
    "/founder/manual/:id, /founder/knowledge/:id, /founder/agents/:id, /founder/processes/:id, /founder/workflows/:id, /founder/architectures/:id, /founder/templates/:id, /founder/proposals/:id, /founder/internal-proposals/:id, /founder/integrations/:id, /founder/monitoring/:id, /founder/expansion/:id, /founder/conversations/:id, /founder/crm/contacts/:id, /founder/crm/inboxes/:id/configure, /founder/projects/:id, /founder/deployments/:id, /founder/executions/:id, /founder/suppliers/:id, /founder/organisations/:id — these are detail pages reached from their parent list.",
  ],
  authority_rules: [
    "Truth Sync is the single source of truth for connection / readiness state. Any 'missing module' wording in legacy diagnostic panels does NOT override Truth Sync.",
    "Every external action surface is described as locked / future / manual-confirmation in both manuals. No manual claim implies external go-live unless a controlled activation prompt has been executed.",
    "Test/rehearsal records always carry is_test_data=true. Every *-rehearsal-purge function only deletes is_test_data=true rows.",
    "Liftor-wide wording is generic. No 'NeonCandy-only' phrasing remains in cross-tenant manuals; NeonCandy is one tenant of many.",
  ],
};

export const AI_COST_GOVERNOR_USER_GUIDE: ManualSection = {
  number: 80,
  key: "ai-cost-governor-roi-engine",
  title: "AI Cost Governor + ROI Engine",
  body: [
    "Plain-English guide. Open Command Centre → AI Cost Governor section (anchor #ai-cost) or the /founder/ai-cost/* pages.",
    "1) What the module does. It controls how much AI Liftor uses, which model handles each task, and whether the spend is creating value. Every AI call is recorded in the AI Usage Ledger; budgets, routing, ROI scoring and human approval gates run on top of it.",
    "2) Why Liftor does not use expensive AI for every task. Premium models are slow and costly. Most tasks (tagging, summarising, drafting boilerplate, classification, simple replies) work just as well on cheap or standard tiers. Premium is reserved for genuine reasoning — valuations, investor analysis, complex legal/financial work.",
    "3) Model tiers. no_ai = deterministic rule, no model call. cheap = small fast models for tagging/classification/short drafts. standard = mid-tier for normal drafting, summaries, replies. premium = top-tier reasoning for strategy, valuations, complex analysis. human_required = AI must not act; a human writes/decides.",
    "4) Business AI budgets. Each business has daily / weekly / monthly / per-campaign caps in /founder/ai-cost/budgets. Near a cap = amber alert. At the cap = non-essential AI pauses and routing drops to a cheaper tier. Businesses without a configured budget get a conservative default and a 'Budget not configured' flag — never unlimited spend.",
    "5) Agent cost controls. Each agent (/founder/ai-cost/agents) has allowed tiers, default tier, daily/weekly spend caps, max retries, max tokens per action and disallowed categories. An agent cannot exceed its caps, request a tier it is not allowed, or run a forbidden category without founder approval.",
    "6) Stop-loss rules. If spend rises without matching value (pipeline / revenue / time-saved flat), Liftor downgrades the tier, pauses the workflow, or requests founder review. Stop-loss never deletes work — it blocks further spend until you decide.",
    "7) How to read AI ROI. /founder/ai-cost/roi shows AI spend, estimated human cost saved, net saving, pipeline linked, revenue linked and an ROI score. Green = AI is paying for itself. Amber = unclear, review. Red = AI is costing more than the value it produced.",
    "8) Estimated human cost saved. Liftor estimates the minutes of human work each AI action replaced, multiplied by a standard hourly rate. It is an estimate and is labelled as such — never treat it as exact revenue.",
    "9) Human approval gates. Any sensitive category (legal, financial, compliance, investor, M&A, partnership, high-value external comms, reputational) is blocked at the gate. AI prepares the draft; the ledger entry becomes human_review_required and a Founder Approval item is created. Nothing leaves Liftor until you approve.",
    "10) What to do when an alert appears. Open /founder/ai-cost/alerts. Each alert states what happened, why it matters, what Liftor recommends, and whether founder action is required. Work top-down by severity.",
    "11) Action vocabulary. Pause = stop new AI calls for that scope, keep existing data. Downgrade = continue on a cheaper tier. Review = founder must look before more spend happens. Stop = hard block until you re-enable.",
    "12) Why this matters for multiple businesses. With 25+ businesses, uncontrolled AI spend would silently destroy margin. The Cost Governor + ROI Engine gives every business its own ceiling, every agent its own discipline, and every pound of AI spend a measurable value comparison.",
    "Principle: AI can recommend and prepare actions, but high-risk external actions require founder approval.",
    "Cross-references: Command Centre (#ai-cost), Founder Approvals, Agent detail pages, Revenue/ROI panels, Build Log entries for AI Cost Governor.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AI_COST_GOVERNOR_USER_GUIDE);

const AI_FINANCE_PACK_USER_GUIDE: ManualSection = {
  number: 81,
  key: "ai-finance-pack",
  title: "Monthly AI Finance Pack & Unit Economics",
  body: [
    "Plain-English guide. Open /founder/ai-cost/finance.",
    "What it is. A single monthly report that tells you whether AI spend is producing value across every business, agent, campaign and task category — and which AI work to scale, keep, watch, reduce, pause or retire next month.",
    "How to read the founder summary. The top card translates the month's numbers into one or two paragraphs: where AI made money, where it lost money, which agents to scale, which to pause, which categories should switch to cheaper models, and a recommended budget direction for next month.",
    "Top totals. AI spend, estimated human cost saved, net saving, revenue linked, pipeline linked, quality-adjusted ROI, approval/rejection/edit rates, and cost-per-outcome (lead, opportunity, sale, content asset, customer interaction).",
    "Quality-adjusted ROI. Standard ROI can look great even when AI output is rejected by humans. Quality-adjusted ROI multiplies the headline saving by approval rate × (1 − rejection rate), so AI work that needs to be redone is correctly discounted.",
    "Breakdowns. Tabs for Business, Agent, Campaign and Task category show the same metrics so you can localise wins and losses. Each row carries a decision label — scale / keep / watch / reduce / pause / retire — with a short reason.",
    "Business unit economics. AI spend as % of revenue and pipeline, AI spend per active campaign, per customer/prospect interaction, per approved output, per rejected output, budget remaining, recommended monthly AI budget, estimated payback months.",
    "Estimates label. Revenue and pipeline values count only records linked into the ledger. Where no link exists they are treated as 0 and the report is clearly labelled as containing estimates. Treat them as directional, not as accounting truth.",
    "Export. The 'Export CSV' button produces a single file containing the founder summary, totals, all breakdowns and business unit economics. Use it for finance reviews and board updates.",
    "When to act. Scale = increase budget or volume. Keep = no change. Watch = monitor next month. Reduce = downgrade model tier or cut volume. Pause = stop new actions, investigate. Retire = remove the workflow or template.",
    "Principle: AI investment decisions must be made monthly using this pack; do not rely on gut feel or single-day spend spikes.",
    "Cross-references: AI Cost Governor, ROI Engine, Quality Scoring, Approval Gates, Business Budgets.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AI_FINANCE_PACK_USER_GUIDE);

const AI_COST_GOVERNOR_COMMAND_CENTRE_GUIDE: ManualSection = {
  number: 82,
  key: "ai-cost-governor-command-centre",
  title: "AI Cost Governor + ROI Engine — Command Centre Section",
  body: [
    "What it does. The AI Cost Governor tracks and controls AI usage live across Liftor. It shows what AI costs, what value it creates, which agents are useful, which are wasting money, and which actions need founder approval.",
    "Where to find it. Open Command Centre → AI Cost Governor (sidebar entry, or /founder/ai-cost). The hub lists: Portfolio AI Overview, Business AI Health, Agent AI Health, Live Alerts, Human Approval Queue, Finance Pack and Settings (pricing, routing, budgets, agent controls, templates, cached context, kill switch, security, quality, ROI, ledger, sandbox).",
    "Live-first principle. Liftor operates live by default. The AI Cost Governor monitors and controls live activity in real time. The system does not sit behind artificial readiness gates. Internal AI preparation, logging, analysis, routing, alerts and dashboards run live. Founder approval is required only where external action, legal/tax/financial/compliance risk, public reputation risk, investor/buyer contact or other high-risk activity is involved.",
    "Daily founder checklist. (1) AI spend today, (2) budget warnings, (3) open cost alerts, (4) approvals waiting, (5) paused agents/campaigns, (6) highest-cost agents, (7) lowest-ROI agents, (8) prompt injection or redaction events, (9) recommended actions.",
    "Status meanings. Live — Healthy: all green. Live — Watch: minor warnings. Live — Budget Warning: a business is close to or over its AI budget. Live — Cost Alert: cost anomaly detected. Live — Risk Alert: security or quality risk needs review. Live — Approval Required: action queued for founder approval before external send. Live — Paused by Founder: scope paused manually. Live — Paused by Stop-Loss: scope paused automatically by stop-loss rules. The system never uses 'Not Ready', 'Simulation Only', 'Ready for Controlled Internal Use', 'Ready for Limited Live Use' or 'Ready for Scale' — those concepts do not apply.",
    "What requires approval. External or high-risk actions only: sending emails; publishing posts; contacting customers, prospects, buyers, investors or partners; legal/tax/financial/compliance-sensitive wording; contract language; acquisition/valuation-sensitive work; reputationally sensitive public action.",
    "What does not require approval. Logging AI usage, calculating cost, routing model tier, creating internal drafts, internal recommendations, dashboards, ROI snapshots, alerts, prompt reuse, cached context, finance reporting, queue records.",
    "How to interpret AI ROI. AI spend = what Liftor paid the provider. Estimated human cost saved = configurable hourly rate × minutes saved. Net saving = saved − spend. Revenue/pipeline linked = only counts ledger rows explicitly linked to a real revenue or pipeline record (treat unlinked as zero). Quality-adjusted ROI discounts work that was rejected or required re-doing. Approved-output cost vs rejected-output cost helps decide whether to keep, scale, watch, reduce, pause or retire an agent.",
    "What to do when alerts appear. Budget warning → review budget or reduce frequency. Cost alert → check the high-cost agent or campaign. Risk alert → review before any external action. Low ROI → improve the prompt, downgrade the model tier, pause the workflow or retire the agent. Prompt injection warning → treat external content as untrusted; do not auto-send. Redaction event → confirms sensitive data was protected before it reached the model.",
    "How this helps the founder. Lets you run multiple businesses through Liftor without AI costs becoming invisible, uncontrolled or wasteful. Every pound of AI spend is tracked, governed, scored against value created, and routed to the cheapest model tier that meets the quality bar.",
    "Cross-references: /founder/ai-cost (hub), /founder/ai-cost/live (Live Operations), /founder/ai-cost/finance (Monthly Finance Pack), /founder/ai-cost/alerts, /founder/ai-cost/approvals, /founder/ai-cost/budgets, /founder/ai-cost/agent-controls, /founder/ai-cost/pricing, /founder/ai-cost/security.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AI_COST_GOVERNOR_COMMAND_CENTRE_GUIDE);

const PORTFOLIO_EXIT_COMMAND_CENTRE_GUIDE: ManualSection = {
  number: 83,
  key: "portfolio-exit-command-centre",
  title: "Portfolio & Exit Command Centre — How to Use It",
  body: [
    "What it does. The Portfolio & Exit Architecture Engine is the live cockpit for every business Liftor is building, scaling, parking or preparing to sell. It tracks each asset's current revenue, pipeline, exit target, gap to target, buyer warmth, data-room readiness, Liftor operability, founder dependency, next decision and next action — and turns that into AI recommendations, quarterly build choices and execution targets handed to the right agents.",
    "Where to find it. Open Command Centre → Portfolio & Exit (top-of-page panel, sidebar entry, or /founder/portfolio-exit). The same module exposes M&A Intelligence, Exit Valuation, Quarterly Build Selector, Execution Handoff, Data Ingestion, Operating Status, Controls Centre and Portfolio Manual.",
    "Live-first principle. The module is live by default. Dashboards, calculations, recommendations, scoring, data-room checklists and execution targets all run live. Missing data creates Intelligence Gaps and next actions; it does not block the module. Approval is required only for genuinely high-risk external or irreversible actions.",
    "Reading the main dashboard. The hero panel shows: active assets, assets in build/validation, scaling, parked, combined target exit value, current monthly revenue, current pipeline value, average exit readiness, average data-room readiness, buyer/valuation/execution/data-room/build counts, open founder approvals. Beneath that, an assets table shows each business with stage, monthly, pipeline, target exit, exit readiness and data-room readiness — click an asset to open its detail page with full progress against target.",
    "Adding records. Buyers, investors, competitors and advisers can be added one-by-one from the M&A Intelligence workspace or imported in bulk via the Data Ingestion Centre. Imports are reviewed against the golden-record / de-duplication logic before they become active.",
    "Creating an asset and setting an exit target. From the Command Centre, create a portfolio asset (name, type, stage). Open Exit Valuation to set the target exit value, target multiple basis (revenue/EBITDA/ARR) and adviser benchmarks. Liftor calculates the required revenue, profit and pipeline backwards from the target and writes them into the asset.",
    "Execution targets to agents. Once a valuation target exists, the Execution Handoff page generates execution targets (revenue, pipeline, content, retention, hiring, etc.) and assigns them to agents/workflows. Targets are visible on the asset detail page and inside the relevant agent profile.",
    "Quarterly Build Selector. Open Build Selector to score build candidates against the Buildability Constitution (market pull, founder leverage, Liftor reusability, exit pathway, risk). The system recommends the next quarter's build; the founder approves before any spend or external commitment is made.",
    "Reading AI recommendations. Every recommendation carries evidence references, confidence score, source freshness, missing-information notes, assumption list, risk level and an approval flag. Weak evidence is labelled 'hypothesis, not decision'. Liftor never invents revenue, valuation, buyer interest, customer traction, legal conclusions or deal multiples.",
    "Approving / rejecting recommendations. Open the Founder Approval Queue (Controls Centre → Approvals or inside the relevant screen). Approving moves the recommendation into execution; rejecting writes the reason into decision memory so the AI learns the founder's preference.",
    "Buyer warm-up. The buyer warmth status on each asset is driven by mock diligence runs, intent signals and adviser notes — no real buyer contact happens automatically. Sending a buyer pack, contacting a buyer or starting a sale process always requires founder approval.",
    "Data-room readiness. The data-room checklist generates from the asset type and exit target. Each item carries an owner, status and required evidence. The readiness percentage is the share of completed items weighted by importance.",
    "Decision memory. Every approval, rejection, override and challenge is written to decision memory and surfaced back to the AI Intelligence Orchestrator so future recommendations learn from the founder's pattern.",
    "Weekly / monthly / quarterly reviews. Weekly: assets needing attention, overdue execution targets, intelligence gaps, approvals waiting. Monthly: revenue vs target, pipeline vs target, exit readiness movement, data-room movement. Quarterly: build candidate scoring, exit target review, buyer/investor map refresh, retire/scale/park decisions.",
    "What requires founder approval. External outreach or sending; buyer/investor/adviser contact; paid API activation; data export; spend commitments; legal/tax/entity changes; sale process start; kill decisions; sharing buyer packs externally.",
    "What does not require founder approval. Viewing dashboards, adding internal records, importing data for review, calculating valuation targets, generating internal recommendations, generating execution targets, creating data-room checklist items, scoring build candidates, running internal AI analysis, updating manuals, viewing progress against target.",
    "What the system must never do automatically. Send external messages, contact a buyer/investor/adviser, publish anything externally, share a buyer pack, commit spend, change legal/tax/entity status, start a sale process, or take an irreversible action without founder approval recorded.",
    "Status meanings. Live — Healthy: all green. Live — Watch: items need review. Live — Budget Warning: AI or external spend approaching cap. Live — Cost Alert: cost anomaly. Live — Risk Alert: critical evidence/security/quality issue. Live — Approval Required: external action queued. The module never uses 'Not Ready', 'Simulation Only' or release-gate language.",
    "Cross-references: /founder/portfolio-exit (Command Centre), /founder/portfolio-exit/valuation, /founder/portfolio-exit/build-selector, /founder/portfolio-exit/intelligence, /founder/portfolio-exit/execution-handoff, /founder/portfolio-exit/ingestion, /founder/portfolio-exit/controls, /founder/portfolio-exit/hardening, /founder/portfolio-exit/release-gate (Operating Status), /founder/portfolio-exit/manual.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(PORTFOLIO_EXIT_COMMAND_CENTRE_GUIDE);

const FOUNDER_ACTION_BOARD_GUIDE: ManualSection = {
  number: 84,
  key: "founder-action-board",
  title: "Founder Action Board — Daily AI Operating Cockpit",
  body: [
    "Where to find it. Command Centre → AI Cost Governor → Founder Action Board (/founder/ai-cost/action-board). It is also linked from the AI Cost Governor hub.",
    "What it is. A single live screen that shows what needs attention today, what is working, the live AI operating summary, recommended decisions and today's AI finance snapshot. Internal preparation, logging and recommendations run live. External or high-risk actions still require explicit founder approval.",
    "What to check daily. (1) Approvals waiting — review and approve or reject. (2) Budget warnings — open budget settings if a business is over cap. (3) Cost alerts — open alerts and act on the recommended action. (4) Paused agents — confirm whether to resume. (5) Low ROI agents and workflows costing money but no value — downgrade tier or pause. (6) Missing provider pricing — add pricing so costs stay accurate. (7) Prompt injection / redaction events — confirm source. (8) Failed actions — open the ledger for the trace. (9) Duplicate prevented — informational, money saved.",
    "How to act on warnings. Each card carries a plain-English explanation, severity, the affected business/agent where relevant, a recommended action and one-click buttons (Review approval, View ledger, Open budget settings, Open provider pricing, Open agent controls, Open alert, Open finance pack, Pause/Resume agent, Acknowledge alert). Dangerous external actions are never possible from this screen without going through the founder approval queue.",
    "How to read recommendations. The Recommended founder decisions panel surfaces practical calls: Scale (agent with strong ROI), Keep (best-performing business), Watch (spend rising faster than value), Configure (missing pricing or budget), Reduce (low ROI agent — downgrade tier), Pause (cost with no linked value), Retire (workflow that cannot reach break-even), Approve (queue items waiting), Investigate (failed or injection events). Every recommendation explains why and links to the right page.",
    "How to use it as the daily control panel. Open it every morning. Clear approvals. Acknowledge or resolve any alerts. Action one Scale, one Watch and one Configure recommendation. Spot-check the AI finance snapshot (spend today by business and agent, cost per approved / rejected / useful action, best and worst ROI today).",
    "Status meanings. Live — Healthy / Watch / Budget Warning / Cost Alert / Risk Alert / Founder Pause. The board never uses 'Not Ready', 'Simulation Only' or release-gate language. The system stays live; only individual flagged actions are restricted.",
    "Cross-references: /founder/ai-cost (hub), /founder/ai-cost/live, /founder/ai-cost/ledger, /founder/ai-cost/alerts, /founder/ai-cost/approvals, /founder/ai-cost/budgets, /founder/ai-cost/agent-controls, /founder/ai-cost/pricing, /founder/ai-cost/quality, /founder/ai-cost/security, /founder/ai-cost/finance, /founder/ai-cost/roi.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(FOUNDER_ACTION_BOARD_GUIDE);

const AI_GATEWAY_RUNTIME_GUIDE: ManualSection = {
  number: 85,
  key: "ai-gateway-runtime",
  title: "AI Gateway, Orchestration Live and Runtime Health",
  body: [
    "What the AI Gateway is. One governance/control layer through which every approved AI call flows. It is not one queue and not one conversation pipe — many AI conversations, agents and workflows run at the same time. The gateway only exists to log cost, enforce budgets, isolate tenants, hold high-risk actions for approval, and give the founder a single place to see what is happening.",
    "Where to find it. Command Centre → AI Cost Governor. Three main screens: AI Bypass Register (/founder/ai-cost/bypass-register), AI Orchestration Live (/founder/ai-cost/orchestration-live), AI Runtime Health (/founder/ai-cost/health).",
    "Simultaneous conversations. Every conversation has its own conversation_id, business_id, portfolio_asset_id and agent_id. Conversations from different businesses never touch the same context. Many can run in parallel. A conversation waiting on approval does not block any other conversation.",
    "Status meanings. running = the AI provider call is in flight. queued = preflight passed and the request is waiting on an agent slot. waiting_approval = a high-risk external action is held for founder approval; the provider has not been called and no message has been sent. failed = the provider returned an error or the network failed. completed = the call returned successfully and was logged.",
    "Approval rules. Internal AI runs live with no approval: analysis, scoring, valuation, reporting, classification, internal drafts, dashboards, intelligence gap detection. Founder approval is always required for: external outreach or sending, buyer/investor/adviser contact, paid API activation, data export, spend commitments, legal/tax/entity changes, sale process start, kill decisions, sharing buyer packs externally.",
    "How to read bottleneck warnings. The Runtime Health cockpit raises warnings when queue depth, failed jobs, approval backlog, rate-limited events or budget usage cross thresholds. Warning means the system can still run but needs attention. Critical means a business is over cap or AI credits are exhausted — non-critical AI for that business is paused until the founder acts.",
    "What to do if AI fails. Open AI Runtime Health → Failed Jobs. Low/medium-risk rows can be retried from the cockpit (one click; a retry event is written to the audit trail). High/critical rows cannot be retried from the cockpit — they must be re-issued by the originating workflow so external-action safety is preserved. Any failed row can be marked resolved which writes manually_resolved to the audit trail.",
    "What the AI Gateway will never do automatically. Send external messages, contact a buyer/investor/adviser, publish anything externally, share a buyer pack, commit spend, change legal/tax/entity status, start a sale process, take an irreversible action without founder approval recorded, or expose any secret.",
    "Bypass Register. The register lists every function still calling AI outside the gateway. Each row shows risk level, migration status (migrated, migrated_no_op, pending) and notes. Migrated functions write to ai_gateway_requests + ai_usage_ledger + ai_runtime_events. Pending functions still run and are still safe, but their cost and concurrency are not yet under gateway control.",
    "Cross-references: /founder/ai-cost (hub), /founder/ai-cost/bypass-register, /founder/ai-cost/orchestration-live, /founder/ai-cost/health, /founder/ai-cost/action-board, /founder/ai-cost/approvals, /founder/ai-cost/budgets, /founder/ai-cost/ledger.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AI_GATEWAY_RUNTIME_GUIDE);

const AI_COST_ACCURACY_GUIDE: ManualSection = {
  number: 86,
  key: "ai-cost-accuracy",
  title: "AI Cost Accuracy — actual vs estimated",
  body: [
    "Cost cards show two figures: Actual cost (computed from real provider token counts) and Estimated-only cost (computed from approximate or streaming token counts).",
    "Every AI call is tagged with a cost_basis: actual_tokens, provider_reported, streaming_estimate, estimated_tokens, manual_estimate, or pricing_missing. The basis tells you how to read the row — actual_tokens and provider_reported are exact; the rest are best-effort.",
    "If you see a 'Models missing pricing' warning, the model returned tokens but has no row in the pricing registry yet. The call still ran; cost just wasn't computed. Add a row in the Provider Pricing page to back-fill.",
    "Most pricing rows ship as 'estimated' until a founder confirms them against the official provider price page and flips them to 'verified'. Estimated rows are flagged in the cockpit and the manual.",
    "Founder Copilot uses streaming. Its rows are tagged streaming_estimate because token totals are not always returned mid-stream. This is expected and does not indicate an error.",
    "Cross-references: /founder/ai-cost/health (Cost Accuracy tab), /founder/ai-cost/pricing (Provider Pricing registry), /founder/ai-cost/ledger.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(AI_COST_ACCURACY_GUIDE);

const PORTFOLIO_COMMANDER_ENGINE_GUIDE: ManualSection = {
  number: 87,
  key: "portfolio-commander-engine",
  title: "Portfolio Commander — what it does and what needs approval",
  body: [
    "Portfolio Commander is the engine that drives internal multi-agent workflows across your portfolio: weekly portfolio review, asset exit review, quarterly build selection, buyer warm-up plan, data room cleanup, valuation refresh, execution target generation, and competitor/investor scans.",
    "Each workflow is broken into ordered steps. Each step is owned by one agent (Portfolio Commander, M&A Intelligence, Valuation, Buyer Warm-Up, Data Room, Execution Target, Compliance/IP, or Founder Approval). The engine executes the next eligible step through the AI Gateway, then advances.",
    "Live-first behaviour. Internal analysis, scoring, drafts and reporting run automatically with no approval. Only high-risk external or irreversible steps wait for founder approval: buyer/investor/adviser contact, external sending, data exports, paid API activation, legal/tax/entity recommendations, spend commitments, sale process start, kill decisions, sharing buyer packs.",
    "Reading workflow progress. Each run shows status (queued, running, waiting_approval, paused, completed, failed, cancelled), current step / total steps, owner agent per step, and whether approval is required. Awaiting-approval steps show an Approve action; failed steps show a Retry action. Retrying a high-risk step routes it back to waiting_approval — duplicate external sends are blocked by idempotency.",
    "Where to see it. AI Orchestration Live (/founder/ai-cost/orchestration-live) shows the full step engine table. Portfolio & Exit Command Centre (/founder/portfolio-exit) shows a compact view with the next 7-day workflow actions and blocked items.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(PORTFOLIO_COMMANDER_ENGINE_GUIDE);

const FINAL_ACCEPTANCE_GUIDE: ManualSection = {
  number: 88,
  key: "final-acceptance-ai-runtime",
  title: "Final Acceptance — what Liftor can and cannot do automatically",
  body: [
    "Status: Live — Gateway Controlled and Orchestrated. Every AI call in Liftor now flows through the AI Gateway. There are zero direct AI bypasses on the runtime path.",
    "What runs automatically (no approval needed). Internal analysis, drafting, summarising, classification, scoring, valuation modelling, buyer/investor/competitor research, portfolio briefings, data-room checks, workflow step execution that does not contact the outside world, and dashboard updates. These run live across multiple businesses, agents and conversations in parallel.",
    "What always waits for founder approval. Sending any external message (email, DM, post, social), contacting buyers/investors/advisers, sharing buyer or data-room packs, committing spend, activating a paid API, starting a sale process, killing an asset, any legal/tax/entity action, and any irreversible step. Portfolio Commander parks these steps as 'waiting_approval' — the AI provider is not even called until you approve.",
    "Simultaneous conversations. Liftor can run many AI conversations at once. Different businesses never see each other's context. A conversation waiting for approval does not block any other conversation.",
    "Cost visibility. Every AI call is logged with a clear cost_basis label. Completed non-streaming calls carry actual token cost where pricing is published; streaming calls and unpriced models carry estimated cost. Open AI Runtime Health → Cost Accuracy to see the split and which models still lack verified pricing.",
    "Top tests you can run yourself. (1) Open AI Runtime Health — confirm 'Live — Gateway Controlled' and 0 bypasses. (2) Run a Founder Copilot chat — confirm runtime events appear. (3) Trigger a portfolio weekly review workflow — confirm internal steps run and a high-risk step parks for approval. (4) Approve the step — confirm it advances. (5) Open AI Bypass Register — confirm it stays at 0.",
    "What Liftor will never do automatically. Send anything externally, contact a buyer/investor/adviser, publish anything, share a buyer pack, commit spend, change legal/tax/entity status, start a sale process, take an irreversible action without your approval recorded, or expose any secret.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(FINAL_ACCEPTANCE_GUIDE);

const START_USING_LIFTOR_TODAY: ManualSection = {
  number: 89,
  key: "start-using-liftor-today",
  title: "Start Using Liftor Today — 60-second founder routine",
  body: [
    "Liftor is live. There is no readiness gate, no simulation-only mode, no pre-live blocker. Internal AI work runs live; only external/high-risk action waits for your approval.",
    "Step 1: Open /founder/command-centre.",
    "Step 2: Read Today's Founder Cockpit at the top — it answers, in one card: what needs attention today, today's AI spend, month-to-date AI spend, AI Gateway health, bypasses (should be 0), pending approvals.",
    "Step 3: Open the Founder Action Board card and clear approvals (the 9 LIVE_INTERNAL_TEST drill items can be bulk-rejected).",
    "Step 4: Check AI Gateway Health (/founder/ai-cost/health) — confirm Live — Gateway Controlled and 0 bypasses.",
    "Step 5: Check Alerts (/founder/ai-cost/alerts) and AI Spend (/founder/ai-cost/finance) — act on any red row.",
    "Step 6: Run one safe internal Liftor Brain query (/founder/brain) — confirm the row appears in the ledger and runtime events.",
    "Step 7: Do not approve any external action (email send, social publish, Apollo/Smartlead push, invoice send, buyer contact) until that business is configured and you have explicitly reviewed the draft.",
    "Cross-references: /founder/command-centre, /founder/ai-cost, /founder/ai-cost/action-board, /founder/ai-cost/health, /founder/ai-cost/alerts, /founder/ai-cost/finance, /founder/brain, /founder/ai-first-use-setup.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(START_USING_LIFTOR_TODAY);

const WHOLE_SYSTEM_LIVE_CAPABILITY_MAP: ManualSection = {
  number: 90,
  key: "whole-system-live-capability-map",
  title: "Whole-System Capability Map — what Liftor does live vs what needs approval",
  body: [
    "Live without approval (internal): analysis, drafting, scoring, classification, CRM/customer memory, content preparation, campaign planning, portfolio analysis, valuation modelling, finance reporting, dashboard updates, ledger logging, runtime events, internal recommendations, intelligence-gap detection.",
    "Always requires founder approval (external/high-risk): sending email (native or SMTP), Smartlead campaign start, Smartlead lead push, follow-up sequence activation; Metricool publish/schedule, ManyChat automation mutation, public post creation; customer email, customer report share, portal invite, customer success message; invoice send, payment or spend commitment, paid API activation, credit spend; buyer/investor/adviser contact, data-room share, sale process start, kill/park/sell asset action; legal/tax/entity action, contract/compliance-sensitive action; API-key change, provider activation, webhook activation, cron/send-job activation.",
    "Whole-system modules (every module reachable from Command Centre).",
    "Command Centre (/founder/command-centre) — daily operating cockpit. Hosts Founder Cockpit, What-Needs-Attention-Today, Business Operating Status, Agent Operating Status, Founder Action Board, navigation to every module.",
    "Liftor Brain (/founder/brain) — central AI co-pilot for internal questions, drafting and analysis. Reads Command Centre, manuals, CRM, approvals, revenue. Never sends, publishes or charges.",
    "AI Cost Governor (/founder/ai-cost) — pricing, budgets, agent controls, kill switch, alerts, ROI, ledger, finance pack, security, quality, sandbox.",
    "Gateway/Runtime Health (/founder/ai-cost/health, /founder/ai-cost/orchestration-live, /founder/ai-cost/bypass-register) — single gateway with 0 direct bypasses; cost-accuracy split between actual_tokens and estimated.",
    "CRM (business contact + memory tables, gated for external send) — total memory of every interaction; drafts only.",
    "Outreach (outreach_campaigns, Apollo) — internal prep live; external send/push behind approval gates.",
    "Smartlead — all four mutating actions (campaign_start, lead_push, webhook_create, follow-up activation) locked at the gate.",
    "Social (Metricool + ManyChat) — drafting live; publish/schedule/DM behind locked gates.",
    "Customer Success — onboarding share, report share, complaint/dispute response, winback message all gated; drafts live.",
    "Finance/Revenue — analysis live; invoice_send and apollo_credit_spend gated; payment/spend never automatic.",
    "Portfolio/Exit (/founder/portfolio-exit) — valuation, build selector, M&A intelligence, execution handoff, data-room readiness all live; buyer/investor contact, data-room share, sale process start always require approval.",
    "Approvals (/founder/ai-cost/approvals, Founder Approval Console) — every gated action lands here with the original draft and the required confirmation phrase.",
    "Alerts (/founder/ai-cost/alerts) — budget warnings, cost anomalies, risk alerts, injection events.",
    "Manuals — this User Manual (Simple + Full) plus the Technical Manual at /founder/manual/full.",
    "Cross-references: /founder/command-centre, /founder/brain, /founder/ai-cost, /founder/portfolio-exit, /founder/manual, /founder/manual/full, /founder/approvals.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(WHOLE_SYSTEM_LIVE_CAPABILITY_MAP);

const TECHNICAL_MANUAL_LIVE_STATE: ManualSection = {
  number: 91,
  key: "technical-manual-live-state",
  title: "Technical Manual — current architecture (v5.3 live state)",
  body: [
    "Live-first principle. Liftor runs live by default. There are no artificial readiness gates, no simulation-only default, no pre-live blockers. Approval locks apply only to external/high-risk action.",
    "Architecture. React 18 + Vite + TS + Tailwind + shadcn/ui frontend; Supabase Postgres + Edge Functions + Storage backend; multi-tenant by business_id with RLS on every public table.",
    "AI Gateway runtime path. Every approved AI call flows through supabase/functions/_shared/aiGateway.ts (callAIGateway / streamAIGateway). The gateway writes ai_gateway_requests, ai_runtime_events, ai_usage_ledger and enforces concurrency leases, budget caps, kill switch, redaction and idempotency.",
    "Edge function list. 14+ runtime functions import the shared gateway helper (Liftor Brain, Founder Copilot, business onboarding factory, daily/weekly loops, portfolio commander, proposal generator, etc.). external-action-executor is the single chokepoint for external mutations and reads external_action_gates before doing anything.",
    "Direct AI bypass status. 0 direct provider calls on the runtime path. The Bypass Register (/founder/ai-cost/bypass-register) reads 0. LOVABLE_API_KEY is the only AI credential; no OPENAI_API_KEY in runtime code.",
    "Database tables (audited live). 200+ public tables, every one with rowsecurity=true. Hot paths: ai_usage_ledger, ai_gateway_requests, ai_runtime_events, ai_provider_pricing, ai_business_budgets, ai_agent_cost_controls, ai_kill_switch_state, founder_approval_items, external_action_gates, execution_result_log, business_*, brain_*, apollo_*, agent_*.",
    "RLS/security. Founder/admin read+write on platform tables via has_role(); tenant-scoped CRM/customer/finance/portfolio tables; service-role inserts on ledger/runtime/gateway; no public SELECT on sensitive tables; UNIQUE(action_type) on external_action_gates prevents bypass ambiguity.",
    "External action gates. 19 gates (native_email_send, smartlead_campaign_start, smartlead_lead_push, smartlead_webhook_create, social_schedule_post, social_dm_send, customer_report_share, customer_onboarding_share, complaint_response_send, dispute_response_send, external_message_send, invoice_send, apollo_credit_spend, apollo_candidate_pull, apollo_reveal, prospecting_external_search, proposal_send, compliance_action, compliance_suppression). All enabled=false, requires_founder_confirmation=true.",
    "Ledger/runtime/cost logging. ai_usage_ledger carries cost_basis ∈ {actual_tokens, provider_reported, streaming_estimate, estimated_tokens, manual_estimate, pricing_missing}; ai_provider_pricing holds 12 active rules currently flagged confidence='estimated' pending founder verification.",
    "Idempotency/concurrency. ai_concurrency_leases enforces per-agent/per-business slot limits; idempotency keys on external_action_executor prevent duplicate sends; portfolio commander steps marked waiting_approval do not call the provider until approval is recorded.",
    "Command Centre data flow. CommandCentre.tsx mounts FounderCockpit + WhatNeedsAttentionToday + BusinessOperatingStatus + AgentOperatingStatus + FounderActionBoard at the top; each queries Supabase live via useQuery. Setup/activation/runbook panels collapsed into a single optional section beneath operations.",
    "Known limitations. (a) 12 pricing rules still 'estimated'. (b) Streaming completion tokens recorded as streaming_estimate. (c) Vite bundle size warning (6 MB / 1.47 MB gz) — cosmetic. (d) Portfolio/exit has no executor wired — by design, advisory-only.",
    "Build status. tsc --noEmit: 0 errors. vite build: passing. vitest: 54/54 tests passing including CommandCentreMasterIndex orphan audit.",
    "Cross-references: /founder/manual/full (this technical manual), /founder/ai-cost/health, /founder/ai-cost/bypass-register, /founder/ai-cost/pricing, /founder/ai-cost/approvals, /founder/ai-first-use-setup.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(TECHNICAL_MANUAL_LIVE_STATE);

const CUSTOMER_VOICE_SALES_CLOSE_ENGINE: ManualSection = {
  number: 92,
  key: "customer-voice-sales-close-engine",
  title: "92. Customer Voice + Sales Close Engine",
  body: [
    "Purpose. Liftor holds customer/prospect conversations, understands each product or service, recommends the right offer, qualifies the buyer, handles objections, prepares a close and hands off to payment / contract / booking. Internal preparation (drafting, analysis, CRM updates, product matching, script generation, quote preparation, objection responses) runs live. Outbound calls, payment links, contract sends, invoice sends and any customer/prospect message remain approval-gated until the relevant provider is connected and founder rules permit.",
    "Routes. /founder/customer-sales (hub), /voice-console, /product-knowledge, /playbooks, /conversations, /call-logs, /close-engine, /offers, /objections, /follow-up, /settings.",
    "Tables. customer_sales_products, customer_sales_offers, customer_sales_playbooks, customer_sales_conversations, customer_sales_call_logs, customer_sales_close_actions, customer_sales_provider_settings, customer_sales_objection_library, customer_sales_knowledge_sources — all RLS-protected to founder/admin only.",
    "Providers. Retell / Vapi / Twilio / ElevenLabs / custom. Each starts at provider_status='not_connected' with api_secret_configured=false. No external dialing, messaging, payment or contract action is performed until provider_status='live' and the matching founder approval flag is satisfied (require_founder_approval_for_outbound / payment / contract).",
    "Command Centre integration. CustomerSalesEngineCard shows provider status, calls today, conversations needing follow-up, close actions awaiting approval, hot buying signals (>=70% close probability), products missing sales knowledge, and the next recommended action. WhatNeedsAttentionToday surfaces sales close approvals and follow-ups. AgentOperatingStatus lists 'Customer Sales Engine' as a core agent.",
    "First-Use Configuration. Section 11 covers products, playbooks, provider connection and close approvals — surfaced as 'configure' or 'watch' status, never as a blocker.",
    "Empty states. No provider connected, no products added, no playbooks added, no calls yet, no close actions yet — every screen has a safe empty state with a hint and a fix link. Liftor continues preparing scripts, qualification and offers internally regardless of empty state.",
    "Caveats. No external provider is wired by this foundation pass: no outbound dialing, no payment links sent, no contracts sent. That switch is enabled per-business once you connect a provider and approve the action explicitly.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(CUSTOMER_VOICE_SALES_CLOSE_ENGINE);

const CUSTOMER_VOICE_SALES_INTEGRATION: ManualSection = {
  number: 93,
  key: "customer-voice-sales-integration",
  title: "93. Customer Voice + Sales Close — full Command Centre integration",
  body: [
    "Surfaces. The Customer Voice + Sales Close Engine is not a detached page. It is wired into Today's Founder Cockpit (sales button + recommended action), What Needs Attention Today (close approvals, follow-ups, hot buying signals, ready-to-buy, safety warnings, escalations, consent gaps, human handoffs), Business Operating Status (calls today + close awaiting approval per business), Agent Operating Status (Voice Sales Agent, Inbound Call Agent, Outbound Call Agent, Sales Conversation Agent, Objection Handling Agent, Close Preparation Agent, Follow-Up Agent, Human Handoff Agent), First-Use Configuration (products, playbooks, provider, close approvals), the Approval Queue (close actions and outbound calls require founder approval), Live Alerts (sales safety events feed founder_alert_run when severity >= high), the CRM contact detail page (CRMContactSalesPanel shows conversations, calls, closes awaiting approval, follow-ups, handoffs, and hot signals), and the Finance / Revenue dashboard (pipeline and close-action state).",
    "Agents. Each sales agent surfaces status (active/idle/paused/failed), provider dependency (Retell/Vapi/Twilio/ElevenLabs/custom), last action timestamp, cost today (rolled up from ai_usage_ledger by sales category), failures (last 24h ai_runtime_events), approvals generated (founder_approval_items), and a recommended next action. External call/message actions remain locked until the provider is live and founder approval rule allows.",
    "Manual coverage. User Manual: how to add products/services (Product Knowledge), how to create offers (Offers), how to review calls (Call Logs + Conversations), how to approve close actions (Close Engine), what the voice agent can/cannot do (Settings → safety + provider status), external action safety (Safety Centre), API setup checklist (Settings → providers + Secrets). Technical Manual: tables customer_sales_*, provider adapter src/lib/providers/voiceProviderAdapter.ts, voice provider secrets (Retell/Vapi/Twilio/ElevenLabs API keys — empty until founder adds), webhook routes (customer-voice-inbound-webhook, customer-voice-call-status-webhook, customer-voice-transcript-ingest, customer-voice-post-call-analysis), playbook engine (sales-conversation-brain), close engine (customer_sales_close_actions with approval_status gate), safety/consent layer (customer_sales_safety_events + customer_sales_contact_safety + customer_sales_prohibited_claims + customer_sales_escalation_triggers), CRM/finance integration (CRMContactSalesPanel + FounderRevenue CustomerSalesEngineCard).",
    "Known limitations. No provider is wired by default; founder must add secrets and switch provider_status to live to enable real calls. Confirmed revenue is updated only on verified payment/contract/booking events. Estimated pipeline derives from close_probability and is advisory. Inbound calls without configured consent language stay in approval-required state.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(CUSTOMER_VOICE_SALES_INTEGRATION);

const SALES_COACHING_LEARNING_LOOP = {
  number: 94,
  key: "sales-coaching-learning-loop",
  title: "94. Sales Coaching + Conversion Learning Loop",
  body: [
    "Purpose. Liftor learns what works. Every conversation, proposal, call, follow-up, close attempt and upgrade feeds a learning loop that improves scripts, offers, objection responses, and conversion rates over time. Internal analysis runs live; all external customer actions remain approval-gated.",
    "Routes. /founder/sales-coaching (Dashboard — funnel, drop-off, objections, scripts, lost-deal reasons, close rate by agent/product), /founder/sales-coaching/conversions (close rate by agent, product, channel), /founder/sales-coaching/objections (objection register with loss impact and suggested responses), /founder/sales-coaching/scripts (per-section usage, conversion, objection, approval, close rate, sentiment, and recommended status keep/improve/retire/test_new), /founder/sales-coaching/wins-losses (per-deal review with winning factors, losing factors, price/trust/timing/fit/competitor flags, recommended change), /founder/sales-coaching/recommendations (Coaching Agent suggestions — review, apply, dismiss).",
    "Tables. sales_conversion_events (funnel events: lead_created, call_booked, call_completed, proposal_sent, follow_up_sent, close_attempted, closed_won, closed_lost, upgraded, churned with value, currency, source_agent, channel). sales_win_loss_reviews (outcome, objections, winning_factors, losing_factors, issue flags, recommended_change). sales_script_performance (usage_count, conversion_rate, objection_rate, approval_rate, close_rate, average_sentiment, recommended_status). sales_coaching_recommendations (category, priority, status open/in_review/applied/dismissed, evidence). RLS restricts to founders/admins.",
    "Agents. Sales Coaching Agent (weekly performance review: what is working, what is not, what to change). Conversion Learning Agent (continuously updates sales_script_performance from new events and reviews).",
    "Integration. Customer Sales Engine emits sales_conversion_events for every funnel transition. Sales Target Achievement Engine consumes conversion rates to recalculate required activity. Upgrade + Upsell Engine emits upgraded/churned events. Approval Queue receives any recommendation that proposes a script/offer change requiring founder sign-off. Command Centre exposes coaching tiles (open recommendations, critical items, scripts to fix or retire) and the Sales Coaching Hub link inside the Customer Sales Hub.",
    "Safety. No external action. Recommendations only mutate internal scripts/offers after the founder presses Apply. The engine never sends a message, schedules a call, or modifies a contract.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(SALES_COACHING_LEARNING_LOOP);

const REVENUE_AUTOPILOT_LOOP = {
  number: 95,
  key: "revenue-autopilot-operating-loop",
  title: "95. Revenue Autopilot Operating Loop",
  body: [
    "Purpose. One daily loop that connects sales, targets, upgrades, CRM, outreach, customer success and finance into a single revenue heartbeat. Internal recommendations and task creation run live; external actions (contact, send, call, charge, book, invoice, sign) remain approval-gated.",
    "Routes. /founder/revenue-autopilot (Overview — target/actual/pipeline/gap, top 5 actions, Revenue Manager Agent recommendation), /founder/revenue-autopilot/today (recommended sequence for today), /founder/revenue-autopilot/targets (active monthly targets feeding the loop), /founder/revenue-autopilot/tasks (Revenue Task Queue — qualify_lead, draft_reply, prepare_call/follow_up/proposal/close/upgrade, review_approval, update_crm, review_lost_deal, improve_script, set_missing_revenue_target, verify_pricing), /founder/revenue-autopilot/gaps (bottleneck explanation, pipeline coverage, blockers), /founder/revenue-autopilot/approvals (close actions awaiting founder sign-off).",
    "Tables. revenue_autopilot_tasks (task_type, priority, estimated_value, due_at, assigned_agent, approval_required, status, linked contact/conversation/product/offer). revenue_autopilot_snapshots (daily target/actual/pipeline/gap/required activity/hot leads/upgrade opportunities/proposals/calls/approvals/top actions). revenue_autopilot_recommendations (Revenue Manager Agent suggestions with category, priority, is_blocking, target_agent, status). RLS restricts to founders/admins.",
    "Agents. Revenue Manager Agent coordinates Sales Manager Agent, Voice Sales Agent, Upgrade Agent, Proposal Generator, Follow-Up Agent, Customer Success Agent and Finance Agent. It outputs the top 5 revenue actions today, what is blocking revenue, what must be approved, what must be configured, what target is at risk, and which agent should act next. The Revenue Autopilot Orchestrator emits and updates daily snapshots and tasks.",
    "Rules. Confirmed revenue updates only after verified payment, contract, subscription or booking completion (confirmed_revenue_value on customer_sales_close_actions). Estimated pipeline is probability-weighted and clearly labelled. No external side effects from this loop; it can prepare, route and queue but never transmit.",
    "Command Centre. The Revenue Autopilot Card surfaces target gap, required actions today, hot leads, upgrade opportunities, close approvals waiting, overdue follow-ups, proposals needed, calls to prepare, and the agent recommended action. What Needs Attention Today exposes open and critical autopilot tasks.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(REVENUE_AUTOPILOT_LOOP);

const QUOTE_TO_CASH_ENGINE = {
  number: 96,
  key: "quote-to-cash-engine",
  title: "96. Quote-to-Cash Engine",
  body: [
    "Purpose. Single commercial flow: lead/opportunity → quote → proposal → approval → invoice/payment link → payment received → revenue confirmed → delivery triggered. Drafts run live. Sending quotes/proposals/invoices, issuing payment links, and provider mutations remain founder-approval-gated.",
    "Routes. /founder/quote-to-cash (Overview + flow diagram), /quotes, /proposals, /invoices, /payments, /revenue-confirmation, /settings (provider wiring + approval rules).",
    "Tables. qtc_quotes (status draft/approval_required/approved/sent/accepted/rejected/expired/cancelled, amount, tax, discount, total, validity, terms). qtc_proposals (title, summary, body, pricing_summary, risk_flags, status). qtc_invoices (status draft/approval_required/approved/sent/paid/overdue/void/cancelled, due_date, provider, provider_invoice_id, payment_link_url). qtc_payments (status pending/succeeded/failed/refunded/disputed/cancelled, provider, provider_payment_id, confirmed_revenue flag). qtc_revenue_confirmations (revenue_type one_time/recurring/subscription/deposit/balance/refund, confirmation_source payment_provider/manual/invoice_paid/contract_signed).",
    "Triggers. qtc_on_quote_accepted: when a quote moves to accepted, an invoice draft is auto-created with founder_approval_required = true. qtc_on_payment_succeeded: when a payment transitions to succeeded (and is not a LIVE_INTERNAL_TEST row), it writes a qtc_revenue_confirmations row, sets confirmed_revenue = true on the payment, and marks the linked invoice paid.",
    "Agents. Quote-to-Cash Agent (drafts quotes/proposals/invoices from accepted deals). Invoice & Payment Agent (chases overdue, prepares retries, never sends without approval). Revenue Confirmation Agent (matches payments to invoices, writes confirmed revenue).",
    "Integration. Customer Sales Close Engine seeds quotes/proposals on close attempts. CRM links contact/deal. Revenue Autopilot consumes approval-blocked counts and confirmed revenue. Finance Pack reads qtc_revenue_confirmations for verified revenue only. Approval Queue receives quote/proposal/invoice approval items. Command Centre exposes the Quote-to-Cash Card (quotes awaiting approval, invoices drafted/awaiting approval, overdue, payments received, confirmed revenue today/month, revenue blocked by approval).",
    "Rules. Confirmed revenue only after verified payment, invoice paid event, signed contract, or manual founder confirmation. Estimated pipeline (from sales conversations/close actions) stays separate from confirmed revenue. Test rows tagged LIVE_INTERNAL_TEST never count as confirmed revenue. No external provider mutation is performed by this engine yet — Stripe/invoice/contract integrations are wired later from Settings.",
  ].join(" "),
};
LIFTOR_FULL_GUIDE.push(QUOTE_TO_CASH_ENGINE);

// ─────────────────────────────────────────────────────────────────────────────
// August 2026 Architecture Reconciliation — plain-English operator sections.
// Added 25 August 2026. Command Centre remains the start point; these sections
// describe modules that existed in code but were missing from the User Manual.
// ─────────────────────────────────────────────────────────────────────────────

export const ARCHITECTURE_SYNC_USER_SECTIONS: ManualSection[] = [
  {
    number: 97,
    key: "one-system-many-businesses",
    title: "97. One system, many businesses (how your data is shared)",
    body: "Liftor is one operating system that runs all your businesses, not a separate copy per business. Two things are true at once. First, each business has its own private operating context — its offers, campaigns, conversations, deals, delivery, support, finance activity and content stay inside that business and must never leak into another. Second, people, organisations and reusable data assets are stored once for the whole portfolio and shared. So the same person can be relevant to two businesses without being duplicated. What stays business-specific is the commercial relationship: whether that business may contact them, how relevant they are, and what has happened between them.",
  },
  {
    number: 98,
    key: "crm-vs-relationship-intelligence",
    title: "98. CRM vs Relationship Intelligence (which one to open)",
    body: "Open /founder/crm/contacts when you want the operational CRM — real people you can work commercially. Open /founder/relationship-intelligence when you want research and evidence you have gathered but not yet made operational. Research does not become CRM automatically. It is promoted through a controlled bridge only when the role/evidence matches or you approve it. Nothing you import or promote ever sends anything.",
  },
  {
    number: 99,
    key: "data-asset-register-user",
    title: "99. Data Asset Register and reusable buyer pools",
    body: "The Data Asset Register on the Command Centre shows every reusable data asset you own, with live counts read from the live database rather than an old saved file. The Global Education asset currently holds 2,519 contacts across 266 organisations: 109 verified work emails, 1,424 needing an email reveal, 986 with no email on file. Old GitHub status files are kept as history only. Rule: hold data, never delete it, and never let an old snapshot overwrite live counts.",
  },
  {
    number: 100,
    key: "pr-and-visibility",
    title: "100. PR, press and visibility (Global PR Radar)",
    body: "Open /founder/global-pr-radar. It holds the media atlas, journalist and outlet intelligence, press readiness per business, pitch drafts, owned-media plans and quarterly PR campaign planning. Everything is prepared internally. No pitch, press release or media email leaves Liftor without your explicit approval.",
  },
  {
    number: 101,
    key: "social-three-engines",
    title: "101. The three social engines and what each is for",
    body: "Social Autopilot (/founder/social-autopilot) plans and drafts your content, runs the calendar, approval queue and publishing queue. The Social Relationship Engine (/founder/social-relationships) is about people: finding targets, tracking relationship health, handling the engagement inbox and matching to CRM. The Social Viral Opportunity Radar (/founder/social) watches for trends worth reacting to and scores opportunities so you can turn one into a brief. Publishing and DMs remain approval-gated in all three.",
  },
  {
    number: 102,
    key: "radars-and-capital",
    title: "102. Radars: distressed, acquisition and funding",
    body: "Distressed Radar (/founder/distressed-radar) surfaces businesses in trouble that could be opportunities. Funding Radar (/founder/funding-radar) runs funding discovery through shortlist, readiness and adviser pack. Acquisition Funding (/founder/acquisition-funding) covers how a deal would actually be paid for. All three prepare information; none of them contact anyone.",
  },
  {
    number: 103,
    key: "wealth-intelligence-user",
    title: "103. Billionaire and wealth network intelligence",
    body: "Open /founder/billionaire-intelligence for the wealth coverage registry, wealth snapshots, philanthropy and Giving Pledge mapping, next-gen wealth networks, and how strong your verified route to a person is. This is intelligence only. Any approach is a separate, deliberate, approved decision.",
  },
  {
    number: 104,
    key: "exit-and-buyers-user",
    title: "104. Exit engines and buyer warm-up",
    body: "Founder-Led Exit Sales Engine (/founder/founder-led-exit) tracks exit targets and readiness. The Buyer & Market Domination Engine (/founder/founder-led-buyer-market) keeps quiet profiles of potential acquirers and competitors. Buyer warm-up is tracking only — contacting a buyer is blocked in the database itself unless you have explicitly marked that buyer approved to contact.",
  },
  {
    number: 105,
    key: "imports-identity-search",
    title: "105. Importing data, removing duplicates and finding anything",
    body: "Import/Migration Centre (/founder/imports) stages any import so you can preview it before it lands. Identity Resolution (/founder/identity-resolution) is where you resolve duplicate people and organisations. Global Search (/founder/search) searches across record types, modules and manuals. Imports never enqueue outreach, and deduping never deletes the record you might still need — Liftor holds rather than removes.",
  },
  {
    number: 106,
    key: "legal-entity-stack-user",
    title: "106. Legal, entity and filings stack",
    body: "Entity Map (/founder/entity-map) holds your legal entities, required-policy matrix and revenue routing rules. Contracts, Corporate Secretarial, Statutory Filings, Jurisdiction & Tax, International Expansion, Insurance & Liability and IP Assets each have their own page. Liftor never files anything, never emails an adviser and never changes an entity, bank or shareholder. Sensitive items go to the adviser queue instead of being answered as AI advice.",
  },
  {
    number: 107,
    key: "evidence-and-data-room-user",
    title: "107. Documents, evidence, data room and adviser packs",
    body: "Document Vault (/founder/documents) is your evidence store. Data Room (/founder/data-room) is closed by default and issues no external links. Adviser Pack (/founder/adviser-pack) assembles a pack for an adviser but does not send it. If you need to share, that is a separate approved action you take yourself.",
  },
  {
    number: 108,
    key: "ai-governance-user",
    title: "108. Keeping AI spend and behaviour under control",
    body: "AI Cost Governor (/founder/ai-cost) shows budgets, usage, provider pricing and ROI. AI Evals (/founder/ai-evals) tests that AI behaviour has not regressed. Agent Capabilities (/founder/agent-capabilities) lists exactly what each agent may do and what stays founder-only. If something feels like it is doing too much, that is the page to check.",
  },
  {
    number: 109,
    key: "healthcare-overlay-user",
    title: "109. Healthcare overlay — what it actually is",
    body: "The Healthcare Overlay (/founder/healthcare-overlay) is a generic readiness overlay for internal preparation. It is NOT LIVE and BLOCKED by default, and there are no clinical decision features in Liftor. Do not treat it as a healthcare product.",
  },
  {
    number: 110,
    key: "manual-hierarchy-user",
    title: "110. Which manual to trust",
    body: "In order: the Command Centre Truth Sync is what is true right now; the Full Technical Manual is the canonical architecture (Section 100 is the current August 2026 map); this User Manual tells you how to operate it; the Build Log is history; Business Manuals hold business-specific tone, offers and rules; the Slim Mandy Manual is a portable summary for handover only and is never the technical source of truth.",
  },
];

ARCHITECTURE_SYNC_USER_SECTIONS.forEach((s) => LIFTOR_FULL_GUIDE.push(s));
