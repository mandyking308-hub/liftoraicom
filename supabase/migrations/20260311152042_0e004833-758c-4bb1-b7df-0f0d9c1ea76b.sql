
-- Platform roles table (custom role definitions)
CREATE TABLE public.platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  access_level text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage platform roles" ON public.platform_roles FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Authenticated can view roles" ON public.platform_roles FOR SELECT TO authenticated USING (true);

CREATE TRIGGER update_platform_roles_updated_at BEFORE UPDATE ON public.platform_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Role permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  permission text NOT NULL,
  granted boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(role_id, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage role permissions" ON public.role_permissions FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Authenticated can view permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- User platform role assignments (links users to platform_roles)
CREATE TABLE public.user_platform_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.platform_roles(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(user_id, role_id)
);

ALTER TABLE public.user_platform_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage user platform roles" ON public.user_platform_roles FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE POLICY "Users can view own platform roles" ON public.user_platform_roles FOR SELECT USING (user_id = auth.uid());

-- Access audit log
CREATE TABLE public.access_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name text DEFAULT '',
  action text NOT NULL,
  details text DEFAULT '',
  ip_address text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can view access audit log" ON public.access_audit_log FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));

-- Seed default platform roles
INSERT INTO public.platform_roles (name, description, access_level) VALUES
  ('Platform Administrator', 'Full platform visibility and control across all organisations and systems', 'platform'),
  ('Liftor AI Engineer', 'Internal engineering access to all systems, workflows, and agents', 'platform'),
  ('Organisation Administrator', 'Full access within a single organisation', 'organisation'),
  ('Operations User', 'Can view and interact with systems but cannot modify configurations', 'organisation'),
  ('Viewer', 'Read-only access to dashboards and reports', 'system');

-- Seed default permissions for each role
INSERT INTO public.role_permissions (role_id, permission) 
SELECT r.id, p.perm FROM public.platform_roles r
CROSS JOIN (VALUES 
  ('view_systems'), ('manage_systems'), ('view_automations'), ('manage_automations'),
  ('view_analytics'), ('manage_users'), ('manage_roles'), ('view_audit_log'),
  ('manage_organisations'), ('view_knowledge'), ('manage_knowledge')
) AS p(perm) WHERE r.name = 'Platform Administrator';

INSERT INTO public.role_permissions (role_id, permission) 
SELECT r.id, p.perm FROM public.platform_roles r
CROSS JOIN (VALUES 
  ('view_systems'), ('manage_systems'), ('view_automations'), ('manage_automations'),
  ('view_analytics'), ('view_knowledge'), ('manage_knowledge')
) AS p(perm) WHERE r.name = 'Liftor AI Engineer';

INSERT INTO public.role_permissions (role_id, permission) 
SELECT r.id, p.perm FROM public.platform_roles r
CROSS JOIN (VALUES 
  ('view_systems'), ('manage_systems'), ('view_automations'), ('view_analytics'), ('manage_users')
) AS p(perm) WHERE r.name = 'Organisation Administrator';

INSERT INTO public.role_permissions (role_id, permission) 
SELECT r.id, p.perm FROM public.platform_roles r
CROSS JOIN (VALUES 
  ('view_systems'), ('view_automations'), ('view_analytics')
) AS p(perm) WHERE r.name = 'Operations User';

INSERT INTO public.role_permissions (role_id, permission) 
SELECT r.id, p.perm FROM public.platform_roles r
CROSS JOIN (VALUES 
  ('view_systems'), ('view_analytics')
) AS p(perm) WHERE r.name = 'Viewer';
