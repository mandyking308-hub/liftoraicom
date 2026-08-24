export type MontvelleRouteType =
  | "reservations"
  | "travel_trade"
  | "concierge"
  | "membership"
  | "reciprocal_access"
  | "events"
  | "general"
  | "service_centre"
  | "direct_property";

export type MontvelleRouteChannel = "phone" | "email" | "web" | "app" | "whatsapp";

export type MontvelleOperationalRoute = {
  id: string;
  supplierId: string;
  routeType: MontvelleRouteType;
  label: string;
  geography: string;
  channels: Array<{
    channel: MontvelleRouteChannel;
    value: string;
  }>;
  purpose: string;
  accessPrerequisite?: string;
  hours?: string;
  sourceUrl: string;
  sourceAuthority: "supplier_official";
  lastVerified: string;
  usableForFulfilment: boolean;
  notes?: string;
};

/**
 * Operational routes are the durable paths Liftor/Montvelle may use to fulfil
 * concierge requests. They are intentionally separate from supplier outreach.
 *
 * Rules:
 * - Only store routes published by the supplier/network itself.
 * - Never invent an email pattern or phone number.
 * - Prefer booking/reservations/travel-trade routes over corporate contacts.
 * - Preserve access prerequisites: membership, IATA/advisor account, reciprocal
 *   club letter, etc. A route that exists but cannot be used by Montvelle yet
 *   must not be presented as immediately fulfilment-ready.
 * - Re-verify periodically and update status rather than deleting history.
 */
