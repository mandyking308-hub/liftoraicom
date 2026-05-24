
CREATE TABLE IF NOT EXISTS public.manual_source_layers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_key text NOT NULL UNIQUE,
  layer_name text NOT NULL,
  purpose text NOT NULL,
  retrieval_priority integer NOT NULL,
  is_portable boolean NOT NULL DEFAULT false,
  current_version text,
  last_reviewed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_source_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read source layers"
  ON public.manual_source_layers FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders/admins write source layers"
  ON public.manual_source_layers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_manual_source_layers_updated_at
  BEFORE UPDATE ON public.manual_source_layers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.manual_source_layers (layer_key, layer_name, purpose, retrieval_priority, is_portable, current_version) VALUES
  ('command_centre_truth_sync', 'Command Centre Truth Sync', 'Current live system state (highest priority for current state queries)', 1, false, 'live'),
  ('full_technical_manual', 'Full Technical / Kitchen-Sink Manual', 'Canonical internal source of truth for architecture, routes, tables, edge functions, gates, agents, acceptance tests, hidden panels, diagnostics, legacy decisions, parked work, safety rules', 2, false, '1.0'),
  ('user_manual', 'User Manual', 'Plain-English operator guide inside Liftor for Mandy, operators, Sharp Brains and assistants', 3, false, '1.4'),
  ('build_log', 'Build Log / Acceptance Reports', 'Historical decisions, build phases, deferred work, acceptance run history', 4, false, 'append-only'),
  ('business_manuals', 'Business Manuals', 'Per-business tone, offer, rules, assets (selected business scope only)', 5, false, 'per-business'),
  ('slim_mandy_manual', 'Slim Mandy Manual', 'Short portable manual Mandy can download/upload to ChatGPT or advisers — high-level state, safety rules, next actions only. NOT the technical source of truth.', 6, true, '1.0')
ON CONFLICT (layer_key) DO UPDATE SET
  layer_name = EXCLUDED.layer_name,
  purpose = EXCLUDED.purpose,
  retrieval_priority = EXCLUDED.retrieval_priority,
  is_portable = EXCLUDED.is_portable;

CREATE TABLE IF NOT EXISTS public.manual_update_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_key text NOT NULL,
  section_key text,
  title text NOT NULL,
  change_type text NOT NULL DEFAULT 'edit',
  old_content text,
  new_content text NOT NULL,
  reason text,
  source text NOT NULL DEFAULT 'system',
  status text NOT NULL DEFAULT 'draft',
  requires_founder_review boolean NOT NULL DEFAULT true,
  reviewed_by uuid,
  reviewed_at timestamptz,
  merged_at timestamptz,
  version_after_merge text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.manual_update_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders/admins read manual drafts"
  ON public.manual_update_drafts FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));
CREATE POLICY "Founders/admins write manual drafts"
  ON public.manual_update_drafts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'founder'));

CREATE TRIGGER update_manual_update_drafts_updated_at
  BEFORE UPDATE ON public.manual_update_drafts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_manual_update_drafts_layer ON public.manual_update_drafts(layer_key, status);
