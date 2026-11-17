# One founder home: "Liftor HQ"

## What you get
One page you log into every day to run all businesses. Nothing built so far is lost: every existing page stays and still works.

### The HQ page
- **Top bar:** business switcher ("All businesses" or one business, e.g. Kindnesss). Every box below follows that choice.
- **"Today" strip:** things waiting on you right now: approvals, replies, blockers, alerts, upcoming send dates.
- **15 boxes, one per area** (same numbering as the capability list):
  1 Daily running · 2 Radars & prospecting · 3 Sales · 4 Email outreach · 5 Social media · 6 Marketing · 7 Customers · 8 Money · 9 Legal & tax · 10 Portfolio & exit · 11 Business setup & knowledge · 12 People & suppliers · 13 AI · 14 Platform & security · 15 Schools & private
- Each box shows 2–3 live numbers and a status colour (working / needs attention / not switched on), then opens that area.

### Area pages (the deeper menus)
- Clicking a box opens that area's own page: a short summary at the top, then tiles for every tool in that area with a one-line plain description.
- Duplicates are folded together: where two pages do the same thing, only the better one gets a tile and the other is listed under "Older version" at the bottom of that area. Nothing is removed.

### Side menu
- Shrinks from about 90 links to 16: HQ plus the 15 areas.
- Old links and bookmarks still work.

## Duplicates folded (examples)
- Two Smartlead links become one.
- Portals and Portal admin become one.
- The command centres, Overview, Start Here and Daily Operator are replaced by HQ (kept under "Older version").
- Monday launch, Monday readiness and Micro-batch are listed as older launch screens under Daily running.
- Money, Finance and Revenue become one "Money" area with the others as tiles.

## Not changing
No data deleted, nothing sent or posted, no safety switches changed.

## Technical details
- `src/lib/founderAreas.ts`: single registry of 15 areas → sections (route, label, description, primary/legacy flag). Nav, HQ and area pages all read it, so new pages are added in one place.
- `src/pages/founder/LiftorHQ.tsx` at `/founder` (current Overview moves to the legacy list); `src/pages/founder/AreaPage.tsx` at `/founder/area/:areaKey`.
- Live box metrics: small read-only queries per area on existing tables, filtered by the selected business (founder RLS unchanged); boxes fall back to "no data yet" rather than guessing.
- `FounderLayout.tsx` nav generated from the registry; `App.tsx` routes untouched apart from the two new ones.
- Unit test: every `/founder` route in App.tsx is in exactly one area (so nothing gets lost); registry has no duplicate primaries.
- Record the registry rule in AGENTS.md.
