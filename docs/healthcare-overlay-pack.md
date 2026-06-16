# Healthcare Overlay Pack

**Status:** Founder/admin-only governance & evidence layer.
**This is not a live clinical decision system.** External clinical, legal and regulatory adviser approval is still required before any healthcare marketplace activation.

## Route
`/founder/healthcare-overlay` (founder/admin only — enforced by `FounderRoute` and RLS via `public.is_founder_or_admin`)

## What it does
1. **Healthcare Readiness Gate** — every healthcare business defaults to `NOT LIVE / BLOCKED`. Founder must manually approve to unblock, and only when credentialing / safeguarding / clinical incident flow / special-category data / regulatory evidence are all `ready/approved/present`.
2. **Credentialing Register** — DBS, GMC, HCPC, NMC, CQC, professional insurance, right-to-work, qualifications, safeguarding training. Manual evidence only; no automated verification against external registers. Expiry badges (`valid`, `expiring soon`, `expired`, `missing evidence`, `adviser review required`).
3. **Safeguarding Register** — concern title, severity, lead, immediate action, external referral and adviser-review flags, status workflow. No AI safeguarding advice.
4. **Clinical Incident Flow** — incident title, severity, occurred/reported time, duty-of-candour consideration, complaint/insurance/regulator links, adviser-review flag, status workflow. No automated triage.
5. **Regulatory Evidence Map** — manual inventory across CQC, safeguarding, complaints, incidents, credentialing, onboarding, training, data protection, insurance and policy categories.
6. **Special-category Health Data Governance** — flags only: special-category presence, lawful basis, explicit consent, DPIA, retention, access-control review, external DPO/legal review. No actual health data stored.
7. **Audit** — every create and status change writes a row to `healthcare_audit_events`.

## Safety guardrails
- Founder/admin only — `is_founder_or_admin(auth.uid())` policies on every table.
- No anon, no patient/customer/provider/operator access.
- No automatic emails, no external sharing, no scraping.
- No AI clinical decisions. AI may only summarise records for founder review via the existing AI Gateway and must be clearly labelled non-clinical/admin support (not implemented in this phase).
- All status changes audit-logged.

## Tables
- `healthcare_readiness`
- `healthcare_credentials`
- `healthcare_safeguarding_records`
- `healthcare_clinical_incidents`
- `healthcare_regulatory_evidence`
- `healthcare_data_governance`
- `healthcare_audit_events`

## Closes audit gap
Closes the Level 0–1 healthcare-overlay gap identified in `docs/business-function-coverage-audit.md` (credentialing, safeguarding, clinical incidents, regulatory evidence). Insurance claim loop, statutory filings calendar, and other audit P1s remain open.

## Plain-English answer
Liftor is now **safer** for healthcare marketplace readiness tracking. It records credentialing, safeguarding, clinical incidents, regulatory evidence and special-category data governance — and forces every healthcare business to remain BLOCKED until the founder/admin explicitly approves go-live based on real evidence and recorded adviser review. It is **not** a live clinical system and must not be used to make clinical decisions.