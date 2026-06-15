-- Carren Estate Capital & Influence Command Layer
-- Extends relationship_intelligence_contacts with capital, philanthropy, deal flow,
-- media and social-signal mapping fields. Relationship-only — no product literature,
-- no solicitation, no client-money requests. Founder-only access preserved.

ALTER TABLE public.relationship_intelligence_contacts
  ADD COLUMN IF NOT EXISTS capital_lane text,
  ADD COLUMN IF NOT EXISTS capital_role text,
  ADD COLUMN IF NOT EXISTS money_signal text,
  ADD COLUMN IF NOT EXISTS relationship_angle text,
  ADD COLUMN IF NOT EXISTS best_vehicle text,
  ADD COLUMN IF NOT EXISTS conversation_posture text,
  ADD COLUMN IF NOT EXISTS outreach_status text,
  ADD COLUMN IF NOT EXISTS compliance_boundary text,
  ADD COLUMN IF NOT EXISTS source_platform text,
  ADD COLUMN IF NOT EXISTS source_evidence text,
  ADD COLUMN IF NOT EXISTS facebook_profile_url text,
  ADD COLUMN IF NOT EXISTS age_or_age_band text,
  ADD COLUMN IF NOT EXISTS hnw_signal_confidence text,
  ADD COLUMN IF NOT EXISTS philanthropy_cause_fit text,
  ADD COLUMN IF NOT EXISTS deal_relevance text,
  ADD COLUMN IF NOT EXISTS alignment_quality text,
  ADD COLUMN IF NOT EXISTS park_reason text,
  ADD COLUMN IF NOT EXISTS next_move_owner text,
  ADD COLUMN IF NOT EXISTS priority_notes text,
  ADD COLUMN IF NOT EXISTS private_capital_notes text,
  ADD COLUMN IF NOT EXISTS philanthropy_notes text,
  ADD COLUMN IF NOT EXISTS elite_context_notes text,
  ADD COLUMN IF NOT EXISTS disclosure_warning text;

COMMENT ON COLUMN public.relationship_intelligence_contacts.capital_lane IS
  'Carren Estate principal capital / GHAT philanthropy / elite advisory / deal flow / media / school soft power / parked. Relationship-only mapping.';
COMMENT ON COLUMN public.relationship_intelligence_contacts.compliance_boundary IS
  'Relationship-only. No product literature, no solicitation, no client-money request, founder-only.';

-- Indexes for new filter fields
CREATE INDEX IF NOT EXISTS idx_ric_capital_lane            ON public.relationship_intelligence_contacts (capital_lane);
CREATE INDEX IF NOT EXISTS idx_ric_capital_role            ON public.relationship_intelligence_contacts (capital_role);
CREATE INDEX IF NOT EXISTS idx_ric_best_vehicle            ON public.relationship_intelligence_contacts (best_vehicle);
CREATE INDEX IF NOT EXISTS idx_ric_outreach_status         ON public.relationship_intelligence_contacts (outreach_status);
CREATE INDEX IF NOT EXISTS idx_ric_source_platform         ON public.relationship_intelligence_contacts (source_platform);
CREATE INDEX IF NOT EXISTS idx_ric_hnw_signal_confidence   ON public.relationship_intelligence_contacts (hnw_signal_confidence);
CREATE INDEX IF NOT EXISTS idx_ric_philanthropy_cause_fit  ON public.relationship_intelligence_contacts (philanthropy_cause_fit);
CREATE INDEX IF NOT EXISTS idx_ric_deal_relevance          ON public.relationship_intelligence_contacts (deal_relevance);
CREATE INDEX IF NOT EXISTS idx_ric_alignment_quality       ON public.relationship_intelligence_contacts (alignment_quality);
CREATE INDEX IF NOT EXISTS idx_ric_next_move_owner         ON public.relationship_intelligence_contacts (next_move_owner);

-- Ensure RLS remains enabled (founder/admin-only policies already exist; do not weaken).
ALTER TABLE public.relationship_intelligence_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_intelligence_events   ENABLE ROW LEVEL SECURITY;
