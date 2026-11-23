ALTER TABLE public.smartlead_sync_schedule DROP CONSTRAINT IF EXISTS smartlead_sync_schedule_id_check;
ALTER TABLE public.smartlead_sync_schedule ADD CONSTRAINT smartlead_sync_schedule_id_check CHECK (id IN (1,2));
ALTER TABLE public.smartlead_sync_schedule ADD CONSTRAINT smartlead_sync_schedule_token_key UNIQUE (token);
INSERT INTO public.smartlead_sync_schedule (id, business_id, provider_campaign_id, enabled)
VALUES (2, '640de582-a112-4d16-a221-03c27f00c6ec', '4664652', true) ON CONFLICT (id) DO NOTHING;