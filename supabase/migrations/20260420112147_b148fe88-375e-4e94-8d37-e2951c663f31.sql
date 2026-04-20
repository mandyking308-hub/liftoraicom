-- ============================================================
-- 1. ENUMS
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.lead_validation_status AS ENUM ('valid', 'invalid', 'duplicate');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.outreach_campaign_status AS ENUM ('active', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.email_queue_status AS ENUM ('pending', 'sent', 'failed', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add 'replied' to email_event_type if missing (already exists per schema, safe-guard)
DO $$ BEGIN
  ALTER TYPE public.email_event_type ADD VALUE IF NOT EXISTS 'replied';
EXCEPTION WHEN others THEN NULL; END $$;

-- ============================================================
-- 2. TABLES
-- ============================================================

-- Import batches
CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  source_name text NOT NULL DEFAULT '',
  file_name text NOT NULL DEFAULT '',
  total_rows integer NOT NULL DEFAULT 0,
  valid_rows integer NOT NULL DEFAULT 0,
  invalid_rows integer NOT NULL DEFAULT 0,
  duplicate_rows integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage import batches" ON public.import_batches;
CREATE POLICY "Founders can manage import batches" ON public.import_batches
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- Imported leads
CREATE TABLE IF NOT EXISTS public.imported_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.import_batches(id) ON DELETE CASCADE,
  email text NOT NULL DEFAULT '',
  name text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  country text NOT NULL DEFAULT '',
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation_status public.lead_validation_status NOT NULL DEFAULT 'valid',
  processed boolean NOT NULL DEFAULT false,
  contact_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_imported_leads_batch ON public.imported_leads(batch_id);
CREATE INDEX IF NOT EXISTS idx_imported_leads_email ON public.imported_leads(lower(email));

ALTER TABLE public.imported_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage imported leads" ON public.imported_leads;
CREATE POLICY "Founders can manage imported leads" ON public.imported_leads
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- Lead scores
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 40 CHECK (score >= 0 AND score <= 100),
  reason text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id)
);

ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage lead scores" ON public.lead_scores;
CREATE POLICY "Founders can manage lead scores" ON public.lead_scores
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER trg_lead_scores_updated_at
BEFORE UPDATE ON public.lead_scores
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outreach campaigns
CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL DEFAULT '',
  campaign_name text NOT NULL,
  status public.outreach_campaign_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage outreach campaigns" ON public.outreach_campaigns;
CREATE POLICY "Founders can manage outreach campaigns" ON public.outreach_campaigns
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

CREATE TRIGGER trg_outreach_campaigns_updated_at
BEFORE UPDATE ON public.outreach_campaigns
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Outreach sequences
CREATE TABLE IF NOT EXISTS public.outreach_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  step_number integer NOT NULL CHECK (step_number BETWEEN 1 AND 4),
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  delay_days integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, step_number)
);

ALTER TABLE public.outreach_sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage outreach sequences" ON public.outreach_sequences;
CREATE POLICY "Founders can manage outreach sequences" ON public.outreach_sequences
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- Email queue
CREATE TABLE IF NOT EXISTS public.email_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  sequence_step integer NOT NULL,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  status public.email_queue_status NOT NULL DEFAULT 'pending',
  inbox_id uuid REFERENCES public.inboxes(id) ON DELETE SET NULL,
  business_name text NOT NULL DEFAULT '',
  block_reason text NOT NULL DEFAULT '',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, campaign_id, sequence_step)
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status_sched ON public.email_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_queue_contact ON public.email_queue(contact_id);

ALTER TABLE public.email_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage email queue" ON public.email_queue;
CREATE POLICY "Founders can manage email queue" ON public.email_queue
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- Campaign metrics
CREATE TABLE IF NOT EXISTS public.campaign_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.outreach_campaigns(id) ON DELETE CASCADE,
  total_sent integer NOT NULL DEFAULT 0,
  total_opens integer NOT NULL DEFAULT 0,
  total_replies integer NOT NULL DEFAULT 0,
  total_bounces integer NOT NULL DEFAULT 0,
  bounce_rate numeric NOT NULL DEFAULT 0,
  reply_rate numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (campaign_id)
);

ALTER TABLE public.campaign_metrics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Founders can manage campaign metrics" ON public.campaign_metrics;
CREATE POLICY "Founders can manage campaign metrics" ON public.campaign_metrics
  FOR ALL USING (has_role(auth.uid(), 'founder'::app_role))
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- ============================================================
-- 3. SCORING
-- ============================================================
CREATE OR REPLACE FUNCTION public.score_contact(_contact_id uuid, _business_name text DEFAULT NULL)
RETURNS public.lead_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contacts%ROWTYPE;
  s integer := 40;
  reasons text[] := ARRAY[]::text[];
  result public.lead_scores;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF COALESCE(c.role, '') <> '' THEN s := s + 20; reasons := array_append(reasons, 'has role'); END IF;
  IF COALESCE(c.company, '') <> '' THEN s := s + 20; reasons := array_append(reasons, 'has company'); END IF;
  IF _business_name IS NOT NULL AND COALESCE(c.assigned_business, '') = _business_name THEN
    s := s + 20; reasons := array_append(reasons, 'business match');
  END IF;
  IF s > 100 THEN s := 100; END IF;

  INSERT INTO public.lead_scores (contact_id, score, reason)
  VALUES (_contact_id, s, array_to_string(reasons, ', '))
  ON CONFLICT (contact_id) DO UPDATE
    SET score = EXCLUDED.score,
        reason = EXCLUDED.reason,
        updated_at = now()
  RETURNING * INTO result;

  RETURN result;
