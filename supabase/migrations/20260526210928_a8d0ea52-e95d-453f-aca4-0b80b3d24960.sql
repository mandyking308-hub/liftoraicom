
CREATE TABLE public.ecommerce_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  product_id UUID,
  sku TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'physical',
  supplier_id UUID,
  stock_tracking_enabled BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_products TO authenticated;
GRANT ALL ON public.ecommerce_products TO service_role;
ALTER TABLE public.ecommerce_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read products" ON public.ecommerce_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write products" ON public.ecommerce_products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ecommerce_products_updated BEFORE UPDATE ON public.ecommerce_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.inventory_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  ecommerce_product_id UUID NOT NULL,
  location_name TEXT NOT NULL DEFAULT 'default',
  stock_on_hand NUMERIC NOT NULL DEFAULT 0,
  stock_reserved NUMERIC NOT NULL DEFAULT 0,
  stock_available NUMERIC NOT NULL DEFAULT 0,
  reorder_point NUMERIC NOT NULL DEFAULT 0,
  reorder_quantity NUMERIC NOT NULL DEFAULT 0,
  inventory_status TEXT NOT NULL DEFAULT 'unknown',
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_records TO authenticated;
GRANT ALL ON public.inventory_records TO service_role;
ALTER TABLE public.inventory_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read inventory" ON public.inventory_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write inventory" ON public.inventory_records FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_inventory_records_updated BEFORE UPDATE ON public.inventory_records FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ecommerce_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  customer_id UUID,
  contact_id UUID,
  qtc_payment_id UUID,
  order_number TEXT NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  shipping_required BOOLEAN NOT NULL DEFAULT false,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_orders TO authenticated;
GRANT ALL ON public.ecommerce_orders TO service_role;
ALTER TABLE public.ecommerce_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read orders" ON public.ecommerce_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write orders" ON public.ecommerce_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ecommerce_orders_updated BEFORE UPDATE ON public.ecommerce_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ecommerce_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  order_id UUID NOT NULL,
  ecommerce_product_id UUID NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  fulfilment_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_order_items TO authenticated;
GRANT ALL ON public.ecommerce_order_items TO service_role;
ALTER TABLE public.ecommerce_order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read order items" ON public.ecommerce_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write order items" ON public.ecommerce_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ecommerce_order_items_updated BEFORE UPDATE ON public.ecommerce_order_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.fulfilment_shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  order_id UUID NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  shipment_status TEXT NOT NULL DEFAULT 'draft',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fulfilment_shipments TO authenticated;
GRANT ALL ON public.fulfilment_shipments TO service_role;
ALTER TABLE public.fulfilment_shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read shipments" ON public.fulfilment_shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write shipments" ON public.fulfilment_shipments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_fulfilment_shipments_updated BEFORE UPDATE ON public.fulfilment_shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.return_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  order_id UUID NOT NULL,
  customer_id UUID,
  return_reason TEXT,
  return_status TEXT NOT NULL DEFAULT 'requested',
  refund_required BOOLEAN NOT NULL DEFAULT false,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_requests TO authenticated;
GRANT ALL ON public.return_requests TO service_role;
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read returns" ON public.return_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write returns" ON public.return_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_return_requests_updated BEFORE UPDATE ON public.return_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.ecommerce_suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID,
  supplier_name TEXT NOT NULL,
  supplier_type TEXT NOT NULL DEFAULT 'other',
  contact_email TEXT,
  lead_time_days INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  active BOOLEAN NOT NULL DEFAULT true,
  audit_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ecommerce_suppliers TO authenticated;
GRANT ALL ON public.ecommerce_suppliers TO service_role;
ALTER TABLE public.ecommerce_suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read suppliers" ON public.ecommerce_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write suppliers" ON public.ecommerce_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_ecommerce_suppliers_updated BEFORE UPDATE ON public.ecommerce_suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
