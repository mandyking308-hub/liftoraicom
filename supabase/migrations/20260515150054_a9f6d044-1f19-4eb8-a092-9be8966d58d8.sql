-- ============================================================
-- GLOBAL MARKET PROFILES
-- ============================================================
CREATE TABLE public.global_market_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  market_key text NOT NULL UNIQUE,
  market_name text NOT NULL,
  country_code text,
  region text,
  default_timezone text NOT NULL,
  business_days jsonb NOT NULL DEFAULT '["monday","tuesday","wednesday","thursday","friday"]'::jsonb,
  business_start_time time NOT NULL DEFAULT '09:00',
  business_end_time time NOT NULL DEFAULT '17:00',
  quiet_hours_start time NOT NULL DEFAULT '20:00',
  quiet_hours_end time NOT NULL DEFAULT '08:00',
  observes_public_holidays boolean NOT NULL DEFAULT true,
  language_defaults jsonb NOT NULL DEFAULT '[]'::jsonb,
  compliance_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.global_market_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view global markets"
  ON public.global_market_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins manage global markets"
  ON public.global_market_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_global_market_profiles_updated_at
  BEFORE UPDATE ON public.global_market_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.global_market_profiles
  (market_key, market_name, country_code, region, default_timezone, language_defaults)
VALUES
  ('uk',           'United Kingdom',    'GB', 'Europe',        'Europe/London',          '["en-GB"]'::jsonb),
  ('us_eastern',   'US Eastern',        'US', 'North America', 'America/New_York',       '["en-US"]'::jsonb),
  ('us_central',   'US Central',        'US', 'North America', 'America/Chicago',        '["en-US"]'::jsonb),
  ('us_pacific',   'US Pacific',        'US', 'North America', 'America/Los_Angeles',    '["en-US"]'::jsonb),
  ('uae',          'United Arab Emirates','AE','Middle East', 'Asia/Dubai',             '["en","ar"]'::jsonb),
  ('eu_central',   'EU Central',        'FR', 'Europe',        'Europe/Paris',           '["fr","de","en"]'::jsonb),
  ('cyprus',       'Cyprus',            'CY', 'Europe',        'Asia/Nicosia',           '["el","en"]'::jsonb),
  ('india',        'India',             'IN', 'Asia',          'Asia/Kolkata',           '["en-IN","hi"]'::jsonb),
  ('au_eastern',   'Australia Eastern', 'AU', 'Oceania',       'Australia/Sydney',       '["en-AU"]'::jsonb),
  ('ca_eastern',   'Canada Eastern',    'CA', 'North America', 'America/Toronto',        '["en-CA","fr-CA"]'::jsonb),
  ('singapore',    'Singapore',         'SG', 'Asia',          'Asia/Singapore',         '["en-SG"]'::jsonb),
  ('japan',        'Japan',             'JP', 'Asia',          'Asia/Tokyo',             '["ja","en"]'::jsonb);

-- ============================================================
-- CONTACT TIMEZONE PROFILES
-- ============================================================
CREATE TABLE public.contact_timezone_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.contacts(id) ON DELETE CASCADE,
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  detected_timezone text,
  detected_country text,
  detected_region text,
  detection_source text,
  confidence numeric NOT NULL DEFAULT 0,
  local_business_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  best_contact_windows jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_resolved_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, business_id)
);

CREATE INDEX idx_contact_tz_business ON public.contact_timezone_profiles (business_id);
CREATE INDEX idx_contact_tz_tz ON public.contact_timezone_profiles (detected_timezone);

ALTER TABLE public.contact_timezone_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view contact tz"
  ON public.contact_timezone_profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins manage contact tz"
  ON public.contact_timezone_profiles FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contact_timezone_profiles_updated_at
  BEFORE UPDATE ON public.contact_timezone_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FOUNDER BRIEF WINDOWS
-- ============================================================
CREATE TABLE public.founder_brief_windows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_key text NOT NULL UNIQUE,
  brief_label text NOT NULL,
  timezone text NOT NULL,
  scheduled_time time NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  scope text NOT NULL DEFAULT 'portfolio',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.founder_brief_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view brief windows"
  ON public.founder_brief_windows FOR SELECT
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Founders/admins manage brief windows"
  ON public.founder_brief_windows FOR ALL
  USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_founder_brief_windows_updated_at
  BEFORE UPDATE ON public.founder_brief_windows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.founder_brief_windows
  (brief_key, brief_label, timezone, scheduled_time, enabled, scope)
VALUES
  ('london_morning_brief',     'London Morning Brief',     'Europe/London',      '07:30', false, 'portfolio'),
  ('london_evening_brief',     'London Evening Brief',     'Europe/London',      '18:30', false, 'portfolio'),
  ('us_market_brief',          'US Market Brief',          'America/New_York',   '09:00', false, 'us'),
  ('asia_market_brief',        'Asia Market Brief',        'Asia/Singapore',     '09:00', false, 'asia'),
  ('portfolio_overnight_brief','Portfolio Overnight Brief','Europe/London',      '23:30', false, 'portfolio');