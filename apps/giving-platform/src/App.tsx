import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardCheck,
  Globe2,
  HandCoins,
  HeartHandshake,
  Landmark,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

type View = "home" | "explore" | "business" | "charity" | "projects" | "volunteers" | "pricing" | "dashboard";
type GivingBasis = "fixed_per_sale" | "percentage_of_sales" | "fixed_campaign";

type CharityListing = {
  id: string;
  name: string;
  country: string;
  registration: string;
  cause: string;
  summary: string;
  verified: boolean;
};

type Project = {
  id: string;
  title: string;
  charityId: string;
  country: string;
  theme: string;
  target: number;
  raised: number;
  status: string;
};

type CampaignDraft = {
  businessName: string;
  companyNumber: string;
  jurisdiction: string;
  charityId: string;
  basis: GivingBasis;
  amount: string;
  saleCount: string;
  eligibleRevenue: string;
  eligibleOffer: string;
  startDate: string;
  endDate: string;
};

const charities: CharityListing[] = [
  {
    id: "ghat",
    name: "Global Health Access Trust",
    country: "United Kingdom",
    registration: "England & Wales charitable trust",
    cause: "Global health & public benefit",
    summary: "Develops, delivers and evidences practical public-benefit projects with accountable project oversight.",
    verified: true,
  },
  {
    id: "pilot-community",
    name: "Community Health Pilot",
    country: "Pilot listing",
    registration: "Demo record",
    cause: "Community health",
    summary: "Demonstration listing used to test marketplace discovery before external charity onboarding begins.",
    verified: false,
  },
  {
    id: "pilot-water",
    name: "Water Access Pilot",
    country: "Pilot listing",
    registration: "Demo record",
    cause: "Water & sanitation",
    summary: "Demonstration listing used to test project discovery, donor journeys and business-giving workflows.",
    verified: false,
  },
];

const projects: Project[] = [
  {
    id: "health-access",
    title: "Health access delivery fund",
    charityId: "ghat",
    country: "Multi-country",
    theme: "Health access",
    target: 100000,
    raised: 0,
    status: "GHAT pathway",
  },
  {
    id: "water-demo",
    title: "Community water access — demonstration",
    charityId: "pilot-water",
    country: "International pilot",
    theme: "Water",
    target: 50000,
    raised: 0,
    status: "Demonstration only",
  },
  {
    id: "community-demo",
    title: "Local prevention programme — demonstration",
    charityId: "pilot-community",
    country: "United Kingdom",
    theme: "Prevention",
    target: 25000,
    raised: 0,
    status: "Demonstration only",
  },
];

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const money = (value: number) => GBP.format(Number.isFinite(value) ? value : 0);
const num = (value: string) => Number.isFinite(Number(value)) ? Number(value) : 0;

const initialCampaign: CampaignDraft = {
  businessName: "",
  companyNumber: "",
  jurisdiction: "United Kingdom",
  charityId: "ghat",
  basis: "fixed_per_sale",
  amount: "1",
  saleCount: "100",
  eligibleRevenue: "5000",
  eligibleOffer: "eligible product sold",
  startDate: "",
  endDate: "",
};

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) as T : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    localStorage.setItem(key, JSON.stringify(value));
  },
};

function Logo() {
  return (
    <button className="brand" onClick={() => window.dispatchEvent(new CustomEvent("giving:navigate", { detail: "home" }))}>
      <span className="brand-mark"><HeartHandshake size={21} /></span>
      <span><strong>Giving Rail</strong><small>working product name</small></span>
    </button>
  );
}

function Header({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  const [open, setOpen] = useState(false);
  const items: Array<[View, string]> = [
    ["explore", "Explore"],
    ["business", "For businesses"],
    ["charity", "For charities"],
    ["projects", "Projects"],
    ["volunteers", "Volunteers"],
    ["pricing", "Pricing"],
  ];
  return (
    <header className="site-header">
      <div className="shell nav-shell">
        <Logo />
        <nav className="desktop-nav">
          {items.map(([key, label]) => <button className={view === key ? "active" : ""} key={key} onClick={() => navigate(key)}>{label}</button>)}
        </nav>
        <div className="nav-actions">
          <button className="ghost-btn desktop-only" onClick={() => navigate("dashboard")}>Dashboard</button>
          <button className="primary-btn desktop-only" onClick={() => navigate("business")}>Start giving</button>
          <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && (
        <div className="mobile-nav shell">
          {items.map(([key, label]) => <button key={key} onClick={() => { navigate(key); setOpen(false); }}>{label}</button>)}
          <button onClick={() => { navigate("dashboard"); setOpen(false); }}>Dashboard</button>
        </div>
      )}
    </header>
  );
}

