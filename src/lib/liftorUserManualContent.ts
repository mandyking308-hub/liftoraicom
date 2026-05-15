// Liftor User Manual — plain-English operating guide (separate from Founder/Technical Manual)

export const LIFTOR_USER_MANUAL_VERSION = "1.4 — Go-To-Use + Revenue Target Operating Mode (15 May 2026)";

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