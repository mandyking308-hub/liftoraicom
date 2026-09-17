import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Check,
  ClipboardCheck,
  Clock,
  Copy,
  Download,
  FileText,
  Globe2,
  HandCoins,
  HeartHandshake,
  Landmark,
  Layers,
  LifeBuoy,
  Lock,
  Mail,
  Menu,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
  X,
} from "lucide-react";

type View =
  | "home"
  | "how"
  | "explore"
  | "business"
  | "charity"
  | "projects"
  | "volunteers"
  | "pricing"
  | "dashboard"
  | "about"
  | "trust"
  | "signin"
  | "terms"
  | "privacy"
  | "cookies"
  | "accessibility"
  | "complaints";

type GivingBasis = "fixed_per_sale" | "percentage_of_sales" | "fixed_campaign";

type CharityListing = {
  id: string;
  name: string;
  country: string;
  registration: string;
  cause: string;
  summary: string;
  verified: boolean;
  acceptsBusinessGiving: boolean;
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
  summary: string;
};

type CampaignDraft = {
  businessName: string;
  companyNumber: string;
  contactEmail: string;
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

type CharityOnboarding = {
  name: string;
  registration: string;
  country: string;
  cause: string;
  website: string;
  contact: string;
  summary: string;
  authorised: boolean;
};

type VolunteerRole = {
  organisation: string;
  title: string;
  skills: string;
  location: string;
  hours: string;
  description: string;
};

type VolunteerApplication = {
  name: string;
  email: string;
  skills: string;
  interests: string;
  availability: string;
};

type PilotLead = {
  name: string;
  email: string;
  organisation: string;
  role: string;
};

const brand = {
  name: "Giving Rail",
  tagline: "Giving that moves.",
  descriptor: "Business giving. Charity control. Proof built in.",
  ghTrustUrl: "https://globalhealthaccesstrust.com/support-the-trust#business-giving",
};

const charities: CharityListing[] = [
  {
    id: "ghat",
    name: "Global Health Access Trust",
    country: "United Kingdom",
    registration: "Pilot beneficiary",
    cause: "Global health & public benefit",
    summary: "Develops and evidences practical public-benefit projects with accountable project oversight.",
    verified: true,
    acceptsBusinessGiving: true,
  },
  {
    id: "pilot-community",
    name: "Community Health Pilot",
    country: "Demo listing",
    registration: "Demonstration record",
    cause: "Community health",
    summary: "Demonstration listing used to test discovery, project funding and charity onboarding journeys.",
    verified: false,
    acceptsBusinessGiving: false,
  },
  {
    id: "pilot-water",
    name: "Water Access Pilot",
    country: "Demo listing",
    registration: "Demonstration record",
    cause: "Water & sanitation",
    summary: "Demonstration listing used to test project discovery and business-giving workflows.",
    verified: false,
    acceptsBusinessGiving: false,
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
    status: "Pilot pathway",
    summary: "A structured project-funding route showing how defined work, funding and evidence can sit together.",
  },
  {
    id: "water-demo",
    title: "Community water access",
    charityId: "pilot-water",
    country: "International demo",
    theme: "Water",
    target: 50000,
    raised: 0,
    status: "Demonstration only",
    summary: "A sample project showing geography, target, beneficiary organisation and progress reporting.",
  },
  {
    id: "community-demo",
    title: "Local prevention programme",
    charityId: "pilot-community",
    country: "United Kingdom",
    theme: "Prevention",
    target: 25000,
    raised: 0,
    status: "Demonstration only",
    summary: "A sample local project for testing supporter discovery, following and volunteer matching.",
  },
];

const routeMap: Record<View, string> = {
  home: "",
  how: "how-it-works",
  explore: "explore",
  business: "businesses",
  charity: "charities",
  projects: "projects",
  volunteers: "volunteers",
  pricing: "pricing",
  dashboard: "workspace",
  about: "about",
  trust: "trust-safety",
  signin: "sign-in",
  terms: "terms",
  privacy: "privacy",
  cookies: "cookies",
  accessibility: "accessibility",
  complaints: "complaints",
};

const viewFromHash = (): View => {
  const path = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const match = (Object.entries(routeMap) as Array<[View, string]>).find(([, route]) => route === path);
  return match?.[0] ?? "home";
};

const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
const money = (value: number) => GBP.format(Number.isFinite(value) ? value : 0);
const num = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);

const initialCampaign: CampaignDraft = {
  businessName: "",
  companyNumber: "",
  contactEmail: "",
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

const initialCharity: CharityOnboarding = {
  name: "",
  registration: "",
  country: "United Kingdom",
  cause: "",
  website: "",
  contact: "",
  summary: "",
  authorised: false,
};

const initialVolunteerRole: VolunteerRole = {
  organisation: "",
  title: "",
  skills: "",
  location: "Remote / flexible",
  hours: "",
  description: "",
};

const initialVolunteerApplication: VolunteerApplication = {
  name: "",
  email: "",
  skills: "",
  interests: "",
  availability: "",
};

const store = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Browser storage is convenience only; the public site must still render if unavailable.
    }
  },
};

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Logo({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="Giving Rail home">
      <span className="brand-mark" aria-hidden="true">
        <span className="rail rail-a" />
        <span className="rail rail-b" />
        <HeartHandshake size={21} />
      </span>
      <span className="brand-copy">
        <strong>{brand.name}</strong>
        <small>{brand.tagline}</small>
      </span>
    </button>
  );
}

