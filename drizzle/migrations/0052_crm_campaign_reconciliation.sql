ALTER TABLE public.smartlead_lead_snapshots
  ADD COLUMN IF NOT EXISTS current_step integer,
  ADD COLUMN IF NOT EXISTS sending_mailbox text,
  ADD COLUMN IF NOT EXISTS is_bounced boolean,
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_from_provider_at timestamptz;
ALTER TABLE public.smartlead_sync_runs ADD COLUMN IF NOT EXISTS reconciliation jsonb;

CREATE OR REPLACE FUNCTION public.crm_summary()
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v jsonb;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  WITH base AS (SELECT c.* FROM public.contacts c WHERE c.archived_at IS NULL AND coalesce(c.is_internal,false) = false),
  inc AS (SELECT DISTINCT lower(email) e FROM public.smartlead_lead_snapshots WHERE removed_from_provider_at IS NULL)
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM base),
    'usable', (SELECT count(*) FROM base WHERE email_verified_status = 'verified' AND NOT coalesce(is_globally_suppressed,false) AND NOT coalesce(hard_bounced,false) AND unsubscribed_at IS NULL AND do_not_contact_at IS NULL),
    'in_campaign', (SELECT count(*) FROM base b WHERE lower(b.email) IN (SELECT e FROM inc)),
    'types', (SELECT coalesce(jsonb_object_agg(t, n), '{}') FROM (SELECT substr(tag, 6) t, count(*) n FROM base, unnest(tags) tag WHERE tag LIKE 'type:%' GROUP BY 1) x),
    'countries', (SELECT coalesce(jsonb_agg(country ORDER BY country), '[]') FROM (SELECT DISTINCT country FROM base WHERE country IS NOT NULL AND country <> '') y)
  ) INTO v;
  RETURN v;
END $function$;

-- p_campaign = '*' means "any campaign".
CREATE OR REPLACE FUNCTION public.crm_people_search(p_type text DEFAULT NULL::text, p_country text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_campaign text DEFAULT NULL::text, p_not_in_campaign boolean DEFAULT false, p_not_contacted_days integer DEFAULT NULL::integer, p_usable_only boolean DEFAULT false, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_ids_only boolean DEFAULT false)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_total int; v_rows jsonb; v_ids jsonb;
BEGIN
  IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  CREATE TEMP TABLE IF NOT EXISTS _crm_hits (id uuid) ON COMMIT DROP;
  TRUNCATE _crm_hits;
  INSERT INTO _crm_hits
  SELECT c.id FROM public.contacts c
  WHERE c.archived_at IS NULL AND coalesce(c.is_internal,false) = false
    AND (p_type IS NULL OR ('type:'||p_type) = ANY(coalesce(c.tags,'{}')))
    AND (p_country IS NULL OR c.country ILIKE p_country)
    AND (p_search IS NULL OR c.email ILIKE '%'||p_search||'%' OR c.name ILIKE '%'||p_search||'%' OR c.company ILIKE '%'||p_search||'%')
    AND (NOT p_usable_only OR (c.email_verified_status = 'verified' AND NOT coalesce(c.is_globally_suppressed,false) AND NOT coalesce(c.hard_bounced,false) AND c.unsubscribed_at IS NULL AND c.do_not_contact_at IS NULL))
    AND (
      CASE
        WHEN p_campaign IS NULL AND NOT p_not_in_campaign THEN true
        WHEN (p_campaign IS NULL OR p_campaign = '*') AND p_not_in_campaign THEN NOT EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.removed_from_provider_at IS NULL AND lower(s.email) = lower(c.email))
        WHEN p_campaign = '*' THEN EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.removed_from_provider_at IS NULL AND lower(s.email) = lower(c.email))
        WHEN p_not_in_campaign THEN NOT EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.removed_from_provider_at IS NULL AND s.provider_campaign_id = p_campaign AND lower(s.email) = lower(c.email))
        ELSE EXISTS (SELECT 1 FROM public.smartlead_lead_snapshots s WHERE s.removed_from_provider_at IS NULL AND s.provider_campaign_id = p_campaign AND lower(s.email) = lower(c.email))
      END)
    AND (p_not_contacted_days IS NULL OR c.last_contacted_at IS NULL OR c.last_contacted_at < now() - make_interval(days => p_not_contacted_days));
  SELECT count(*) INTO v_total FROM _crm_hits;
  IF p_ids_only THEN
    SELECT coalesce(jsonb_agg(id), '[]') INTO v_ids FROM (SELECT id FROM _crm_hits LIMIT 5000) x;
    RETURN jsonb_build_object('total', v_total, 'ids', v_ids);
  END IF;
  SELECT coalesce(jsonb_agg(row_to_json(t)), '[]') INTO v_rows FROM (
    SELECT c.id, c.email, c.name, c.company, c.role, c.country, c.tags, c.email_verified_status, c.last_contacted_at, c.last_replied_at,
      c.hard_bounced, c.unsubscribed_at, c.do_not_contact_at, c.is_globally_suppressed,
      (coalesce(c.is_globally_suppressed,false) OR coalesce(c.hard_bounced,false) OR c.unsubscribed_at IS NOT NULL OR c.do_not_contact_at IS NOT NULL) AS blocked,
      (SELECT coalesce(jsonb_agg(DISTINCT s.provider_campaign_id), '[]') FROM public.smartlead_lead_snapshots s WHERE s.removed_from_provider_at IS NULL AND lower(s.email) = lower(c.email)) AS campaigns
    FROM public.contacts c JOIN _crm_hits h ON h.id = c.id
    ORDER BY c.created_at DESC LIMIT least(p_limit, 200) OFFSET greatest(p_offset, 0)) t;
  RETURN jsonb_build_object('total', v_total, 'rows', v_rows);
END $function$;