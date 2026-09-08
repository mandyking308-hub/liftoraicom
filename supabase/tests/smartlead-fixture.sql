-- Isolated representative schema for the Smartlead migration tests. No external access.
CREATE SCHEMA auth;
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT '00000000-0000-0000-0000-000000000001'::uuid $$;
CREATE FUNCTION public.has_role(uuid,text) RETURNS boolean LANGUAGE sql AS $$ SELECT current_setting('test.founder',true)='true' $$;
CREATE TYPE public.contact_sendable_status AS ENUM ('sendable','not_sendable','needs_review','suppressed','duplicate','enrichment_failed','no_email');
CREATE TYPE public.contact_status AS ENUM ('NEW','CONTACTED','ENGAGED','QUALIFIED','CLIENT','SUPPLIER','DO_NOT_CONTACT','INTERNAL');
CREATE TYPE public.bcr_stage AS ENUM ('ready_to_stage','staged','contacted','engaged','client','do_not_contact','archived');
CREATE TABLE public.businesses(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL);
CREATE TABLE public.contacts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),email text UNIQUE,name text NOT NULL DEFAULT '',first_name text,last_name text,
 company text NOT NULL DEFAULT '',role text NOT NULL DEFAULT '',linkedin_url text,phone text,country text,
 source_record_id text,source_platform text,email_verified_status text DEFAULT 'unknown',
 sendable_status public.contact_sendable_status DEFAULT 'needs_review',status public.contact_status DEFAULT 'NEW',
 is_globally_suppressed boolean NOT NULL DEFAULT false,hard_bounced boolean NOT NULL DEFAULT false,
 unsubscribed_at timestamptz,unsubscribe_source text,do_not_contact_at timestamptz,archived_at timestamptz,
 global_suppression_at timestamptz,global_suppression_reason text,assigned_business text DEFAULT '',
 active_campaign_id uuid,lawful_basis text,unsubscribe_token text,compliance_status text DEFAULT '',
 is_internal boolean NOT NULL DEFAULT false,founder_review_requested_at timestamptz,
 last_replied_at timestamptz,conversation_active boolean NOT NULL DEFAULT false,last_contacted_at timestamptz
);
CREATE TABLE public.outreach_campaigns(id uuid PRIMARY KEY,business_name text NOT NULL);
CREATE TABLE public.outbound_provider_campaign_mappings(
 id uuid PRIMARY KEY,business_id uuid,liftor_campaign_id uuid,provider_type text,provider_campaign_id text,
 is_active boolean DEFAULT false,mapping_status text,last_synced_at timestamptz
);
CREATE TABLE public.outbound_provider_lead_mappings(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid NOT NULL,liftor_contact_id uuid NOT NULL,
 liftor_campaign_id uuid NOT NULL,campaign_mapping_id uuid,provider_type text NOT NULL DEFAULT 'smartlead',
 provider_campaign_id text,provider_lead_id text,contact_email text NOT NULL,
 push_status text NOT NULL DEFAULT 'not_pushed' CHECK(push_status IN ('not_pushed','previewed','pushing','pushed','failed','skipped')),
 metadata jsonb NOT NULL DEFAULT '{}',provider_response jsonb
);
CREATE UNIQUE INDEX outbound_provider_lead_mappings_uniq ON public.outbound_provider_lead_mappings
 (provider_type,provider_campaign_id,lower(contact_email)) WHERE provider_campaign_id IS NOT NULL;
CREATE TABLE public.business_contact_relationships(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contact_id uuid NOT NULL,business_id uuid,business_name text NOT NULL,
 do_not_contact boolean NOT NULL DEFAULT false,do_not_contact_reason text NOT NULL DEFAULT '',
 campaign_eligible boolean NOT NULL DEFAULT false,current_stage public.bcr_stage DEFAULT 'ready_to_stage',notes text DEFAULT '',
 UNIQUE(contact_id,business_name)
);
CREATE TABLE public.email_queue(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),contact_id uuid,campaign_id uuid,status text,block_reason text);
CREATE TABLE public.external_action_gates(gate_key text,enabled boolean);
CREATE TABLE public.business_operating_profiles(business_id uuid,external_provider_mutation_allowed boolean);
CREATE TABLE public.outbound_provider_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),provider_type text DEFAULT 'smartlead',provider_event_type text,
 provider_event_id text,provider_campaign_id text,provider_lead_id text,contact_id uuid,
 raw_payload jsonb DEFAULT '{}',normalized_payload jsonb DEFAULT '{}',processing_status text DEFAULT 'received'
 CHECK(processing_status IN ('received','mapped','ignored','error')),operational_mutation_applied boolean DEFAULT false,
 error text,received_at timestamptz DEFAULT now()
);
CREATE TABLE public.communication_records(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid,contact_id uuid,channel text,direction text,
 communication_status text,subject text,summary text,content_reference text,external_provider text,provider_message_id text,
 sent_at timestamptz,received_at timestamptz,audit_metadata jsonb
);
CREATE TABLE public.communication_threads(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),business_id uuid,thread_title text,last_message_at timestamptz);
CREATE TABLE public.communication_thread_messages(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),thread_id uuid,
 communication_record_id uuid,message_order integer DEFAULT 0);
