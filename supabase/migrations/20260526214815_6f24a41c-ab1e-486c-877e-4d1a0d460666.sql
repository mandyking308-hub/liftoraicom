
CREATE TABLE public.business_memory_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  summary_type TEXT NOT NULL DEFAULT 'founder',
  summary_title TEXT NOT NULL,
  summary_body TEXT NULL,
  current_status TEXT NULL,
  key_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  open_risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  open_work_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_generated_at TIMESTAMPTZ NULL,
  generated_by TEXT NULL,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_memory_summaries TO authenticated;
GRANT ALL ON public.business_memory_summaries TO service_role;
ALTER TABLE public.business_memory_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage memory summaries" ON public.business_memory_summaries FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_business_memory_summaries_updated BEFORE UPDATE ON public.business_memory_summaries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.handover_packs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  pack_type TEXT NOT NULL DEFAULT 'operator',
  pack_status TEXT NOT NULL DEFAULT 'draft',
  pack_title TEXT NOT NULL,
  pack_summary TEXT NULL,
  included_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  sensitivity_level TEXT NOT NULL DEFAULT 'internal',
  founder_approval_required BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handover_packs TO authenticated;
GRANT ALL ON public.handover_packs TO service_role;
ALTER TABLE public.handover_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage handover packs" ON public.handover_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_handover_packs_updated BEFORE UPDATE ON public.handover_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.handover_pack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pack_id UUID NOT NULL REFERENCES public.handover_packs(id) ON DELETE CASCADE,
  business_id UUID NULL,
  item_type TEXT NOT NULL,
  item_summary TEXT NULL,
  source_table TEXT NULL,
  source_record_id UUID NULL,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.handover_pack_items TO authenticated;
GRANT ALL ON public.handover_pack_items TO service_role;
ALTER TABLE public.handover_pack_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage handover pack items" ON public.handover_pack_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));

CREATE TABLE public.portfolio_history_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  source_module TEXT NULL,
  source_record_id UUID NULL,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_history_events TO authenticated;
GRANT ALL ON public.portfolio_history_events TO service_role;
ALTER TABLE public.portfolio_history_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage portfolio history" ON public.portfolio_history_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));

CREATE INDEX idx_pmem_bms_business ON public.business_memory_summaries(business_id);
CREATE INDEX idx_pmem_bms_type ON public.business_memory_summaries(summary_type);
CREATE INDEX idx_pmem_hpacks_business ON public.handover_packs(business_id);
CREATE INDEX idx_pmem_hpacks_status ON public.handover_packs(pack_status);
CREATE INDEX idx_pmem_hpitems_pack ON public.handover_pack_items(pack_id);
CREATE INDEX idx_pmem_history_business ON public.portfolio_history_events(business_id, event_date DESC);

INSERT INTO public.business_memory_summaries (id, business_id, summary_type, summary_title, summary_body, current_status, key_metrics, open_risks, open_decisions, open_work_items, last_generated_at, generated_by, audit_metadata) VALUES
('b1000001-0000-0000-0000-000000000001', NULL, 'founder', 'TEST · 5-minute brief — Venture Alpha',
 'Venture Alpha is a B2B AI workflow product. Lifecycle: revenue-started. Entity: UK Ltd. Channels: outbound + partner. Two AI agents active.',
 'revenue_started',
 '{"mrr_estimate":"£4,200","customers":18,"ai_agents_active":2,"confirmed":false,"estimated":true}'::jsonb,
 '["Single-supplier dependency","Founder concentration risk"]'::jsonb,
 '["Pricing change pending founder review"]'::jsonb,
 '["Draft new sales SOP","Confirm tax adviser engagement"]'::jsonb,
 now(), 'portfolio_memory_agent', '{"live_internal_test":true,"estimated_metrics":true}'::jsonb),
