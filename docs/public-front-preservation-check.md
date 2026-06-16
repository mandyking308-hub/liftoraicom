# Public Front Preservation Check

Date: 2026-06-16
Scope: Read-only audit of public-facing surfaces. No public redesign, no new marketing claims, no internal docs removed.

---

## A. Overall status

**PASS** — public front remains discreet; founder/admin operating system stays behind login.

---

## B. Public pages checked

- `src/pages/Index.tsx` (home)
- `src/pages/About.tsx`
- `src/pages/WhatWeBuild.tsx`
- `src/pages/Systems.tsx`
- `src/pages/Architecture.tsx`
- `src/pages/Platform.tsx`
- `src/pages/Industries.tsx`
- `src/pages/Method.tsx`
- `src/pages/CaseStudies.tsx`
- `src/pages/PartnerProgram.tsx`
- `src/pages/ProjectDiscovery.tsx`
- `src/pages/AIProposal.tsx`
- `src/pages/legal/*` (12 policy pages)
- `src/components/layout/Navbar.tsx`
- `src/components/layout/Footer.tsx`
- `public/sitemap.xml`, `public/robots.txt`

---

## C. Revealing language found and changed

Searched all public pages and components for: *AI empire, exit machine, acquisition radar, M&A intelligence, buyer warm-up, portfolio operating brain, automated business factory, founder command centre, internal AI workforce, healthcare overlay, data room tokens, operating brain, acquisition machine*.

**Zero hits** on any public-facing page or shared layout component. All such terminology lives exclusively inside `/founder/*` pages, `src/lib/*` engines, and internal docs — none of which render to the public.

No public copy changes required.

---

## D. Founder/admin route exposure check

- Every `/founder/*` route in `src/App.tsx` is wrapped in `<FounderRoute>` (login + founder/admin gate).
- No `/founder` link present in `Navbar.tsx` or `Footer.tsx`.
- No `/founder` link present in any public page (Index, About, WhatWeBuild, Systems, Platform, Industries, Method, Architecture, CaseStudies, PartnerProgram, ProjectDiscovery, AIProposal, legal/*).
- `public/sitemap.xml` lists only public marketing + legal routes; no founder, portal-admin, data-room, healthcare, M&A, exit, or AI-governance routes are listed.
- `public/robots.txt` allows crawling of public routes only; founder routes are not advertised in the sitemap, and the gate returns the login surface to any unauthenticated crawler that guesses the path.

---

## E. Public nav/footer check

- `Navbar.tsx`: no link to `/founder`, `/founder/command-centre`, `/founder/data-room`, `/founder/healthcare-overlay`, `/founder/portfolio-exit/*`, `/founder/funding-radar/*`, `/founder/ai-*`, or any operating-loop route.
- `Footer.tsx`: same — only public marketing + legal links.
- Project Discovery / AI Proposal pages use neutral language ("business systems", "operations", "proposal") and do not name internal modules.

---

## F. Remaining concerns

None blocking. Optional future considerations:

1. If Liftor ever publishes a public case study referencing portfolio activity, review wording so it doesn't read as an "acquisition/exit machine".
2. Consider an explicit `Disallow: /founder/` in `robots.txt` purely as belt-and-braces (the auth gate already protects content; this would only suppress incidental indexing of the login redirect). Not required.
3. Periodically re-run the same regex sweep after any new public page is added.

---

## G. Plain-English verdict

**Yes — Liftor's public/front-facing presence remains discreet while the private founder operating system stays protected behind login.**

The marketing site reads as a calm, professional AI systems engineering firm. None of the internal language (command centre, operating brain, acquisition radar, exit machine, buyer warm-up, healthcare overlay, data room tokens, automated business factory, AI workforce) leaks onto any public page, nav, footer, sitemap, or robots file. All `/founder/*` surfaces remain login-gated to founder/admin only, and the internal documentation needed for adviser, legal, tax, and future due-diligence review is preserved untouched behind that gate.