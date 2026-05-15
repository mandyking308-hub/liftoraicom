CREATE TABLE public.customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid REFERENCES public.businesses(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  organisation_id uuid,
  package_id uuid,
  subscription_name text NOT NULL,
  subscription_status text NOT NULL DEFAULT 'draft',
  billing_frequency text,
  amount numeric,
  currency text NOT NULL DEFAULT 'GBP',
  start_date date,
  renewal_date date,
  cancellation_date date,
  next_invoice_due date,
  payment_status text,
  churn_risk text,
  founder_review_required boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage customer subscriptions"
ON public.customer_subscriptions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_customer_subscriptions_updated_at
BEFORE UPDATE ON public.customer_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.renewal_review_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid,
  contact_id uuid,
  subscription_id uuid REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  review_type text NOT NULL,
  due_at timestamptz,
  review_status text NOT NULL DEFAULT 'pending',
  recommendation text,
  risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  founder_review_required boolean NOT NULL DEFAULT true,
  owner_agent_key text NOT NULL DEFAULT 'customer_success_agent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.renewal_review_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage renewal review tasks"
ON public.renewal_review_tasks
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER trg_renewal_review_tasks_updated_at
BEFORE UPDATE ON public.renewal_review_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_csub_business ON public.customer_subscriptions(business_id);
CREATE INDEX idx_csub_renewal ON public.customer_subscriptions(renewal_date);
CREATE INDEX idx_csub_status ON public.customer_subscriptions(subscription_status);
CREATE INDEX idx_rrt_subscription ON public.renewal_review_tasks(subscription_id);
CREATE INDEX idx_rrt_due ON public.renewal_review_tasks(due_at);
CREATE INDEX idx_rrt_status ON public.renewal_review_tasks(review_status);