('b1000001-0000-0000-0000-000000000002', NULL, 'operator', 'TEST · Operator brief — Venture Alpha',
 'How to run Venture Alpha day-to-day. SOPs: sales, support, refund. Work instructions only; no confidential finance.',
 'revenue_started',
 '{"sla_response_minutes":120,"open_tickets":3}'::jsonb,
 '["Stale support SOP review"]'::jsonb, '[]'::jsonb,
 '["Clear inbox","Run weekly review"]'::jsonb,
 now(), 'portfolio_memory_agent', '{"live_internal_test":true}'::jsonb);

INSERT INTO public.handover_packs (id, business_id, pack_type, pack_status, pack_title, pack_summary, included_sections, sensitivity_level, founder_approval_required, audit_metadata) VALUES
('a1000001-0000-0000-0000-000000000001', NULL, 'operator', 'draft', 'TEST · Operator handover pack — Venture Alpha',
 'For VA / operator onboarding. Excludes confidential finance.',
 '["overview","systems","access","next_actions","warnings"]'::jsonb,
 'internal', true, '{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000002', NULL, 'adviser', 'review_required', 'TEST · Adviser handover pack — Venture Alpha',
 'For tax/legal adviser. Confidential. Approval gated.',
 '["overview","legal","finance","risks","decisions"]'::jsonb,
 'confidential', true, '{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000003', NULL, 'buyer', 'draft', 'TEST · Buyer brief — Venture Alpha',
 'Buyer data-room placeholder. No raw secrets. Sharing requires founder approval.',
 '["overview","metrics","products","risks","legal"]'::jsonb,
 'restricted', true, '{"live_internal_test":true,"secrets_redacted":true}'::jsonb);

INSERT INTO public.handover_pack_items (pack_id, item_type, item_summary, source_table, audit_metadata) VALUES
('a1000001-0000-0000-0000-000000000001','overview','Venture Alpha — B2B AI workflow product','business_archetypes','{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000001','systems','Two AI agents active; outbound + CRM + finance spine','agent_registry','{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000001','access','Operator role · read-only finance · full SOP access','user_roles','{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000001','next_actions','Top 5 next actions assembled from Master Work Queue','master_work_queue','{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000001','warnings','Do not approve refunds without founder review','sop_documents','{"live_internal_test":true}'::jsonb),
('a1000001-0000-0000-0000-000000000002','legal','Entity: UK Ltd · cross-border VAT advisory engaged','entity_map','{"live_internal_test":true,"sensitive":true}'::jsonb),
('a1000001-0000-0000-0000-000000000002','finance','Estimated MRR + open invoices summary (no bank credentials)','finance_summary','{"live_internal_test":true,"secrets_redacted":true}'::jsonb),
('a1000001-0000-0000-0000-000000000003','metrics','Estimated MRR £4,200 · 18 customers · est. growth 8% MoM','business_metrics','{"live_internal_test":true,"estimated":true}'::jsonb),
('a1000001-0000-0000-0000-000000000003','products','Product catalogue snapshot (public-safe)','product_catalogue','{"live_internal_test":true}'::jsonb);

INSERT INTO public.portfolio_history_events (business_id, event_type, event_summary, event_date, source_module, audit_metadata) VALUES
(NULL,'created','TEST · Venture Alpha created in portfolio', now() - interval '180 days','business_archetype','{"live_internal_test":true}'::jsonb),
(NULL,'launched','TEST · Venture Alpha launched to first 5 customers', now() - interval '120 days','launch_factory','{"live_internal_test":true}'::jsonb),
(NULL,'revenue_started','TEST · Venture Alpha crossed £1k MRR', now() - interval '60 days','revenue_console','{"live_internal_test":true}'::jsonb),
(NULL,'risk_flagged','TEST · Single-supplier dependency flagged', now() - interval '10 days','portfolio_risk','{"live_internal_test":true}'::jsonb),
(NULL,'decision_made','TEST · Founder pause/scale decision queued', now() - interval '2 days','decision_register','{"live_internal_test":true}'::jsonb);
