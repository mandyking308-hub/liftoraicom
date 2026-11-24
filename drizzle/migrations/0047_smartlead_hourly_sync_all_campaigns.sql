ALTER TABLE public.smartlead_sync_schedule DROP CONSTRAINT smartlead_sync_schedule_id_check;
ALTER TABLE public.smartlead_sync_schedule ADD CONSTRAINT smartlead_sync_schedule_id_check CHECK (id > 0);
CREATE SEQUENCE IF NOT EXISTS public.smartlead_sync_schedule_id_seq OWNED BY public.smartlead_sync_schedule.id;
SELECT setval('public.smartlead_sync_schedule_id_seq', (SELECT COALESCE(max(id),1) FROM public.smartlead_sync_schedule));
ALTER TABLE public.smartlead_sync_schedule ALTER COLUMN id SET DEFAULT nextval('public.smartlead_sync_schedule_id_seq');
CREATE UNIQUE INDEX IF NOT EXISTS smartlead_sync_schedule_scope_uq ON public.smartlead_sync_schedule(business_id, provider_campaign_id);

CREATE OR REPLACE FUNCTION public.smartlead_ensure_sync_schedule()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.provider_type = 'smartlead' AND NEW.mapping_status = 'mapped'
     AND NEW.business_id IS NOT NULL AND NEW.provider_campaign_id ~ '^\d{1,12}$' THEN
    INSERT INTO public.smartlead_sync_schedule(business_id, provider_campaign_id)
    VALUES (NEW.business_id, NEW.provider_campaign_id)
    ON CONFLICT (business_id, provider_campaign_id) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.smartlead_ensure_sync_schedule() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_smartlead_ensure_sync_schedule ON public.outbound_provider_campaign_mappings;
CREATE TRIGGER trg_smartlead_ensure_sync_schedule
AFTER INSERT OR UPDATE OF mapping_status, provider_campaign_id ON public.outbound_provider_campaign_mappings
FOR EACH ROW EXECUTE FUNCTION public.smartlead_ensure_sync_schedule();