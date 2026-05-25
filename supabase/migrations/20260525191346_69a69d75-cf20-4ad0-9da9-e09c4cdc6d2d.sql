-- 1. delivery_orders
CREATE TABLE public.delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  customer_id uuid,
  deal_id uuid,
  quote_id uuid,
  invoice_id uuid,
  product_id uuid,
  offer_id uuid,
  order_status text NOT NULL DEFAULT 'pending' CHECK (order_status IN ('pending','active','blocked','delivered','completed','cancelled','refunded')),
  delivery_type text NOT NULL DEFAULT 'service' CHECK (delivery_type IN ('digital','service','consultation','subscription','project','custom')),
  start_date timestamptz,
  due_date timestamptz,
  completed_at timestamptz,
  customer_requirements text,
  delivery_summary text,
  risk_flags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage delivery_orders" ON public.delivery_orders
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_delivery_orders_updated BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_delivery_orders_business ON public.delivery_orders(business_id);
CREATE INDEX idx_delivery_orders_status ON public.delivery_orders(order_status);

-- 2. delivery_tasks
CREATE TABLE public.delivery_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  delivery_order_id uuid REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  task_name text NOT NULL,
  task_type text NOT NULL DEFAULT 'setup' CHECK (task_type IN ('setup','onboarding','production','review','approval','handoff','customer_message','file_share','meeting','support')),
  task_status text NOT NULL DEFAULT 'pending' CHECK (task_status IN ('pending','in_progress','blocked','approval_required','completed','cancelled')),
  assigned_to_type text DEFAULT 'ai_agent' CHECK (assigned_to_type IN ('ai_agent','human','founder','vendor')),
  assigned_to text,
  due_at timestamptz,
  priority text DEFAULT 'medium',
  blocker_reason text,
  customer_visible boolean NOT NULL DEFAULT false,
  founder_approval_required boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.delivery_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage delivery_tasks" ON public.delivery_tasks
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_delivery_tasks_updated BEFORE UPDATE ON public.delivery_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_delivery_tasks_order ON public.delivery_tasks(delivery_order_id);
CREATE INDEX idx_delivery_tasks_status ON public.delivery_tasks(task_status);

-- 3. delivery_completion_proof
CREATE TABLE public.delivery_completion_proof (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  delivery_order_id uuid REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  proof_type text NOT NULL DEFAULT 'note' CHECK (proof_type IN ('file','note','link','screenshot','customer_confirmation','payment_confirmation','manual')),
  proof_summary text,
  proof_url text,
  customer_confirmed boolean NOT NULL DEFAULT false,
  verified_by uuid,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  audit_metadata jsonb DEFAULT '{}'::jsonb
);
ALTER TABLE public.delivery_completion_proof ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage delivery_completion_proof" ON public.delivery_completion_proof
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));

-- 4. delivery_capacity
CREATE TABLE public.delivery_capacity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  capacity_period_start timestamptz NOT NULL,
  capacity_period_end timestamptz NOT NULL,
  max_orders integer DEFAULT 0,
  max_hours numeric DEFAULT 0,
  current_orders integer DEFAULT 0,
  current_hours numeric DEFAULT 0,
  capacity_status text NOT NULL DEFAULT 'available' CHECK (capacity_status IN ('available','watch','full','over_capacity')),
  recommended_action text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.delivery_capacity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders manage delivery_capacity" ON public.delivery_capacity
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'founder'));
CREATE TRIGGER trg_delivery_capacity_updated BEFORE UPDATE ON public.delivery_capacity
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();