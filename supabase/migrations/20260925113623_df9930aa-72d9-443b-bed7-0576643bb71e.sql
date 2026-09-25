CREATE TABLE public.strategic_organisation_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text, geography text, access_model text, membership_cost_text text,
  us_relevance text, online_usefulness text, primary_value text,
  status text NOT NULL DEFAULT 'researching',
  website text, notes text, last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.strategic_organisation_register FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.strategic_organisation_register TO authenticated;
GRANT ALL ON public.strategic_organisation_register TO service_role;
ALTER TABLE public.strategic_organisation_register ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder/admin manage strategic organisation register"
  ON public.strategic_organisation_register FOR ALL TO authenticated
  USING (public._is_founder_or_admin()) WITH CHECK (public._is_founder_or_admin());

CREATE OR REPLACE FUNCTION public.sor_touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_sor_updated_at BEFORE UPDATE ON public.strategic_organisation_register
  FOR EACH ROW EXECUTE FUNCTION public.sor_touch_updated_at();

INSERT INTO public.strategic_organisation_register (name, status) VALUES
('Association of Corporate Treasurers (ACT)','researching'),
('Association for Financial Professionals (AFP)','researching'),
('Society of Professional Economists (SPE)','researching'),
('National Association for Business Economics (NABE)','researching'),
('ACI Financial Markets Association / ACI UK','researching'),
('Chartered Institute for Securities & Investment (CISI)','researching'),
('International Capital Market Association (ICMA)','researching'),
('CFA Institute / CFA UK','researching'),
('CAIA Association','researching'),
('Pensions Management Institute (PMI)','researching'),
('Pensions and Lifetime Savings Association (PLSA)','researching'),
('Loan Market Association (LMA)','researching'),
('SIFMA','researching'),
('PIMFA','researching'),
('Money, Macro and Finance Society','researching'),
('European Leveraged Finance Association (ELFA)','researching'),
('Bank of England / King''s College London Watchers programme','researching'),
('AIMA / Alternative Credit Council (ACC)','researching'),
('Institutional Limited Partners Association (ILPA)','researching'),
('Global Partnership Family Offices (GPFO)','researching'),
('100 Women in Finance','researching'),
('UK Private Capital','researching'),
('PEI Group','researching'),
('Campden Wealth / Campden Club / Institute for Private Investors','researching'),
('Institutional Investor','researching'),
('Milken Institute / Financial Innovations Labs & Family Office work (FFAM)','researching'),
('Sovereign Wealth Fund Institute (SWFI)','researching'),
('SALT','researching'),
('SuperReturn','researching'),
('iConnections','researching'),
('Association for Corporate Growth (ACG)','researching'),
('Family Office Exchange (FOX)','researching'),
('First Wealth / First Wealth Private Office','researching'),
('Nasdaq','researching'),
('Nasdaq Entrepreneurial Center','researching'),
('Nasdaq Private Market','researching'),
('SEC Office of the Advocate for Small Business Capital Formation','researching'),
('NIRI — National Investor Relations Institute','researching'),
('Forge Global','researching'),
('EquityZen','researching'),
('London Stock Exchange Group / London Stock Exchange (LSEG/LSE)','researching'),
('OMFIF','researching'),
('Investment Week','researching'),
('STEP — Society of Trust and Estate Practitioners','researching'),
('International Fiscal Association UK (IFA UK)','researching'),
('International Tax Planning Association (ITPA)','researching'),
('Institute of Directors (IoD)','researching'),
('Royal Society of Medicine (RSM)','researching')
ON CONFLICT (name) DO NOTHING;