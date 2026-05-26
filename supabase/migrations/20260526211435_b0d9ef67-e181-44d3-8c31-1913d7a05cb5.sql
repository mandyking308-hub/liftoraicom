
CREATE TABLE public.scheduling_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'other',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  availability_summary TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scheduling_resources TO authenticated;
GRANT ALL ON public.scheduling_resources TO service_role;
ALTER TABLE public.scheduling_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read resources" ON public.scheduling_resources FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write resources" ON public.scheduling_resources FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_scheduling_resources_updated BEFORE UPDATE ON public.scheduling_resources FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.availability_windows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  resource_id UUID NOT NULL,
  day_of_week SMALLINT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.availability_windows TO authenticated;
GRANT ALL ON public.availability_windows TO service_role;
ALTER TABLE public.availability_windows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read avail" ON public.availability_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write avail" ON public.availability_windows FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_availability_windows_updated BEFORE UPDATE ON public.availability_windows FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.booking_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  contact_id UUID,
  customer_id UUID,
  resource_id UUID,
  related_conversation_id UUID,
  booking_type TEXT NOT NULL DEFAULT 'other',
  booking_status TEXT NOT NULL DEFAULT 'draft',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  meeting_url TEXT,
  calendar_provider TEXT,
  provider_event_id TEXT,
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_records TO authenticated;
GRANT ALL ON public.booking_records TO service_role;
ALTER TABLE public.booking_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read bookings" ON public.booking_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bookings" ON public.booking_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_booking_records_updated BEFORE UPDATE ON public.booking_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.booking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  booking_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_events TO authenticated;
GRANT ALL ON public.booking_events TO service_role;
ALTER TABLE public.booking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read booking events" ON public.booking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write booking events" ON public.booking_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
