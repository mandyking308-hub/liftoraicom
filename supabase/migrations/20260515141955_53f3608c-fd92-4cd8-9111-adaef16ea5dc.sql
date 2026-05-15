
CREATE TABLE public.portfolio_operating_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL DEFAULT current_date,
  total_businesses integer NOT NULL DEFAULT 0,
  active_businesses integer NOT NULL DEFAULT 0,
  setup_businesses integer NOT NULL DEFAULT 0,
  blocked_businesses integer NOT NULL DEFAULT 0,
  approvals_pending integer NOT NULL DEFAULT 0,
  agent_tasks_pending integer NOT NULL DEFAULT 0,
  proposals_pending integer NOT NULL DEFAULT 0,
  open_deals integer NOT NULL DEFAULT 0,
  invoices_outstanding numeric NOT NULL DEFAULT 0,
  revenue_last_30_days numeric NOT NULL DEFAULT 0,
  critical_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pos_date ON public.portfolio_operating_snapshots(snapshot_date DESC);

ALTER TABLE public.portfolio_operating_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders manage portfolio snapshots"
  ON public.portfolio_operating_snapshots FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
