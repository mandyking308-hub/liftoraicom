
CREATE TABLE IF NOT EXISTS public.business_operating_runbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NULL,
  runbook_key text NOT NULL,
  runbook_name text NOT NULL,
  runbook_type text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  safety_notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  required_approvals jsonb NOT NULL DEFAULT '[]'::jsonb,
  expected_outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS business_operating_runbooks_key_business_idx
  ON public.business_operating_runbooks (runbook_key, COALESCE(business_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE public.business_operating_runbooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founder/admin can view runbooks"
  ON public.business_operating_runbooks FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founder/admin can insert runbooks"
  ON public.business_operating_runbooks FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founder/admin can update runbooks"
  ON public.business_operating_runbooks FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Founder/admin can delete runbooks"
  ON public.business_operating_runbooks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_business_operating_runbooks_updated
  BEFORE UPDATE ON public.business_operating_runbooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Neon Candy runbooks
WITH nc AS (
  SELECT id FROM public.businesses WHERE name = 'Neon Candy' LIMIT 1
)
INSERT INTO public.business_operating_runbooks
  (business_id, runbook_key, runbook_name, runbook_type, status, steps, safety_notes, required_approvals, expected_outputs, metadata)
SELECT nc.id, x.k, x.n, x.t, 'active', x.steps::jsonb, x.safety::jsonb, x.appr::jsonb, x.out::jsonb, x.meta::jsonb
FROM nc, (VALUES
  ('neon_candy_morning_control', 'Morning Control Check', 'daily',
    '[
      {"order":1,"label":"Open Command Centre Section 3 — Today''s founder actions","panel":"/founder/command-centre#sec-actions","action":"review"},
      {"order":2,"label":"Review Founder Approval Console queue","panel":"/founder/command-centre","action":"review"},
      {"order":3,"label":"Run Approved Action Execution (internal only)","panel":"/founder/command-centre","action":"execute_internal"},
      {"order":4,"label":"Check overnight blockers in Priority Dashboard","panel":"/founder/priority","action":"review"},
      {"order":5,"label":"Confirm Smartlead campaigns remain paused/draft","panel":"/founder/integrations","action":"verify"}
    ]',
    '["No emails sent automatically","No Apollo spend without gate","No Smartlead POST without explicit gate"]',
    '["founder_review_each_external_action"]',
    '{"summary":"Founder knows the day''s shape and any blockers"}',
    '{"order":1,"duration_min":10}'),

  ('neon_candy_outreach_scale_check', 'Outreach Scale Check', 'daily',
    '[
      {"order":1,"label":"Inspect outreach pipeline (source → reply)","panel":"/founder/command-centre#sec-outreach","action":"review"},
      {"order":2,"label":"Review Smartlead Controlled Activation checklist","panel":"/founder/integrations","action":"review"},
      {"order":3,"label":"Confirm campaign paused/draft and webhook status","panel":"/founder/integrations","action":"verify"},
      {"order":4,"label":"Check Lead Quality Autopilot — pending review counts","panel":"/founder/command-centre","action":"review"}
    ]',
    '["No campaign start without smartlead_campaign_start_gate","No lead push without smartlead_lead_push_gate"]',
    '["founder_smartlead_send_authorisation"]',
    '{"summary":"Confirms scale-send rails remain controlled"}',
    '{"order":2,"duration_min":10}'),

  ('neon_candy_reply_review', 'Reply Review Session', 'daily',
    '[
      {"order":1,"label":"Open Conversations / replies inbox","panel":"/founder/conversations","action":"review"},
      {"order":2,"label":"Review AI conversation drafts (preview only)","panel":"/founder/agents","action":"review_drafts"},
      {"order":3,"label":"Approve or edit replies in Founder Approval Console","panel":"/founder/command-centre","action":"approve"},
      {"order":4,"label":"Mark replies for commercial handoff if qualified","panel":"/founder/command-centre","action":"handoff"}
    ]',
    '["Reply send remains gated — drafts only until founder approves"]',
    '["founder_approves_each_reply"]',
    '{"summary":"All replies triaged with founder oversight"}',
    '{"order":3,"duration_min":15}'),

  ('neon_candy_ai_agent_run', 'AI Agent Run', 'daily',
    '[
      {"order":1,"label":"Open Agent Directory","panel":"/founder/agents","action":"review"},
      {"order":2,"label":"Trigger AI Engagement Agent (preview)","panel":"/founder/agents","action":"run_preview"},
      {"order":3,"label":"Run AI Agent Orchestrator preview cycle","panel":"/founder/agents","action":"run_preview"},
      {"order":4,"label":"Confirm new approval items appear in console","panel":"/founder/command-centre","action":"verify"}
    ]',
    '["All agent output writes to drafts/approvals — no external send"]',
    '["founder_reviews_agent_output"]',
    '{"summary":"Agents have produced fresh draft work for founder review"}',
    '{"order":4,"duration_min":15}'),

  ('neon_candy_approval_session', 'Approval Session', 'daily',
    '[
      {"order":1,"label":"Open Founder Approval Console","panel":"/founder/command-centre","action":"review"},
      {"order":2,"label":"Approve safe internal actions (drafts, CRM next actions, proposal drafts)","panel":"/founder/command-centre","action":"approve_internal"},
      {"order":3,"label":"Run Approved Action Executor (internal only)","panel":"/founder/command-centre","action":"execute_internal"},
      {"order":4,"label":"Hold external sends pending controlled gate session","panel":"/founder/command-centre","action":"defer"}
    ]',
    '["External actions require gate enable + confirmation phrase"]',
    '["external_action_gate_confirmation_phrase"]',
    '{"summary":"Approved internal work is materialised; external actions remain queued"}',
    '{"order":5,"duration_min":15}'),

  ('neon_candy_proposal_handoff', 'Proposal & Commercial Handoff', 'daily',
    '[
      {"order":1,"label":"Review qualified replies ready for handoff","panel":"/founder/command-centre","action":"review"},
      {"order":2,"label":"Open Internal Proposals","panel":"/founder/internal-proposals","action":"review"},
      {"order":3,"label":"Generate or refine proposal draft","panel":"/founder/proposals","action":"draft"},
      {"order":4,"label":"Hold proposal_send for explicit founder gate","panel":"/founder/proposals","action":"defer"}
    ]',
    '["Proposal send is gated — no auto delivery"]',
    '["founder_proposal_send_authorisation"]',
    '{"summary":"Commercial pipeline progressed with founder control"}',
    '{"order":6,"duration_min":15}'),

  ('neon_candy_weekly_growth_review', 'Weekly Growth Review', 'weekly',
    '[
      {"order":1,"label":"Open Founder Analytics — 7-day results","panel":"/founder/analytics","action":"review"},
      {"order":2,"label":"Review Revenue Console productisation readiness","panel":"/founder/revenue","action":"review"},
      {"order":3,"label":"Inspect Knowledge Brain updates for Neon Candy","panel":"/founder/knowledge","action":"review"},
      {"order":4,"label":"Set next week''s outreach posture in Autopilot Policy","panel":"/founder/command-centre","action":"set_policy"}
    ]',
    '["Policy changes only — no live campaign mutation"]',
    '["founder_sets_policy"]',
    '{"summary":"Weekly direction set without changing live infrastructure"}',
    '{"order":7,"duration_min":30}'),

  ('neon_candy_smartlead_activation', 'Smartlead Controlled Activation', 'event',
    '[
      {"order":1,"label":"Open Smartlead Controlled Activation panel","panel":"/founder/integrations","action":"review"},
      {"order":2,"label":"Verify campaign mapping and webhook secret stored","panel":"/founder/integrations","action":"verify"},
      {"order":3,"label":"Confirm campaign remains paused/draft","panel":"/founder/integrations","action":"verify"},
      {"order":4,"label":"Enable specific Smartlead gate + enter confirmation phrase","panel":"/founder/operations","action":"enable_gate"},
      {"order":5,"label":"Run controlled action via External Action Executor","panel":"/founder/operations","action":"execute_external"}
    ]',
    '["No Smartlead POST until gate enabled and phrase entered","Live sending requires explicit founder authorisation"]',
    '["smartlead_gate_enable","confirmation_phrase","founder_smartlead_send_authorisation"]',
    '{"summary":"Smartlead activation progresses through controlled gates only"}',
    '{"order":8,"duration_min":20}')
) AS x(k,n,t,steps,safety,appr,out,meta)
ON CONFLICT DO NOTHING;
