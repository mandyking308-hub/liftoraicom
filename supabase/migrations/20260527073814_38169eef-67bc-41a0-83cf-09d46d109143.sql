
CREATE TABLE public.attention_load_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_open_items INTEGER NOT NULL DEFAULT 0,
  founder_only_items INTEGER NOT NULL DEFAULT 0,
  critical_items INTEGER NOT NULL DEFAULT 0,
  noise_items INTEGER NOT NULL DEFAULT 0,
  delegated_items INTEGER NOT NULL DEFAULT 0,
  deferred_items INTEGER NOT NULL DEFAULT 0,
  overload_level TEXT NOT NULL DEFAULT 'normal',
  notes TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_load_snapshots TO authenticated;
GRANT ALL ON public.attention_load_snapshots TO service_role;
ALTER TABLE public.attention_load_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_load_snapshots" ON public.attention_load_snapshots FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attention_noise_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  match_pattern TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'suppress',
  reason TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_noise_rules TO authenticated;
GRANT ALL ON public.attention_noise_rules TO service_role;
ALTER TABLE public.attention_noise_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_noise_rules" ON public.attention_noise_rules FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attention_focus_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_ref TEXT,
  business_name TEXT,
  urgency INTEGER NOT NULL DEFAULT 3,
  value INTEGER NOT NULL DEFAULT 3,
  risk INTEGER NOT NULL DEFAULT 3,
  founder_only BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL DEFAULT 'operational',
  status TEXT NOT NULL DEFAULT 'open',
  rationale TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_focus_priorities TO authenticated;
GRANT ALL ON public.attention_focus_priorities TO service_role;
ALTER TABLE public.attention_focus_priorities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_focus_priorities" ON public.attention_focus_priorities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attention_fatigue_warnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warning_type TEXT NOT NULL,
  detail TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  recommended_action TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_fatigue_warnings TO authenticated;
GRANT ALL ON public.attention_fatigue_warnings TO service_role;
ALTER TABLE public.attention_fatigue_warnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_fatigue_warnings" ON public.attention_fatigue_warnings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attention_delegation_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  source_module TEXT NOT NULL,
  source_ref TEXT,
  recommended_action TEXT NOT NULL DEFAULT 'delegate',
  recommended_owner TEXT,
  defer_until DATE,
  status TEXT NOT NULL DEFAULT 'recommended',
  founder_decision TEXT,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_delegation_items TO authenticated;
GRANT ALL ON public.attention_delegation_items TO service_role;
ALTER TABLE public.attention_delegation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_delegation_items" ON public.attention_delegation_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.attention_never_hide_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,
  reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  is_test_data BOOLEAN NOT NULL DEFAULT false,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attention_never_hide_items TO authenticated;
GRANT ALL ON public.attention_never_hide_items TO service_role;
ALTER TABLE public.attention_never_hide_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage attention_never_hide_items" ON public.attention_never_hide_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