export const MONTVELLE_OPERATIONAL_ROUTES: MontvelleOperationalRoute[] = [
  {
    id: "virtuoso-service-centre",
    supplierId: "virtuoso",
    routeType: "service_centre",
    label: "Virtuoso Service Center",
    geography: "Global / US service centre",
    channels: [
      { channel: "phone", value: "+1 817 870 0300" },
      { channel: "email", value: "help@virtuoso.com" },
      { channel: "web", value: "https://www.virtuoso.com/" },
    ],
    purpose: "Network support and routing into the Virtuoso ecosystem; not a substitute for a participating advisor/agency booking route.",
    accessPrerequisite: "Virtuoso network access/relationship may be required for partner systems and benefits.",
    sourceUrl: "https://virtuosomeetings.virtuoso.com/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: false,
    notes: "Use as a network-access route while Montvelle establishes the appropriate agency/partner relationship.",
  },
  {
    id: "iac-network-booking",
    supplierId: "iac",
    routeType: "reciprocal_access",
    label: "IAC reciprocal-club booking route",
    geography: "40+ countries",
    channels: [
      { channel: "web", value: "https://www.iacworldwide.com/" },
      { channel: "app", value: "IAC app" },
      { channel: "email", value: "info@iacworldwide.com" },
    ],
    purpose: "Search reciprocal private clubs, make bookings through the IAC website/app and generate the required Letter of Introduction.",
    accessPrerequisite: "Guest must hold eligible membership through an IAC participating home club; booking/letter process follows IAC rules.",
    sourceUrl: "https://www.iacworldwide.com/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "soho-house-membership",
    supplierId: "soho-house",
    routeType: "membership",
    label: "Soho House membership/support route",
    geography: "Global",
    channels: [
      { channel: "email", value: "membership@sohohouse.com" },
      { channel: "web", value: "https://www.sohohouse.com/contact" },
      { channel: "app", value: "Soho House app → Profile → Contact us" },
    ],
    purpose: "Membership, access and account enquiries; individual House pages provide local telephone routes for bookings and event/private-hire enquiries.",
    accessPrerequisite: "House access is membership-controlled except where a public restaurant, bedroom or other public service is explicitly available.",
    sourceUrl: "https://www.sohohouse.com/faq/soho-friends-membership",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
    notes: "For a live request, resolve the destination to the individual House and use its published local contact/booking route.",
  },
  {
    id: "soho-house-london-greek-street",
    supplierId: "soho-house",
    routeType: "direct_property",
    label: "Soho House 40 Greek Street",
    geography: "London, UK",
    channels: [
      { channel: "phone", value: "+44 20 7734 5188" },
      { channel: "web", value: "https://www.sohohouse.com/houses/soho-house-40-greek-street" },
    ],
    purpose: "Local House route for member access, dining and eligible private-event enquiries.",
    accessPrerequisite: "Many club spaces and private-hire options are members only.",
    sourceUrl: "https://www.sohohouse.com/houses/soho-house-40-greek-street/event-spaces",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "67-pall-mall-london-reservations",
    supplierId: "67-pall-mall",
    routeType: "reservations",
    label: "67 Pall Mall London reservations",
    geography: "London, UK",
    channels: [
      { channel: "phone", value: "+44 20 3000 6767" },
      { channel: "web", value: "https://www.67pallmall.com/contact-and-enquiries/" },
    ],
    purpose: "Reservations and general reception routing for the London club.",
    accessPrerequisite: "Private-club access rules apply; membership/guest eligibility must be checked before promising access.",
    sourceUrl: "https://www.67pallmall.com/contact-and-enquiries/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "67-pall-mall-verbier-reservations",
    supplierId: "67-pall-mall",
    routeType: "reservations",
    label: "67 Pall Mall Verbier reservations",
    geography: "Verbier, Switzerland",
    channels: [
      { channel: "phone", value: "+41 27 565 91 60" },
      { channel: "whatsapp", value: "+41 76 221 60 69" },
      { channel: "web", value: "https://www.67pallmall.com/contact-and-enquiries/" },
    ],
    purpose: "Reservations for the Verbier club.",
    accessPrerequisite: "Private-club access rules apply.",
    sourceUrl: "https://www.67pallmall.com/contact-and-enquiries/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "67-pall-mall-singapore-reservations",
    supplierId: "67-pall-mall",
    routeType: "reservations",
    label: "67 Pall Mall Singapore reservations",
    geography: "Singapore",
    channels: [
      { channel: "phone", value: "+65 6797 6727" },
      { channel: "whatsapp", value: "+65 6797 1767" },
      { channel: "web", value: "https://www.67pallmall.com/contact-and-enquiries/" },
    ],
    purpose: "Reservations for the Singapore club.",
    accessPrerequisite: "Private-club access rules apply.",
    sourceUrl: "https://www.67pallmall.com/contact-and-enquiries/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "preferred-hotels-member-services",
    supplierId: "preferred-hotels",
    routeType: "reservations",
    label: "Preferred Hotels & Resorts reservation assistance",
    geography: "Global",
    channels: [
      { channel: "phone", value: "+1 314 900 1482" },
      { channel: "phone", value: "UK: 0800 917 9615" },
      { channel: "web", value: "https://preferredhotels.com/contact-us/contact-member-services" },
    ],
    purpose: "Reservation assistance and member-services routing across the Preferred Hotels & Resorts portfolio.",
    accessPrerequisite: "Some benefits require I Prefer membership; travel-agent commissions require an eligible agency identifier and commissionable booking channel.",
    sourceUrl: "https://preferredhotels.com/contact-us/contact-member-services",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "preferred-hotels-travel-professionals",
    supplierId: "preferred-hotels",
    routeType: "travel_trade",
    label: "Preferred Hotels travel-professional route",
    geography: "Global",
    channels: [
      { channel: "phone", value: "+1 312 496 6835" },
      { channel: "email", value: "Commission@PreferredHotels.com" },
      { channel: "web", value: "https://preferredhotels.com/page/travel-professionals" },
    ],
    purpose: "Travel-professional support and commission routing; useful institutional route while Montvelle establishes formal agency credentials.",
    accessPrerequisite: "Commissionable agency bookings require a valid agency identifier such as IATA, CLIA or TRUE where applicable.",
    sourceUrl: "https://preferredhotels.com/page/travel-professionals",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "leading-hotels-worldwide-reservations-uk",
    supplierId: "leading-hotels",
    routeType: "reservations",
    label: "LHW Worldwide Reservations — UK/Europe",
    geography: "UK and participating European countries",
    channels: [
      { channel: "phone", value: "00 800 2888 8882" },
      { channel: "web", value: "https://www.lhw.com/customer-care" },
    ],
    purpose: "Voice reservations across The Leading Hotels of the World portfolio.",
    accessPrerequisite: "For on-property immediate assistance, LHW instructs guests to contact the hotel directly.",
    sourceUrl: "https://www.lhw.com/customer-care",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "small-luxury-hotels-reservations-uk",
    supplierId: "small-luxury-hotels",
    routeType: "reservations",
    label: "SLH 24/7 reservations — UK",
    geography: "UK / Global network",
    channels: [
      { channel: "phone", value: "0800 0482 314" },
      { channel: "phone", value: "+44 203 308 9005 (Europe)" },
      { channel: "web", value: "https://slh.com/contact-us" },
    ],
    purpose: "24/7 reservation assistance across Small Luxury Hotels of the World.",
    hours: "24 hours a day, 7 days a week",
    sourceUrl: "https://slh.com/contact-us",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "relais-chateaux-reservations-uk",
    supplierId: "relais-chateaux",
    routeType: "reservations",
    label: "Relais & Châteaux travel advisors — UK",
    geography: "UK / Global portfolio",
    channels: [
      { channel: "phone", value: "+44 203 519 1967" },
      { channel: "email", value: "reservation@relaischateaux.com" },
      { channel: "web", value: "https://www.relaischateaux.com/gb/about/contact/" },
    ],
    purpose: "Advisor-assisted hotel reservations, properties not bookable online, tailor-made itineraries and special requests.",
    sourceUrl: "https://www.relaischateaux.com/gb/about/contact/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "design-hotels-reservations-uk",
    supplierId: "design-hotels",
    routeType: "reservations",
    label: "Design Hotels 24/7 reservation route — UK",
    geography: "UK / Global portfolio",
    channels: [
      { channel: "phone", value: "+44 20 3499 6485" },
      { channel: "phone", value: "+49 30 884 940 040 (global fallback)" },
      { channel: "web", value: "https://www.designhotels.com/contact/" },
    ],
    purpose: "24/7 telephone reservation routing across Design Hotels; official contact page also provides reservation email and callback form.",
    hours: "Telephone route 24/7; email enquiries listed Mon–Fri 09:00–18:00 CEST",
    sourceUrl: "https://www.designhotels.com/contact/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: true,
  },
  {
    id: "ten-lifestyle-business-development",
    supplierId: "ten-lifestyle-group",
    routeType: "general",
    label: "Ten Lifestyle business-development route",
    geography: "Global / London HQ",
    channels: [
      { channel: "phone", value: "+44 20 3301 6300" },
      { channel: "email", value: "businessdevelopment@tengroup.com" },
      { channel: "web", value: "https://tenlifestylegroup.com/" },
    ],
    purpose: "Commercial relationship route into Ten's concierge/supplier ecosystem; not an immediate client booking line.",
    accessPrerequisite: "Commercial relationship required before treating Ten as an operational fulfilment channel.",
    sourceUrl: "https://tenlifestylegroup.com/",
    sourceAuthority: "supplier_official",
    lastVerified: "2026-08-24",
    usableForFulfilment: false,
  },
];

export function getMontvelleOperationalRoutes(supplierId: string) {
  return MONTVELLE_OPERATIONAL_ROUTES.filter((route) => route.supplierId === supplierId);
}

export function getMontvelleFulfilmentRoutes(supplierId: string) {
  return getMontvelleOperationalRoutes(supplierId).filter((route) => route.usableForFulfilment);
}
