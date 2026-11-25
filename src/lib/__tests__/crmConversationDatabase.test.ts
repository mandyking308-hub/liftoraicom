import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";

// Every fixture is transactional and rolled back, including its audit entries.
// Opt-in local socket only: never run fixtures against the managed production connection.
const socket = process.env.CRM_CONVERSATION_TEST_PGHOST;
const database = socket?.startsWith("/tmp/") ? describe : describe.skip;
const testEnv = { ...process.env, PGHOST: socket, PGPORT: "55439", PGUSER: "postgres", PGDATABASE: "postgres", PGPASSWORD: "", PGSSLMODE: "disable" };
function rule(body: string) {
  execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1", "-c", `
    BEGIN;
    DO $test$
    DECLARE biz uuid; campaign text; person uuid:=gen_random_uuid(); rel uuid; msg uuid; draft uuid;
      second uuid; response jsonb; failed boolean:=false; founder uuid; fixture_email text;
    BEGIN
      SELECT m.business_id,m.provider_campaign_id INTO biz,campaign FROM public.outbound_provider_campaign_mappings m
        JOIN public.businesses b ON b.id=m.business_id WHERE m.provider_type='smartlead' AND m.mapping_status='mapped' AND b.portfolio_status='active' LIMIT 1;
      IF biz IS NULL THEN RAISE EXCEPTION 'No active mapped campaign for rolled-back fixture'; END IF;
      SELECT user_id INTO founder FROM public.user_roles WHERE role IN ('founder','admin') LIMIT 1;
      PERFORM set_config('request.jwt.claim.sub',founder::text,true);
      fixture_email:='conversation-'||person::text||'@example.invalid';
      INSERT INTO public.contacts(id,email,name,source,tags,is_globally_suppressed,hard_bounced)
        VALUES(person,fixture_email,'Conversation verification fixture','test:crm-conversation',ARRAY['test:crm-conversation'],false,false);
      INSERT INTO public.business_contact_relationships(business_id,business_name,contact_id,do_not_contact,campaign_eligible)
        VALUES(biz,'Conversation verification fixture',person,false,false) RETURNING id INTO rel;
      INSERT INTO public.smartlead_lead_snapshots(business_id,provider_campaign_id,provider_lead_id,email,liftor_contact_id)
        VALUES(biz,campaign,'999999999991',fixture_email,person);
      INSERT INTO public.smartlead_thread_messages(business_id,provider_campaign_id,provider_lead_id,dedupe_key,direction,provider_message_id,from_email,to_email,subject,body_html,sent_at)
        VALUES(biz,campaign,'999999999991','fixture-sent:'||person,'SENT','fixture-sent:'||person,'team@example.invalid',fixture_email,'School reporting','<p>Our complete original email.</p>',now()-interval '2 hours');
      INSERT INTO public.smartlead_thread_messages(business_id,provider_campaign_id,provider_lead_id,dedupe_key,direction,provider_message_id,from_email,to_email,subject,body_html,sent_at)
        VALUES(biz,campaign,'999999999991','fixture-reply:'||person,'REPLY','fixture-reply:'||person,fixture_email,'team@example.invalid','Re: School reporting','<p>Please explain school reporting.</p>',now()-interval '1 hour') RETURNING id INTO msg;
      ${body}
    END $test$;
    ROLLBACK;
  `], { stdio: ["ignore", "pipe", "pipe"], env: testEnv, timeout: 20000 });
}

database("CRM conversation database contracts (rolled back)", () => {
  beforeAll(() => {
    const schema = readFileSync("src/lib/__tests__/fixtures/crmConversationSchema.sql", "utf8");
    const migration = readFileSync("drizzle/migrations/0053_crm_approval_only_conversations.sql", "utf8");
    const revisions = readFileSync("drizzle/migrations/0054_crm_conversation_revision_and_history_safety.sql", "utf8");
    execFileSync("psql", ["-X", "-q", "-v", "ON_ERROR_STOP=1"], { input: schema + migration + revisions, env: testEnv, stdio: ["pipe", "pipe", "pipe"] });
  });
  it("preserves full messages with the exact person, business and campaign", () => {
    expect(() => rule(`
      response:=public.crm_customer_conversations(person);
      IF jsonb_array_length(response->'messages')<>2 OR response->'messages'->1->>'body_html'<>'<p>Please explain school reporting.</p>'
        OR response->'threads'->0->>'business_id'<>biz::text OR response->'threads'->0->>'provider_campaign_id'<>campaign THEN RAISE EXCEPTION 'Full thread attribution failed'; END IF;
    `)).not.toThrow();
  });
  it("approval is founder-only, idempotent and never marks a response sent", () => {
    expect(() => rule(`
      INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body,source_reply_row_id) VALUES(biz,campaign,'999999999991','Reviewed AI response',msg) RETURNING id INTO draft;
      response:=public.crm_review_reply(draft,'Reviewed AI response','approved');
      PERFORM public.crm_review_reply(draft,'Reviewed AI response','approved');
      IF response->>'sent'<>'false' OR (SELECT sent_at IS NOT NULL OR approved_by IS DISTINCT FROM founder FROM public.smartlead_reply_drafts WHERE id=draft) THEN RAISE EXCEPTION 'Approval incorrectly sent or lost attribution'; END IF;
      IF (SELECT count(*) FROM public.crm_interaction_ledger WHERE dedupe_key='crm-draft:'||draft::text||':approved')<>1 THEN RAISE EXCEPTION 'Duplicate approval audit'; END IF;
      PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
      BEGIN PERFORM public.crm_review_reply(draft,'Reviewed AI response','approved'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
      IF NOT failed THEN RAISE EXCEPTION 'Non-founder reviewed response'; END IF;
    `)).not.toThrow();
  });
  it("rejects ambiguous identity rather than selecting the last matching email", () => {
    expect(() => rule(`
      INSERT INTO public.contacts(email,name,source) VALUES(upper(fixture_email),'Ambiguous fixture','test:crm-conversation') RETURNING id INTO second;
      INSERT INTO public.business_contact_relationships(business_id,business_name,contact_id) VALUES(biz,'Conversation fixture',second);
      IF EXISTS(SELECT 1 FROM public.crm_smartlead_identity(biz,campaign,'999999999991')) OR EXISTS(SELECT 1 FROM public.crm_smartlead_identity(biz,'999999999992','999999999991')) THEN RAISE EXCEPTION 'Ambiguous or other-campaign identity matched'; END IF;
    `)).not.toThrow();
  });
  it("blocks approving a stale draft after a newer customer reply", () => {
    expect(() => rule(`
      INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body) VALUES(biz,campaign,'999999999991','Old answer') RETURNING id INTO draft;
      INSERT INTO public.smartlead_thread_messages(business_id,provider_campaign_id,provider_lead_id,dedupe_key,direction,provider_message_id,body_html,sent_at)
        VALUES(biz,campaign,'999999999991','fixture-new:'||person,'REPLY','fixture-new:'||person,'A new question',now());
      BEGIN PERFORM public.crm_review_reply(draft,'Old answer','approved'); EXCEPTION WHEN raise_exception THEN failed:=true; END;
      IF NOT failed OR (SELECT status FROM public.smartlead_reply_drafts WHERE id=draft)<>'draft' THEN RAISE EXCEPTION 'Stale draft approved'; END IF;
    `)).not.toThrow();
  });
  it("preserves edited originals and records rejected responses without sending", () => {
    expect(() => rule(`
      INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body) VALUES(biz,campaign,'999999999991','Original AI answer') RETURNING id INTO draft;
      second:=public.crm_save_reply_version(draft,'Original AI answer','Founder-edited answer');
      PERFORM public.crm_review_reply(second,'Founder-edited answer','rejected');
      IF (SELECT body FROM public.smartlead_reply_drafts WHERE id=draft)<>'Original AI answer' OR (SELECT status FROM public.smartlead_reply_drafts WHERE id=draft)<>'superseded'
        OR (SELECT status FROM public.smartlead_reply_drafts WHERE id=second)<>'rejected' OR (SELECT sent_at FROM public.smartlead_reply_drafts WHERE id=second) IS NOT NULL THEN RAISE EXCEPTION 'Version or rejection history lost'; END IF;
    `)).not.toThrow();
  });
  it("holds suppressed customers and prevents direct client approval edits", () => {
    expect(() => rule(`
      INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body) VALUES(biz,campaign,'999999999991','Answer') RETURNING id INTO draft;
      UPDATE public.contacts SET is_globally_suppressed=true WHERE id=person;
      BEGIN PERFORM public.crm_review_reply(draft,'Answer','approved'); EXCEPTION WHEN raise_exception THEN failed:=true; END;
      IF NOT failed OR has_table_privilege('authenticated','public.smartlead_reply_drafts','UPDATE') THEN RAISE EXCEPTION 'Suppression or client approval guard failed'; END IF;
    `)).not.toThrow();
  });
  it("does not draft in response to automatic replies or delivery failures", () => {
    expect(() => rule(`
      UPDATE public.smartlead_thread_messages SET subject='Automatic reply: School reporting',body_html='I am out of the office' WHERE id=msg;
      IF (SELECT reply_kind FROM public.smartlead_thread_messages WHERE id=msg)<>'auto_reply' THEN RAISE EXCEPTION 'Automatic reply misclassified'; END IF;
      BEGIN INSERT INTO public.smartlead_reply_drafts(business_id,provider_campaign_id,provider_lead_id,body) VALUES(biz,campaign,'999999999991','Unwanted answer'); EXCEPTION WHEN raise_exception THEN failed:=true; END;
      IF NOT failed THEN RAISE EXCEPTION 'Draft created for automatic reply'; END IF;
      UPDATE public.smartlead_thread_messages SET subject='Undeliverable: School reporting' WHERE id=msg;
      IF (SELECT reply_kind FROM public.smartlead_thread_messages WHERE id=msg)<>'bounce' THEN RAISE EXCEPTION 'Bounce misclassified'; END IF;
    `)).not.toThrow();
  });
});