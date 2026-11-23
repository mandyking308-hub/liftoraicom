// Liftor page-by-page User Guide (19 Nov 2026).
// Pages come straight from founderAreas.ts, so every registered page is always covered.
import { founderAreas, type FounderArea } from "./founderAreas";

export const LIFTOR_PAGE_GUIDE_VERSION = "2.0 — 19 November 2026 · every Liftor HQ section and page";

export type AreaGuide = { purpose: string; howTo: string[]; safety: string };

export const GETTING_STARTED: { title: string; body: string }[] = [
  { title: "Signing in", body: "Go to https://liftorai.com/founder/login and sign in with your founder account. There is no public sign-up; only founder/admin accounts can open Liftor." },
  { title: "Liftor HQ is home", body: "After signing in you land on Liftor HQ (/founder). It shows 14 boxes — one per section. Click a box to open that section, then click any tool inside it. The menu on the left shows the same 14 sections." },
  { title: "Tabs and Older versions", body: "Related tools are combined into one page with tabs along the top. Earlier or duplicate pages are never deleted; they sit under 'Older versions' at the bottom of each section and still open." },
  { title: "Choosing a business", body: "Kindnesss is the active business. Pages that hold business data show the selected business; data from one business never mixes with another." },
  { title: "Nothing goes out by itself", body: "Liftor drafts, prepares and waits. Sending emails, posting on social, charging money, pushing leads and going live are all behind safety switches that are OFF. Drafts always say DRAFT / NOT SENT." },
  { title: "A normal day", body: "1) Daily running → Approvals. 2) Work queue → Today and Overdue. 3) Alerts. 4) Email outreach → Unified inbox for replies. 5) Kindnesss sign-ups card on Liftor HQ. 6) Reviews & reports at the end of the week." },
];