function SectionTitle({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
  return <div className="section-title"><span>{eyebrow}</span><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

function Home({ navigate }: { navigate: (view: View) => void }) {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div>
            <div className="eyebrow"><Sparkles size={14} /> Giving infrastructure, not another donation button</div>
            <h1>Make business giving <em>easy to start, easy to prove and easy to manage.</em></h1>
            <p className="hero-copy">A platform for businesses, charities, donors, projects and volunteers — beginning with the friction that stops small businesses linking sales to charitable giving.</p>
            <div className="hero-actions">
              <button className="primary-btn large" onClick={() => navigate("business")}>Create a giving campaign <ArrowRight size={17} /></button>
              <button className="secondary-btn large" onClick={() => navigate("charity")}>List a charity</button>
            </div>
            <div className="trust-line"><ShieldCheck size={17} /> UK sales-linked giving workflow first. International country packs are jurisdiction-gated.</div>
          </div>
          <div className="hero-panel">
            <div className="panel-kicker">THE GAP</div>
            <h3>Small business wants to give.</h3>
            <div className="flow-step"><span>01</span><div><strong>Choose a charity</strong><p>Discover verified organisations and projects.</p></div></div>
            <div className="flow-step"><span>02</span><div><strong>Define the promise</strong><p>£ per sale, % of eligible sales, or a fixed campaign amount.</p></div></div>
            <div className="flow-step"><span>03</span><div><strong>Generate the compliance pack</strong><p>Campaign facts, public statement and agreement workflow.</p></div></div>
            <div className="flow-step"><span>04</span><div><strong>Pay and evidence</strong><p>Regulated payment rail, reconciliation and impact record.</p></div></div>
          </div>
        </div>
      </section>

      <section className="stat-band">
        <div className="shell stats">
          <div><strong>0%</strong><span>planned platform deduction from the charity's gift</span></div>
          <div><strong>1 workflow</strong><span>business promise → agreement → payment → evidence</span></div>
          <div><strong>3 sides</strong><span>businesses, charities and donors in one system</span></div>
          <div><strong>Global-ready</strong><span>country compliance packs added deliberately</span></div>
        </div>
      </section>

      <section className="section shell">
        <SectionTitle eyebrow="ONE PLATFORM" title="More useful than a fundraising marketplace." body="Giving is only one part of the relationship. The platform is designed to manage the work around it too." />
        <div className="feature-grid">
          {[
            [BriefcaseBusiness, "Business giving", "Direct gifts, sales-linked campaigns, recurring commitments and impact reporting."],
            [Landmark, "Charity marketplace", "Self-service listings, verification, projects, supporter stewardship and reporting."],
            [HandCoins, "Donor & project funding", "Discover projects, follow progress, manage commitments and retain an evidence trail."],
            [Users, "Volunteer management", "Publish opportunities, match skills, manage applications and record contribution."],
            [ClipboardCheck, "Compliance workflow", "Turn campaign facts into the records required before public sales-linked fundraising begins."],
            [Globe2, "Country packs", "Keep legal rules separate by jurisdiction instead of pretending one agreement works everywhere."],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof BriefcaseBusiness;
            return <div className="feature-card" key={String(title)}><I /><h3>{String(title)}</h3><p>{String(body)}</p></div>;
          })}
        </div>
      </section>

      <section className="section soft">
        <div className="shell split">
          <div>
            <SectionTitle eyebrow="FIRST VERIFIED BENEFICIARY" title="Global Health Access Trust is already built for this." body="GHAT already has donor, project, payment and volunteer infrastructure. The business-giving layer now plugs into that operating base." />
            <button className="secondary-btn" onClick={() => navigate("projects")}>View project model <ArrowRight size={16} /></button>
          </div>
          <div className="quote-card"><BadgeCheck /><p>“Don't make the charity absorb a percentage simply because a business wants to give through its sales. Charge for useful infrastructure and make the flow transparent.”</p><span>Product principle for the pilot</span></div>
        </div>
      </section>
    </>
  );
}

