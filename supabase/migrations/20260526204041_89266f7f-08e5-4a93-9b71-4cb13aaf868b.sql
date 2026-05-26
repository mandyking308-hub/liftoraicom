
CREATE TABLE public.role_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_code text NOT NULL UNIQUE,
  role_name text NOT NULL,
  role_description text,
  default_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  sensitivity_level text NOT NULL DEFAULT 'medium',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_definitions TO authenticated;
GRANT ALL ON public.role_definitions TO service_role;
ALTER TABLE public.role_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage role definitions" ON public.role_definitions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE TABLE public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text,
  display_name text,
  role_id uuid REFERENCES public.role_definitions(id) ON DELETE RESTRICT,
  business_id uuid,
  assignment_scope text NOT NULL DEFAULT 'global',
  access_status text NOT NULL DEFAULT 'proposed',
  granted_by uuid,
  granted_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_assignments TO authenticated;
GRANT ALL ON public.user_role_assignments TO service_role;
ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage user role assignments" ON public.user_role_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));
CREATE INDEX idx_user_role_status ON public.user_role_assignments (access_status, expires_at);

CREATE TABLE public.module_permission_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.role_definitions(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  business_id uuid,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  can_export boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_manage_settings boolean NOT NULL DEFAULT false,
  can_trigger_external_action boolean NOT NULL DEFAULT false,
  sensitivity_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, module_name, business_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.module_permission_matrix TO authenticated;
GRANT ALL ON public.module_permission_matrix TO service_role;
ALTER TABLE public.module_permission_matrix ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage permission matrix" ON public.module_permission_matrix
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_name text,
  requester_email text,
  requested_role_id uuid REFERENCES public.role_definitions(id) ON DELETE SET NULL,
  business_id uuid,
  requested_scope text,
  reason text,
  request_status text NOT NULL DEFAULT 'draft',
  founder_approval_required boolean NOT NULL DEFAULT true,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage access requests" ON public.access_requests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE TABLE public.access_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_role_assignment_id uuid REFERENCES public.user_role_assignments(id) ON DELETE CASCADE,
  review_type text NOT NULL DEFAULT 'periodic',
  review_status text NOT NULL DEFAULT 'pending',
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  is_test_data boolean NOT NULL DEFAULT false,
  audit_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_review_events TO authenticated;
GRANT ALL ON public.access_review_events TO service_role;
ALTER TABLE public.access_review_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "founders manage access review events" ON public.access_review_events
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'founder'::app_role));

CREATE TRIGGER trg_role_defs_updated BEFORE UPDATE ON public.role_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_user_role_updated BEFORE UPDATE ON public.user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_perm_matrix_updated BEFORE UPDATE ON public.module_permission_matrix
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_access_req_updated BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.role_definitions (role_code, role_name, role_description, sensitivity_level, default_permissions) VALUES
  ('founder_admin',             'Founder / Admin',          'Full platform access. Final approver for all external actions.', 'critical', '{"all":true}'),
  ('founder_view_only',         'Founder (View only)',      'Read-only founder context, no mutations.', 'high', '{"view":true}'),
  ('va_operator',               'VA / Operator',            'Day-to-day operations, business/module scoped, no external action.', 'medium', '{"view":true,"edit":true}'),
  ('sales_reviewer',            'Sales Reviewer',           'Reviews sales conversations and pipeline. No external send.', 'medium', '{"view":true}'),
  ('customer_support_operator', 'Customer Support Operator','Handles support tickets internally. No public posts.', 'medium', '{"view":true,"edit":true}'),
  ('finance_viewer',            'Finance Viewer',           'Read-only finance/revenue. No payouts.', 'high', '{"view":true}'),
  ('finance_operator',          'Finance Operator',         'Edits internal finance records. Payouts approval-gated.', 'high', '{"view":true,"edit":true}'),
  ('technical_admin',           'Technical Admin',          'Platform tech operations. No raw secrets exposure.', 'critical', '{"view":true,"edit":true,"manage_settings":true}'),
  ('adviser_read_only',         'Adviser (Read-only)',      'Read-only adviser pack and selected packs.', 'medium', '{"view":true}'),
  ('legal_adviser',             'Legal Adviser',            'Read-only access to legal/privacy/contract packs.', 'high', '{"view":true}'),
  ('tax_adviser',               'Tax Adviser',              'Read-only access to entity/tax packs.', 'high', '{"view":true}'),
  ('business_operator',         'Business Operator',        'Per-business operator. Business-scoped only.', 'medium', '{"view":true,"edit":true}'),
  ('contractor_limited',        'Contractor (Limited)',     'Scoped to specific deliverables. Temporary.', 'medium', '{"view":true}'),
  ('vendor_limited',            'Vendor (Limited)',         'Vendor-portal scope only. No internal data.', 'medium', '{"view":true}'),
  ('auditor_read_only',         'Auditor (Read-only)',      'Audit trail / compliance read-only.', 'high', '{"view":true,"export":true}');