function Header({ view, navigate }: { view: View; navigate: (view: View) => void }) {
  const [open, setOpen] = useState(false);
  const items: Array<[View, string]> = [
    ["how", "How it works"],
    ["business", "Businesses"],
    ["charity", "Charities"],
    ["projects", "Projects"],
    ["volunteers", "Volunteers"],
    ["pricing", "Pricing"],
  ];
  return (
    <>
      <div className="pilot-bar">
        <div className="shell pilot-inner">
          <span><Sparkles size={14} /> Founding pilot</span>
          <p>UK business-giving workflow first. International compliance packs open country by country.</p>
          <button onClick={() => navigate("pricing")}>Join the pilot <ArrowRight size={14} /></button>
        </div>
      </div>
      <header className="site-header">
        <div className="shell nav-shell">
          <Logo onClick={() => navigate("home")} />
          <nav className="desktop-nav" aria-label="Primary navigation">
            {items.map(([key, label]) => (
              <button className={view === key ? "active" : ""} key={key} onClick={() => navigate(key)}>{label}</button>
            ))}
          </nav>
          <div className="nav-actions">
            <button className="ghost-btn desktop-only" onClick={() => navigate("signin")}>Sign in</button>
            <button className="primary-btn desktop-only" onClick={() => navigate("business")}>Start giving</button>
            <button className="menu-btn" onClick={() => setOpen(!open)} aria-label="Open menu">{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {open && (
          <div className="mobile-nav shell">
            {items.map(([key, label]) => <button key={key} onClick={() => { navigate(key); setOpen(false); }}>{label}</button>)}
            <button onClick={() => { navigate("about"); setOpen(false); }}>About</button>
            <button onClick={() => { navigate("trust"); setOpen(false); }}>Trust & safety</button>
            <button onClick={() => { navigate("signin"); setOpen(false); }}>Sign in</button>
            <button className="primary-btn" onClick={() => { navigate("business"); setOpen(false); }}>Start giving</button>
          </div>
        )}
      </header>
    </>
  );
}

function SectionTitle({ eyebrow, title, body, align = "left" }: { eyebrow: string; title: string; body?: string; align?: "left" | "center" }) {
  return <div className={`section-title ${align}`}><span>{eyebrow}</span><h2>{title}</h2>{body && <p>{body}</p>}</div>;
}

function TrustPill({ children }: { children: React.ReactNode }) {
  return <span className="trust-pill"><Check size={13} />{children}</span>;
}

function Home({ navigate }: { navigate: (view: View) => void }) {
  return (
    <>
      <section className="hero">
        <div className="shell hero-grid">
          <div className="hero-copy-wrap">
            <div className="eyebrow"><Sparkles size={14} /> A better route from promise to impact</div>
            <h1>Giving that <em>moves.</em></h1>
            <p className="hero-copy">Giving Rail connects businesses, charities, projects and volunteers in one transparent workflow — from a public giving promise to payment, evidence and impact.</p>
            <div className="hero-actions">
              <button className="primary-btn large" onClick={() => navigate("business")}>Create a giving campaign <ArrowRight size={17} /></button>
              <button className="secondary-btn large" onClick={() => navigate("explore")}>Explore charities</button>
            </div>
            <div className="trust-pills">
              <TrustPill>Transparent fee model</TrustPill>
              <TrustPill>Charity approval controls</TrustPill>
              <TrustPill>Jurisdiction-gated compliance</TrustPill>
            </div>
          </div>
          <div className="hero-visual" aria-label="Giving Rail workflow preview">
            <div className="visual-top"><span>GIVING RAIL</span><b>LIVE WORKFLOW</b></div>
            <div className="rail-flow">
              <div className="rail-line" />
              {[
                [BriefcaseBusiness, "Business", "Defines the promise"],
                [ClipboardCheck, "Agreement", "Controls the promotion"],
                [HandCoins, "Payment", "Moves the contribution"],
                [BarChart3, "Proof", "Closes the loop"],
              ].map(([Icon, title, text], index) => {
                const I = Icon as typeof BriefcaseBusiness;
                return <div className="rail-node" key={String(title)}><div><I size={19} /><span>{index + 1}</span></div><strong>{String(title)}</strong><small>{String(text)}</small></div>;
              })}
            </div>
            <div className="visual-summary">
              <div><span>Campaign promise</span><strong>£1 per eligible sale</strong></div>
              <div><span>Expected contribution</span><strong>£2,500</strong></div>
              <div><span>Platform gift deduction</span><strong>£0</strong></div>
            </div>
          </div>
        </div>
      </section>

      <section className="logo-band">
        <div className="shell logo-band-inner">
          <span>BUILT FOR</span>
          <div><BriefcaseBusiness /> SMEs & brands</div>
          <div><Landmark /> Charities & nonprofits</div>
          <div><Layers /> Projects & programmes</div>
          <div><Users /> Volunteers & supporters</div>
        </div>
      </section>

      <section className="section shell">
        <SectionTitle eyebrow="THE PLATFORM" title="One relationship. Four connected journeys." body="Giving Rail is designed around what happens before and after the donation, not just the moment money changes hands." align="center" />
        <div className="audience-grid">
          {[
            ["01", BriefcaseBusiness, "For businesses", "Create direct gifts or sales-linked campaigns, prepare the compliance record, reconcile what is owed and show customers the result.", "business"],
            ["02", Landmark, "For charities", "Control your listing, approve partnerships, publish projects, receive support, manage records and report impact from one workspace.", "charity"],
            ["03", HandCoins, "For projects", "Turn a broad cause into a defined funding need with target, geography, evidence and progress that supporters can follow.", "projects"],
            ["04", Users, "For volunteers", "Publish opportunities, match skills, manage interest and keep non-financial contribution alongside financial support.", "volunteers"],
          ].map(([no, Icon, title, body, target]) => {
            const I = Icon as typeof BriefcaseBusiness;
            return <article className="audience-card" key={String(title)}><span>{String(no)}</span><I /><h3>{String(title)}</h3><p>{String(body)}</p><button className="text-btn" onClick={() => navigate(target as View)}>See the journey <ArrowRight size={15} /></button></article>;
          })}
        </div>
      </section>

      <section className="section dark-section">
        <div className="shell split impact-split">
          <div>
            <SectionTitle eyebrow="WHY IT EXISTS" title="Small businesses should not need a fundraising department to give properly." body="The hardest part is often not generosity. It is turning a public promise into a clear agreement, accurate payment and usable evidence without creating a compliance mess." />
            <div className="dark-actions"><button className="light-btn" onClick={() => navigate("how")}>See how Giving Rail works <ArrowRight size={16} /></button></div>
          </div>
          <div className="metric-stack">
            <div><strong>1</strong><p>workflow from campaign promise to evidence</p></div>
            <div><strong>0%</strong><p>planned platform deduction from the charitable gift</p></div>
            <div><strong>4</strong><p>connected participant journeys in the launch architecture</p></div>
          </div>
        </div>
      </section>

      <section className="section shell">
        <div className="split align-start">
          <div>
            <SectionTitle eyebrow="PILOT BENEFICIARY" title="Global Health Access Trust provides the first real giving pathway." body="GHAT already has donation, project and volunteer infrastructure. That makes it a practical first beneficiary while the multi-charity marketplace completes its production payment and verification layers." />
            <div className="button-row"><a className="primary-btn link-btn" href={brand.ghTrustUrl}>Open GHAT business giving <ArrowRight size={16} /></a><button className="secondary-btn" onClick={() => navigate("projects")}>View project model</button></div>
          </div>
          <div className="principle-card">
            <ShieldCheck size={30} />
            <span>PRODUCT PRINCIPLE</span>
            <h3>Charge for useful infrastructure. Keep the charitable amount visible.</h3>
            <p>Subscriptions, verification and software services can be priced separately instead of quietly taking an avoidable percentage of every gift.</p>
          </div>
        </div>
      </section>

      <section className="section soft final-cta">
        <div className="shell final-cta-inner">
          <div><span>FOUNDING PILOT</span><h2>Build the giving relationship once. Reuse it every time.</h2><p>Start with a business campaign, a charity listing or a project. The workflow connects from there.</p></div>
          <div className="button-row"><button className="primary-btn large" onClick={() => navigate("business")}>Start with a business</button><button className="secondary-btn large" onClick={() => navigate("charity")}>Start with a charity</button></div>
        </div>
      </section>
    </>
  );
}

function HowItWorks({ navigate }: { navigate: (view: View) => void }) {
  const steps = [
    ["01", "Choose the relationship", "A business selects a charity or project; a charity can also invite a business into an approved partnership.", BriefcaseBusiness],
    ["02", "Define the giving promise", "Set the product or service, giving formula, dates, geography and expected contribution in plain language.", HandCoins],
    ["03", "Complete the required controls", "The platform records the facts needed for review, agreement, verification and the applicable jurisdiction pack before public promotion.", ClipboardCheck],
    ["04", "Run and reconcile", "Track eligible activity, calculate what is owed, preserve the campaign reference and move the contribution through the approved payment route.", BarChart3],
    ["05", "Publish the proof", "Close the loop with payment confirmation, project evidence, progress updates and a reusable impact record for the business and charity.", BadgeCheck],
  ];
  return <>
    <section className="page-hero compact"><div className="shell"><span>HOW IT WORKS</span><h1>From public promise to provable impact.</h1><p>Giving Rail turns a fragmented set of emails, forms, spreadsheets and payment links into a reusable operating workflow.</p></div></section>
    <section className="section shell"><div className="timeline">{steps.map(([no, title, body, Icon]) => { const I = Icon as typeof BriefcaseBusiness; return <article key={String(no)}><div className="timeline-no">{String(no)}</div><div className="timeline-icon"><I /></div><div><h3>{String(title)}</h3><p>{String(body)}</p></div></article>; })}</div></section>
    <section className="section soft"><div className="shell split"><div><SectionTitle eyebrow="TWO GIVING MODES" title="Direct giving stays simple. Sales-linked giving gets the controls it needs." body="A straightforward corporate donation should not be forced through a campaign workflow. A public promise tied to sales needs more structure. Giving Rail keeps those routes distinct." /></div><div className="mode-grid"><div><HeartHandshake /><h3>Direct corporate gift</h3><p>A business contributes its own funds to a charity through an approved donation route.</p><button className="text-btn" onClick={() => navigate("business")}>Start a direct gift <ArrowRight size={15} /></button></div><div><Scale /><h3>Sales-linked campaign</h3><p>A business publicly links eligible sales to a charitable contribution and completes the required review and agreement controls before promotion.</p><button className="text-btn" onClick={() => navigate("business")}>Build a campaign <ArrowRight size={15} /></button></div></div></div></section>
    <section className="section shell"><SectionTitle eyebrow="GLOBAL BY DESIGN" title="International does not mean one contract copied everywhere." body="The launch architecture separates payment, verification and fundraising rules into country packs. A jurisdiction stays pending until the relevant controls have been reviewed." align="center" /><div className="country-grid"><div className="country-card ready"><BadgeCheck /><strong>United Kingdom</strong><span>Launch pack</span><p>Business-giving workflow prepared for legal review and controlled pilot use.</p></div>{["Ireland", "United States", "Australia", "European Union"].map(country => <div className="country-card" key={country}><Globe2 /><strong>{country}</strong><span>Country pack pending</span><p>Not represented as compliant until local legal, tax, payment and verification rules are approved.</p></div>)}</div></section>
  </>;
}

function Explore({ navigate }: { navigate: (view: View) => void }) {
  const [query, setQuery] = useState("");
  const filtered = charities.filter(c => `${c.name} ${c.cause} ${c.country}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <section className="page-hero compact"><div className="shell"><span>DISCOVER</span><h1>Find organisations and work worth backing.</h1><p>Search by charity, cause or geography. Demonstration listings remain clearly labelled until external onboarding and verification open.</p></div></section>
    <section className="section shell">
      <div className="search-box"><Search size={18} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search charities, causes or places" aria-label="Search charities" /></div>
      <div className="cards-three">{filtered.map(c => <article className="listing-card" key={c.id}><div className="listing-meta"><span>{c.country}</span>{c.verified ? <b><BadgeCheck size={14} /> Pilot verified</b> : <i>Demo</i>}</div><div className="listing-icon"><Landmark /></div><h3>{c.name}</h3><p>{c.summary}</p><div className="tag">{c.cause}</div><div className="listing-foot"><span>{c.acceptsBusinessGiving ? "Business giving available" : "Demo pathway only"}</span><button className="text-btn" onClick={() => navigate(c.verified ? "business" : "charity")}>{c.verified ? "Support through a business" : "See charity onboarding"} <ArrowRight size={15} /></button></div></article>)}</div>
    </section>
  </>;
}

function Business() {
  const [draft, setDraft] = useState<CampaignDraft>(() => store.get("giving:campaign", initialCampaign));
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => store.set("giving:campaign", draft), [draft]);
  const update = <K extends keyof CampaignDraft>(key: K, value: CampaignDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
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
  const checks: Array<[string, boolean]> = [
    ["Business identified", Boolean(draft.businessName.trim())],
    ["Business contact captured", Boolean(draft.contactEmail.trim())],
    ["Recipient charity selected", Boolean(draft.charityId)],
    ["Donation formula defined", num(draft.amount) > 0],
    ["Eligible scope defined", Boolean(draft.eligibleOffer.trim())],
    ["Campaign dates defined", Boolean(draft.startDate && draft.endDate)],
    ["UK launch pack selected", draft.jurisdiction === "United Kingdom"],
  ];
  const ready = checks.every(([, ok]) => ok);
  const summary = `GIVING RAIL — CAMPAIGN SUMMARY\n\nBusiness: ${draft.businessName || "Not supplied"}\nCompany / registration no: ${draft.companyNumber || "Not supplied"}\nContact: ${draft.contactEmail || "Not supplied"}\nJurisdiction: ${draft.jurisdiction}\nRecipient: ${charity.name}\nGiving basis: ${draft.basis}\nExpected contribution: ${money(donation)}\nEligible offer: ${draft.eligibleOffer}\nDates: ${draft.startDate || "TBC"} to ${draft.endDate || "TBC"}\n\nPublic statement draft:\n${statement}\n\nStatus: ${ready ? "Ready for agreement review" : "Incomplete — missing campaign facts or unsupported jurisdiction"}\n\nThis summary is an operational draft and is not legal advice or authorisation to begin a public promotion.`;
  const copyStatement = async () => {
    try { await navigator.clipboard.writeText(statement); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };
  return <>
    <section className="page-hero business-hero"><div className="shell"><span>FOR BUSINESSES</span><h1>Turn a good intention into a campaign you can actually run.</h1><p>Define the promise, calculate the expected contribution, prepare the campaign record and route it for the controls required before you advertise sales-linked giving.</p><div className="trust-pills"><TrustPill>SME-friendly workflow</TrustPill><TrustPill>Clear contribution formula</TrustPill><TrustPill>Reusable campaign record</TrustPill></div></div></section>
    <section className="section shell">
      <div className="notice"><ShieldCheck /><div><strong>Controlled launch route.</strong> This website prepares the campaign workflow. A sales-linked promotion must not be treated as authorised until the required charity review, written arrangement and applicable legal/compliance steps are complete.</div></div>
      <div className="builder-grid">
        <div className="form-card">
          <div className="form-heading"><span>01</span><div><h3>Your business</h3><p>Identify the organisation making the public promise.</p></div></div>
          <label>Business name<input value={draft.businessName} onChange={e => update("businessName", e.target.value)} placeholder="Example Trading Ltd" /></label>
          <div className="two"><label>Company / registration number<input value={draft.companyNumber} onChange={e => update("companyNumber", e.target.value)} placeholder="Optional at draft stage" /></label><label>Contact email<input type="email" value={draft.contactEmail} onChange={e => update("contactEmail", e.target.value)} placeholder="giving@example.com" /></label></div>
          <label>Jurisdiction<select value={draft.jurisdiction} onChange={e => update("jurisdiction", e.target.value)}><option>United Kingdom</option><option>Ireland — country pack pending</option><option>United States — country pack pending</option><option>Australia — country pack pending</option><option>European Union — country pack pending</option></select></label>
          <div className="form-heading"><span>02</span><div><h3>Choose the charity</h3><p>The charity must control whether a sales-linked relationship is accepted.</p></div></div>
          <label>Recipient<select value={draft.charityId} onChange={e => update("charityId", e.target.value)}>{charities.map(c => <option value={c.id} key={c.id}>{c.name}{!c.verified ? " — demonstration" : ""}</option>)}</select></label>
          <div className="form-heading"><span>03</span><div><h3>Define the promise</h3><p>Make the customer-facing contribution formula measurable.</p></div></div>
          <label>Giving basis<select value={draft.basis} onChange={e => update("basis", e.target.value as GivingBasis)}><option value="fixed_per_sale">Fixed £ per sale</option><option value="percentage_of_sales">% of eligible sales</option><option value="fixed_campaign">Fixed campaign amount</option></select></label>
          <div className="two"><label>{draft.basis === "percentage_of_sales" ? "Percentage" : "Amount (£)"}<input type="number" min="0" step="0.01" value={draft.amount} onChange={e => update("amount", e.target.value)} /></label>{draft.basis === "fixed_per_sale" && <label>Expected eligible sales<input type="number" min="0" value={draft.saleCount} onChange={e => update("saleCount", e.target.value)} /></label>}{draft.basis === "percentage_of_sales" && <label>Expected eligible revenue (£)<input type="number" min="0" value={draft.eligibleRevenue} onChange={e => update("eligibleRevenue", e.target.value)} /></label>}</div>
          <label>Eligible product / service / offer<input value={draft.eligibleOffer} onChange={e => update("eligibleOffer", e.target.value)} placeholder="e.g. every medium coffee sold online" /></label>
          <div className="two"><label>Start date<input type="date" value={draft.startDate} onChange={e => update("startDate", e.target.value)} /></label><label>End date<input type="date" value={draft.endDate} onChange={e => update("endDate", e.target.value)} /></label></div>
          <button className="primary-btn full" onClick={() => { store.set("giving:saved-campaign", { ...draft, expectedDonation: donation, statement, savedAt: new Date().toISOString() }); setSaved(true); }}>Save campaign to workspace</button>
          {saved && <p className="success-line"><Check size={15} /> Campaign draft saved in this browser workspace.</p>}
        </div>
        <div className="result-stack sticky-results">
          <div className="result-card highlight"><span>Expected charity contribution</span><strong>{money(donation)}</strong><small>Proposed platform deduction from this charitable amount: £0.</small></div>
          <div className="result-card"><div className="result-card-head"><h3>Public campaign statement</h3><button className="icon-btn" onClick={copyStatement} aria-label="Copy statement"><Copy size={16} /></button></div><p className="statement">{statement}</p><small>{copied ? "Copied." : "Drafting aid only — final wording remains subject to the approved arrangement and applicable rules."}</small></div>
          <div className="result-card"><h3>Agreement readiness</h3>{checks.map(([label, ok]) => <div className="check-row" key={label}><span className={ok ? "ok" : "pending"}>{ok ? <Check size={14} /> : "·"}</span>{label}</div>)}<div className={`ready-badge ${ready ? "yes" : "no"}`}>{ready ? "Ready for agreement review" : "Complete the missing facts"}</div></div>
          <button className="secondary-btn full" onClick={() => downloadText("giving-rail-campaign-summary.txt", summary)}><Download size={16} /> Download campaign summary</button>
          <div className="result-card"><h3>Just making a corporate gift?</h3><p>Skip the sales-linked campaign workflow. The GHAT pilot route accepts direct corporate gifts through its own donation infrastructure.</p><a className="secondary-btn link-btn full" href={brand.ghTrustUrl}>Open GHAT business giving <ArrowRight size={15} /></a></div>
        </div>
      </div>
    </section>
  </>;
}

function Charity() {
  const [form, setForm] = useState<CharityOnboarding>(() => store.get("giving:charity-onboarding", initialCharity));
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => store.set("giving:charity-onboarding", form), [form]);
  const patch = <K extends keyof CharityOnboarding>(key: K, value: CharityOnboarding[K]) => setForm(current => ({ ...current, [key]: value }));
  const complete = Boolean(form.name && form.registration && form.contact && form.authorised);
  return <>
    <section className="page-hero charity-hero"><div className="shell"><span>FOR CHARITIES</span><h1>Control the relationship without rebuilding the admin every time.</h1><p>Manage your public profile, projects, business partnerships, volunteer opportunities and evidence in one place — while keeping approval with the charity.</p></div></section>
    <section className="section shell"><div className="benefit-strip">{[[BadgeCheck, "Verified identity", "Registration, authority and payment checks"],[BriefcaseBusiness, "Business partnerships", "Campaign records and approval workflow"],[Layers, "Project funding", "Defined asks with targets and evidence"],[Users, "Volunteer management", "Roles, skills and contribution records"]].map(([Icon, title, body]) => { const I = Icon as typeof BadgeCheck; return <div key={String(title)}><I /><strong>{String(title)}</strong><span>{String(body)}</span></div>; })}</div></section>
    <section className="section soft"><div className="shell builder-grid">
      <div className="form-card">
        <div className="form-heading"><span>01</span><div><h3>Start your organisation profile</h3><p>This creates an onboarding record, not an automatic verified badge.</p></div></div>
        <label>Legal charity / nonprofit name<input value={form.name} onChange={e => patch("name", e.target.value)} /></label>
        <div className="two"><label>Registration number<input value={form.registration} onChange={e => patch("registration", e.target.value)} /></label><label>Country<select value={form.country} onChange={e => patch("country", e.target.value)}><option>United Kingdom</option><option>Ireland</option><option>United States</option><option>Australia</option><option>Other / country pack review</option></select></label></div>
        <label>Primary cause<input value={form.cause} onChange={e => patch("cause", e.target.value)} placeholder="Health, education, environment…" /></label>
        <label>Short public summary<textarea rows={4} value={form.summary} onChange={e => patch("summary", e.target.value)} placeholder="What does your organisation do and for whom?" /></label>
        <div className="two"><label>Website<input value={form.website} onChange={e => patch("website", e.target.value)} placeholder="https://" /></label><label>Authorised contact email<input type="email" value={form.contact} onChange={e => patch("contact", e.target.value)} /></label></div>
        <label className="checkbox"><input type="checkbox" checked={form.authorised} onChange={e => patch("authorised", e.target.checked)} /> I am authorised to begin this organisation's onboarding.</label>
        <button className="primary-btn full" onClick={() => { store.set("giving:charity-submission", { ...form, submittedAt: new Date().toISOString() }); setSubmitted(true); }} disabled={!complete}>Save onboarding record</button>
        {submitted && <p className="success-line"><Check size={15} /> Onboarding record saved. Verification remains a separate controlled step.</p>}
      </div>
      <div className="result-stack">
        <div className="result-card"><h3>Verification path</h3><div className="verify-list"><div><span>1</span><p><strong>Registration</strong> Confirm legal identity and current status.</p></div><div><span>2</span><p><strong>Authority</strong> Confirm the person acting for the organisation.</p></div><div><span>3</span><p><strong>Risk checks</strong> Sanctions, fraud and due-diligence controls.</p></div><div><span>4</span><p><strong>Payment</strong> Verify the approved receiving account / payment connection.</p></div><div><span>5</span><p><strong>Go live</strong> Publish the verified profile and enabled giving routes.</p></div></div></div>
        <div className="result-card accent"><h3>Charity control is deliberate.</h3><p>Businesses can propose a partnership. They do not grant themselves permission to use a charity's name or begin a sales-linked promotion.</p></div>
        <div className="result-card"><h3>What comes next</h3><ul className="tick-list"><li>Publish projects and defined funding asks</li><li>Approve or decline business relationships</li><li>Manage volunteer opportunities</li><li>Track campaign settlements and evidence</li><li>Share impact updates with supporters</li></ul></div>
      </div>
    </div></section>
  </>;
}

function Projects({ navigate }: { navigate: (view: View) => void }) {
  const [followed, setFollowed] = useState<string[]>(() => store.get("giving:followed", []));
  const toggle = (id: string) => { const next = followed.includes(id) ? followed.filter(item => item !== id) : [...followed, id]; setFollowed(next); store.set("giving:followed", next); };
  return <>
    <section className="page-hero compact"><div className="shell"><span>PROJECTS</span><h1>Fund defined work. Follow what happens next.</h1><p>Projects turn a broad mission into a clear purpose, target, geography and evidence trail that businesses and donors can understand.</p></div></section>
    <section className="section shell"><div className="project-feature"><div><span>WHY PROJECTS</span><h2>A donation can be generous. A project can also be accountable.</h2><p>Giving Rail is designed to preserve the connection between the contribution and the work it was intended to support, without pretending every gift is legally restricted unless the underlying arrangement makes it so.</p></div><Layers size={88} /></div><div className="cards-three">{projects.map(project => { const charity = charities.find(c => c.id === project.charityId) ?? charities[0]; const pct = Math.min(100, Math.round((project.raised / project.target) * 100)); return <article className="project-card" key={project.id}><div className="listing-meta"><span>{project.country}</span><i>{project.status}</i></div><div className="project-theme">{project.theme}</div><h3>{project.title}</h3><p className="project-charity">{charity.name}</p><p>{project.summary}</p><div className="progress"><span style={{ width: `${pct}%` }} /></div><div className="project-money"><strong>{money(project.raised)}</strong><span>of {money(project.target)}</span></div><div className="card-actions"><button className="secondary-btn" onClick={() => toggle(project.id)}>{followed.includes(project.id) ? "Following" : "Follow project"}</button><button className="text-btn" onClick={() => navigate("business")}>Back through business <ArrowRight size={14} /></button></div></article>; })}</div></section>
  </>;
}

function Volunteers() {
  const [role, setRole] = useState<VolunteerRole>(() => store.get("giving:volunteer-role", initialVolunteerRole));
  const [application, setApplication] = useState<VolunteerApplication>(() => store.get("giving:volunteer-application", initialVolunteerApplication));
  const [savedRole, setSavedRole] = useState(false);
  const [savedApplication, setSavedApplication] = useState(false);
  const patchRole = <K extends keyof VolunteerRole>(key: K, value: VolunteerRole[K]) => setRole(current => ({ ...current, [key]: value }));
  const patchApplication = <K extends keyof VolunteerApplication>(key: K, value: VolunteerApplication[K]) => setApplication(current => ({ ...current, [key]: value }));
  return <>
    <section className="page-hero volunteer-hero"><div className="shell"><span>VOLUNTEERS</span><h1>Time and skills are part of the giving relationship too.</h1><p>Charities can publish opportunities while supporters create a reusable skills profile. The production workspace will connect applications, vetting, assignments and contribution records.</p></div></section>
    <section className="section shell"><div className="two-column-panels">
      <div className="form-card"><div className="form-heading"><span>A</span><div><h3>Publish a volunteer opportunity</h3><p>For charities and approved organisations.</p></div></div><label>Organisation<input value={role.organisation} onChange={e => patchRole("organisation", e.target.value)} /></label><label>Role title<input value={role.title} onChange={e => patchRole("title", e.target.value)} placeholder="e.g. Data analysis volunteer" /></label><div className="two"><label>Location<input value={role.location} onChange={e => patchRole("location", e.target.value)} /></label><label>Time commitment<input value={role.hours} onChange={e => patchRole("hours", e.target.value)} placeholder="e.g. 4 hours/month" /></label></div><label>Skills sought<input value={role.skills} onChange={e => patchRole("skills", e.target.value)} /></label><label>Description<textarea rows={5} value={role.description} onChange={e => patchRole("description", e.target.value)} /></label><button className="primary-btn full" onClick={() => { store.set("giving:volunteer-role", role); setSavedRole(true); }} disabled={!role.organisation || !role.title}>Save role draft</button>{savedRole && <p className="success-line"><Check size={15} /> Role draft saved.</p>}</div>
      <div className="form-card"><div className="form-heading"><span>B</span><div><h3>Create a volunteer profile</h3><p>Tell organisations what you can contribute.</p></div></div><div className="two"><label>Name<input value={application.name} onChange={e => patchApplication("name", e.target.value)} /></label><label>Email<input type="email" value={application.email} onChange={e => patchApplication("email", e.target.value)} /></label></div><label>Skills and experience<textarea rows={4} value={application.skills} onChange={e => patchApplication("skills", e.target.value)} placeholder="Professional, technical, language or practical skills" /></label><label>Causes / roles of interest<input value={application.interests} onChange={e => patchApplication("interests", e.target.value)} /></label><label>Availability<input value={application.availability} onChange={e => patchApplication("availability", e.target.value)} placeholder="e.g. evenings, 3 hours/month" /></label><button className="secondary-btn full" onClick={() => { store.set("giving:volunteer-application", application); setSavedApplication(true); }} disabled={!application.name || !application.email}>Save volunteer profile</button>{savedApplication && <p className="success-line"><Check size={15} /> Volunteer profile saved.</p>}</div>
    </div></section>
    <section className="section soft"><div className="shell"><SectionTitle eyebrow="PRODUCTION WORKFLOW" title="Volunteer management is more than a noticeboard." body="The full operating model keeps the stages visible so organisations can manage risk and supporters know what happens next." align="center" /><div className="workflow-grid">{[[Search, "Discover", "Opportunity search and role matching"],[UserCheck, "Apply", "Reusable supporter profile and application"],[ShieldCheck, "Check", "Role-appropriate screening and approval"],[Users, "Assign", "Named contact, task and contribution record"],[BarChart3, "Evidence", "Hours, outputs, references and impact"]].map(([Icon, title, body]) => { const I = Icon as typeof Search; return <div key={String(title)}><I /><strong>{String(title)}</strong><span>{String(body)}</span></div>; })}</div></div></section>
  </>;
}

function Pricing() {
  const [lead, setLead] = useState<PilotLead>({ name: "", email: "", organisation: "", role: "Business" });
  const [joined, setJoined] = useState(false);
  const tiers = [
    { name: "Charity Starter", price: "£0", who: "Registered charities", points: ["Public organisation profile", "Project pages", "Direct giving profile", "Volunteer opportunities"] },
    { name: "Charity Verified", price: "Pilot £19/mo", who: "Growing charities", points: ["Verification workflow", "Business-giving workspace", "Campaign agreement records", "Supporter reporting"] },
    { name: "Business Purpose", price: "Pilot £19/mo", who: "SMEs", points: ["Sales-linked campaign builder", "Agreement readiness workflow", "Statement generator", "Campaign evidence"] },
    { name: "Business Scale", price: "Pilot £79/mo", who: "Multi-brand teams", points: ["Multiple campaigns", "Team access", "Portfolio reporting", "Integration-ready workspace"] },
  ];
  return <>
    <section className="page-hero compact"><div className="shell"><span>PRICING</span><h1>Charge for infrastructure. Keep the gift visible.</h1><p>These are pilot price hypotheses while willingness-to-pay and service cost are tested. Payment-provider and jurisdiction-specific verification costs would be shown separately.</p></div></section>
    <section className="section shell"><div className="pricing-grid">{tiers.map(tier => <div className="price-card" key={tier.name}><span>{tier.who}</span><h3>{tier.name}</h3><strong>{tier.price}</strong><small>founding pilot</small><ul>{tier.points.map(point => <li key={point}><Check size={14} />{point}</li>)}</ul><a href="#pilot-form" className="secondary-btn link-btn full">Join founding pilot</a></div>)}</div><div className="fee-principle"><HandCoins /><div><strong>No hidden percentage thesis</strong><p>The proposed platform model is subscription, verification and software/service revenue — not an automatic platform percentage quietly removed from the charitable amount.</p></div></div></section>
    <section className="section soft" id="pilot-form"><div className="shell pilot-form-wrap"><div><SectionTitle eyebrow="FOUNDING PILOT" title="Put your organisation at the front of the build." body="Save your details into the current pilot workspace. Production lead capture will be connected to the platform backend before external launch." /><div className="contact-points"><span><Mail /> Business and charity pilot access</span><span><LifeBuoy /> Product feedback and onboarding support</span><span><Clock /> UK workflow first</span></div></div><div className="form-card"><label>Name<input value={lead.name} onChange={e => setLead(current => ({ ...current, name: e.target.value }))} /></label><label>Work email<input type="email" value={lead.email} onChange={e => setLead(current => ({ ...current, email: e.target.value }))} /></label><label>Organisation<input value={lead.organisation} onChange={e => setLead(current => ({ ...current, organisation: e.target.value }))} /></label><label>I am joining as<select value={lead.role} onChange={e => setLead(current => ({ ...current, role: e.target.value }))}><option>Business</option><option>Charity / nonprofit</option><option>Volunteer / supporter</option><option>Partner / adviser</option></select></label><button className="primary-btn full" disabled={!lead.name || !lead.email} onClick={() => { store.set("giving:pilot-lead", { ...lead, savedAt: new Date().toISOString() }); setJoined(true); }}>Save pilot interest</button>{joined && <p className="success-line"><Check size={15} /> Pilot interest saved in this browser workspace.</p>}</div></div></section>
  </>;
}

function Dashboard({ navigate }: { navigate: (view: View) => void }) {
  const campaign = store.get<{ businessName?: string; expectedDonation?: number; statement?: string } | null>("giving:saved-campaign", null);
  const followed = store.get<string[]>("giving:followed", []);
  const charity = store.get<CharityOnboarding | null>("giving:charity-submission", null);
  const volunteer = store.get<VolunteerApplication | null>("giving:volunteer-application", null);
  const lead = store.get<PilotLead | null>("giving:pilot-lead", null);
  return <>
    <section className="page-hero compact workspace-hero"><div className="shell"><span>PILOT WORKSPACE</span><h1>Your giving relationship in one place.</h1><p>The current version uses browser-local records. Production replaces this with authenticated business, charity and supporter workspaces.</p></div></section>
    <section className="section shell"><div className="dashboard-grid"><div className="dash-card"><BriefcaseBusiness/><span>Business campaign</span><strong>{campaign ? money(campaign.expectedDonation ?? 0) : "Not started"}</strong><p>{campaign?.businessName || "Create a campaign to populate this card."}</p><button className="text-btn" onClick={() => navigate("business")}>Open campaign <ArrowRight size={14} /></button></div><div className="dash-card"><HeartHandshake/><span>Followed projects</span><strong>{followed.length}</strong><p>Projects bookmarked for review.</p><button className="text-btn" onClick={() => navigate("projects")}>Open projects <ArrowRight size={14} /></button></div><div className="dash-card"><Building2/><span>Charity onboarding</span><strong>{charity?.name || "Not started"}</strong><p>{charity?.registration || "Your organisation record will appear here."}</p><button className="text-btn" onClick={() => navigate("charity")}>Open onboarding <ArrowRight size={14} /></button></div><div className="dash-card"><Users/><span>Volunteer profile</span><strong>{volunteer?.name || "Not started"}</strong><p>{volunteer?.skills || "Your skills profile will appear here."}</p><button className="text-btn" onClick={() => navigate("volunteers")}>Open volunteers <ArrowRight size={14} /></button></div></div>{lead && <div className="workspace-banner"><BadgeCheck /><div><strong>Founding pilot interest saved</strong><span>{lead.name} · {lead.organisation || lead.role}</span></div></div>}</section>
  </>;
}

function About({ navigate }: { navigate: (view: View) => void }) {
  return <>
    <section className="page-hero about-hero"><div className="shell"><span>ABOUT GIVING RAIL</span><h1>The infrastructure between wanting to give and being able to prove it.</h1><p>Giving Rail is being built around a simple idea: generosity should not collapse under administration, and administration should not disappear just because the story sounds good.</p></div></section>
    <section className="section shell"><div className="split align-start"><div><SectionTitle eyebrow="THE THESIS" title="The donation button is not the whole product." body="Businesses need a way to define and evidence giving. Charities need control and records. Projects need a visible purpose. Volunteers need a route into the work. Giving Rail connects those parts instead of treating them as separate websites." /></div><div className="values-card">{[["01","Transparent by default"],["02","Charity control over association"],["03","Compliance before promotion"],["04","Proof after payment"],["05","Global expansion by local rule"]].map(([no, text]) => <div key={no}><span>{no}</span><strong>{text}</strong></div>)}</div></div></section>
    <section className="section soft"><div className="shell"><SectionTitle eyebrow="WHO IT SERVES" title="Built for practical participation, not philanthropy theatre." align="center" /><div className="feature-grid three">{[[BriefcaseBusiness,"Small and growing businesses","A usable route into credible giving without having to invent the workflow internally."],[Landmark,"Charities and nonprofits","A controlled way to receive business interest, publish work and manage the relationship."],[Users,"People who want to contribute","Money, skills and time connected to visible organisations and projects."]].map(([Icon,title,body]) => { const I = Icon as typeof BriefcaseBusiness; return <div className="feature-card" key={String(title)}><I /><h3>{String(title)}</h3><p>{String(body)}</p></div>; })}</div></div></section>
    <section className="section shell"><div className="final-cta-card"><div><span>START WITH THE WORKFLOW</span><h2>See the product rather than reading another manifesto.</h2></div><button className="primary-btn large" onClick={() => navigate("business")}>Build a campaign <ArrowRight size={16} /></button></div></section>
  </>;
}

function TrustSafety() {
  return <>
    <section className="page-hero trust-hero"><div className="shell"><span>TRUST & SAFETY</span><h1>Good intent still needs controls.</h1><p>Giving Rail is designed so identity, authority, payment, public claims and evidence do not get blurred into a single “verified” button.</p></div></section>
    <section className="section shell"><div className="trust-grid">{[[BadgeCheck,"Organisation verification","Registration, status, authorised representative and payment destination are separate checks."],[Scale,"Campaign controls","Sales-linked promotions remain subject to the applicable written arrangement and public statement rules before launch."],[Lock,"Payment boundaries","Production payment flows will use approved regulated infrastructure and avoid casual custody of charitable funds."],[Globe2,"Country gating","International expansion is enabled by reviewed jurisdiction packs rather than one UK workflow being presented as global law."],[FileText,"Records and evidence","Campaign facts, approvals, payment references and project evidence are retained as an auditable relationship record."],[LifeBuoy,"Complaints and escalation","A public complaints route and internal review process are part of the production launch checklist."]].map(([Icon,title,body]) => { const I = Icon as typeof BadgeCheck; return <article key={String(title)}><I /><h3>{String(title)}</h3><p>{String(body)}</p></article>; })}</div></section>
    <section className="section dark-section"><div className="shell split"><div><SectionTitle eyebrow="WHAT A BADGE WILL MEAN" title="Verification will describe a specific check — not imply perfection." body="An organisation may be registered and authorised without every project claim having been independently audited. The interface should tell users what was checked and when." /></div><div className="badge-demo"><div><BadgeCheck /><strong>Organisation verified</strong><span>Registration + authority + payment destination checked</span></div><div><ClipboardCheck /><strong>Campaign approved</strong><span>Charity approval / agreement record present</span></div><div><BarChart3 /><strong>Evidence received</strong><span>Project or campaign evidence attached</span></div></div></div></section>
  </>;
}

function SignIn({ navigate }: { navigate: (view: View) => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Business");
  const [saved, setSaved] = useState(false);
  return <section className="auth-section"><div className="auth-shell"><div className="auth-brand"><Logo onClick={() => navigate("home")} /><h1>Welcome to your Giving Rail workspace.</h1><p>Production authentication is not connected yet. This pilot sign-in surface records the intended account journey without pretending a browser-local session is secure authentication.</p><div className="auth-points"><span><Lock /> Authenticated workspaces at production launch</span><span><UserCheck /> Role-aware business, charity and supporter access</span><span><ShieldCheck /> Verification and approval states kept separate</span></div></div><div className="auth-card"><span>PILOT ACCESS</span><h2>Choose your workspace</h2><label>Work email<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@organisation.com" /></label><label>Workspace type<select value={role} onChange={e => setRole(e.target.value)}><option>Business</option><option>Charity / nonprofit</option><option>Volunteer / supporter</option><option>Platform administrator</option></select></label><button className="primary-btn full" disabled={!email} onClick={() => { store.set("giving:pilot-session", { email, role, savedAt: new Date().toISOString() }); setSaved(true); }}>Save pilot workspace preference</button>{saved && <><p className="success-line"><Check size={15} /> Pilot preference saved.</p><button className="secondary-btn full" onClick={() => navigate("dashboard")}>Open workspace</button></>}<small>Do not use this pilot screen for sensitive information. Production authentication and access control remain a launch gate.</small></div></div></section>;
}

const legalCopy: Record<"terms" | "privacy" | "cookies" | "accessibility" | "complaints", { eyebrow: string; title: string; intro: string; sections: Array<[string, string]> }> = {
  terms: {
    eyebrow: "DRAFT TERMS",
    title: "Platform terms — launch review draft",
    intro: "This page is a structured launch draft for legal review. It is not represented as final solicitor-approved terms.",
    sections: [["1. Platform role","Giving Rail provides software and workflow infrastructure connecting businesses, charities, projects and supporters. Production terms must define the contracting entity, service scope and applicable payment-provider relationships."],["2. Charity relationships","A business using the platform does not acquire permission to use a charity's name, logo or public association merely by creating a draft campaign. Required approval and written arrangements remain separate controls."],["3. Payments","Production terms must identify whether funds move directly to recipient organisations through regulated payment infrastructure, what fees apply and how refunds, chargebacks and failed payments are handled."],["4. User responsibilities","Users must provide accurate information, have authority to act for organisations they represent and comply with the laws and contractual obligations applicable to their campaigns and communications."],["5. Platform limitations","The software may generate operational or drafting outputs, but does not replace legal, tax, accounting or regulatory advice. Country-specific workflows are enabled only after review."],["6. Suspension and complaints","Final terms must include misuse, fraud, sanctions, misleading claims, intellectual-property complaints, suspension, termination and appeal/escalation processes."]],
  },
  privacy: {
    eyebrow: "DRAFT PRIVACY NOTICE",
    title: "Privacy — launch review draft",
    intro: "Production privacy wording will be completed once the final entity, hosting, analytics, CRM, payment and verification processors are confirmed.",
    sections: [["Data we expect to process","Account identity and contact data; organisation and authority information; campaign and project records; volunteer profile data; support and complaint correspondence; technical security records."],["Why we process it","To provide the requested platform service, verify organisations and authority, administer campaigns and projects, maintain security, respond to support requests and meet legal or regulatory obligations."],["Payments and verification","Payment and identity verification should be handled through approved providers where possible. Giving Rail should avoid collecting sensitive credentials or bank details where a regulated provider can process them directly."],["Retention","Production retention schedules will distinguish account records, financial/campaign evidence, volunteer information, support records and statutory compliance records."],["International transfers","Any processor or hosting transfer outside the UK must be documented and covered by the appropriate legal transfer mechanism."],["Your rights","The final notice will state the controller identity, contact route and the rights available under applicable data-protection law, including complaint rights to the relevant supervisory authority."]],
  },
  cookies: {
    eyebrow: "DRAFT COOKIE NOTICE",
    title: "Cookies — minimal by default",
    intro: "The launch build currently relies on browser storage for pilot convenience. Production analytics and marketing technologies must be inventoried before this notice is finalised.",
    sections: [["Essential storage","Session, security and workspace preference storage may be required for the service to operate."],["Pilot browser storage","This current build stores draft campaign, charity, volunteer and pilot-interest records in the user's browser. It is not a production database."],["Analytics","Non-essential analytics should be added only with a documented purpose, configured privacy settings and consent where required."],["Marketing technologies","Advertising or cross-site tracking should not be enabled by default. Any future use requires explicit review and clear consent controls."],["Managing preferences","The production website will provide a cookie-preference control if non-essential cookies or similar technologies are used."]],
  },
  accessibility: {
    eyebrow: "ACCESSIBILITY",
    title: "Accessibility statement — launch draft",
    intro: "Giving Rail is being designed for clear keyboard navigation, readable contrast, responsive layouts and semantic controls. A formal accessibility audit remains part of launch QA.",
    sections: [["Our aim","We aim to make core business, charity, project and volunteer journeys usable with keyboard navigation, assistive technology and browser zoom."],["Design approach","Controls use visible labels, meaningful headings, large touch targets and restrained motion. Colour is not intended to be the sole indicator of status."],["Known work before launch","Run automated and manual WCAG testing, verify focus states and screen-reader announcements, test form errors and complete mobile zoom/overflow checks."],["Feedback","The production site will publish an accessibility feedback route and expected response time once the operating entity and support channel are finalised."]],
  },
  complaints: {
    eyebrow: "COMPLAINTS",
    title: "Complaints and concerns — process draft",
    intro: "A credible giving platform needs an escalation route for misleading campaigns, charity association disputes, payment issues, safety concerns and service complaints.",
    sections: [["What can be raised","Campaign wording or association concerns, suspected fraud or impersonation, payment or reconciliation issues, charity verification disputes, volunteer safety issues, privacy concerns and service complaints."],["How cases will be handled","Production cases will receive a reference, triage category, responsible owner and target response time. High-risk matters can trigger campaign or account suspension while reviewed."],["Charity name and brand misuse","A charity should be able to report an unauthorised association quickly. The platform design supports separating a business draft from a charity-approved campaign state."],["Escalation","Final policy will identify internal escalation, independent/external routes where applicable and relevant regulator or law-enforcement reporting obligations."],["Records","Complaint decisions and material campaign changes should be retained in the relevant organisation/campaign record so the evidence trail remains intact."]],
  },
};

function LegalPage({ type }: { type: keyof typeof legalCopy }) {
  const page = legalCopy[type];
  return <><section className="page-hero compact legal-hero"><div className="shell"><span>{page.eyebrow}</span><h1>{page.title}</h1><p>{page.intro}</p></div></section><section className="section shell legal-layout"><aside><strong>Launch status</strong><span className="draft-badge">Draft for professional review</span><p>The structure is in place so the website is complete. Final legal wording must match the operating entity and production integrations.</p></aside><div className="legal-body">{page.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div></section></>;
}

function Footer({ navigate }: { navigate: (view: View) => void }) {
  return <footer className="site-footer"><div className="shell footer-top"><div className="footer-brand"><Logo onClick={() => navigate("home")} /><p>{brand.descriptor}</p><div className="footer-badge"><ShieldCheck size={15} /> Founding pilot · UK workflow first</div></div><div><strong>Platform</strong><button onClick={() => navigate("how")}>How it works</button><button onClick={() => navigate("business")}>For businesses</button><button onClick={() => navigate("charity")}>For charities</button><button onClick={() => navigate("projects")}>Projects</button><button onClick={() => navigate("volunteers")}>Volunteers</button></div><div><strong>Company</strong><button onClick={() => navigate("about")}>About</button><button onClick={() => navigate("pricing")}>Pricing</button><button onClick={() => navigate("trust")}>Trust & safety</button><button onClick={() => navigate("signin")}>Sign in</button></div><div><strong>Legal & support</strong><button onClick={() => navigate("terms")}>Terms</button><button onClick={() => navigate("privacy")}>Privacy</button><button onClick={() => navigate("cookies")}>Cookies</button><button onClick={() => navigate("accessibility")}>Accessibility</button><button onClick={() => navigate("complaints")}>Complaints</button></div></div><div className="shell footer-bottom"><span>© {new Date().getFullYear()} Giving Rail. Launch brand subject to final name/entity clearance.</span><span>Built as a distinct platform surface within Liftor.</span></div></footer>;
}

export default function App() {
  const [view, setView] = useState<View>(() => viewFromHash());
  useEffect(() => {
    const handler = () => setView(viewFromHash());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    const titles: Partial<Record<View, string>> = { home: "Giving Rail — Giving that moves", business: "For Businesses — Giving Rail", charity: "For Charities — Giving Rail", projects: "Projects — Giving Rail", volunteers: "Volunteers — Giving Rail", pricing: "Pricing — Giving Rail", trust: "Trust & Safety — Giving Rail", about: "About — Giving Rail" };
    document.title = titles[view] ?? `${brand.name} — ${routeMap[view].replaceAll("-", " ") || brand.tagline}`;
  }, [view]);
  const navigate = (next: View) => {
    const route = routeMap[next];
    if (view === next) window.scrollTo({ top: 0, behavior: "smooth" });
    window.location.hash = route ? `/${route}` : "/";
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const legalViews: Array<keyof typeof legalCopy> = ["terms", "privacy", "cookies", "accessibility", "complaints"];
  return <div className="app">
    {view !== "signin" && <Header view={view} navigate={navigate} />}
    <main>
      {view === "home" && <Home navigate={navigate} />}
      {view === "how" && <HowItWorks navigate={navigate} />}
      {view === "explore" && <Explore navigate={navigate} />}
      {view === "business" && <Business />}
      {view === "charity" && <Charity />}
      {view === "projects" && <Projects navigate={navigate} />}
      {view === "volunteers" && <Volunteers />}
      {view === "pricing" && <Pricing />}
      {view === "dashboard" && <Dashboard navigate={navigate} />}
      {view === "about" && <About navigate={navigate} />}
      {view === "trust" && <TrustSafety />}
      {view === "signin" && <SignIn navigate={navigate} />}
      {legalViews.includes(view as keyof typeof legalCopy) && <LegalPage type={view as keyof typeof legalCopy} />}
    </main>
    {view !== "signin" && <Footer navigate={navigate} />}
  </div>;
}
