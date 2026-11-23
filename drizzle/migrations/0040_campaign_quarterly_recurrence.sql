CREATE TABLE public.campaign_recurrence_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  source_provider text NOT NULL DEFAULT 'smartlead',
  source_campaign_id text NOT NULL,
  campaign_name text NOT NULL,
  interval_months integer NOT NULL DEFAULT 3 CHECK (interval_months = 3),
  sequence_steps integer NOT NULL DEFAULT 4 CHECK (sequence_steps = 4),
  max_rounds integer NULL,
  auto_start boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  first_sent_at timestamptz NOT NULL,
  next_round_at timestamptz NOT NULL,
  rounds_completed integer NOT NULL DEFAULT 0,
  send_days integer NOT NULL DEFAULT 5,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider, source_campaign_id)
);
CREATE TABLE public.campaign_recurrence_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.campaign_recurrence_plans(id) ON DELETE CASCADE,
  business_id uuid NOT NULL,
  round_number integer NOT NULL,
  due_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','blocked','started','failed')),
  provider_campaign_id text,
  eligible_count integer NOT NULL DEFAULT 0,
  held_counts jsonb NOT NULL DEFAULT '{}'::jsonb,
  critical jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, round_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recurrence_plans TO authenticated;
GRANT SELECT ON public.campaign_recurrence_rounds TO authenticated;
GRANT ALL ON public.campaign_recurrence_plans TO service_role;
GRANT ALL ON public.campaign_recurrence_rounds TO service_role;
ALTER TABLE public.campaign_recurrence_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_recurrence_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder/admin manage recurrence plans" ON public.campaign_recurrence_plans FOR ALL TO authenticated
  USING (public.is_founder_or_admin(auth.uid())) WITH CHECK (public.is_founder_or_admin(auth.uid()));
CREATE POLICY "Founder/admin read recurrence rounds" ON public.campaign_recurrence_rounds FOR SELECT TO authenticated
  USING (public.is_founder_or_admin(auth.uid()));