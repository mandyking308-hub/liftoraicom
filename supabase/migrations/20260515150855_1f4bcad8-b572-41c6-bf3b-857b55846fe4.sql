
-- Jurisdiction policy profiles
CREATE TABLE public.jurisdiction_policy_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jurisdiction_code text NOT NULL,
  jurisdiction_name text NOT NULL,
  region text,
  policy_area text NOT NULL,
  business_type text,
  channel_key text,
  contact_type text,
  action_type text NOT NULL,
  policy_status text NOT NULL DEFAULT 'guidance',
  allowed boolean NOT NULL DEFAULT false,
  founder_review_required boolean NOT NULL DEFAULT true,
  legal_review_recommended boolean NOT NULL DEFAULT true,
  required_disclosures jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_suppression_checks jsonb NOT NULL DEFAULT '[]'::jsonb,
  retention_notes text,
  consent_notes text,
  risk_level text NOT NULL DEFAULT 'medium',
  source_notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_policy_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read jurisdiction policies"
ON public.jurisdiction_policy_profiles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founder/admin manage jurisdiction policies"
ON public.jurisdiction_policy_profiles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_jpp_lookup ON public.jurisdiction_policy_profiles(jurisdiction_code, action_type);

CREATE TRIGGER update_jpp_updated_at
BEFORE UPDATE ON public.jurisdiction_policy_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jurisdiction review queue
CREATE TABLE public.jurisdiction_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  action_type text NOT NULL,
  jurisdiction_code text,
  channel_key text,
  risk_level text NOT NULL DEFAULT 'medium',
  review_reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  founder_review_required boolean NOT NULL DEFAULT true,
  legal_review_recommended boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.jurisdiction_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin read jurisdiction review queue"
ON public.jurisdiction_review_queue FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Founder/admin manage jurisdiction review queue"
ON public.jurisdiction_review_queue FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'founder'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_jrq_updated_at
BEFORE UPDATE ON public.jurisdiction_review_queue
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed starter policies
INSERT INTO public.jurisdiction_policy_profiles
(jurisdiction_code, jurisdiction_name, region, policy_area, action_type, allowed, founder_review_required, legal_review_recommended, required_disclosures, required_suppression_checks, risk_level, consent_notes, retention_notes, source_notes)
VALUES
-- UK
('UK','United Kingdom','Europe','data_protection','cold_b2b_email', true, true, true,
 '["sender_identity","physical_address","unsubscribe_link"]'::jsonb,
 '["internal_suppression","unsubscribe_list"]'::jsonb,
 'medium','PECR/UK GDPR: B2B corporate addresses permitted with soft-opt-out logic; sole traders/partnerships treated as individuals.',
 'Retain records of consent and suppression indefinitely while contact is active.',
 'Operational guidance only. Confirm with legal counsel.'),
('UK','United Kingdom','Europe','data_protection','warm_customer_email', true, true, false,
 '["sender_identity","unsubscribe_link"]'::jsonb,'["unsubscribe_list"]'::jsonb,'low',null,null,null),
('UK','United Kingdom','Europe','consumer_protection','marketing_followup', false, true, true,
 '["sender_identity","unsubscribe_link","prior_relationship_basis"]'::jsonb,
 '["unsubscribe_list","ico_tps_check"]'::jsonb,'high','PECR consent required for B2C marketing.',null,null),
-- EU GDPR
('EU','European Union (GDPR)','Europe','data_protection','cold_b2b_email', false, true, true,
 '["sender_identity","physical_address","unsubscribe_link","gdpr_lawful_basis"]'::jsonb,
 '["internal_suppression","unsubscribe_list"]'::jsonb,'high',
 'GDPR + ePrivacy: prior consent generally required; legitimate interest assessment for B2B varies by member state.',
 'Document lawful basis; retain consent evidence.',
 'Operational guidance only.'),
('EU','European Union (GDPR)','Europe','data_protection','warm_customer_email', true, true, true,
 '["sender_identity","unsubscribe_link"]'::jsonb,'["unsubscribe_list"]'::jsonb,'medium',null,null,null),
('EU','European Union (GDPR)','Europe','data_protection','data_retention', false, true, true,
 '[]'::jsonb,'[]'::jsonb,'high','GDPR storage limitation principle applies.','Define and document retention periods per category.',null),
