
-- Launched platforms table
CREATE TABLE public.launched_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  organisation_name text NOT NULL DEFAULT '',
  industry text NOT NULL DEFAULT '',
  platform_purpose text DEFAULT '',
  template_id uuid REFERENCES public.system_templates(id) ON DELETE SET NULL,
  template_name text DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  launched_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.launched_platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage launched platforms" ON public.launched_platforms FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
CREATE TRIGGER update_launched_platforms_updated_at BEFORE UPDATE ON public.launched_platforms FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Launch checklist items
CREATE TABLE public.launch_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.launched_platforms(id) ON DELETE CASCADE,
  item text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.launch_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founders can manage launch checklist" ON public.launch_checklist FOR ALL USING (has_role(auth.uid(), 'founder'::app_role));
