# Liftor Portfolio CRM Architecture

This document records the non-destructive CRM direction for shared portfolio data.

## Core principle

Liftor owns people and organisations once. Businesses attach through many-to-many relationships. Data assets and buyer pools are reusable portfolio assets, not business-specific silos.

## Target flow

Data Asset -> Buyer Pool -> Organisation -> Person -> Business Relevance -> Campaign Eligibility -> Conversation -> Proposal -> Deal -> Customer -> Revenue

## Non-destructive migration rules

- Keep the existing `contacts` table as the master person registry.
- Keep `business_contact_relationships` as the business-specific relationship layer.
- Keep Relationship Intelligence as research/evidence; bridge approved records into CRM rather than merging the systems blindly.
- Treat `contacts.assigned_business` as a legacy compatibility field, not the source of truth.
- Never duplicate a person merely because another Liftor business can use the relationship.
- Global suppression always wins; business-specific suppression remains scoped to the business relationship.
- Do not automatically send when a dataset is imported or promoted.

## Wave 1

Education is the first portfolio cohort. The education data asset is reusable beyond the first launch businesses, including procurement, IT, governance, marketing, HR/L&D, estates and other relevant roles within education organisations.
