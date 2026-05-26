
-- Extend existing founder_decisions
ALTER TABLE public.founder_decisions
  ADD COLUMN IF NOT EXISTS source_module TEXT,
  ADD COLUMN IF NOT EXISTS source_table TEXT,
  ADD COLUMN IF NOT EXISTS source_record_id UUID,
  ADD COLUMN IF NOT EXISTS decision_title TEXT,
  ADD COLUMN IF NOT EXISTS decision_summary TEXT,
  ADD COLUMN IF NOT EXISTS decision_status TEXT NOT NULL DEFAULT 'needed',
  ADD COLUMN IF NOT EXISTS recommended_option TEXT,
  ADD COLUMN IF NOT EXISTS options_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS financial_impact_summary TEXT,
  ADD COLUMN IF NOT EXISTS risk_summary TEXT,
  ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS founder_decision TEXT,
  ADD COLUMN IF NOT EXISTS founder_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_founder_decisions_decstatus ON public.founder_decisions(decision_status);
CREATE INDEX IF NOT EXISTS idx_founder_decisions_business ON public.founder_decisions(business_id);

-- founder_decision_events
CREATE TABLE IF NOT EXISTS public.founder_decision_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.founder_decisions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_summary TEXT NULL,
  created_by UUID NULL,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.founder_decision_events TO authenticated;
GRANT ALL ON public.founder_decision_events TO service_role;
ALTER TABLE public.founder_decision_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage decision events" ON public.founder_decision_events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE INDEX IF NOT EXISTS idx_founder_decision_events_dec ON public.founder_decision_events(decision_id, created_at DESC);

-- decision_review_reminders
CREATE TABLE IF NOT EXISTS public.decision_review_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID NOT NULL REFERENCES public.founder_decisions(id) ON DELETE CASCADE,
  review_due_at TIMESTAMPTZ NOT NULL,
  review_reason TEXT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.decision_review_reminders TO authenticated;
GRANT ALL ON public.decision_review_reminders TO service_role;
ALTER TABLE public.decision_review_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage decision reminders" ON public.decision_review_reminders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_decision_reminders_updated BEFORE UPDATE ON public.decision_review_reminders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX IF NOT EXISTS idx_decision_reminders_dec ON public.decision_review_reminders(decision_id);

-- Seed LIVE_INTERNAL_TEST data
INSERT INTO public.founder_decisions
  (id, source_module, source_table, decision_title, decision_summary, decision_type, decision_status, recommended_option, options_json, financial_impact_summary, risk_summary, deadline, audit_metadata, title, status)
VALUES
('d0000001-0000-0000-0000-000000000001','portfolio_prioritisation','portfolio_priorities','TEST · Pause low-traction venture #07','Venture 07 has 90 days of flat revenue and rising AI cost ratio. Recommend pause for 30 days.','pause','recommended','Pause 30 days','[{"key":"pause","label":"Pause 30 days","reasoning":"Stop ad spend, reduce cost, re-evaluate"},{"key":"keep","label":"Keep running"},{"key":"kill","label":"Send to kill review"}]'::jsonb,'Saves ~£1,200/mo in AI + ad cost','Customer perception risk if pause communicated externally', now() + interval '7 days','{"live_internal_test":true}'::jsonb,'TEST · Pause low-traction venture #07','pending'),
('d0000001-0000-0000-0000-000000000002','pricing_margin','pricing_changes','TEST · Raise Plan B price 9%','Margin slipping 4 pts; competitor raised 12%. Recommend +9%.','pricing','founder_review','Raise 9%','[{"key":"hold","label":"Hold price"},{"key":"raise9","label":"Raise 9%","reasoning":"Restore margin, below competitor"},{"key":"raise15","label":"Raise 15%"}]'::jsonb,'+£3,400/mo gross margin','Churn risk on price-sensitive cohort', now() + interval '14 days','{"live_internal_test":true}'::jsonb,'TEST · Raise Plan B price 9%','pending'),
('d0000001-0000-0000-0000-000000000003','marketplace_seller_ops','seller_applications','TEST · Activate seller "Northwind Crafts"','Seller passed KYC + sample review. Awaiting activation.','seller','needed','Approve activation','[{"key":"approve","label":"Approve activation"},{"key":"hold","label":"Hold for second review"},{"key":"reject","label":"Reject"}]'::jsonb,'+est. £600/mo GMV','Reputational risk if quality drops', now() + interval '3 days','{"live_internal_test":true}'::jsonb,'TEST · Activate seller Northwind Crafts','pending'),
('d0000001-0000-0000-0000-000000000004','data_quality','dq_repairs','TEST · Run destructive duplicate-customer merge','427 duplicate customer rows detected. Merge requires destructive write.','other','founder_review','Dry-run first','[{"key":"dryrun","label":"Dry-run first","reasoning":"Confirm impact before destructive write"},{"key":"merge","label":"Merge now"},{"key":"defer","label":"Defer"}]'::jsonb,'No revenue impact; cleaner reporting','HIGH · destructive, requires founder approval', now() + interval '2 days','{"live_internal_test":true,"irreversible":true}'::jsonb,'TEST · Destructive duplicate-customer merge','pending'),
('d0000001-0000-0000-0000-000000000005','legal_tax','entity_map','TEST · Engage UK tax adviser for cross-border VAT','EU sales crossed £85k threshold across two ventures. Adviser engagement recommended.','legal_tax','recommended','Engage Adviser A','[{"key":"adviserA","label":"Engage Adviser A","reasoning":"Specialises in cross-border VAT, fixed fee"},{"key":"adviserB","label":"Engage Adviser B"},{"key":"defer","label":"Defer"}]'::jsonb,'£1,800 one-off advisory fee','Non-compliance penalty if deferred', now() + interval '10 days','{"live_internal_test":true}'::jsonb,'TEST · Engage UK tax adviser','pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.founder_decision_events (decision_id, event_type, event_summary, audit_metadata) VALUES
('d0000001-0000-0000-0000-000000000001','created','Created from portfolio prioritisation watch','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000001','recommended','Agent recommended pause 30 days','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000002','created','Created from pricing review','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000002','recommended','Agent recommended +9%','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000003','created','Created from seller activation queue','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000004','created','Created from data quality engine','{"live_internal_test":true}'::jsonb),
('d0000001-0000-0000-0000-000000000004','recommended','Agent recommended dry-run first (destructive guard)','{"live_internal_test":true,"irreversible":true}'::jsonb),
('d0000001-0000-0000-0000-000000000005','created','Created from legal/tax map watch','{"live_internal_test":true}'::jsonb);

INSERT INTO public.decision_review_reminders (decision_id, review_due_at, review_reason) VALUES
('d0000001-0000-0000-0000-000000000001', now() + interval '30 days', 'Re-evaluate pause impact'),
('d0000001-0000-0000-0000-000000000002', now() + interval '45 days', 'Check churn vs margin after price change');