-- US
('US','United States','North America','consumer_protection','cold_b2b_email', true, true, true,
 '["sender_identity","physical_address","unsubscribe_link"]'::jsonb,
 '["unsubscribe_list","internal_suppression"]'::jsonb,'medium',
 'CAN-SPAM Act: clear identification, valid postal address, functional opt-out within 10 business days.',
 'Honor opt-outs within 10 business days; retain suppression list.',null),
('US','United States','North America','consumer_protection','marketing_followup', true, true, true,
 '["sender_identity","physical_address","unsubscribe_link"]'::jsonb,
 '["unsubscribe_list","state_suppression_lists"]'::jsonb,'medium','State variations (CCPA/CPRA, etc.) apply.',null,null),
-- UAE
('UAE','United Arab Emirates','Middle East','data_protection','cold_b2b_email', false, true, true,
 '["sender_identity","unsubscribe_link","prior_consent_basis"]'::jsonb,
 '["unsubscribe_list","internal_suppression"]'::jsonb,'high',
 'Federal Decree-Law 45 of 2021 (PDPL) and TDRA spam regulations: prior consent typically required.',null,null),
-- Canada
('CA','Canada','North America','consumer_protection','cold_b2b_email', false, true, true,
 '["sender_identity","physical_address","unsubscribe_link","casl_basis"]'::jsonb,
 '["unsubscribe_list","internal_suppression"]'::jsonb,'high',
 'CASL: express or implied consent required; B2B exemption is narrow.',
 'Retain consent evidence for 3 years post last contact.',null),
-- Australia
('AU','Australia','Oceania','consumer_protection','cold_b2b_email', true, true, true,
 '["sender_identity","unsubscribe_link","contact_details"]'::jsonb,
 '["unsubscribe_list"]'::jsonb,'medium',
 'Spam Act 2003: consent (express/inferred) required; B2B addresses with conspicuous publication may be permitted.',
 'Honor unsubscribe within 5 business days.',null),
-- Global unknown
('XX','Global / Unknown',null,'global_default','cold_b2b_email', false, true, true,
 '["sender_identity","unsubscribe_link"]'::jsonb,
 '["unsubscribe_list","internal_suppression"]'::jsonb,'critical',
 'Jurisdiction unknown — block by default and require founder review.',null,
 'Default conservative posture for unknown jurisdictions.'),
('XX','Global / Unknown',null,'global_default','warm_customer_email', false, true, true,
 '["sender_identity","unsubscribe_link"]'::jsonb,'["unsubscribe_list"]'::jsonb,'high',null,null,null),
('XX','Global / Unknown',null,'global_default','proposal_send', false, true, true,'[]'::jsonb,'[]'::jsonb,'high',null,null,null),
('XX','Global / Unknown',null,'global_default','invoice_send', false, true, true,'[]'::jsonb,'[]'::jsonb,'high',null,null,null),
('XX','Global / Unknown',null,'global_default','ai_generated_reply', false, true, true,'[]'::jsonb,'[]'::jsonb,'high','All AI replies require founder review until policy is set.',null,null),
('XX','Global / Unknown',null,'global_default','multilingual_reply', false, true, true,'[]'::jsonb,'[]'::jsonb,'high',null,null,null),
('XX','Global / Unknown',null,'sensitive_sector','donor_outreach', false, true, true,'[]'::jsonb,'[]'::jsonb,'critical','Charity/donor regulations vary; legal review required.',null,null),
('XX','Global / Unknown',null,'sensitive_sector','property_investment_message', false, true, true,'[]'::jsonb,'[]'::jsonb,'critical','Financial promotion rules apply (e.g., FCA in UK, SEC in US).',null,null),
('XX','Global / Unknown',null,'sensitive_sector','health_related_message', false, true, true,'[]'::jsonb,'[]'::jsonb,'critical','HIPAA / health advertising rules likely apply.',null,null),
('XX','Global / Unknown',null,'sensitive_sector','education_child_related_message', false, true, true,'[]'::jsonb,'[]'::jsonb,'critical','COPPA / safeguarding rules likely apply.',null,null),
('XX','Global / Unknown',null,'global_default','unsubscribe_processing', true, false, false,
 '[]'::jsonb,'["unsubscribe_list"]'::jsonb,'low','Always honor unsubscribe immediately.',null,null),
('XX','Global / Unknown',null,'global_default','data_retention', false, true, true,'[]'::jsonb,'[]'::jsonb,'high','Define retention period per jurisdiction.',null,null);
