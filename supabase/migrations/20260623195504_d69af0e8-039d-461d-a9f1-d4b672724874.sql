
-- Lock down SELECT to founder/admin only
DROP POLICY IF EXISTS "auth read bookings" ON public.booking_records;
CREATE POLICY "founders read bookings" ON public.booking_records FOR SELECT USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "auth read order items" ON public.ecommerce_order_items;
CREATE POLICY "founders read order items" ON public.ecommerce_order_items FOR SELECT USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "auth read orders" ON public.ecommerce_orders;
CREATE POLICY "founders read orders" ON public.ecommerce_orders FOR SELECT USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "auth read suppliers" ON public.ecommerce_suppliers;
CREATE POLICY "founders read suppliers" ON public.ecommerce_suppliers FOR SELECT USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "auth read returns" ON public.return_requests;
CREATE POLICY "founders read returns" ON public.return_requests FOR SELECT USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

DROP POLICY IF EXISTS "Authenticated read portal_invites" ON public.portal_invites;
-- founders write portal_invites (ALL) already covers founder reads.

DROP POLICY IF EXISTS "Authenticated read portal_users" ON public.portal_users;
-- founders write portal_users (ALL) already covers founder reads.

DROP POLICY IF EXISTS "Authenticated read snapshots" ON public.reporting_snapshots;
-- founders write snapshots (ALL) already covers founder reads.

-- Replace permissive ALL on import_preview_rows with founder/admin-only write
DROP POLICY IF EXISTS "Authenticated write preview" ON public.import_preview_rows;
CREATE POLICY "Founders write preview" ON public.import_preview_rows
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role));

-- Storage: allow founder/admin uploads + management on project-documents bucket
CREATE POLICY "Founders upload project documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'project-documents' AND (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

CREATE POLICY "Founders update project documents" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'project-documents' AND (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role)))
  WITH CHECK (bucket_id = 'project-documents' AND (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role)));

CREATE POLICY "Founders delete project documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'project-documents' AND (has_role(auth.uid(),'founder'::app_role) OR has_role(auth.uid(),'admin'::app_role)));
