# Montvelle concierge fulfilment routing

Montvelle supplier contacts have two distinct purposes and Liftor must never confuse them.

## 1. Operational fulfilment routes

These are the routes Liftor uses when a Montvelle client asks the concierge to do something: reserve a hotel, arrange a private club visit, secure dining, book transport, source a yacht, arrange a villa, find staff, organise wellness or solve another request.

Operational routes should prefer, in order:

1. dedicated reservations / booking desk
2. travel-trade or travel-advisor desk
3. concierge desk
4. reciprocal-access mechanism
5. direct property / local office
6. general service centre

Each route records the published phone, email, website/app/WhatsApp channel, geography, purpose, access prerequisites, source URL and last verification date.

Only supplier-published routes are permitted. Do not infer email formats or use privately enriched telephone numbers.

## 2. Supplier relationship outreach

This is separate. It is used to tell a supplier that Montvelle has identified it for its sourcing universe, seek trade terms, establish commissions/net rates, obtain a preferred commercial contact and deepen the relationship.

Sending outreach does not make the operational route valid, and having a valid booking route does not imply a formal supplier partnership.

## Fulfilment guardrail

Before Liftor tells a client that access is available, it must check any prerequisite attached to the route.

Examples:

- International Associate Clubs requires eligible reciprocal club membership and uses its website/app to generate a Letter of Introduction.
- Private members' clubs may restrict access to members and their guests.
- Travel-trade benefits or commissions may require IATA, CLIA, TRUE or another recognised agency identifier.
- A hotel network may provide a global reservations line but require the individual hotel to handle urgent on-property requests.

The concierge agent should therefore return one of:

- **route ready** — published operational route and prerequisites satisfied;
- **route available, prerequisite needed** — route exists but access/account/membership must be established;
- **direct supplier fallback** — contact a local property/location directly;
- **route research needed** — supplier exists in the Montvelle base but no verified operational route is yet stored.

## Initial verified route batch — 24 August 2026

The first operational-route batch covers high-leverage networks including Virtuoso, International Associate Clubs, Soho House, 67 Pall Mall, Preferred Hotels & Resorts, The Leading Hotels of the World, Small Luxury Hotels of the World, Relais & Châteaux, Design Hotels and Ten Lifestyle Group.

Source of truth: `src/data/montvelleOperationalRoutes.ts`.
