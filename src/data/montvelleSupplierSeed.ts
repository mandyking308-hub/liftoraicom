export type MontvelleSupplierLifecycle =
  | "identified" | "contacted" | "screened" | "approved" | "preferred" | "contracted" | "held";
export type MontvelleOutreachStatus =
  | "not_contacted" | "queued" | "sent" | "replied" | "follow_up" | "closed";
export type MontvelleWebsiteNameStatus =
  | "internal_only" | "sourcing_reference" | "approved_supplier" | "preferred_partner";
export type MontvelleSupplierCategory =
  | "luxury_travel_network"
  | "private_club_network"
  | "private_members_club"
  | "hotel_network"
  | "hotel_restaurant_network"
  | "concierge_network"
  | "hotel_group"
  | "private_aviation"
  | "chauffeur"
  | "yacht"
  | "destination_management"
  | "villas_residences"
  | "luxury_retail"
  | "art_collectibles"
  | "property"
  | "relocation"
  | "private_staffing"
  | "security"
  | "health_security"
  | "wellness";

export type MontvelleSupplier = {
  id: string;
  name: string;
  category: MontvelleSupplierCategory;
  coverage: string;
  networkMultiplier: boolean;
  multiplierReach: string;
  lifecycleStatus: MontvelleSupplierLifecycle;
  outreachStatus: MontvelleOutreachStatus;
  websiteNameStatus: MontvelleWebsiteNameStatus;
  notes: string;
};

export const MONTVELLE_SUPPLIER_CATEGORY_LABELS: Record<MontvelleSupplierCategory, string> = {
  luxury_travel_network: "Luxury Travel Network",
  private_club_network: "Private Club Network",
  private_members_club: "Private Members' Club",
  hotel_network: "Hotel Network",
  hotel_restaurant_network: "Hotel & Restaurant Network",
  concierge_network: "Concierge Network",
  hotel_group: "Hotel Group",
  private_aviation: "Private Aviation",
  chauffeur: "Chauffeur & Ground Transport",
  yacht: "Yachts & Marine",
  destination_management: "Destination Management",
  villas_residences: "Villas & Residences",
  luxury_retail: "Luxury Retail",
  art_collectibles: "Art & Collectibles",
  property: "Property & Real Estate",
  relocation: "Relocation",
  private_staffing: "Private Staffing",
  security: "Security & Risk",
  health_security: "Medical & Security Assistance",
  wellness: "Wellness & Longevity",
} as const;

type SeedRow = readonly [
  id: string,
  name: string,
  category: MontvelleSupplierCategory,
  coverage: string,
  networkMultiplier: boolean,
  multiplierReach: string,
  notes: string,
];

