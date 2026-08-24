export type MontvelleAdvisoryCategory =
  | "private_client_law"
  | "tax_accounting"
  | "private_banking_wealth"
  | "fiduciary_corporate_services"
  | "immigration_residency"
  | "global_mobility_relocation"
  | "real_estate_advisory"
  | "insurance_risk"
  | "security_intelligence"
  | "corporate_finance_ma"
  | "executive_search"
  | "reputation_crisis"
  | "private_health"
  | "art_collectibles"
  | "philanthropy_family_governance";

export type MontvelleAdvisoryTier = "global_leader" | "global_specialist";
export type MontvelleAdvisoryOutreachStatus =
  | "not_contacted"
  | "queued"
  | "sent"
  | "replied"
  | "follow_up"
  | "closed";
export type MontvelleAdvisoryRelationshipStatus =
  | "prospect"
  | "contacted"
  | "active"
  | "preferred"
  | "held";
export type MontvelleAdvisoryRouteStatus =
  | "verified_public_email"
  | "verified_web_route"
  | "official_site_only";

export type MontvelleAdviser = {
  id: string;
  name: string;
  category: MontvelleAdvisoryCategory;
  tier: MontvelleAdvisoryTier;
  coverage: string;
  websiteUrl: string;
  contactUrl: string;
  publicEmail: string | null;
  bestFor: string;
  outreachStatus: MontvelleAdvisoryOutreachStatus;
  relationshipStatus: MontvelleAdvisoryRelationshipStatus;
  routeStatus: MontvelleAdvisoryRouteStatus;
  sourceUrl: string;
  emailSourceUrl?: string;
  lastReviewed: string;
  notes: string;
};

export const MONTVELLE_ADVISORY_CATEGORY_LABELS: Record<
  MontvelleAdvisoryCategory,
  string
> = {
  private_client_law: "Private Client Law",
  tax_accounting: "Tax & Accountancy",
  private_banking_wealth: "Private Banking & Wealth",
  fiduciary_corporate_services: "Fiduciary & Corporate Services",
  immigration_residency: "Immigration & Residency",
  global_mobility_relocation: "Global Mobility & Relocation",
  real_estate_advisory: "Real Estate Advisory",
  insurance_risk: "Insurance & Risk",
  security_intelligence: "Security & Intelligence",
  corporate_finance_ma: "Corporate Finance & M&A",
  executive_search: "Executive Search",
  reputation_crisis: "Reputation & Crisis",
  private_health: "Private Health",
  art_collectibles: "Art & Collectibles",
  philanthropy_family_governance: "Philanthropy & Family Governance",
} as const;

type AdvisoryRow = readonly [
  id: string,
  name: string,
  category: MontvelleAdvisoryCategory,
  websiteUrl: string,
  contactUrl: string,
  publicEmail: string | null,
  bestFor: string,
  emailSourceUrl: string | null,
];

const GLOBAL_SPECIALISTS = new Set<string>([
  "arton-capital",
  "bridgespan-group",
  "henley-partners",
  "rockefeller-philanthropy-advisors",
  "s-rm",
]);