END;
$$;

-- ============================================================
-- 4. INBOX ASSIGNMENT
-- ============================================================
CREATE OR REPLACE FUNCTION public.assign_inbox_for_contact(_contact_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.contacts%ROWTYPE;
  picked_inbox_id uuid;
BEGIN
  SELECT * INTO c FROM public.contacts WHERE id = _contact_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF c.assigned_inbox_id IS NOT NULL THEN
    RETURN c.assigned_inbox_id;
  END IF;

  SELECT id INTO picked_inbox_id
    FROM public.inboxes
   WHERE active = true
     AND (c.assigned_business = '' OR business_name = c.assigned_business)
     AND current_send_count < daily_send_limit
   ORDER BY current_send_count ASC, created_at ASC
   LIMIT 1;

  IF picked_inbox_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.contacts SET assigned_inbox_id = picked_inbox_id, updated_at = now()
   WHERE id = _contact_id;

  RETURN picked_inbox_id;
END;
$$;

-- ============================================================
-- 5. INBOX COUNTER (increments when queue row is marked sent)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bump_inbox_send_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sent' AND (OLD.status IS DISTINCT FROM 'sent') AND NEW.inbox_id IS NOT NULL THEN
    UPDATE public.inboxes
       SET current_send_count = current_send_count + 1,
           updated_at = now()
     WHERE id = NEW.inbox_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_queue_bump_inbox ON public.email_queue;
CREATE TRIGGER trg_email_queue_bump_inbox
AFTER UPDATE OF status ON public.email_queue
FOR EACH ROW EXECUTE FUNCTION public.bump_inbox_send_count();

-- Daily reset of inbox counters
CREATE OR REPLACE FUNCTION public.reset_inbox_send_counts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.inboxes SET current_send_count = 0, updated_at = now()
   WHERE current_send_count > 0;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ============================================================
-- 6. CAMPAIGN METRICS RECOMPUTE
-- ============================================================
CREATE OR REPLACE FUNCTION public.recompute_campaign_metrics(_campaign_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sent integer; v_replies integer; v_bounces integer; v_opens integer;
BEGIN
  SELECT COUNT(*) INTO v_sent FROM public.email_queue WHERE campaign_id = _campaign_id AND status = 'sent';

  SELECT COUNT(*) INTO v_replies
    FROM public.email_events ee
    JOIN public.email_queue eq ON eq.contact_id = ee.contact_id
   WHERE eq.campaign_id = _campaign_id AND ee.event_type = 'replied';

  SELECT COUNT(*) INTO v_bounces
    FROM public.email_events ee
    JOIN public.email_queue eq ON eq.contact_id = ee.contact_id
   WHERE eq.campaign_id = _campaign_id AND ee.event_type = 'bounced';

  SELECT COUNT(*) INTO v_opens
    FROM public.email_events ee
    JOIN public.email_queue eq ON eq.contact_id = ee.contact_id
   WHERE eq.campaign_id = _campaign_id AND ee.event_type = 'opened';

  INSERT INTO public.campaign_metrics (campaign_id, total_sent, total_opens, total_replies, total_bounces, bounce_rate, reply_rate)
  VALUES (
    _campaign_id, v_sent, v_opens, v_replies, v_bounces,
    CASE WHEN v_sent > 0 THEN ROUND((v_bounces::numeric / v_sent) * 100, 2) ELSE 0 END,
    CASE WHEN v_sent > 0 THEN ROUND((v_replies::numeric / v_sent) * 100, 2) ELSE 0 END
  )
  ON CONFLICT (campaign_id) DO UPDATE
    SET total_sent = EXCLUDED.total_sent,
        total_opens = EXCLUDED.total_opens,
        total_replies = EXCLUDED.total_replies,
        total_bounces = EXCLUDED.total_bounces,
        bounce_rate = EXCLUDED.bounce_rate,
        reply_rate = EXCLUDED.reply_rate,
        updated_at = now();
END;
$$;

-- ============================================================
-- 7. CRON: daily inbox counter reset at 00:00 UTC
-- ============================================================
DO $$ BEGIN
  PERFORM cron.unschedule('reset-inbox-send-counts-daily');
EXCEPTION WHEN others THEN NULL; END $$;

SELECT cron.schedule(
  'reset-inbox-send-counts-daily',
  '0 0 * * *',
  $$ SELECT public.reset_inbox_send_counts(); $$
);