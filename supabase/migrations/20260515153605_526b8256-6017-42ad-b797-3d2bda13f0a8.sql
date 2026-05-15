CREATE TABLE public.global_brain_status_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  businesses_total integer NOT NULL DEFAULT 0,
  businesses_active integer NOT NULL DEFAULT 0,
  markets_active integer NOT NULL DEFAULT 0,
  languages_detected integer NOT NULL DEFAULT 0,
  agents_active integer NOT NULL DEFAULT 0,
  agent_tasks_pending integer NOT NULL DEFAULT 0,
  founder_approvals_pending integer NOT NULL DEFAULT 0,
  autopilot_gates_enabled integer NOT NULL DEFAULT 0,
  high_risk_gates_locked integer NOT NULL DEFAULT 0,
  open_self_healing_findings integer NOT NULL DEFAULT 0,
  revenue_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  top_blockers jsonb NOT NULL DEFAULT '[]'::jsonb,
  top_opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_global_brain_snapshot_at ON public.global_brain_status_snapshots(snapshot_at DESC);

ALTER TABLE public.global_brain_status_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins view global brain snapshots"
ON public.global_brain_status_snapshots FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Founders/admins insert global brain snapshots"
ON public.global_brain_status_snapshots FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'founder') OR public.has_role(auth.uid(), 'admin'));