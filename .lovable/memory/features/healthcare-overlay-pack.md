---
name: Healthcare Overlay Pack
description: Founder/admin-only governance & evidence layer for credentialing, safeguarding, clinical incidents, regulatory evidence and special-category health data. Not a live clinical system.
type: feature
---
Route: `/founder/healthcare-overlay`. Founder/admin only via `FounderRoute` and `is_founder_or_admin` RLS. Tables: `healthcare_readiness`, `healthcare_credentials`, `healthcare_safeguarding_records`, `healthcare_clinical_incidents`, `healthcare_regulatory_evidence`, `healthcare_data_governance`, `healthcare_audit_events`. Healthcare businesses default to NOT LIVE / BLOCKED. No AI clinical decisions, no automated triage, no patient/customer access, no external automation. Every status change writes an audit event.