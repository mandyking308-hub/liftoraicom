
-- Treasury / Cashflow / Accounting tables

CREATE TABLE IF NOT EXISTS public.group_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid references public.group_entity_register(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  account_label text not null,
  bank_name text,
  country text,
  currency text,
  account_type text,
  account_status text default 'active',
  opening_balance numeric,
  current_balance_estimate numeric,
  last_reconciled_at timestamptz,
  credentials_stored boolean default false,
  never_display_credentials boolean default true,
  notes text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.cashflow_forecasts (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  business_id uuid,
  forecast_name text not null,
  period_start date not null,
  period_end date not null,
  opening_cash numeric,
  expected_inflows numeric default 0,
  expected_outflows numeric default 0,
  tax_reserve numeric default 0,
  net_cash_position numeric,
  runway_months numeric,
  risk_level text default 'medium',
  assumptions jsonb default '[]'::jsonb,
  forecast_status text default 'draft',
  founder_review_required boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.cashflow_forecast_items (
  id uuid primary key default gen_random_uuid(),
  forecast_id uuid references public.cashflow_forecasts(id) on delete cascade,
  business_id uuid,
  entity_id uuid,
  item_type text not null,
  item_label text not null,
  expected_date date,
  amount numeric not null default 0,
  currency text default 'GBP',
  confidence text default 'medium',
  source_table text,
  source_id uuid,
  status text default 'expected',
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS public.accounting_close_tasks (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid,
  business_id uuid,
  period_start date,
  period_end date,
  task_name text not null,
  task_type text not null,
  status text default 'pending',
  due_date date,
  responsible_party text,
  adviser_required boolean default false,
  evidence_document_id uuid,
  blockers jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

ALTER TABLE public.group_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cashflow_forecast_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounting_close_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage bank accounts" ON public.group_bank_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage cashflow forecasts" ON public.cashflow_forecasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage forecast items" ON public.cashflow_forecast_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE POLICY "Admins manage close tasks" ON public.accounting_close_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE INDEX IF NOT EXISTS idx_bank_accounts_entity ON public.group_bank_accounts(entity_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_business ON public.group_bank_accounts(business_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_forecasts_period ON public.cashflow_forecasts(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_cashflow_items_forecast ON public.cashflow_forecast_items(forecast_id);
CREATE INDEX IF NOT EXISTS idx_close_tasks_due ON public.accounting_close_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_close_tasks_status ON public.accounting_close_tasks(status);
