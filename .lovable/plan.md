# GIAS release verification — results and optional next step

## Verified (read-only, 16 Oct 2026)
- liftoraicom.lovable.app and liftorai.com serve the same bundle (`index-BSaS8J5W.js`), which contains the new strings: "School Register (GIAS)", "Establishment group", "No matching records for these filters", and the `/founder/gias-search` route.
- Signed out, `/founder/gias-search` redirects to `/founder/login`. The school register page does not render.

## Not verified
- Deployment ID `6d7696c6-…` and SHA `d8a1014f…` were not matched directly. Hosting exposes no build ID, so these are inferred from the matching strings.
- Founder-only controls (menu link, group filter, results) were not checked while signed in, because no signed-in session was available.

## Optional next step (only if approved)
- Mint a read-only founder browser session for the founder account, open `/founder/gias-search` on the live site, select "Independent schools" + "Open", and confirm the page shows 1,573 records. This would not edit files, change data, deploy, send anything or change gates.
