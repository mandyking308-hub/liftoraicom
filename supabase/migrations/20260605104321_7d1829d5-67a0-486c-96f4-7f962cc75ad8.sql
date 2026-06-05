
-- Helper: drop + recreate write policies as founder/admin only.
-- Reads are left as-is unless noted.

-- ============ BOOKING / SCHEDULING ============
DROP POLICY IF EXISTS "auth write bookings" ON public.booking_records;
CREATE POLICY "founders write bookings" ON public.booking_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write booking events" ON public.booking_events;
CREATE POLICY "founders write booking events" ON public.booking_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write avail" ON public.availability_windows;
CREATE POLICY "founders write avail" ON public.availability_windows
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write resources" ON public.scheduling_resources;
CREATE POLICY "founders write resources" ON public.scheduling_resources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============ E-COMMERCE ============
DROP POLICY IF EXISTS "auth write orders" ON public.ecommerce_orders;
CREATE POLICY "founders write orders" ON public.ecommerce_orders
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write order items" ON public.ecommerce_order_items;
CREATE POLICY "founders write order items" ON public.ecommerce_order_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write products" ON public.ecommerce_products;
CREATE POLICY "founders write products" ON public.ecommerce_products
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write suppliers" ON public.ecommerce_suppliers;
CREATE POLICY "founders write suppliers" ON public.ecommerce_suppliers
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write inventory" ON public.inventory_records;
CREATE POLICY "founders write inventory" ON public.inventory_records
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============ FULFILMENT / RETURNS ============
DROP POLICY IF EXISTS "auth write shipments" ON public.fulfilment_shipments;
CREATE POLICY "founders write shipments" ON public.fulfilment_shipments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "auth write returns" ON public.return_requests;
CREATE POLICY "founders write returns" ON public.return_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============ REPORTING / KPI ============
DROP POLICY IF EXISTS "Authenticated write kpi_definitions" ON public.kpi_definitions;
CREATE POLICY "founders write kpi_definitions" ON public.kpi_definitions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write truth_rules" ON public.reporting_truth_rules;
CREATE POLICY "founders write truth_rules" ON public.reporting_truth_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write conflicts" ON public.reporting_conflicts;
CREATE POLICY "founders write conflicts" ON public.reporting_conflicts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write snapshots" ON public.reporting_snapshots;
CREATE POLICY "founders write snapshots" ON public.reporting_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============ PORTAL AUDIT / ACCESS ============
DROP POLICY IF EXISTS "Authenticated write portal_access_events" ON public.portal_access_events;
CREATE POLICY "founders write portal_access_events" ON public.portal_access_events
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write portal_profiles" ON public.portal_profiles;
CREATE POLICY "founders write portal_profiles" ON public.portal_profiles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write portal_invites" ON public.portal_invites;
CREATE POLICY "founders write portal_invites" ON public.portal_invites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

DROP POLICY IF EXISTS "Authenticated write portal_users" ON public.portal_users;
CREATE POLICY "founders write portal_users" ON public.portal_users
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'founder') OR public.has_role(auth.uid(),'admin'));

-- ============ GLOBAL SEARCH INDEX ============
DROP POLICY IF EXISTS "users read low-sensitivity active search index" ON public.global_search_index;
CREATE POLICY "users read public active search index" ON public.global_search_index
  FOR SELECT TO authenticated
  USING (active = true AND is_test_data = false AND sensitivity_level = 'public');

-- ============ PUBLIC PROPOSAL RPC: return only customer-safe fields ============
DROP FUNCTION IF EXISTS public.get_proposal_by_token(text);
CREATE OR REPLACE FUNCTION public.get_proposal_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.internal_proposals;
BEGIN
  SELECT * INTO p FROM public.internal_proposals
   WHERE view_token = _token OR accept_token = _token
   LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;

  IF p.status = 'sent' AND p.viewed_at IS NULL THEN
    UPDATE public.internal_proposals
       SET viewed_at = now(), status = 'viewed', updated_at = now()
     WHERE id = p.id;
    p.viewed_at := now();
    p.status := 'viewed';
  END IF;

  RETURN jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'business_name', p.business_name,
    'suggested_solution', p.suggested_solution,
    'estimated_scope', p.estimated_scope,
    'estimated_timeline', p.estimated_timeline,
    'estimated_cost_range', p.estimated_cost_range,
    'estimated_cost_breakdown', p.estimated_cost_breakdown,
    'architecture_components', p.architecture_components,
    'estimated_roi_summary', p.estimated_roi_summary,
    'estimated_annual_savings', p.estimated_annual_savings,
    'estimated_roi_period', p.estimated_roi_period,
    'estimated_productivity_gain', p.estimated_productivity_gain,
    'status', p.status,
    'accepted_at', p.accepted_at,
    'viewed_at', p.viewed_at,
    'accept_token', p.accept_token,
    'include_demo', p.include_demo
  );
END;
$$;
