ALTER TABLE public.smartlead_lead_snapshots ADD COLUMN IF NOT EXISTS history_checked_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS smartlead_active_response_per_reply ON public.smartlead_reply_drafts(source_reply_row_id) WHERE source_reply_row_id IS NOT NULL AND revised_from IS NULL AND status IN ('draft','approved','sending','sent','send_unknown');
CREATE OR REPLACE FUNCTION public.crm_validate_response_transition() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE latest uuid;
BEGIN
IF TG_OP='INSERT' AND NEW.source_reply_row_id IS NOT NULL THEN
SELECT id INTO latest FROM public.smartlead_thread_messages WHERE business_id=NEW.business_id AND provider_campaign_id=NEW.provider_campaign_id AND provider_lead_id=NEW.provider_lead_id AND direction='REPLY' ORDER BY sent_at DESC NULLS LAST,created_at DESC,id DESC LIMIT 1;
IF latest IS DISTINCT FROM NEW.source_reply_row_id THEN RAISE EXCEPTION 'A newer reply arrived while preparing this response'; END IF;
END IF;
IF TG_OP='UPDATE' AND NEW.status='sending' AND OLD.status<>'sending' THEN
IF OLD.status<>'approved' OR OLD.approved_by IS NULL OR OLD.approved_at IS NULL THEN RAISE EXCEPTION 'Founder approval is required before sending'; END IF;
END IF;
IF TG_OP='UPDATE' AND NEW.status='sent' AND OLD.status NOT IN ('sending','sent') THEN RAISE EXCEPTION 'A provider-confirmed send attempt is required'; END IF;
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_validate_response_transition() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER a_crm_validate_response_transition BEFORE INSERT OR UPDATE ON public.smartlead_reply_drafts FOR EACH ROW EXECUTE FUNCTION public.crm_validate_response_transition();
CREATE OR REPLACE FUNCTION public.crm_refresh_thread_identity() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
UPDATE public.smartlead_thread_messages SET match_status=match_status WHERE business_id=NEW.business_id AND provider_campaign_id=NEW.provider_campaign_id AND provider_lead_id=NEW.provider_lead_id AND (match_status='unmatched' OR contact_id IS DISTINCT FROM NEW.liftor_contact_id);
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_refresh_thread_identity() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_refresh_thread_identity AFTER INSERT OR UPDATE ON public.smartlead_lead_snapshots FOR EACH ROW EXECUTE FUNCTION public.crm_refresh_thread_identity();