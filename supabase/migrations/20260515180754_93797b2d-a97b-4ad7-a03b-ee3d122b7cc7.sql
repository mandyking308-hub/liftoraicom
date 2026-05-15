
-- prospecting_source_registry
CREATE TABLE IF NOT EXISTS public.prospecting_source_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key text NOT NULL UNIQUE,
  source_name text NOT NULL,
  source_type text NOT NULL,
  enabled boolean DEFAULT false,
  requires_credentials boolean DEFAULT false,
  credentials_present boolean DEFAULT false,
  external_api boolean DEFAULT false,
  credit_spend_risk boolean DEFAULT false,
  allowed_without_founder_approval boolean DEFAULT false,
  notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.prospecting_source_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage prospecting_source_registry" ON public.prospecting_source_registry
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_psr_updated BEFORE UPDATE ON public.prospecting_source_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- prospecting_search_jobs
CREATE TABLE IF NOT EXISTS public.prospecting_search_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  job_name text NOT NULL,
  search_goal text NOT NULL,
  target_market text,
  target_customer_type text,
  target_geography jsonb DEFAULT '[]'::jsonb,
  target_industries jsonb DEFAULT '[]'::jsonb,
  source_keys jsonb DEFAULT '[]'::jsonb,
  search_status text DEFAULT 'draft',
  founder_brief text,
  max_results integer DEFAULT 100,
  credit_spend_allowed boolean DEFAULT false,
  external_search_allowed boolean DEFAULT false,
  founder_approval_required boolean DEFAULT true,
  created_by_agent_key text DEFAULT 'prospecting_agent',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.prospecting_search_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage prospecting_search_jobs" ON public.prospecting_search_jobs
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_psj_updated BEFORE UPDATE ON public.prospecting_search_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_psj_business ON public.prospecting_search_jobs(business_id);

-- strategic_target_accounts
CREATE TABLE IF NOT EXISTS public.strategic_target_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  prospecting_job_id uuid REFERENCES public.prospecting_search_jobs(id) ON DELETE SET NULL,
  account_name text NOT NULL,
  account_domain text,
  website_url text,
  industry text,
  geography text,
  company_size text,
  account_type text,
  target_persona text,
  known_contact_name text,
  known_contact_title text,
  known_contact_email text,
  linkedin_url text,
  source_key text,
  source_notes text,
  crm_match_status text DEFAULT 'not_checked',
  existing_contact_id uuid,
  existing_organisation_id uuid,
  duplicate_risk boolean DEFAULT false,
  do_not_contact_risk boolean DEFAULT false,
  compliance_risk text,
  strategic_value_score numeric,
  icp_fit_score numeric,
  urgency_score numeric,
  accessibility_score numeric,
  relationship_score numeric,
  revenue_potential_score numeric,
  overall_priority_score numeric,
  recommended_channel text,
  recommended_next_action text,
  ranking_reason text,
  founder_review_required boolean DEFAULT true,
  approval_status text DEFAULT 'pending',
  promoted_to_crm boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.strategic_target_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage strategic_target_accounts" ON public.strategic_target_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_sta_updated BEFORE UPDATE ON public.strategic_target_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_sta_business ON public.strategic_target_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_sta_priority ON public.strategic_target_accounts(overall_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_sta_approval ON public.strategic_target_accounts(approval_status);