export const AREA_GUIDES: Record<string, AreaGuide> = {
  daily: { purpose: "Your daily control room: what needs a yes/no, what is overdue, what is going wrong and what you decided.",
    howTo: ["Start in Approvals and approve, reject or send back each item.", "Open Work queue and work the Today tab, then Overdue; use Priority, Attention guard and Hand-offs tabs to focus.", "Check Alerts — red means act today, amber this week. Mark items resolved yourself.", "Record big choices in Decisions so follow-through is tracked.", "Use Reviews & reports for daily summaries and the weekly review."],
    safety: "Approving here only approves inside Liftor; external actions still need their own safety switch." },
  radars: { purpose: "Who you know and who to approach: the shared CRM, your relationship network, research radars and your private school records.",
    howTo: ["CRM: search or open a person; each business keeps its own status, suppression and eligibility. Use the Duplicate people tab to merge doubles.", "Relationship intelligence: your network memory, with Strategic organisations and Relationship health tabs.", "Funding, PR, Distressed and Billionaire radars: research lists only — they never create leads automatically.", "Retirement & Succession (23 Nov 2026): UK businesses sold because the owner is retiring. Tabs: Opportunities (score, seller finance proof/possible/unknown, profit shown as Unknown when not stated, Interesting vs Due-diligence ready), Sources & Alerts (9 broker sites; set up each site's email alert yourself; no site is crawled and the discovery connector is not configured), Import (one listing or CSV/JSON: preview, then save; duplicates merge; emails and phone numbers rejected), Activity. Also linked from Portfolio & exit. Never contacts sellers.", "Retirement & Succession (23 Nov 2026): UK businesses sold because the owner is retiring. Tabs: Opportunities (score, seller finance proof/possible/unknown, profit Unknown when not stated, Interesting vs Due-diligence ready), Sources & Alerts (9 broker sites; set up each site's email alert yourself — no site is crawled and the discovery connector is not configured), Import (one listing or CSV/JSON: preview, then save; duplicates merge; emails/phones rejected), Activity. Never contacts sellers.", "Schools (private): your school records, Admissions tracker and the 52,591-school official register. Private, never linked to a campaign."],
    safety: "Research is not a lead list. Family and admissions details never go into campaigns." },
  sales: { purpose: "Turning a conversation into a sale.",
    howTo: ["Pipeline: drag leads between stages.", "Sales targets: enter a revenue goal and see the daily activity needed.", "Sales conversations: qualification, objections and hand-offs, plus a Sales coaching tab.", "Demos: sandbox demo passes with no real client data.", "Quote to cash: proposals, invoices, payment and delivery, including website proposal requests."],
    safety: "Proposals and invoices stay internal until you share them through their gate." },
  outreach: { purpose: "Cold email: booking the shared mailboxes, Smartlead campaigns, replies and mailbox health.",
    howTo: ["Send calendar & launch control: book a business's five-email campaign into a time slot across the 180 GSM mailboxes; Liftor blocks overlapping bookings. Campaign factory is a tab here.", "Smartlead campaigns: read-only view of campaigns synced from Smartlead (Kindnesss campaign 4103531 is DRAFTED, 0 sent).", "Unified inbox & log: every reply tagged by business, with quarantine and the privacy queue.", "Outreach data: lead datasets, the Apollo archive and CRM checks.", "GSM mailboxes: the commercial sending estate with Sending health tabs. GHAT mailboxes are charity-only and never used for commercial campaigns."],
    safety: "Bookings never send (sending_enabled is locked off). Starting a campaign or pushing leads needs the Smartlead safety switches, which are OFF." },
  social: { purpose: "Social posts and social networking.",
    howTo: ["Social posting: review drafts in the Readiness & drafts tab and approve them.", "Social messaging: networking conversations, kept separate from posting."],
    safety: "No social account is connected and nothing posts automatically." },
  marketing: { purpose: "Campaign briefs, launch kits, creative and partners.",
    howTo: ["Marketing hub: the Kindnesss box at the top shows the current four-email campaign (DRAFT, NOT SENT) with each full email; older drafts sit closed under 'Superseded / not used'. Channels, Experiments and Attribution are tabs.", "Creative assets: brand, image, video and copy library with an IP & rights tab.", "Partners & affiliates: partner and referral records."],
    safety: "Copy here is reviewable drafts only; there is no send or publish button." },
  customers: { purpose: "Looking after paying customers.",
    howTo: ["Customer success: check-ins, renewals and retention, with Onboarding, Upgrades and Feedback tabs.", "Support: help articles and drafts, with Tickets and Complaints & refunds tabs.", "Delivery: what must be delivered, by whom and when.", "Client portals: portal admin and portal content.", "Scheduling: customer bookings.", "Trust & safety: fraud and abuse risk scores."],
    safety: "Surveys, reports and portal invites are drafted, not sent, until approved." },
  money: { purpose: "Revenue, invoices, cash and checking the numbers agree.",
    howTo: ["Finance hub: targets, deals, invoices and cash, with Morning view, Revenue, Pricing & margin, Revenue autopilot and Currency tabs.", "Collections: money owed and follow-ups.", "Reconciliation: mismatches between records, held for your approval."],
    safety: "Liftor never charges or refunds anyone by itself." },
  legal: { purpose: "Staying compliant and organised legally.",
    howTo: ["Compliance: flags, with Business, AI and Healthcare tabs.", "Privacy: data requests, consent and breaches.", "Policies & contracts: policy versions, acceptances, coverage and contracts.", "Company & tax: entities, company secretarial, filings, tax, international and adviser packs.", "Insurance: cover, renewals and claims.", "Wind-down: controlled closure of a business."],
    safety: "Liftor does not file anything with authorities; filings are prepared for you or your adviser." },
  portfolio: { purpose: "Choosing what to build next and preparing businesses for sale.",
    howTo: ["Build & priorities: next businesses, prioritisation, resources, lifecycle and memory tabs.", "Portfolio risk: exposure across businesses, with Diversity tab.", "Portfolio & exit: valuation, exit metrics, targets, buyers and funding.", "Data room: investor access with watermarking and audit."],
    safety: "Data room access is audited; nothing is shared without you granting access." },
  setup: { purpose: "Adding a business and holding everything Liftor knows about it.",
    howTo: ["Add a business: pick or create the business, enter the website and tick 'use the copied manuals', click 'Read and fill all steps' (tick 'Replace boxes…' to overwrite). Liftor reads the whole website (up to about 31 pages) and the manuals, fills the 12 steps as drafts; review and Save each step. 'One company setup across Liftor' then creates or links records in all 14 sections — safe to rerun.", "Step 4 Offer/product holds all plans and monthly, quarterly and yearly prices; Step 8 Sales target holds only revenue targets.", "Launch & go-live: launch packs, internal activation and go-live readiness.", "Products & offers: catalogue, shop, marketplace and education.", "Manuals & knowledge: business manuals, this Liftor manual, user guide and knowledge quality.", "Documents & SOPs: evidence vault, SOPs, automation book and videos."],
    safety: "Setup never sends, publishes, charges or switches anything live. Existing live/approval settings are preserved." },
  people: { purpose: "Helpers, workers and suppliers.",
    howTo: ["People: workers and access, with Helpers, Worker manuals, Help audit and Capacity tabs.", "Suppliers: source and approve suppliers, with Supplier assignments.", "Vendors & tools: software costs, renewals and data risk."],
    safety: "Workers only see what their role allows." },
  ai: { purpose: "Liftor's AI helpers and what they cost.",
    howTo: ["AI co-pilot: ask questions in plain English (e.g. 'what's blocking Kindnesss?').", "AI brain: reply insights with Brain core and Strategy tabs.", "Agents: see each agent's status and queue; run safe internal jobs.", "AI costs & approvals: spend and the AI approval queue."],
    safety: "AI drafts are always internal; a human approves every external action." },
  platform: { purpose: "Keeping Liftor healthy, secure and separated by business.",
    howTo: ["System oversight: events, health and modes.", "Security: monitoring and access.", "Safety switches / Activation gate: which businesses and actions may run — all external switches are OFF.", "Business separation: stops businesses' data mixing.", "Integrations: connected services (Smartlead, Apollo, Winnr, Kindness Habits feed).", "Audit ledger: the permanent record of who did what.", "Testing, Workflows, Imports and Backups: checks, automations, controlled imports with rollback and recovery packs."],
    safety: "Only founder/admin accounts can open these pages; backend jobs refuse anonymous callers." },
};

