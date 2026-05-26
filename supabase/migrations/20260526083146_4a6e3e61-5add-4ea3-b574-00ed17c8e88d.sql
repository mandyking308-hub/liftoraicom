
CREATE TABLE public.global_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'product',
  description TEXT,
  target_customer TEXT,
  delivery_type TEXT,
  cost_to_deliver_estimate NUMERIC,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.global_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.global_products(id) ON DELETE CASCADE,
  offer_name TEXT NOT NULL,
  offer_type TEXT NOT NULL DEFAULT 'standard',
  price_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GBP',
  billing_frequency TEXT,
  discount_allowed BOOLEAN NOT NULL DEFAULT false,
  margin_estimate NUMERIC,
  offer_status TEXT NOT NULL DEFAULT 'draft',
  approval_required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.offer_claims (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID REFERENCES public.global_products(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.global_offers(id) ON DELETE CASCADE,
  claim_text TEXT NOT NULL,
  claim_status TEXT NOT NULL DEFAULT 'draft',
  evidence_source TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.offer_delivery_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  product_id UUID REFERENCES public.global_products(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES public.global_offers(id) ON DELETE CASCADE,
  requirement_name TEXT NOT NULL,
  requirement_type TEXT NOT NULL DEFAULT 'setup',
  required BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_delivery_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage global_products" ON public.global_products
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage global_offers" ON public.global_offers
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage offer_claims" ON public.offer_claims
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage offer_delivery_requirements" ON public.offer_delivery_requirements
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_gp_business ON public.global_products(business_id, active);
CREATE INDEX idx_go_business ON public.global_offers(business_id, offer_status);
CREATE INDEX idx_go_product ON public.global_offers(product_id);
CREATE INDEX idx_oc_offer ON public.offer_claims(offer_id, claim_status);
CREATE INDEX idx_odr_offer ON public.offer_delivery_requirements(offer_id);

CREATE TRIGGER trg_gp_updated BEFORE UPDATE ON public.global_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_go_updated BEFORE UPDATE ON public.global_offers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_oc_updated BEFORE UPDATE ON public.offer_claims FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_odr_updated BEFORE UPDATE ON public.offer_delivery_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
