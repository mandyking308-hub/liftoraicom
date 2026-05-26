
DO $$ BEGIN CREATE TYPE public.fx_confidence AS ENUM ('estimated','provider','manual','verified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.party_type AS ENUM ('customer','seller','vendor','partner','entity','payment_provider','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.jurisdiction_confidence AS ENUM ('unknown','inferred','provided','verified'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.tax_flag AS ENUM ('unknown','not_applicable','possible','required_review','confirmed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.adviser_review_type AS ENUM ('vat','sales_tax','marketplace_tax','withholding','fx','entity_routing','seller_payout','customer_country','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE public.adviser_review_status AS ENUM ('draft','review_required','approved_to_ask','answered','closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.currency_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  default_currency TEXT NOT NULL DEFAULT 'USD',
  supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['USD'],
  display_currency TEXT NOT NULL DEFAULT 'USD',
  fx_rate_source TEXT,
  fx_rate_confidence public.fx_confidence NOT NULL DEFAULT 'estimated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currency_settings TO authenticated;
GRANT ALL ON public.currency_settings TO service_role;
ALTER TABLE public.currency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage currency_settings" ON public.currency_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.jurisdiction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  related_table TEXT,
  related_record_id UUID,
  party_type public.party_type NOT NULL,
  country TEXT,
  region TEXT,
  tax_identifier_summary TEXT,
  jurisdiction_confidence public.jurisdiction_confidence NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisdiction_records TO authenticated;
GRANT ALL ON public.jurisdiction_records TO service_role;
ALTER TABLE public.jurisdiction_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage jurisdiction_records" ON public.jurisdiction_records FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.tax_treatment_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  legal_entity_id UUID,
  related_table TEXT,
  related_record_id UUID,
  revenue_type TEXT,
  customer_country TEXT,
  seller_country TEXT,
  currency TEXT,
  vat_sales_tax_flag public.tax_flag NOT NULL DEFAULT 'unknown',
  withholding_flag public.tax_flag NOT NULL DEFAULT 'unknown',
  marketplace_tax_flag public.tax_flag NOT NULL DEFAULT 'unknown',
  adviser_review_required BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tax_treatment_flags TO authenticated;
GRANT ALL ON public.tax_treatment_flags TO service_role;
ALTER TABLE public.tax_treatment_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage tax_treatment_flags" ON public.tax_treatment_flags FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TABLE public.jurisdiction_adviser_review_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID,
  legal_entity_id UUID,
  review_type public.adviser_review_type NOT NULL,
  question TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  status public.adviser_review_status NOT NULL DEFAULT 'draft',
  answer_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisdiction_adviser_review_items TO authenticated;
GRANT ALL ON public.jurisdiction_adviser_review_items TO service_role;
ALTER TABLE public.jurisdiction_adviser_review_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage jurisdiction_adviser_review_items" ON public.jurisdiction_adviser_review_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder')) WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'founder'));

CREATE TRIGGER trg_currency_settings_updated BEFORE UPDATE ON public.currency_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jurisdiction_records_updated BEFORE UPDATE ON public.jurisdiction_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_tax_treatment_flags_updated BEFORE UPDATE ON public.tax_treatment_flags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_jurisdiction_adviser_review_items_updated BEFORE UPDATE ON public.jurisdiction_adviser_review_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_jurisdiction_party ON public.jurisdiction_records (party_type);
CREATE INDEX idx_jurisdiction_country ON public.jurisdiction_records (country);
CREATE INDEX idx_tax_flag_review ON public.tax_treatment_flags (adviser_review_required);
CREATE INDEX idx_adviser_review_status ON public.jurisdiction_adviser_review_items (status);