export const activeSections = (a: FounderArea) => a.sections.filter((s) => !s.legacy);
export const olderSections = (a: FounderArea) => a.sections.filter((s) => s.legacy);

export const buildPageGuideMarkdown = () => {
  const lines = [`# Liftor User Guide — every section and page`, `_Version ${LIFTOR_PAGE_GUIDE_VERSION}_`, "", "## Getting started", ""];
  GETTING_STARTED.forEach((g) => lines.push(`**${g.title}.** ${g.body}`, ""));
  founderAreas.forEach((a) => {
    const g = AREA_GUIDES[a.key];
    lines.push(`## ${a.n}. ${a.title}`, "", a.summary, "");
    if (g) { lines.push(`**What it's for:** ${g.purpose}`, "", "**How to use it:**", ...g.howTo.map((h, i) => `${i + 1}. ${h}`), "", `**Safety:** ${g.safety}`, ""); }
    lines.push("**Pages:**", ...activeSections(a).map((s) => `- **${s.label}** (${s.route}) — ${s.desc}`), "");
    const old = olderSections(a);
    if (old.length) lines.push("**Older versions (still open, nothing deleted):**", ...old.map((s) => `- ${s.label} (${s.route}) — ${s.desc}`), "");
  });
  return lines.join("\n");
};
