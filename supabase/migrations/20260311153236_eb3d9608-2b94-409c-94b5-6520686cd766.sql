
-- Revenue records for projects
CREATE TABLE public.revenue_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL DEFAULT 'project',
  source_id uuid,
  source_name text NOT NULL DEFAULT '',
  client_organisation text NOT NULL DEFAULT '',
  revenue_value numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  period_start date,
  period_end date,
  status text NOT NULL DEFAULT 'confirmed',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage revenue records" ON public.revenue_records FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_revenue_records_updated_at BEFORE UPDATE ON public.revenue_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Partner deals
CREATE TABLE public.partner_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name text NOT NULL DEFAULT '',
  client_organisation text NOT NULL DEFAULT '',
  project_name text NOT NULL DEFAULT '',
  project_value numeric(12,2) NOT NULL DEFAULT 0,
  partner_commission numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'GBP',
  deal_status text NOT NULL DEFAULT 'lead',
  opportunity_id uuid REFERENCES public.partner_opportunities(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage partner deals" ON public.partner_deals FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_partner_deals_updated_at BEFORE UPDATE ON public.partner_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