-- prospect_ranking_models
CREATE TABLE IF NOT EXISTS public.prospect_ranking_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  model_key text NOT NULL,
  model_name text NOT NULL,
  model_status text DEFAULT 'active',
  scoring_weights jsonb DEFAULT '{}'::jsonb,
  qualification_rules jsonb DEFAULT '[]'::jsonb,
  exclusion_rules jsonb DEFAULT '[]'::jsonb,
  preferred_channels jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.prospect_ranking_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage prospect_ranking_models" ON public.prospect_ranking_models
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_prm_updated BEFORE UPDATE ON public.prospect_ranking_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE UNIQUE INDEX IF NOT EXISTS idx_prm_key_biz ON public.prospect_ranking_models(model_key, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- strategic_account_lists
CREATE TABLE IF NOT EXISTS public.strategic_account_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  list_name text NOT NULL,
  list_type text NOT NULL,
  list_status text DEFAULT 'draft',
  target_count integer DEFAULT 0,
  strategy_summary text,
  founder_review_required boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE public.strategic_account_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage strategic_account_lists" ON public.strategic_account_lists
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_sal_updated BEFORE UPDATE ON public.strategic_account_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.strategic_account_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid REFERENCES public.strategic_account_lists(id) ON DELETE CASCADE,
  target_account_id uuid REFERENCES public.strategic_target_accounts(id) ON DELETE CASCADE,
  rank_order integer,
  priority_score numeric,
  reason text,
  recommended_channel text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.strategic_account_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage strategic_account_list_items" ON public.strategic_account_list_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE INDEX IF NOT EXISTS idx_sali_list ON public.strategic_account_list_items(list_id);

-- Seed prospecting_source_registry
INSERT INTO public.prospecting_source_registry (source_key, source_name, source_type, enabled, requires_credentials, external_api, credit_spend_risk) VALUES
  ('manual_import','Manual import','internal', true, false, false, false),
  ('apollo_existing_pool','Apollo existing pool','internal', true, false, false, false),
  ('apollo_new_search','Apollo new search','external', false, true, true, true),
  ('website_research','Website research','external', false, false, true, false),
  ('google_search_provider','Google search provider','external', false, true, true, true),
  ('linkedin_manual_research','LinkedIn manual research','manual', false, false, false, false),
  ('social_profile_research','Social profile research','manual', false, false, false, false),
  ('company_website','Company website','manual', false, false, false, false),
  ('competitor_customer_research','Competitor customer research','manual', false, false, false, false),
  ('event_attendee_list','Event attendee list','internal', false, false, false, false),
  ('partner_intro_list','Partner intro list','internal', false, false, false, false),
  ('press_media_lists','Press / media lists','internal', false, false, false, false),
  ('playlist_curator_lists','Playlist curator lists','internal', false, false, false, false),
  ('creator_lists','Creator lists','internal', false, false, false, false),
  ('directory_research','Directory research','manual', false, false, false, false),
  ('founder_notes','Founder notes','internal', true, false, false, false)
ON CONFLICT (source_key) DO NOTHING;

-- Seed default ranking model
INSERT INTO public.prospect_ranking_models (model_key, model_name, model_status, scoring_weights, preferred_channels, notes) VALUES
  ('default_v1','Default Strategic Ranking v1','active',
   '{"icp_fit_score":25,"strategic_value_score":20,"revenue_potential_score":20,"accessibility_score":10,"relationship_score":10,"urgency_score":10,"compliance_safety_score":5}'::jsonb,
   '["smartlead","manual","social","partner_intro","content_campaign"]'::jsonb,
   'Founder-approved baseline. Used when no business-specific model exists.')
ON CONFLICT DO NOTHING;

-- Neon Candy preset jobs
INSERT INTO public.prospecting_search_jobs (business_id, job_name, search_goal, target_market, target_customer_type, target_industries, source_keys, search_status, founder_brief, metadata)
SELECT b.id, 'Playlist curators', 'Identify Spotify/Apple playlist curators for synth/electronic/dance', 'Music', 'playlist_curator',
       '["music","entertainment"]'::jsonb,
       '["manual_import","playlist_curator_lists","social_profile_research","linkedin_manual_research"]'::jsonb,
       'draft','Find independent playlist curators in synth/electronic/dance genres. Manual research only — no scraping.',
       '{"preset":"neon_candy","recommended_channel":"social"}'::jsonb
FROM public.businesses b WHERE b.name = 'Neon Candy'
ON CONFLICT DO NOTHING;

INSERT INTO public.prospecting_search_jobs (business_id, job_name, search_goal, target_market, target_customer_type, target_industries, source_keys, search_status, founder_brief, metadata)
SELECT b.id, preset.job_name, preset.search_goal, 'Music / Creator', preset.customer_type,
       '["music","entertainment","content_creation"]'::jsonb,
       '["manual_import","creator_lists","social_profile_research"]'::jsonb,
       'draft', preset.brief,
       jsonb_build_object('preset','neon_candy','recommended_channel', preset.channel)
FROM public.businesses b
CROSS JOIN (VALUES
  ('DJs','Identify DJs who could play / share Neon Candy tracks','dj','Find independent DJs aligned with the Neon Candy sound.','social'),
  ('Music bloggers','Identify music bloggers who cover indie electronic music','media_press','Music bloggers covering electronic / synth / indie. Manual outreach.','manual'),
  ('Music media editors','Identify editors at music media outlets','media_press','Music media editors who cover emerging electronic artists.','manual'),
  ('AI music & video creators','Find creators using AI tooling for music & video','creator','Creators experimenting with AI music/video tooling.','social'),
  ('Instagram & TikTok music creators','Identify short-form creators in music niches','creator','Instagram/TikTok creators with music-led content.','social'),
  ('YouTube Shorts music discovery channels','Identify YT Shorts music discovery channels','creator','Discovery channels surfacing new electronic tracks.','social'),
  ('Brand & collaboration partners','Identify brand collaboration partners','partner','Brands aligned with the Neon Candy aesthetic and audience.','founder_intro'),
  ('Digital art & music communities','Identify digital art & music communities','creator','Communities at the intersection of digital art and electronic music.','manual'),
  ('Sync & licensing prospects','Identify sync/licensing prospects (later stage)','strategic_account','Sync agencies and licensing supervisors. Manual founder review only.','manual')
) AS preset(job_name, search_goal, customer_type, brief, channel)
WHERE b.name = 'Neon Candy'
ON CONFLICT DO NOTHING;

-- Prospecting agent
INSERT INTO public.ai_agent_roles
  (agent_key, agent_name, agent_category, description, primary_module, default_status,
   can_read_crm, can_read_conversations, can_read_finance, can_read_suppliers,
   can_call_external_providers, can_mutate_operational_data, can_send_email,
   can_create_proposals, can_create_deals, can_create_invoices,
   founder_approval_required, auto_action_allowed, risk_level, guardrails)
VALUES (
  'prospecting_agent','Strategic Prospecting Agent','growth',
  'Finds and ranks potential customers, partners, creators and strategic accounts. Reads business ICP, knowledge profile, CRM history and competitor context. Recommends who to approach first and which channel. Never spends Apollo credits, never pushes to Smartlead, never sends outreach without founder approval.',
  'growth','preview',
  true, true, false, false, false, false, false, false, false, false,
  true, false, 'high',
  '{"never_send_external":true,"never_spend_apollo_credits":true,"never_push_smartlead":true,"requires_founder_approval":true,"never_scrape_aggressively":true}'::jsonb
)
ON CONFLICT (agent_key) DO UPDATE SET
  description = EXCLUDED.description,
  guardrails = EXCLUDED.guardrails,
  agent_category = EXCLUDED.agent_category;

-- External action gates for prospecting risk surfaces
INSERT INTO public.external_action_gates (gate_key, gate_label, action_type, enabled, confirmation_phrase, max_batch_size, risk_level) VALUES
  ('apollo_credit_spend_gate','Apollo credit spend','external_provider_call', false, 'SPEND APOLLO CREDITS', 1, 'high'),
  ('smartlead_lead_push_gate','Smartlead lead push','external_provider_call', false, 'PUSH LEADS TO SMARTLEAD', 1, 'high'),
  ('prospecting_external_search_gate','Prospecting external search','external_provider_call', false, 'RUN EXTERNAL PROSPECTING SEARCH', 1, 'high')
ON CONFLICT (gate_key) DO NOTHING;

-- Prospecting journey steps (before lead import)
INSERT INTO public.command_centre_customer_journey_steps
  (step_key, step_label, step_order, journey_stage_group, description, primary_route, command_centre_anchor, owner_agent_key, external_action_risk, founder_approval_required, enabled)
VALUES
  ('market_research','Market research',5,'prospecting','Research the market and ICP before sourcing leads','/founder/command-centre','sec-strategic-prospecting','prospecting_agent',false,true,true),
  ('strategic_prospecting','Strategic prospecting',6,'prospecting','Prospecting agent finds candidate accounts from safe sources','/founder/command-centre','sec-strategic-prospecting','prospecting_agent',false,true,true),
  ('target_account_ranking','Target account ranking',7,'prospecting','Score and rank candidate accounts','/founder/command-centre','sec-strategic-prospecting','prospecting_agent',false,true,true),
  ('founder_prospect_approval','Founder prospect approval',8,'prospecting','Founder reviews top prospects before CRM promotion','/founder/command-centre','sec-strategic-prospecting','prospecting_agent',false,true,true),
  ('promote_target_to_crm','Promote target to CRM',9,'prospecting','Approved prospects promoted into CRM (no outreach)','/founder/command-centre','sec-strategic-prospecting','prospecting_agent',false,true,true)
ON CONFLICT (step_key) DO NOTHING;
