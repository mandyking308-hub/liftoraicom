// Liftor User Manual — plain-English operating guide (separate from Founder/Technical Manual)

export const LIFTOR_USER_MANUAL_VERSION = "1.0 — Operator Go-To-Use Edition (15 May 2026)";

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
