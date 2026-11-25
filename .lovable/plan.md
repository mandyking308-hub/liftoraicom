# Plan: One Customer CRM, campaign picking, customer journey, PR & Marketing database

Billionaire list stays exactly as it is. Nothing is emailed, and no paid Apollo lookups, as part of this build.

## 1. Customer CRM page (simple and clear)
- Clicking "Radars & prospecting" opens the CRM directly (no in-between page).
- Top: 4 coloured boxes - Total people, Usable, In a campaign, Not yet in a campaign.
- Below: a searchable people list with filters: Type (Education, Corporate, Charity, plus any you add), Country, Business, Campaign, "Not contacted in last 3 months".
- Light look to match Email outreach. Technical details tucked behind a "Details" button.

## 2. Upload spreadsheets to the CRM
- "Upload" button: choose a CSV/Excel file and a Type (e.g. Education).
- Liftor matches the columns automatically (you can adjust), then shows a check before anything is saved:
  new people, already in CRM (merged, not duplicated), bad or catch-all addresses, do-not-contact.
- Press Save; you see what was saved and what was skipped. Re-uploading the same file never creates duplicates.
- Handles large files (2,500+ rows) in batches.

## 3. Add people to a campaign (existing or new)
- In the CRM: filter, see "1,240 people match", press **Add to campaign**, pick from campaigns already running (e.g. Kindnesss - Education).
- Liftor silently removes duplicates, bad addresses, do-not-contact people and anyone already in that campaign, shows the final number, you confirm once.
- People join where the campaign currently is; it is not restarted.
- On Email outreach, "New campaign" uses the same picker to choose people from the CRM.
- Before your 2,500 contacts, one test person is added to prove it works end to end.

## 4. Customer journey on every person
- Click a person: one timeline of everything - uploaded, added to campaign, each email sent, opened, replied, bounced, unsubscribed, notes, demos, payments.
- Every touch is recorded automatically from the hourly campaign updates and instant updates.
- Shows which businesses and campaigns they have been in, so data is reused safely.

## 5. PR & Marketing database (separate from the CRM)
- New page for newspapers, journalists, agencies and marketing organisations.
- Upload with the same check-before-save, tagged by country and continent.
- Search and filter: one country, a whole continent, or all.
- Each contact has the same journey timeline (correspondence back and forth, notes).
- Old PR pages folded into this one place (hidden, data kept).

## Order of work
1. CRM page + upload  2. Add to campaign + one-person test  3. Journey timeline  4. PR & Marketing database

## Still needed from you
- A sample PR/marketing spreadsheet (so columns match exactly). Until then I'll accept common columns: name, outlet/organisation, role, email, phone, website, country, continent.
- Old saved data for Education Harvest / Retirement is wiped after you publish and allow it in Settings.

## Technical details
- CRM = existing canonical `contacts` + `business_contact_relationships`; add a contact "type/segment" tag table (founder/admin RLS) and reuse existing Apollo/CRM import RPCs where possible; idempotent server-side dedupe by lower(email).
- Add to campaign = existing founder-only Add people function (Smartlead push), gated by suppression, email history (fail-closed), business scoping and existing campaign mapping; one approval.
- Journey = read from crm_interaction_ledger + email events + Smartlead activity events, in one timeline query.
- PR database = new founder/admin-only tables for media contacts, organisations, country/continent and interactions, with GRANTs + RLS; no link to customer CRM or campaigns.
- Tests for dedupe, filters, and campaign eligibility rules.
