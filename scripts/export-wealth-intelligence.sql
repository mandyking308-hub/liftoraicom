-- Founder Wealth Intelligence audit/export helpers
-- Live Supabase is authoritative. These queries produce portable JSONL snapshots.

-- Registry JSONL
select to_jsonb(x)::text
from (
  select network_name, category, priority_tier, region, country_focus, audience,
         website_url, source_url, source_status, access_mode,
         inheritor_focus, next_gen_focus, family_office_focus,
         philanthropy_focus, impact_investing_focus,
         membership_size_note, ghat_route_notes, status, last_verified_at,
         metadata, data_domain, crm_sync_allowed, intended_uses
  from public.philanthropy_network_registry
  order by priority_tier, network_name
) x;

-- Contact/evidence JSONL
select to_jsonb(x)::text
from (
  select r.network_name, c.person_name, c.role_title, c.contact_type,
         c.public_email, c.public_phone, c.contact_page_url, c.linkedin_url,
         c.preferred_channel, c.is_primary, c.verification_status,
         c.source_url, c.last_verified_at, c.notes, c.metadata,
         c.data_domain, c.crm_sync_allowed
  from public.philanthropy_network_contacts c
  join public.philanthropy_network_registry r on r.id = c.network_id
  order by r.priority_tier, r.network_name, c.is_primary desc, c.person_name nulls last
) x;

-- Completion validation
select
  (select count(*) from public.philanthropy_network_registry) as registry_records,
  (select count(distinct network_id) from public.philanthropy_network_contacts) as networks_with_contact_or_resolution_route,
  (select count(*) from public.philanthropy_network_contacts) as contact_evidence_rows,
  (select count(*) from public.philanthropy_network_research_queue where status = 'complete') as research_complete,
  (select count(*) from public.philanthropy_network_research_queue where status <> 'complete') as research_not_complete,
  (select count(*) from public.philanthropy_network_registry where crm_sync_allowed = true) as crm_syncable_registry,
  (select count(*) from public.philanthropy_network_contacts where crm_sync_allowed = true) as crm_syncable_contacts;
