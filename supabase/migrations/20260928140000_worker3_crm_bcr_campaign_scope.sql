-- Worker 3 CRM attribution: bind canonical outreach campaigns to a stable business.
-- Only exact, uniquely named existing businesses are backfilled; other rows stay unbound.

ALTER TABLE public.outreach_campaigns
  ADD COLUMN IF NOT EXISTS business_id UUID;

UPDATE public.outreach_campaigns AS campaign
SET business_id = business.id
FROM public.businesses AS business
WHERE campaign.business_id IS NULL
  AND campaign.business_name = business.name;

DO $$ BEGIN
  ALTER TABLE public.outreach_campaigns
    ADD CONSTRAINT outreach_campaigns_business_id_fkey
    FOREIGN KEY (business_id) REFERENCES public.businesses(id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS outreach_campaigns_id_business_scope_key
  ON public.outreach_campaigns (id, business_id);

DO $$ BEGIN
  ALTER TABLE public.outbound_provider_campaign_mappings
    ADD CONSTRAINT outbound_provider_campaign_mappings_liftor_campaign_business_scope_fkey
    FOREIGN KEY (liftor_campaign_id, business_id)
    REFERENCES public.outreach_campaigns(id, business_id) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
