-- Wealth Intelligence CRM firewall
-- Keeps philanthropy / HNW network research as reusable intelligence rather than CRM inventory.

alter table public.philanthropy_network_registry
  add column if not exists data_domain text not null default 'wealth_intelligence',
  add column if not exists crm_sync_allowed boolean not null default false,
  add column if not exists intended_uses text[] not null default array['GHAT','HNW','philanthropy','family_office']::text[];

alter table public.philanthropy_network_contacts
  add column if not exists data_domain text not null default 'wealth_intelligence',
  add column if not exists crm_sync_allowed boolean not null default false;

alter table public.philanthropy_network_research_queue
  add column if not exists data_domain text not null default 'wealth_intelligence';

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'philanthropy_network_registry_domain_guard') then
    alter table public.philanthropy_network_registry
      add constraint philanthropy_network_registry_domain_guard
      check (data_domain = 'wealth_intelligence' and crm_sync_allowed = false);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'philanthropy_network_contacts_domain_guard') then
    alter table public.philanthropy_network_contacts
      add constraint philanthropy_network_contacts_domain_guard
      check (data_domain = 'wealth_intelligence' and crm_sync_allowed = false);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'philanthropy_network_research_domain_guard') then
    alter table public.philanthropy_network_research_queue
      add constraint philanthropy_network_research_domain_guard
      check (data_domain = 'wealth_intelligence');
  end if;
end $$;

comment on column public.philanthropy_network_registry.crm_sync_allowed is
  'Hard false. Wealth-intelligence records are never CRM records. Any future CRM relationship must be created explicitly as a separate CRM record.';

comment on column public.philanthropy_network_contacts.crm_sync_allowed is
  'Hard false. Public research contacts remain in Wealth Intelligence and must not auto-sync into CRM.';