const ROWS: AdvisoryRow[] = [
  ["withers", "Withers", "private_client_law", "https://www.withersworldwide.com/", "https://www.withersworldwide.com/en-gb/contact-us", null, "Cross-border private wealth, trusts, estates, family governance and international families", null],
  ["charles-russell-speechlys", "Charles Russell Speechlys", "private_client_law", "https://www.charlesrussellspeechlys.com/", "https://www.charlesrussellspeechlys.com/en/contact/", "enquiries@crsblaw.com", "Private client, family office, tax, trusts, succession and private property", "https://www.charlesrussellspeechlys.com/en/legal-notices/"],
  ["baker-mckenzie", "Baker McKenzie", "private_client_law", "https://www.bakermckenzie.com/", "https://www.bakermckenzie.com/", null, "Cross-border legal, tax, corporate and international structuring", null],
  ["dentons", "Dentons", "private_client_law", "https://www.dentons.com/", "https://www.dentons.com/", null, "Cross-border legal matters, private wealth and international business", null],
  ["dla-piper", "DLA Piper", "private_client_law", "https://www.dlapiper.com/", "https://www.dlapiper.com/", null, "International legal, corporate, tax, real estate and complex transactions", null],
  ["hogan-lovells", "Hogan Lovells", "private_client_law", "https://www.hoganlovells.com/", "https://www.hoganlovells.com/", null, "International legal, regulatory, corporate and private capital matters", null],
  ["mcdermott-will-emery", "McDermott Will & Emery", "private_client_law", "https://www.mwe.com/", "https://www.mwe.com/", null, "Private client, wealth transfer, tax, family office and business-owner matters", null],
  ["taylor-wessing", "Taylor Wessing", "private_client_law", "https://www.taylorwessing.com/", "https://www.taylorwessing.com/", null, "Private wealth, family business, technology wealth and international legal matters", null],
  ["deloitte", "Deloitte", "tax_accounting", "https://www.deloitte.com/", "https://www.deloitte.com/", null, "International tax, private client, family enterprise and transaction support", null],
  ["pwc", "PwC", "tax_accounting", "https://www.pwc.com/", "https://www.pwc.com/", null, "Private business, family enterprise, tax, deals and international structuring", null],
  ["ey", "EY", "tax_accounting", "https://www.ey.com/", "https://www.ey.com/", "EYPrivateAssurance@eyg.ey.com", "Private client services, family enterprise, tax, assurance and transactions", "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-gl/services/private-client-audit-experience/documents/ey-private-client-audit-experiences.pdf"],
  ["kpmg", "KPMG", "tax_accounting", "https://kpmg.com/", "https://kpmg.com/", null, "Private enterprise, tax, deal advisory, family business and governance", null],
  ["bdo", "BDO", "tax_accounting", "https://www.bdo.global/", "https://www.bdo.global/", null, "Private client tax, family business, audit and international advisory", null],
  ["grant-thornton", "Grant Thornton", "tax_accounting", "https://www.grantthornton.global/", "https://www.grantthornton.global/", null, "Private business, tax, transactions, family enterprise and international advisory", null],
  ["rsm", "RSM", "tax_accounting", "https://www.rsm.global/", "https://www.rsm.global/", null, "Global tax, private client, family office, audit and business advisory", null],
  ["forvis-mazars", "Forvis Mazars", "tax_accounting", "https://www.forvismazars.com/", "https://www.forvismazars.com/", null, "Tax, audit, wealth, family business and international advisory", null],
  ["ubs", "UBS Global Wealth Management", "private_banking_wealth", "https://www.ubs.com/global/en/wealthmanagement.html", "https://www.ubs.com/global/en/contact.html", null, "UHNW wealth management, family office, lending, investments and succession", null],
  ["jpm-private-bank", "J.P. Morgan Private Bank", "private_banking_wealth", "https://privatebank.jpmorgan.com/", "https://privatebank.jpmorgan.com/eur/en/contact", null, "UHNW private banking, family office, investments, credit and philanthropy", null],
  ["goldman-pwm", "Goldman Sachs Private Wealth Management", "private_banking_wealth", "https://privatewealth.goldmansachs.com/", "https://privatewealth.goldmansachs.com/", null, "UHNW investing, wealth planning, alternatives, liquidity and philanthropy", null],
  ["morgan-stanley-pwm", "Morgan Stanley Private Wealth Management", "private_banking_wealth", "https://www.morganstanley.com/", "https://www.morganstanley.com/", null, "UHNW wealth, family office, investments, lending and estate strategy", null],
  ["citi-private-bank", "Citi Private Bank", "private_banking_wealth", "https://www.privatebank.citibank.com/", "https://www.privatebank.citibank.com/", null, "Global UHNW banking, family office, investments, lending and cross-border wealth", null],
  ["hsbc-global-private-banking", "HSBC Global Private Banking", "private_banking_wealth", "https://www.privatebanking.hsbc.com/", "https://www.privatebanking.hsbc.com/", null, "International private banking, family wealth, credit and cross-border solutions", null],
  ["bank-of-america-private-bank", "Bank of America Private Bank", "private_banking_wealth", "https://www.privatebank.bankofamerica.com/", "https://www.privatebank.bankofamerica.com/", null, "Private banking, trust, investments, philanthropy and wealth strategy", null],
  ["bnp-paribas-wealth", "BNP Paribas Wealth Management", "private_banking_wealth", "https://wealthmanagement.bnpparibas/", "https://wealthmanagement.bnpparibas/", null, "International wealth management, entrepreneurs, investments and private assets", null],
  ["julius-baer", "Julius Baer", "private_banking_wealth", "https://www.juliusbaer.com/", "https://www.juliusbaer.com/", null, "International private banking, wealth planning, investments and entrepreneurs", null],
  ["pictet", "Pictet Wealth Management", "private_banking_wealth", "https://www.pictet.com/", "https://www.pictet.com/", null, "Private wealth, family office, investments and intergenerational planning", null],
  ["lombard-odier", "Lombard Odier", "private_banking_wealth", "https://www.lombardodier.com/", "https://www.lombardodier.com/", null, "Private wealth, family governance, investments and cross-border planning", null],
  ["lgt-private-banking", "LGT Private Banking", "private_banking_wealth", "https://www.lgt.com/", "https://www.lgt.com/", null, "Private banking, family wealth, investments and entrepreneurial families", null],
  ["rothschild-wealth", "Rothschild & Co Wealth Management", "private_banking_wealth", "https://www.rothschildandco.com/", "https://www.rothschildandco.com/", null, "Wealth preservation, investments, succession and family capital", null],
  ["deutsche-private-bank", "Deutsche Bank Private Bank", "private_banking_wealth", "https://www.db.com/", "https://www.db.com/", null, "International private banking, wealth management, lending and investments", null],
  ["vistra", "Vistra", "fiduciary_corporate_services", "https://www.vistra.com/", "https://www.vistra.com/contact-form", null, "Trusts, corporate services, funds, family-office administration and cross-border structures", null],
  ["iq-eq", "IQ-EQ", "fiduciary_corporate_services", "https://iqeq.com/", "https://iqeq.com/contact-us/", null, "Family office, private asset owners, fiduciary, fund and corporate administration", null],
  ["jtc", "JTC", "fiduciary_corporate_services", "https://www.jtcgroup.com/", "https://www.jtcgroup.com/contact/", null, "Private client, family governance, trusts, funds and luxury-asset structures", null],
  ["ocorian", "Ocorian", "fiduciary_corporate_services", "https://www.ocorian.com/", "https://www.ocorian.com/", null, "Private client, corporate, fund and capital-markets administration", null],
  ["trident-trust", "Trident Trust", "fiduciary_corporate_services", "https://www.tridenttrust.com/", "https://www.tridenttrust.com/", null, "Trust, corporate and fund administration for international private clients", null],
  ["tmf-group", "TMF Group", "fiduciary_corporate_services", "https://www.tmf-group.com/", "https://www.tmf-group.com/", null, "International entity management, accounting, payroll and corporate compliance", null],
  ["zedra", "ZEDRA", "fiduciary_corporate_services", "https://www.zedra.com/", "https://www.zedra.com/", null, "Private wealth, family office, corporate and fund solutions", null],
  ["apex-group", "Apex Group", "fiduciary_corporate_services", "https://www.apexgroup.com/", "https://www.apexgroup.com/", null, "Global financial services, family office, funds and corporate solutions", null],
  ["fragomen", "Fragomen", "immigration_residency", "https://www.fragomen.com/", "https://www.fragomen.com/", "londoninfo@fragomen.com", "Global immigration, residence, mobility and complex cross-border cases", "https://www.fragomen.com/insights/new-service-centres-to-streamline-in-country-visa-process.html"],
  ["newland-chase", "Newland Chase", "immigration_residency", "https://newlandchase.com/", "https://newlandchase.com/", null, "Corporate immigration, visas, work permits and global immigration coordination", null],
  ["henley-partners", "Henley & Partners", "immigration_residency", "https://www.henleyglobal.com/", "https://www.henleyglobal.com/", null, "Residence and citizenship planning for internationally mobile private clients", null],
  ["arton-capital", "Arton Capital", "immigration_residency", "https://www.artoncapital.com/", "https://www.artoncapital.com/", "info@artoncapital.com", "Residence and citizenship advisory for globally mobile high-net-worth families", "https://tr.ru.artoncapital.com/"],
  ["vialto-partners", "Vialto Partners", "immigration_residency", "https://vialtopartners.com/", "https://vialtopartners.com/", null, "Global mobility, tax, immigration and workforce cross-border advisory", null],
  ["bal", "BAL", "immigration_residency", "https://www.bal.com/", "https://www.bal.com/", null, "Global corporate immigration, mobility programmes and compliance", null],
  ["crown-relocations", "Crown Relocations", "global_mobility_relocation", "https://www.crownrelo.com/", "https://www.crownrelo.com/", null, "International household relocation, destination services and settling-in", null],
  ["santa-fe-relocation", "Santa Fe Relocation", "global_mobility_relocation", "https://www.santaferelo.com/", "https://www.santaferelo.com/", null, "Global mobility, relocation, immigration and destination services", null],
  ["cartus", "Cartus", "global_mobility_relocation", "https://www.cartus.com/", "https://www.cartus.com/", "cartussolutions@cartus.com", "Global relocation management, destination services and mobility programmes", "https://cartus.com/en/wp-content/uploads/sites/97/2025/12/Cartus_About-Cartus-Brochure_05-2023.pdf"],
  ["graebel", "Graebel", "global_mobility_relocation", "https://www.graebel.com/", "https://www.graebel.com/", null, "Global mobility, relocation programme management and destination support", null],
  ["aires", "Aires", "global_mobility_relocation", "https://www.aires.com/", "https://www.aires.com/", null, "Global relocation management, mobility technology and destination support", null],
  ["altair-global", "Altair Global", "global_mobility_relocation", "https://www.altairglobal.com/", "https://www.altairglobal.com/", null, "Global mobility management, relocation and destination services", null],
  ["savills-advisory", "Savills", "real_estate_advisory", "https://www.savills.com/", "https://www.savills.com/", null, "Prime residential, commercial, investment, valuation and international property", null],
  ["knight-frank-advisory", "Knight Frank", "real_estate_advisory", "https://www.knightfrank.com/", "https://www.knightfrank.com/", null, "Prime residential, wealth property, investment and global real-estate advisory", null],
  ["cbre", "CBRE", "real_estate_advisory", "https://www.cbre.com/", "https://www.cbre.com/", null, "Global commercial real estate, investment, valuation and development advisory", null],
  ["jll", "JLL", "real_estate_advisory", "https://www.jll.com/", "https://www.jll.com/", null, "Global real estate, investment management, development and workplace advisory", null],
  ["colliers", "Colliers", "real_estate_advisory", "https://www.colliers.com/", "https://www.colliers.com/", null, "Global property investment, brokerage, valuation and development advisory", null],
  ["cushman-wakefield", "Cushman & Wakefield", "real_estate_advisory", "https://www.cushmanwakefield.com/", "https://www.cushmanwakefield.com/", null, "Global commercial property, capital markets, valuation and occupier advisory", null],
  ["sothebys-international-realty", "Sotheby's International Realty", "real_estate_advisory", "https://www.sothebysrealty.com/", "https://www.sothebysrealty.com/", null, "Luxury residential property sourcing and sales across international markets", null],
  ["engel-volkers", "Engel & Völkers", "real_estate_advisory", "https://www.engelvoelkers.com/", "https://www.engelvoelkers.com/", null, "Premium residential property, yachts and international real-estate brokerage", null],
  ["marsh", "Marsh", "insurance_risk", "https://www.marsh.com/", "https://www.marsh.com/", null, "Complex insurance, private-client risk, corporate risk and specialty placement", null],
  ["aon", "Aon", "insurance_risk", "https://www.aon.com/", "https://www.aon.com/", null, "Risk, insurance, health, wealth and specialty advisory for complex needs", null],
  ["wtw", "WTW", "insurance_risk", "https://www.wtwco.com/", "https://www.wtwco.com/", null, "Insurance broking, risk, benefits and wealth advisory", null],
  ["howden", "Howden", "insurance_risk", "https://www.howdengroup.com/", "https://www.howdengroup.com/", null, "Specialty insurance, private client, corporate risk and international broking", null],
  ["lockton", "Lockton", "insurance_risk", "https://global.lockton.com/", "https://global.lockton.com/", null, "Global insurance broking, people solutions and specialty risk", null],
  ["gallagher", "Gallagher", "insurance_risk", "https://www.ajg.com/", "https://www.ajg.com/", null, "Insurance, risk management, benefits and specialty placement", null],
  ["control-risks-advisory", "Control Risks", "security_intelligence", "https://www.controlrisks.com/", "https://www.controlrisks.com/contact-us", null, "Strategic intelligence, protective security, travel risk, cyber and investigations", null],
  ["kroll", "Kroll", "security_intelligence", "https://www.kroll.com/", "https://www.kroll.com/", null, "Investigations, due diligence, cyber, valuation, disputes and risk intelligence", null],
  ["crisis24", "Crisis24", "security_intelligence", "https://www.crisis24.com/", "https://www.crisis24.com/", null, "Executive protection, intelligence, travel risk and crisis response", null],
  ["gardaworld", "GardaWorld", "security_intelligence", "https://www.garda.com/", "https://www.garda.com/", null, "Protective security, crisis response and high-risk operational support", null],
  ["international-sos-advisory", "International SOS", "security_intelligence", "https://www.internationalsos.com/", "https://www.internationalsos.com/", null, "International medical, security, travel-risk and emergency coordination", null],
  ["s-rm", "S-RM", "security_intelligence", "https://www.s-rminform.com/", "https://www.s-rminform.com/contact-us", null, "Corporate intelligence, cyber security, investigations and strategic risk", null],
  ["lazard", "Lazard", "corporate_finance_ma", "https://www.lazard.com/", "https://www.lazard.com/", null, "M&A, strategic advisory, capital structure and complex corporate transactions", null],
  ["evercore", "Evercore", "corporate_finance_ma", "https://www.evercore.com/", "https://www.evercore.com/", null, "Independent M&A, restructuring, capital markets and strategic advisory", null],
  ["houlihan-lokey", "Houlihan Lokey", "corporate_finance_ma", "https://www.hl.com/", "https://www.hl.com/", null, "M&A, financial restructuring, valuation and private-capital advisory", null],
  ["moelis", "Moelis & Company", "corporate_finance_ma", "https://www.moelis.com/", "https://www.moelis.com/", null, "Independent strategic and financial advisory for major transactions", null],
  ["pjt-partners", "PJT Partners", "corporate_finance_ma", "https://www.pjtpartners.com/", "https://www.pjtpartners.com/", null, "Strategic advisory, restructuring, private funds and complex transactions", null],
  ["jefferies", "Jefferies", "corporate_finance_ma", "https://www.jefferies.com/", "https://www.jefferies.com/", null, "Investment banking, capital markets, M&A and private-capital solutions", null],
  ["perella-weinberg", "Perella Weinberg Partners", "corporate_finance_ma", "https://pwpartners.com/", "https://pwpartners.com/", null, "Independent strategic, M&A, restructuring and capital-markets advice", null],
  ["baird-global-investment-banking", "Baird Global Investment Banking", "corporate_finance_ma", "https://www.rwbaird.com/", "https://www.rwbaird.com/", null, "M&A, equity and debt advisory for private and public companies", null],
  ["egon-zehnder", "Egon Zehnder", "executive_search", "https://www.egonzehnder.com/", "https://www.egonzehnder.com/", null, "Board, CEO, leadership succession and senior executive search", null],
  ["spencer-stuart", "Spencer Stuart", "executive_search", "https://www.spencerstuart.com/", "https://www.spencerstuart.com/", null, "Board, CEO, executive search, succession and leadership advisory", null],
  ["russell-reynolds", "Russell Reynolds Associates", "executive_search", "https://www.russellreynolds.com/", "https://www.russellreynolds.com/", null, "CEO, board, executive search and leadership assessment", null],
  ["korn-ferry", "Korn Ferry", "executive_search", "https://www.kornferry.com/", "https://www.kornferry.com/", null, "Executive search, organisational strategy, leadership and talent advisory", null],
  ["heidrick-struggles", "Heidrick & Struggles", "executive_search", "https://www.heidrick.com/", "https://www.heidrick.com/", null, "Executive search, board, leadership and culture advisory", null],
  ["fgs-global", "FGS Global", "reputation_crisis", "https://fgsglobal.com/", "https://fgsglobal.com/", null, "Strategic communications, reputation, transactions, litigation and crisis", null],
  ["brunswick-group", "Brunswick Group", "reputation_crisis", "https://www.brunswickgroup.com/", "https://www.brunswickgroup.com/", null, "Reputation, critical issues, transactions, litigation and leadership communications", null],
  ["teneo", "Teneo", "reputation_crisis", "https://www.teneo.com/", "https://www.teneo.com/", null, "CEO advisory, communications, risk, strategy and transformation", null],
  ["edelman", "Edelman", "reputation_crisis", "https://www.edelman.com/", "https://www.edelman.com/", null, "Global communications, reputation, trust and crisis support", null],
  ["apco-worldwide", "APCO Worldwide", "reputation_crisis", "https://apcoworldwide.com/", "https://apcoworldwide.com/", null, "Public affairs, geopolitical strategy, reputation and crisis communications", null],
  ["bupa-global", "Bupa Global", "private_health", "https://www.bupaglobal.com/", "https://www.bupaglobal.com/", null, "International private medical insurance and global healthcare access", null],
  ["cigna-global", "Cigna Global", "private_health", "https://www.cignaglobal.com/", "https://www.cignaglobal.com/", null, "International private medical insurance and global health support", null],
  ["mayo-clinic-international", "Mayo Clinic International Services", "private_health", "https://www.mayoclinic.org/", "https://www.mayoclinic.org/", "intl.mcr@mayo.edu", "International patient coordination, complex diagnostics and specialist care", "https://www.mayoclinic.org/documents/program-brochure-pdf/DOC-20079466"],
  ["cleveland-clinic-international", "Cleveland Clinic Global Patient Services", "private_health", "https://my.clevelandclinic.org/", "https://my.clevelandclinic.org/", null, "International patient services, complex care and specialist referrals", null],
  ["johns-hopkins-international", "Johns Hopkins Medicine International", "private_health", "https://www.hopkinsmedicine.org/international", "https://www.hopkinsmedicine.org/international", null, "International patient coordination, specialist care and complex treatment", null],
  ["sothebys-advisory", "Sotheby's", "art_collectibles", "https://www.sothebys.com/", "https://help.sothebys.com/en/support/solutions/articles/44002518078-guide-for-buyers-global", "UK.CX@sothebys.com", "Art, jewellery, watches, collectibles, private sales, valuation and auctions", "https://help.sothebys.com/en/support/solutions/articles/44002518078-guide-for-buyers-global"],
  ["christies-advisory", "Christie's", "art_collectibles", "https://www.christies.com/", "https://www.christies.com/en/help/contact-us", "info@christies.com", "Art, jewellery, watches, private sales, valuations and professional-adviser support", "https://www.christies.com/en/help/contact-us"],
  ["bonhams-advisory", "Bonhams", "art_collectibles", "https://www.bonhams.com/", "https://www.bonhams.com/", null, "Art, classic cars, jewellery, watches, collectibles and specialist auctions", null],
  ["phillips-advisory", "Phillips", "art_collectibles", "https://www.phillips.com/", "https://www.phillips.com/location/London", "ClientServicesLondon@phillips.com", "Contemporary art, design, watches, jewellery, private sales and auctions", "https://www.phillips.com/location/London"],
  ["rockefeller-philanthropy-advisors", "Rockefeller Philanthropy Advisors", "philanthropy_family_governance", "https://www.rockpa.org/", "https://www.rockpa.org/", null, "Philanthropic strategy, vehicles, grantmaking, family giving and impact", null],
  ["bridgespan-group", "The Bridgespan Group", "philanthropy_family_governance", "https://www.bridgespan.org/", "https://www.bridgespan.org/", null, "Philanthropy strategy, social impact, nonprofits and major-donor advisory", null],
  ["charities-aid-foundation", "Charities Aid Foundation", "philanthropy_family_governance", "https://www.cafonline.org/", "https://www.cafonline.org/", null, "Philanthropic giving, donor-advised structures, charities and international giving", null],
];

export const MONTVELLE_ADVISORY_NETWORK: MontvelleAdviser[] = ROWS.map(
  ([id, name, category, websiteUrl, contactUrl, publicEmail, bestFor, emailSourceUrl]) => ({
    id,
    name,
    category,
    tier: GLOBAL_SPECIALISTS.has(id) ? "global_specialist" : "global_leader",
    coverage: "Global / major markets",
    websiteUrl,
    contactUrl,
    publicEmail,
    bestFor,
    outreachStatus: "not_contacted",
    relationshipStatus: "prospect",
    routeStatus: publicEmail
      ? "verified_public_email"
      : contactUrl !== websiteUrl
        ? "verified_web_route"
        : "official_site_only",
    sourceUrl: contactUrl,
    ...(emailSourceUrl ? { emailSourceUrl } : {}),
    lastReviewed: "2026-08-24",
    notes:
      "Institutional/global selection. Inclusion is a sourcing reference only and does not imply a Montvelle relationship, endorsement or guaranteed client access.",
  }),
);

export function getMontvelleAdviser(adviserId: string) {
  return MONTVELLE_ADVISORY_NETWORK.find((adviser) => adviser.id === adviserId);
}
