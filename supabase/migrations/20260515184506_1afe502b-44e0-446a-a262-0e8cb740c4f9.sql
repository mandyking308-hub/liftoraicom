
CREATE TABLE public.product_roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  product_name text,
  item_type text NOT NULL,
  title text NOT NULL,
  description text,
  priority_level text DEFAULT 'normal',
  status text DEFAULT 'backlog',
  customer_requested boolean DEFAULT false,
  related_contact_id uuid,
  competitor_signal boolean DEFAULT false,
  target_release_date date,
  owner_agent_key text DEFAULT 'ops_agent',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.qa_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  module_key text,
  test_name text NOT NULL,
  test_type text NOT NULL,
  expected_result text,
  status text DEFAULT 'active',
  last_run_at timestamptz,
  last_result text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.release_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  release_name text NOT NULL,
  release_status text DEFAULT 'draft',
  planned_release_date date,
  included_items jsonb DEFAULT '[]'::jsonb,
  qa_status text DEFAULT 'not_checked',
  rollback_plan text,
  founder_approval_required boolean DEFAULT true,
  approved_at timestamptz,
  deployed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.product_roadmap_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage roadmap" ON public.product_roadmap_items
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage qa" ON public.qa_test_cases
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage releases" ON public.release_plans
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_product_roadmap_items_updated_at
  BEFORE UPDATE ON public.product_roadmap_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_test_cases_updated_at
  BEFORE UPDATE ON public.qa_test_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_plans_updated_at
  BEFORE UPDATE ON public.release_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_roadmap_status ON public.product_roadmap_items(status);
CREATE INDEX idx_roadmap_type ON public.product_roadmap_items(item_type);
CREATE INDEX idx_qa_status ON public.qa_test_cases(status);
CREATE INDEX idx_release_status ON public.release_plans(release_status);
