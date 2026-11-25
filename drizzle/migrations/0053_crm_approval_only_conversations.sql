ALTER TABLE public.smartlead_thread_messages ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id), ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.business_contact_relationships(id), ADD COLUMN IF NOT EXISTS match_status text NOT NULL DEFAULT 'unmatched', ADD COLUMN IF NOT EXISTS reply_kind text;
ALTER TABLE public.smartlead_reply_drafts ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES public.contacts(id), ADD COLUMN IF NOT EXISTS relationship_id uuid REFERENCES public.business_contact_relationships(id), ADD COLUMN IF NOT EXISTS approved_by uuid, ADD COLUMN IF NOT EXISTS approved_at timestamptz, ADD COLUMN IF NOT EXISTS reviewed_at timestamptz, ADD COLUMN IF NOT EXISTS source_reply_row_id uuid REFERENCES public.smartlead_thread_messages(id), ADD COLUMN IF NOT EXISTS revised_from uuid REFERENCES public.smartlead_reply_drafts(id);
CREATE INDEX IF NOT EXISTS smartlead_thread_contact_idx ON public.smartlead_thread_messages(contact_id,business_id,provider_campaign_id,sent_at);
CREATE INDEX IF NOT EXISTS smartlead_draft_contact_idx ON public.smartlead_reply_drafts(contact_id,business_id,provider_campaign_id,created_at);
CREATE OR REPLACE FUNCTION public.crm_smartlead_identity(p_business uuid,p_campaign text,p_lead text) RETURNS TABLE(contact_id uuid,relationship_id uuid) LANGUAGE sql STABLE SECURITY INVOKER SET search_path=public AS $$
WITH scope AS (SELECT count(DISTINCT business_id)=1 AND bool_or(business_id=p_business AND mapping_status='mapped') AS ok FROM public.outbound_provider_campaign_mappings WHERE provider_type='smartlead' AND provider_campaign_id=p_campaign), candidates AS (SELECT DISTINCT r.contact_id,r.id AS relationship_id,s.liftor_contact_id AS pinned FROM public.smartlead_lead_snapshots s JOIN public.business_contact_relationships r ON r.business_id=s.business_id JOIN public.contacts c ON c.id=r.contact_id AND lower(trim(c.email))=lower(trim(s.email)) CROSS JOIN scope WHERE scope.ok AND s.business_id=p_business AND s.provider_campaign_id=p_campaign AND s.provider_lead_id=p_lead) SELECT contact_id,relationship_id FROM candidates WHERE (SELECT count(*) FROM candidates)=1 AND (pinned IS NULL OR pinned=contact_id);
$$;
REVOKE ALL ON FUNCTION public.crm_smartlead_identity(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_smartlead_identity(uuid,text,text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.crm_link_smartlead_thread() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v record; f text; s text; b text;
BEGIN
SELECT * INTO v FROM public.crm_smartlead_identity(NEW.business_id,NEW.provider_campaign_id,NEW.provider_lead_id);
NEW.contact_id:=v.contact_id; NEW.relationship_id:=v.relationship_id; NEW.match_status:=CASE WHEN v.contact_id IS NULL THEN 'unmatched' ELSE 'matched' END;
f:=lower(coalesce(NEW.from_email,'')); s:=lower(coalesce(NEW.subject,'')); b:=left(lower(regexp_replace(coalesce(NEW.body_html,''),'<[^>]*>',' ','g')),1500);
NEW.reply_kind:=CASE WHEN NEW.direction<>'REPLY' THEN 'sent' WHEN f ~ 'mailer-daemon|postmaster|mail delivery (subsystem|system)' OR s ~ 'undeliverable|undelivered mail|delivery status notification|delivery (has )?failed|mail delivery failed|returned mail|failure notice|address not found' OR b ~ '(550|554)[ -]5\.[0-9]\.[0-9]|recipient address rejected|mailbox (unavailable|not found|does not exist)|user unknown|could not be delivered|wasn''t delivered|address couldn''t be found' THEN 'bounce' WHEN regexp_replace(s,'^(re|aw|fw):\s*','') ~ '^(automatic reply|auto(matic)?[- ]?reply|out of (the )?office|ooo\y|away from)' OR b ~ 'i am (currently )?out of (the )?office|i''m (currently )?out of (the )?office|on annual leave|limited access to (my )?email|i am away until|i will be away' THEN 'auto_reply' ELSE 'reply' END;
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_link_smartlead_thread() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_link_smartlead_thread BEFORE INSERT OR UPDATE ON public.smartlead_thread_messages FOR EACH ROW EXECUTE FUNCTION public.crm_link_smartlead_thread();
CREATE OR REPLACE FUNCTION public.crm_record_smartlead_thread() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NEW.contact_id IS NOT NULL THEN
INSERT INTO public.crm_interaction_ledger(business_id,contact_id,business_contact_relationship_id,source_system,source_channel,channel_key,source_table,source_id,interaction_type,direction,provider_type,provider_campaign_id,provider_lead_id,provider_message_id,subject,summary,occurred_at,matched_status,dedupe_key,founder_review_required,metadata)
VALUES(NEW.business_id,NEW.contact_id,NEW.relationship_id,'smartlead','email','email','smartlead_thread_messages',NEW.id,CASE WHEN NEW.reply_kind='reply' THEN 'email_reply' WHEN NEW.reply_kind='bounce' THEN 'email_bounce' WHEN NEW.reply_kind='auto_reply' THEN 'email_auto_reply' ELSE 'email_sent' END,CASE WHEN NEW.direction='REPLY' THEN 'inbound' ELSE 'outbound' END,'smartlead',NEW.provider_campaign_id,NEW.provider_lead_id,NEW.provider_message_id,NEW.subject,'Full message saved in customer conversation',coalesce(NEW.sent_at,NEW.created_at),'matched','crm-thread:'||NEW.id::text,NEW.reply_kind='reply',jsonb_build_object('thread_message_id',NEW.id,'reply_kind',NEW.reply_kind)) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END IF; RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_record_smartlead_thread() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_record_smartlead_thread AFTER INSERT OR UPDATE ON public.smartlead_thread_messages FOR EACH ROW EXECUTE FUNCTION public.crm_record_smartlead_thread();
CREATE OR REPLACE FUNCTION public.crm_link_smartlead_draft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v record; reply public.smartlead_thread_messages; actor uuid:=auth.uid();
BEGIN
SELECT * INTO v FROM public.crm_smartlead_identity(NEW.business_id,NEW.provider_campaign_id,NEW.provider_lead_id);
IF v.contact_id IS NULL THEN RAISE EXCEPTION 'Conversation identity is not unambiguous'; END IF;
NEW.contact_id:=v.contact_id; NEW.relationship_id:=v.relationship_id;
IF TG_OP='INSERT' THEN
IF NEW.status<>'draft' OR length(trim(NEW.body)) NOT BETWEEN 1 AND 20000 THEN RAISE EXCEPTION 'Only a nonempty draft can be created'; END IF;
SELECT * INTO reply FROM public.smartlead_thread_messages WHERE business_id=NEW.business_id AND provider_campaign_id=NEW.provider_campaign_id AND provider_lead_id=NEW.provider_lead_id AND direction='REPLY' ORDER BY sent_at DESC NULLS LAST,created_at DESC,id DESC LIMIT 1;
IF reply.id IS NULL OR reply.reply_kind<>'reply' OR reply.contact_id<>v.contact_id THEN RAISE EXCEPTION 'A matched genuine customer reply is required'; END IF;
NEW.source_reply_row_id:=reply.id; NEW.reply_to_message_id:=reply.provider_message_id;
IF actor IS NOT NULL THEN NEW.created_by:=actor; END IF;
NEW.approved_at:=NULL; NEW.approved_by:=NULL; NEW.sent_at:=NULL; NEW.sent_by:=NULL;
ELSIF NEW.body IS DISTINCT FROM OLD.body OR NEW.business_id IS DISTINCT FROM OLD.business_id OR NEW.provider_campaign_id IS DISTINCT FROM OLD.provider_campaign_id OR NEW.provider_lead_id IS DISTINCT FROM OLD.provider_lead_id OR NEW.source_reply_row_id IS DISTINCT FROM OLD.source_reply_row_id THEN RAISE EXCEPTION 'Preserve the original draft; save edits as a new version';
END IF;
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_link_smartlead_draft() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_link_smartlead_draft BEFORE INSERT OR UPDATE ON public.smartlead_reply_drafts FOR EACH ROW EXECUTE FUNCTION public.crm_link_smartlead_draft();
CREATE OR REPLACE FUNCTION public.crm_record_smartlead_draft() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
INSERT INTO public.crm_interaction_ledger(business_id,contact_id,business_contact_relationship_id,source_system,source_channel,channel_key,source_table,source_id,interaction_type,direction,provider_type,provider_campaign_id,provider_lead_id,summary,occurred_at,matched_status,dedupe_key,founder_review_required,metadata)
VALUES(NEW.business_id,NEW.contact_id,NEW.relationship_id,'liftor','email','email','smartlead_reply_drafts',NEW.id,CASE NEW.status WHEN 'sent' THEN 'approved_reply_sent' WHEN 'approved' THEN 'reply_draft_approved' WHEN 'rejected' THEN 'reply_draft_rejected' ELSE 'reply_draft_'||NEW.status END,CASE WHEN NEW.status='sent' THEN 'outbound' ELSE 'internal' END,'smartlead',NEW.provider_campaign_id,NEW.provider_lead_id,CASE NEW.status WHEN 'approved' THEN 'Approved — not sent' WHEN 'sent' THEN 'Provider confirmed response sent' ELSE 'Response '||NEW.status END,coalesce(NEW.sent_at,NEW.reviewed_at,NEW.created_at),'matched','crm-draft:'||NEW.id::text||':'||NEW.status,NEW.status='draft',jsonb_build_object('reply_draft_id',NEW.id,'approved_by',NEW.approved_by,'approved_at',NEW.approved_at,'source_reply_row_id',NEW.source_reply_row_id,'status',NEW.status)) ON CONFLICT(dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.crm_record_smartlead_draft() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER crm_record_smartlead_draft AFTER INSERT OR UPDATE ON public.smartlead_reply_drafts FOR EACH ROW EXECUTE FUNCTION public.crm_record_smartlead_draft();
UPDATE public.smartlead_thread_messages SET match_status=match_status;
REVOKE UPDATE,DELETE ON public.smartlead_reply_drafts FROM authenticated;
CREATE OR REPLACE FUNCTION public.crm_review_reply(p_draft_id uuid,p_expected_body text,p_decision text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.smartlead_reply_drafts; latest uuid; identity record;
BEGIN
IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder access required' USING ERRCODE='42501'; END IF;
IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'Invalid review decision'; END IF;
SELECT * INTO d FROM public.smartlead_reply_drafts WHERE id=p_draft_id FOR UPDATE;
IF d.id IS NULL OR d.body IS DISTINCT FROM p_expected_body THEN RAISE EXCEPTION 'Draft changed; refresh before reviewing'; END IF;
IF d.status=p_decision THEN RETURN jsonb_build_object('ok',true,'status',d.status,'sent',false); END IF;
IF d.status<>'draft' THEN RAISE EXCEPTION 'Draft has already been reviewed'; END IF;
SELECT * INTO identity FROM public.crm_smartlead_identity(d.business_id,d.provider_campaign_id,d.provider_lead_id);
IF identity.contact_id IS NULL OR identity.contact_id<>d.contact_id THEN RAISE EXCEPTION 'Conversation identity changed'; END IF;
SELECT id INTO latest FROM public.smartlead_thread_messages WHERE business_id=d.business_id AND provider_campaign_id=d.provider_campaign_id AND provider_lead_id=d.provider_lead_id AND direction='REPLY' ORDER BY sent_at DESC NULLS LAST,created_at DESC,id DESC LIMIT 1;
IF p_decision='approved' AND latest IS DISTINCT FROM d.source_reply_row_id THEN RAISE EXCEPTION 'A newer reply arrived; prepare a fresh draft'; END IF;
IF p_decision='approved' AND EXISTS(SELECT 1 FROM public.contacts c JOIN public.business_contact_relationships r ON r.contact_id=c.id WHERE c.id=d.contact_id AND r.business_id=d.business_id AND (c.is_globally_suppressed OR c.hard_bounced OR c.do_not_contact_at IS NOT NULL OR c.unsubscribed_at IS NOT NULL OR r.do_not_contact)) THEN RAISE EXCEPTION 'This person must not be contacted'; END IF;
UPDATE public.smartlead_reply_drafts SET status=p_decision,approved_by=CASE WHEN p_decision='approved' THEN auth.uid() ELSE NULL END,approved_at=CASE WHEN p_decision='approved' THEN now() ELSE NULL END,reviewed_at=now(),updated_at=now() WHERE id=d.id;
RETURN jsonb_build_object('ok',true,'status',p_decision,'sent',false);
END; $$;
REVOKE ALL ON FUNCTION public.crm_review_reply(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_review_reply(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.crm_save_reply_version(p_draft_id uuid,p_expected_body text,p_body text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE d public.smartlead_reply_drafts; new_id uuid;
BEGIN
IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder access required' USING ERRCODE='42501'; END IF;
SELECT * INTO d FROM public.smartlead_reply_drafts WHERE id=p_draft_id FOR UPDATE;
IF d.id IS NULL OR d.status<>'draft' OR d.body IS DISTINCT FROM p_expected_body THEN RAISE EXCEPTION 'Draft changed; refresh before editing'; END IF;
INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body,created_by,revised_from,agent_category,agent_summary) VALUES(d.business_id,d.provider_campaign_id,d.provider_lead_id,p_body,auth.uid(),d.id,d.agent_category,d.agent_summary) RETURNING id INTO new_id;
UPDATE public.smartlead_reply_drafts SET status='superseded',reviewed_at=now(),updated_at=now() WHERE id=d.id;
RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.crm_save_reply_version(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_save_reply_version(uuid,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.crm_customer_conversations(p_contact_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
IF NOT public._is_founder_or_admin() THEN RAISE EXCEPTION 'Founder access required' USING ERRCODE='42501'; END IF;
RETURN jsonb_build_object('threads',coalesce((SELECT jsonb_agg(x ORDER BY x.last_at DESC NULLS LAST) FROM (SELECT t.business_id,t.provider_campaign_id,t.provider_lead_id,b.name AS business_name,coalesce(max(c.campaign_name),'Campaign '||t.provider_campaign_id) AS campaign_name,max(t.sent_at) AS last_at FROM public.smartlead_thread_messages t JOIN public.businesses b ON b.id=t.business_id LEFT JOIN public.smartlead_campaign_snapshots c ON c.business_id=t.business_id AND c.provider_campaign_id=t.provider_campaign_id WHERE t.contact_id=p_contact_id GROUP BY t.business_id,t.provider_campaign_id,t.provider_lead_id,b.name) x),'[]'::jsonb),'messages',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.sent_at NULLS LAST,t.created_at,t.id) FROM public.smartlead_thread_messages t WHERE t.contact_id=p_contact_id),'[]'::jsonb),'drafts',coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.created_at DESC) FROM public.smartlead_reply_drafts d WHERE d.contact_id=p_contact_id),'[]'::jsonb));
END; $$;
REVOKE ALL ON FUNCTION public.crm_customer_conversations(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.crm_customer_conversations(uuid) TO authenticated;
COMMENT ON FUNCTION public.crm_review_reply(uuid,text,text) IS 'Founder-only optimistic review. Approval is internal only and never sends; full original draft is preserved.';