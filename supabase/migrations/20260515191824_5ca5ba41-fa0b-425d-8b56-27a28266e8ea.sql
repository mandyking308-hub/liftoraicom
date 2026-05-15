CREATE TABLE public.meeting_call_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  organisation_id uuid,
  calendar_event_id text,
  meeting_title text NOT NULL,
  meeting_type text,
  meeting_status text NOT NULL DEFAULT 'draft',
  meeting_at timestamptz,
  attendees jsonb NOT NULL DEFAULT '[]'::jsonb,
  summary text,
  transcript text,
  decisions jsonb NOT NULL DEFAULT '[]'::jsonb,
  commitments jsonb NOT NULL DEFAULT '[]'::jsonb,
  followups jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_call_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting call records"
ON public.meeting_call_records
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_meeting_call_records_updated_at
BEFORE UPDATE ON public.meeting_call_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.meeting_action_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid REFERENCES public.meeting_call_records(id) ON DELETE CASCADE,
  business_id uuid,
  contact_id uuid,
  action_title text NOT NULL,
  action_owner text,
  owner_agent_key text,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  founder_review_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage meeting action items"
ON public.meeting_action_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_meeting_action_items_updated_at
BEFORE UPDATE ON public.meeting_action_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_mcr_business ON public.meeting_call_records(business_id);
CREATE INDEX idx_mcr_contact ON public.meeting_call_records(contact_id);
CREATE INDEX idx_mcr_meeting_at ON public.meeting_call_records(meeting_at);
CREATE INDEX idx_mai_meeting ON public.meeting_action_items(meeting_id);
CREATE INDEX idx_mai_due ON public.meeting_action_items(due_at);
CREATE INDEX idx_mai_status ON public.meeting_action_items(status);