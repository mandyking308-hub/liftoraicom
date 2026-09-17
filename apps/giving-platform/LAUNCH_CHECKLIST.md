# Giving Rail — production launch checklist

The public website can be made visually complete before the operating stack is switched on. The items below are the remaining production gates and should not be hidden behind marketing language.

## Built in the website

- Launch brand, favicon, social card and web manifest.
- Responsive public home page.
- How it works / operating workflow.
- Business campaign builder.
- Direct corporate-gift route to GHAT pilot.
- Charity onboarding journey.
- Charity discovery / listing model.
- Project discovery, following and funding model.
- Volunteer opportunity and supporter-profile journeys.
- Pilot pricing and lead-capture surface.
- Pilot workspace / dashboard.
- About page.
- Trust & Safety page.
- Sign-in / role-selection surface.
- Draft Terms, Privacy, Cookies, Accessibility and Complaints pages.
- Hash-based deep links for the static launch site.
- SEO and sharing metadata.
- Dedicated GitHub production-build quality gate.

## Required before external production launch

### 1. Entity, brand and contracts
- Confirm the legal operating entity for Giving Rail.
- Complete trademark / company-name / domain clearance for the final brand.
- Put any related-party arrangement with Liftor and GHAT in writing.
- Solicitor approves platform Terms, charity terms, business terms, privacy notice, complaints policy and standard sales-linked agreement workflow.

### 2. Authentication and permissions
- Replace browser-local pilot records with a production database.
- Implement secure authentication.
- Implement role-based access: business, charity, supporter/volunteer, administrator.
- Add organisation membership, invitations and authorised-representative controls.
- Add audit logging for approvals and material changes.

### 3. Charity verification
- Connect official registration checks where practical.
- Verify authorised representatives.
- Complete sanctions / financial-crime / fraud controls proportionate to risk.
- Verify the approved payment destination.
- Store verification status, evidence, reviewer, timestamp and expiry/review date.

### 4. Payments
- Decide and document the regulated marketplace/payment architecture.
- Configure Stripe Connect or equivalent if multi-charity payments are enabled.
- Avoid casual custody of charitable funds.
- Implement payment reconciliation, refunds, failed payments and chargebacks.
- Define provider fees separately from Giving Rail software/service fees.
- Test live and test modes end-to-end.

### 5. Sales-linked giving workflow
- Finalise the UK agreement template and approval process.
- Store the approved public participation statement.
- Prevent a business from marking its own campaign approved.
- Add evidence of charity approval and agreement execution.
- Add campaign settlement, reconciliation and close-out states.
- Add monitoring / suspension route for misleading or unauthorised promotions.

### 6. Projects and evidence
- Add charity-side project creation and editing.
- Add target, status, geography, budget and evidence fields.
- Add supporter updates and impact reporting.
- Distinguish ordinary designated messaging from legally restricted funds where applicable.

### 7. Volunteer operations
- Add applications, screening status, assignment and named owner.
- Add role-specific safeguarding / vetting controls.
- Add hours / outputs / references where appropriate.
- Add retention rules for unsuccessful applicants and sensitive vetting data.

### 8. Data protection and security
- Complete data map and DPIA where required.
- Confirm hosting region and processor list.
- Implement retention / deletion schedules.
- Add rate limiting, abuse controls, logging and incident response.
- Run dependency and CodeQL scanning.
- Run penetration testing before material payment volume.

### 9. Accessibility and QA
- Run automated accessibility checks.
- Complete keyboard, screen-reader, zoom and contrast testing.
- Test 320px, 390px, tablet and desktop viewports.
- Test all forms with errors and interrupted sessions.
- Add browser / device support matrix.

### 10. International expansion
- Keep non-UK sales-linked campaign packs disabled until reviewed.
- Build a jurisdiction matrix covering fundraising law, consumer disclosures, charity eligibility, tax/receipting, payments, sanctions/AML, privacy and record retention.
- Activate countries individually.

## Launch stages

**Stage A — branded public pilot:** website, GHAT beneficiary route, controlled business/charity onboarding, no multi-charity custody.  
**Stage B — UK production:** authenticated accounts, verification, approved UK sales-linked workflow and regulated multi-charity payment rail.  
**Stage C — international:** jurisdiction-by-jurisdiction activation after local review.
