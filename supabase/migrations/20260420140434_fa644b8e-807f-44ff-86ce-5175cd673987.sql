-- Tighten insert policy on system_changes (was WITH CHECK true)
DROP POLICY IF EXISTS "Service writes system_changes" ON public.system_changes;
CREATE POLICY "Founders insert system_changes" ON public.system_changes
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'founder'::app_role));

-- record_system_change is SECURITY DEFINER so it bypasses RLS for trigger-style writes;
-- recreate to confirm search_path is locked.
CREATE OR REPLACE FUNCTION public.record_system_change(
  _entity_type text, _entity_id uuid, _entity_key text,
  _change_type text, _summary text, _manual_version integer DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  INSERT INTO system_changes (entity_type, entity_id, entity_key, change_type, summary, manual_version)
  VALUES (_entity_type, _entity_id, COALESCE(_entity_key,''), _change_type, COALESCE(_summary,''), _manual_version)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;