const SEED_ROWS: SeedRow[] = [
  ["virtuoso", "Virtuoso", "luxury_travel_network", "Global", true, "2,300+ preferred travel partners / 1,200+ agency locations", "Global luxury travel network; multiplier route across hotels, cruises, airlines, tour companies and destinations."],
  ["iac", "International Associate Clubs (IAC)", "private_club_network", "Global", true, "200+ private clubs / 40+ countries", "Reciprocal private-club network; exceptionally strong multiplier for city, country, golf and accommodation clubs."],
  ["soho-house", "Soho House", "private_members_club", "Global", true, "50 Houses / 20 countries", "Global members-club group with bedrooms, events, wellness and dining."],
  ["67-pall-mall", "67 Pall Mall", "private_members_club", "Global", true, "Global club portfolio + reciprocal relationships", "Wine-focused private club group with London, Singapore and Verbier plus expansion markets."],
  ["neds-club", "Ned's Club", "private_members_club", "Global", true, "London, New York, Doha, Washington DC", "Global private-club membership with hotel, dining, wellness and events access."],
  ["leading-hotels", "The Leading Hotels of the World", "hotel_network", "Global", true, "Large independent luxury hotel collection", "High-leverage hotel network and independent luxury property route."],
  ["preferred-hotels", "Preferred Hotels & Resorts", "hotel_network", "Global", true, "625+ hotels / 80 countries", "Large independent luxury hotel portfolio; strong global sourcing multiplier."],
  ["small-luxury-hotels", "Small Luxury Hotels of the World", "hotel_network", "Global", true, "Global independent luxury hotel collection", "Independent luxury hotel multiplier."],
  ["relais-chateaux", "Relais & Châteaux", "hotel_restaurant_network", "Global", true, "Global hotels and restaurants network", "Luxury hotels and restaurants multiplier with strong culinary coverage."],
  ["design-hotels", "Design Hotels", "hotel_network", "Global", true, "Global design-led hotel collection", "Independent design/luxury hotel network."],
  ["serandipians", "Serandipians by Traveller Made", "luxury_travel_network", "Global", true, "Luxury travel designers and partners", "High-end travel network useful for luxury hotels, villas, DMCs and experiences."],
  ["quintessentially", "Quintessentially", "concierge_network", "Global", true, "Global concierge offices and partner ecosystem", "Lifestyle-management and concierge network multiplier."],
  ["four-seasons", "Four Seasons Hotels and Resorts", "hotel_group", "Global", true, "Global luxury hotel and resort group", "Priority direct hotel-group relationship."],
  ["rosewood", "Rosewood Hotel Group", "hotel_group", "Global", true, "Global luxury hotels and resorts", "Priority direct hotel-group relationship."],
  ["mandarin-oriental", "Mandarin Oriental Hotel Group", "hotel_group", "Global", true, "Global luxury hotel group", "Priority direct hotel-group relationship."],
  ["aman", "Aman", "hotel_group", "Global", true, "Ultra-luxury hotels, resorts and residences", "Ultra-luxury hospitality and wellness."],
  ["belmond", "Belmond", "hotel_group", "Global", true, "Hotels, trains, cruises and safaris", "Excellent multiplier spanning hospitality and luxury transport."],
  ["dorchester-collection", "Dorchester Collection", "hotel_group", "Europe / US", true, "Luxury hotel collection", "Flagship ultra-luxury city and resort hotels."],
  ["oetker-collection", "Oetker Collection", "hotel_group", "Global", true, "Masterpiece hotels and private villas", "Ultra-luxury hotel and villa collection."],
  ["peninsula", "The Peninsula Hotels", "hotel_group", "Global", true, "Global luxury hotel group", "Priority direct hotel relationship."],
  ["raffles", "Raffles Hotels & Resorts", "hotel_group", "Global", true, "Luxury hotels and resorts", "Global high-end hotel coverage."],
  ["oneandonly", "One&Only Resorts", "hotel_group", "Global", true, "Ultra-luxury resorts", "Resort and private-home coverage."],
  ["six-senses", "Six Senses", "hotel_group", "Global", true, "Luxury resorts and wellness", "Strong wellness and destination coverage."],
  ["cheval-blanc", "Cheval Blanc", "hotel_group", "Europe / Indian Ocean / US", false, "Ultra-luxury maisons", "Top-tier hospitality sourcing."],
  ["airelles", "Airelles", "hotel_group", "Europe", false, "Luxury palace and resort collection", "French/European ultra-luxury coverage."],
  ["maybourne", "Maybourne", "hotel_group", "UK / Europe / US", false, "Claridge's, The Connaught, The Berkeley and international properties", "Ultra-luxury city hotel cluster."],
  ["vistajet", "VistaJet", "private_aviation", "Global", true, "Global private aviation network", "Private jet access and charter."],
  ["netjets", "NetJets", "private_aviation", "Global", true, "Large fractional/private aviation fleet", "Private aviation multiplier."],
  ["flexjet", "Flexjet", "private_aviation", "US / Europe", true, "Private aviation fleet and terminals", "Private aviation coverage."],
  ["air-charter-service", "Air Charter Service", "private_aviation", "Global", true, "Global charter brokerage offices", "Strong charter multiplier across jets, groups and cargo."],
  ["privatefly", "PrivateFly", "private_aviation", "Global", true, "Private jet charter platform", "Digital and brokered private aviation sourcing."],
  ["blacklane", "Blacklane", "chauffeur", "Global", true, "Global chauffeur network", "Chauffeur coverage across major cities and airports."],
  ["wheely", "Wheely", "chauffeur", "UK / Europe / Middle East", true, "Premium chauffeur platform", "High-end on-demand and pre-booked chauffeur service."],
  ["carey", "Carey International", "chauffeur", "Global", true, "Global chauffeured transportation", "Corporate and luxury ground transportation."],
  ["burgess", "Burgess", "yacht", "Global", true, "Superyacht charter, sales and management", "Top-tier yacht supplier and industry network."],
  ["fraser", "Fraser Yachts", "yacht", "Global", true, "Yacht charter, sales and management", "Global yacht coverage."],
  ["northrop-johnson", "Northrop & Johnson", "yacht", "Global", true, "Yacht charter, sales and management", "Global yacht coverage."],
  ["camper-nicholsons", "Camper & Nicholsons", "yacht", "Global", true, "Yacht charter, sales and management", "Historic global yacht house."],
  ["yco", "Y.CO", "yacht", "Global", true, "Yacht charter, sales and management", "Global yacht and experience sourcing."],
  ["edmiston", "Edmiston", "yacht", "Global", true, "Superyacht charter and brokerage", "Ultra-high-end yacht sourcing."],
  ["abercrombie-kent", "Abercrombie & Kent", "destination_management", "Global", true, "Luxury travel and DMC operations", "Strong destination-management multiplier."],
  ["kuoni-tumlare", "Kuoni Tumlare", "destination_management", "Global", true, "Destination management network", "Broad on-the-ground travel and events sourcing."],
  ["dmc-network", "DMC Network", "destination_management", "Global", true, "Independent DMC member network", "Multiplier across local destination specialists."],
  ["onefinestay", "onefinestay", "villas_residences", "Global", true, "Luxury private homes and villas", "Private residence and villa sourcing."],
  ["le-collectionist", "Le Collectionist", "villas_residences", "Global", true, "Luxury villas and experiences", "High-end villa and destination services."],
  ["the-thinking-traveller", "The Thinking Traveller", "villas_residences", "Mediterranean", false, "Luxury villas", "Strong Mediterranean villa specialist."],
  ["villas-of-distinction", "Villas of Distinction", "villas_residences", "Global", true, "Luxury villa portfolio", "Broad villa sourcing."],
  ["cuvee", "Cuvée", "villas_residences", "Global", true, "Luxury residences and curated experiences", "UHNW residence sourcing."],
  ["ten-lifestyle-group", "Ten Lifestyle Group", "concierge_network", "Global", true, "Global concierge platform and supplier relationships", "Excellent commercial/network multiplier."],
  ["john-paul", "John Paul", "concierge_network", "Global", true, "Global concierge and loyalty services", "Concierge supplier ecosystem."],
  ["bluefish", "The Bluefish", "concierge_network", "Global", false, "Luxury concierge and experiences", "Hard-to-source lifestyle and event requests."],
  ["arts-club", "The Arts Club", "private_members_club", "London / Dubai", true, "Private club locations and partner ecosystem", "High-value culture/business member network."],
  ["aman-club", "Aman Club", "private_members_club", "New York / Tokyo / selected Aman destinations", true, "Aman private club ecosystem", "Ultra-luxury private-club route."],
  ["casa-cipriani", "Casa Cipriani", "private_members_club", "New York / Milan / selected markets", true, "Private club and hospitality ecosystem", "Luxury hospitality and membership route."],
  ["neuehouse", "NeueHouse", "private_members_club", "US", true, "Private work/social club locations", "Creative-industry member network."],
  ["core-club", "CORE:", "private_members_club", "New York / Milan", true, "Private club locations", "High-net-worth business/cultural member route."],
  ["annabels", "Annabel's", "private_members_club", "London", false, "Private members' club", "Flagship London UHNW social club."],
  ["home-house", "Home House", "private_members_club", "London", false, "Private members' club and accommodation", "London luxury club and accommodation."],
  ["the-conduit", "The Conduit", "private_members_club", "London", false, "Private members' club", "Impact/business membership community."],
  ["harrods", "Harrods", "luxury_retail", "UK / Global clients", true, "Luxury department store and services", "Personal shopping, rare sourcing and concierge retail."],
  ["selfridges", "Selfridges", "luxury_retail", "UK", false, "Luxury department store", "Personal shopping and luxury retail sourcing."],
  ["sothebys", "Sotheby's", "art_collectibles", "Global", true, "Auction, private sales, luxury categories", "Art, jewellery, watches and collectibles multiplier."],
  ["christies", "Christie's", "art_collectibles", "Global", true, "Auction and private sales", "Art, jewellery, watches and collectibles multiplier."],
  ["bonhams", "Bonhams", "art_collectibles", "Global", true, "Auction and private sales", "Collectibles and specialist categories."],
  ["knight-frank", "Knight Frank", "property", "Global", true, "Prime property offices and partners", "Prime property, relocation and residence sourcing."],
  ["savills", "Savills", "property", "Global", true, "Global property network", "Prime property and relocation sourcing."],
  ["sothebys-realty", "Sotheby's International Realty", "property", "Global", true, "Global luxury real estate network", "Luxury property network multiplier."],
  ["crown-relocations", "Crown Relocations", "relocation", "Global", true, "International relocation network", "Household moves and destination settling-in."],
  ["santa-fe-relocation", "Santa Fe Relocation", "relocation", "Global", true, "International relocation services", "Global mobility and relocation."],
  ["tiger-recruitment", "Tiger Recruitment", "private_staffing", "UK / US / Europe / Middle East", true, "Private household and executive recruitment", "Household, family-office and executive staffing."],
  ["silver-swan", "Silver Swan Recruitment", "private_staffing", "Global", false, "Private household staffing", "UHNW household recruitment."],
  ["polo-tweed", "Polo & Tweed", "private_staffing", "Global", false, "Private household staffing and training", "Household staffing and service training."],
  ["garda-world", "GardaWorld", "security", "Global", true, "Security and risk services", "Corporate/private security sourcing; use only with appropriate licensing and due diligence."],
  ["control-risks", "Control Risks", "security", "Global", true, "Risk and security consultancy", "Travel, geopolitical and security risk support."],
  ["international-sos", "International SOS", "health_security", "Global", true, "Medical and security assistance network", "Travel assistance and medical/security coordination."],
  ["lanserhof", "Lanserhof", "wellness", "Europe", false, "Medical wellness resorts", "High-end wellness and longevity."],
  ["chenot", "Chenot", "wellness", "Europe / Global guests", false, "Medical wellness resorts", "Luxury wellness and longevity."],
  ["clinique-la-prairie", "Clinique La Prairie", "wellness", "Switzerland / Global", false, "Longevity and wellness clinic", "Ultra-premium wellness and longevity."],
];

export const MONTVELLE_SUPPLIERS: MontvelleSupplier[] = SEED_ROWS.map(
  ([id, name, category, coverage, networkMultiplier, multiplierReach, notes]) => ({
    id,
    name,
    category,
    coverage,
    networkMultiplier,
    multiplierReach,
    lifecycleStatus: "identified",
    outreachStatus: "not_contacted",
    websiteNameStatus: "sourcing_reference",
    notes,
  }),
);

export const MONTVELLE_SUPPLIER_BUILD_RULES = {
  publicWording:
    "Supplier names may be shown only as factual sourcing references unless a relationship has been confirmed. Do not label an organisation a partner, approved supplier or preferred supplier without evidence.",
  lifecycle:
    "Identified → Contacted → Screened → Approved → Preferred → Contracted. Hold rather than delete useful research.",
  outreach:
    "Database first. Outreach is a separate controlled step. Record sent date, recipient, message version, response and next action before changing relationship status.",
  multiplierPriority:
    "Prioritise global networks, hotel collections, concierge groups and reciprocal private-club networks because one relationship can unlock many underlying providers.",
} as const;