function Explore({ navigate }: { navigate: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const filtered = charities.filter(c => `${c.name} ${c.cause} ${c.country}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="section shell page-top">
    <SectionTitle eyebrow="DISCOVER" title="Find a cause worth backing." body="Verified charities will be searchable by geography, cause, project and business-giving availability. Demo records are clearly labelled until onboarding opens." />
    <div className="search-box"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search charities, causes or places" /></div>
    <div className="cards-three">
      {filtered.map(c => <article className="listing-card" key={c.id}>
        <div className="listing-meta"><span>{c.country}</span>{c.verified ? <b><BadgeCheck size={14} /> Verified</b> : <i>Demo</i>}</div>
        <h3>{c.name}</h3><p>{c.summary}</p><div className="tag">{c.cause}</div>
        <button className="text-btn" onClick={() => navigate("business")}>Support through a business <ArrowRight size={15} /></button>
      </article>)}
    </div>
  </section>;
}

function Business() {
  const [draft, setDraft] = useState<CampaignDraft>(() => store.get("giving:campaign", initialCampaign));
  const [saved, setSaved] = useState(false);
  useEffect(() => store.set("giving:campaign", draft), [draft]);
  const update = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const charity = charities.find(c => c.id === draft.charityId) ?? charities[0];
  const donation = useMemo(() => {
    if (draft.basis === "fixed_per_sale") return num(draft.amount) * num(draft.saleCount);
    if (draft.basis === "percentage_of_sales") return num(draft.eligibleRevenue) * num(draft.amount) / 100;
    return num(draft.amount);
  }, [draft]);
  const statement = draft.basis === "fixed_per_sale"
    ? `${money(num(draft.amount))} from every ${draft.eligibleOffer || "eligible sale"} between ${draft.startDate || "[start date]"} and ${draft.endDate || "[end date]"} will be donated to ${charity.name}.`
    : draft.basis === "percentage_of_sales"
      ? `${num(draft.amount)}% of eligible sales from ${draft.eligibleOffer || "the stated promotion"} between ${draft.startDate || "[start date]"} and ${draft.endDate || "[end date]"} will be donated to ${charity.name}.`
      : `${money(num(draft.amount))} will be donated to ${charity.name} from this campaign between ${draft.startDate || "[start date]"} and ${draft.endDate || "[end date]"}.`;
  const checks = [
    ["Business identified", Boolean(draft.businessName.trim())],
    ["Recipient charity selected", Boolean(draft.charityId)],
    ["Donation formula defined", num(draft.amount) > 0],
    ["Eligible sales scope defined", Boolean(draft.eligibleOffer.trim())],
    ["Campaign dates defined", Boolean(draft.startDate && draft.endDate)],
    ["UK compliance pack available", draft.jurisdiction === "United Kingdom"],
  ] as const;
  const ready = checks.every(([, ok]) => ok);
  return <section className="section shell page-top">
    <SectionTitle eyebrow="FOR BUSINESSES" title="Turn sales into support without the paperwork maze." body="The UK pilot captures the facts needed for a sales-linked promotion, calculates the commitment and prepares the agreement workflow before anything is advertised." />
    <div className="notice"><ShieldCheck /><div><strong>Important:</strong> this prototype prepares the workflow; a live sales-linked campaign still requires the applicable written agreement and legal/compliance controls before launch.</div></div>
    <div className="builder-grid">
      <div className="form-card">
        <h3>1. Your business</h3>
        <label>Business name<input value={draft.businessName} onChange={e => update("businessName", e.target.value)} placeholder="Example Trading Ltd" /></label>
        <label>Company / registration number<input value={draft.companyNumber} onChange={e => update("companyNumber", e.target.value)} placeholder="Optional for prototype" /></label>
        <label>Jurisdiction<select value={draft.jurisdiction} onChange={e => update("jurisdiction", e.target.value)}><option>United Kingdom</option><option>Ireland — country pack pending</option><option>United States — country pack pending</option><option>Australia — country pack pending</option><option>European Union — country pack pending</option></select></label>
        <h3>2. Choose a charity</h3>
        <label>Recipient<select value={draft.charityId} onChange={e => update("charityId", e.target.value)}>{charities.map(c => <option value={c.id} key={c.id}>{c.name}{!c.verified ? " — demo" : ""}</option>)}</select></label>
        <h3>3. Define the giving promise</h3>
        <label>Giving basis<select value={draft.basis} onChange={e => update("basis", e.target.value as GivingBasis)}><option value="fixed_per_sale">Fixed £ per sale</option><option value="percentage_of_sales">% of eligible sales</option><option value="fixed_campaign">Fixed campaign amount</option></select></label>
        <label>{draft.basis === "percentage_of_sales" ? "Percentage" : "Amount (£)"}<input type="number" min="0" step="0.01" value={draft.amount} onChange={e => update("amount", e.target.value)} /></label>
        <label>Eligible product / service<input value={draft.eligibleOffer} onChange={e => update("eligibleOffer", e.target.value)} /></label>
        {draft.basis === "fixed_per_sale" && <label>Expected eligible sales<input type="number" min="0" value={draft.saleCount} onChange={e => update("saleCount", e.target.value)} /></label>}
        {draft.basis === "percentage_of_sales" && <label>Expected eligible revenue (£)<input type="number" min="0" value={draft.eligibleRevenue} onChange={e => update("eligibleRevenue", e.target.value)} /></label>}
        <div className="two"><label>Start date<input type="date" value={draft.startDate} onChange={e => update("startDate", e.target.value)} /></label><label>End date<input type="date" value={draft.endDate} onChange={e => update("endDate", e.target.value)} /></label></div>
        <button className="primary-btn full" onClick={() => { store.set("giving:saved-campaign", { ...draft, expectedDonation: donation, statement }); setSaved(true); }}>Save campaign draft</button>
        {saved && <p className="success-line"><Check size={15} /> Draft saved to this browser.</p>}
      </div>
      <div className="result-stack">
        <div className="result-card highlight"><span>Expected charity amount</span><strong>{money(donation)}</strong><small>No platform percentage deducted in the proposed model.</small></div>
        <div className="result-card"><h3>Public campaign statement</h3><p className="statement">{statement}</p><small>Generated wording is a drafting aid, not legal advice.</small></div>
        <div className="result-card"><h3>Agreement readiness</h3>{checks.map(([label, ok]) => <div className="check-row" key={label}><span className={ok ? "ok" : "pending"}>{ok ? <Check size={14} /> : "·"}</span>{label}</div>)}<div className={`ready-badge ${ready ? "yes" : "no"}`}>{ready ? "Ready for agreement review" : "Complete the missing facts"}</div></div>
        <div className="result-card"><h3>Direct corporate gift</h3><p>Businesses that simply want to donate to GHAT can use GHAT's existing regulated payment pathway without creating a sales-linked promotion.</p><a className="secondary-btn link-btn" href="https://globalhealthaccesstrust.com/business-giving">Open GHAT business giving <ArrowRight size={15} /></a></div>
      </div>
    </div>
  </section>;
}

function Charity() {
  const [form, setForm] = useState(() => store.get("giving:charity-onboarding", { name: "", registration: "", country: "United Kingdom", cause: "", website: "", contact: "", authorised: false }));
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => store.set("giving:charity-onboarding", form), [form]);
  const patch = (key: string, value: string | boolean) => setForm((f: typeof form) => ({ ...f, [key]: value }));
  return <section className="section shell page-top">
    <SectionTitle eyebrow="FOR CHARITIES" title="List once. Receive business support without rebuilding the admin every time." body="Charities control their profile, projects, authorised representatives, business-giving rules and volunteer opportunities from one account." />
    <div className="builder-grid">
      <div className="form-card">
        <h3>Start a charity listing</h3>
        <label>Legal charity / nonprofit name<input value={form.name} onChange={e => patch("name", e.target.value)} /></label>
        <label>Registration number<input value={form.registration} onChange={e => patch("registration", e.target.value)} /></label>
        <label>Country<select value={form.country} onChange={e => patch("country", e.target.value)}><option>United Kingdom</option><option>Ireland</option><option>United States</option><option>Australia</option><option>Other / country pack review</option></select></label>
        <label>Primary cause<input value={form.cause} onChange={e => patch("cause", e.target.value)} placeholder="Health, education, environment…" /></label>
        <label>Website<input value={form.website} onChange={e => patch("website", e.target.value)} /></label>
        <label>Authorised contact email<input type="email" value={form.contact} onChange={e => patch("contact", e.target.value)} /></label>
        <label className="checkbox"><input type="checkbox" checked={form.authorised} onChange={e => patch("authorised", e.target.checked)} /> I am authorised to begin this organisation's onboarding.</label>
        <button className="primary-btn full" onClick={() => { store.set("giving:charity-submission", form); setSubmitted(true); }} disabled={!form.name || !form.registration || !form.contact || !form.authorised}>Save onboarding record</button>
        {submitted && <p className="success-line"><Check size={15} /> Onboarding record saved. External verification is deliberately not automated in this prototype.</p>}
      </div>
      <div className="result-stack">
        <div className="result-card"><h3>What the charity gets</h3><ul className="tick-list"><li>Self-managed public profile</li><li>Business sales-linked giving agreements</li><li>Direct donation and project routes</li><li>Supporter and campaign evidence</li><li>Volunteer opportunity management</li><li>Country-specific compliance controls</li></ul></div>
        <div className="result-card"><h3>Verification gate</h3><p>No organisation becomes “verified” merely by filling in a form. Registration, authority, bank/payment account, sanctions/risk and jurisdiction checks sit between listing and live payment.</p></div>
        <div className="result-card accent"><h3>Commercial principle</h3><p>The proposed model does not need to take a percentage of the charitable gift. Software, verification and business-facing services can be priced separately and transparently.</p></div>
      </div>
    </div>
  </section>;
}

function Projects({ navigate }: { navigate: (view: View) => void }) {
  const [followed, setFollowed] = useState<string[]>(() => store.get("giving:followed", []));
  const toggle = (id: string) => { const next = followed.includes(id) ? followed.filter(x => x !== id) : [...followed, id]; setFollowed(next); store.set("giving:followed", next); };
  return <section className="section shell page-top"><SectionTitle eyebrow="PROJECT FUNDING" title="Follow the work, not just the transaction." body="Projects connect funding to a defined purpose, geography, target and evidence trail. Demonstration records remain labelled until charities publish real projects." />
    <div className="cards-three">{projects.map(p => { const charity = charities.find(c => c.id === p.charityId)!; const pct = Math.min(100, Math.round((p.raised / p.target) * 100)); return <article className="project-card" key={p.id}><div className="listing-meta"><span>{p.country}</span><i>{p.status}</i></div><h3>{p.title}</h3><p>{charity.name}</p><div className="progress"><span style={{ width: `${pct}%` }} /></div><div className="project-money"><strong>{money(p.raised)}</strong><span>of {money(p.target)}</span></div><div className="card-actions"><button className="secondary-btn" onClick={() => toggle(p.id)}>{followed.includes(p.id) ? "Following" : "Follow project"}</button><button className="text-btn" onClick={() => navigate("business")}>Back through business</button></div></article>; })}</div>
  </section>;
}

function Volunteers() {
  const [role, setRole] = useState(() => store.get("giving:volunteer-role", { organisation: "", title: "", skills: "", location: "Remote / flexible", hours: "", description: "" }));
  const [application, setApplication] = useState(() => store.get("giving:volunteer-application", { name: "", email: "", skills: "", interest: "" }));
  const [savedRole, setSavedRole] = useState(false);
  const [savedApplication, setSavedApplication] = useState(false);
  return <section className="section shell page-top"><SectionTitle eyebrow="VOLUNTEER INFRASTRUCTURE" title="Money is not the only resource charities need." body="The platform includes opportunity publishing, skills matching and application records so charities can manage people alongside funding." />
    <div className="builder-grid">
      <div className="form-card"><h3>Charity: publish an opportunity</h3>{[
        ["organisation", "Organisation"], ["title", "Role title"], ["skills", "Skills needed"], ["location", "Location / remote"], ["hours", "Time commitment"], ["description", "What the volunteer will do"],
      ].map(([key, label]) => <label key={key}>{label}<input value={(role as Record<string,string>)[key]} onChange={e => setRole({ ...role, [key]: e.target.value })} /></label>)}<button className="primary-btn full" onClick={() => { store.set("giving:volunteer-role", role); setSavedRole(true); }}>Save opportunity</button>{savedRole && <p className="success-line"><Check size={15} /> Opportunity saved.</p>}</div>
      <div className="form-card"><h3>Volunteer: express interest</h3>{[
        ["name", "Name"], ["email", "Email"], ["skills", "Skills / experience"], ["interest", "What would you like to help with?"],
      ].map(([key, label]) => <label key={key}>{label}<input value={(application as Record<string,string>)[key]} onChange={e => setApplication({ ...application, [key]: e.target.value })} /></label>)}<button className="secondary-btn full" onClick={() => { store.set("giving:volunteer-application", application); setSavedApplication(true); }}>Save volunteer profile</button>{savedApplication && <p className="success-line"><Check size={15} /> Volunteer interest saved.</p>}</div>
    </div>
  </section>;
}

function Pricing() {
  const tiers = [
    { name: "Charity Starter", price: "£0", who: "Registered charities", points: ["Public listing", "Project pages", "Direct giving profile", "Volunteer opportunities"] },
    { name: "Charity Verified", price: "Pilot £19/mo", who: "Growing charities", points: ["Verification workflow", "Business-giving dashboard", "CPA records", "Supporter reporting"] },
    { name: "Business Purpose", price: "Pilot £19/mo", who: "SMEs", points: ["Sales-linked campaigns", "Agreement workflow", "Statement generator", "Campaign evidence"] },
    { name: "Business Scale", price: "Pilot £79/mo", who: "Multi-brand teams", points: ["Multiple campaigns", "Team access", "Integrations", "Portfolio reporting"] },
  ];
  return <section className="section shell page-top"><SectionTitle eyebrow="PILOT ECONOMICS" title="Charge for infrastructure. Don't quietly shave the gift." body="Pricing is deliberately provisional while willingness-to-pay is tested. The design principle is transparent subscription/service revenue rather than an avoidable percentage of the charitable amount." /><div className="pricing-grid">{tiers.map(t => <div className="price-card" key={t.name}><span>{t.who}</span><h3>{t.name}</h3><strong>{t.price}</strong><small>provisional</small><ul>{t.points.map(p => <li key={p}><Check size={14} />{p}</li>)}</ul><button className="secondary-btn full">Join pilot waitlist</button></div>)}</div><p className="fineprint">Payment-provider processing costs, regulated-services costs and country-specific verification costs would be shown separately before launch.</p></section>;
}

function Dashboard() {
  const campaign = store.get<any>("giving:saved-campaign", null);
  const followed = store.get<string[]>("giving:followed", []);
  const charity = store.get<any>("giving:charity-submission", null);
  const volunteer = store.get<any>("giving:volunteer-application", null);
  return <section className="section shell page-top"><SectionTitle eyebrow="LOCAL PROTOTYPE DASHBOARD" title="One place to see the relationship." body="This prototype uses browser storage only. Production will use authenticated organisation, donor and volunteer workspaces." /><div className="dashboard-grid"><div className="dash-card"><BriefcaseBusiness/><span>Business campaign</span><strong>{campaign ? money(campaign.expectedDonation ?? 0) : "No saved campaign"}</strong><p>{campaign?.businessName || "Create a business campaign to populate this card."}</p></div><div className="dash-card"><HeartHandshake/><span>Followed projects</span><strong>{followed.length}</strong><p>Projects bookmarked for donor or business review.</p></div><div className="dash-card"><Building2/><span>Charity onboarding</span><strong>{charity?.name || "Not started"}</strong><p>{charity?.registration || "Self-service listing record will appear here."}</p></div><div className="dash-card"><Users/><span>Volunteer profile</span><strong>{volunteer?.name || "Not started"}</strong><p>{volunteer?.skills || "Skills and interests will appear here."}</p></div></div></section>;
}

export default function App() {
  const [view, setView] = useState<View>("home");
  useEffect(() => {
    const handler = (event: Event) => setView((event as CustomEvent<View>).detail);
    window.addEventListener("giving:navigate", handler);
    return () => window.removeEventListener("giving:navigate", handler);
  }, []);
  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: "smooth" }); };
  return <div className="app"><Header view={view} navigate={navigate} /><main>{view === "home" && <Home navigate={navigate} />}{view === "explore" && <Explore navigate={navigate} />}{view === "business" && <Business />}{view === "charity" && <Charity />}{view === "projects" && <Projects navigate={navigate} />}{view === "volunteers" && <Volunteers />}{view === "pricing" && <Pricing />}{view === "dashboard" && <Dashboard />}</main><footer><div className="shell footer-grid"><div><Logo /><p>Prototype built inside Liftor as a standalone product surface. Final brand, entity and payment architecture remain founder decisions.</p></div><div><strong>Platform</strong><button onClick={() => navigate("business")}>Business giving</button><button onClick={() => navigate("charity")}>Charities</button><button onClick={() => navigate("volunteers")}>Volunteers</button></div><div><strong>Principles</strong><span>Transparent fees</span><span>Jurisdiction-gated compliance</span><span>Regulated payment providers</span></div></div></footer></div>;
}
