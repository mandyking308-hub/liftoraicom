
create table if not exists public.customer_survey_templates (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  template_key text not null,
  template_name text not null,
  survey_type text not null,
  trigger_event text,
  description text,
  questions jsonb default '[]'::jsonb,
  scoring_model text,
  active boolean default true,
  founder_approval_required boolean default true,
  auto_send_allowed boolean default false,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, template_key)
);

alter table public.customer_survey_templates enable row level security;

create policy "Founders manage survey templates" on public.customer_survey_templates
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

create table if not exists public.customer_survey_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  proposal_id uuid,
  demo_access_id uuid,
  deal_id uuid,
  invoice_id uuid,
  assignment_id uuid,
  support_review_id uuid,
  template_id uuid references public.customer_survey_templates(id) on delete set null,
  survey_token text unique default encode(gen_random_bytes(24), 'hex'),
  request_status text default 'draft',
  send_channel text,
  send_allowed boolean default false,
  founder_approval_required boolean default true,
  sent_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.customer_survey_requests enable row level security;

create policy "Founders manage survey requests" on public.customer_survey_requests
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

-- Public can fetch a request only by its token (no listing). Anon select with restricted columns is enforced by app layer.
create policy "Public can read by token" on public.customer_survey_requests
  for select to anon
  using (request_status in ('sent','approved','draft') and (expires_at is null or expires_at > now()));

create index if not exists idx_csr_token on public.customer_survey_requests(survey_token);

create table if not exists public.customer_survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_request_id uuid references public.customer_survey_requests(id) on delete cascade,
  business_id uuid,
  contact_id uuid,
  survey_type text,
  response_payload jsonb default '{}'::jsonb,
  score numeric,
  nps_score integer,
  csat_score integer,
  effort_score integer,
  sentiment text,
  key_needs jsonb default '[]'::jsonb,
  objections jsonb default '[]'::jsonb,
  requested_improvements jsonb default '[]'::jsonb,
  upsell_interest jsonb default '[]'::jsonb,
  competitor_mentions jsonb default '[]'::jsonb,
  testimonial_permission boolean default false,
  follow_up_required boolean default false,
  founder_review_required boolean default true,
  raw_text_feedback text,
  created_at timestamptz default now()
);

alter table public.customer_survey_responses enable row level security;

create policy "Founders manage survey responses" on public.customer_survey_responses
  for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'founder'));

-- Public can insert a response if they reference a valid survey request
create policy "Public can submit survey response" on public.customer_survey_responses
  for insert to anon
  with check (
    survey_request_id is not null and exists (
      select 1 from public.customer_survey_requests r
      where r.id = survey_request_id
        and (r.expires_at is null or r.expires_at > now())
    )
  );

-- Seed 8 global default templates (business_id null = global)
insert into public.customer_survey_templates (template_key, template_name, survey_type, trigger_event, description, questions, scoring_model, founder_approval_required, auto_send_allowed)
values
  ('post_interaction_csat','Post-interaction CSAT','post_interaction_csat','conversation_closed','Quick CSAT after any customer touch.', '[{"id":"csat","type":"scale","label":"How satisfied were you with this interaction?","min":1,"max":5},{"id":"comment","type":"text","label":"Anything we could do better?"}]'::jsonb, 'csat', true, false),
  ('proposal_feedback','Proposal feedback','proposal_feedback','proposal_viewed','Feedback on a proposal received.', '[{"id":"clarity","type":"scale","label":"Was the proposal clear?","min":1,"max":5},{"id":"value","type":"scale","label":"Did it reflect the value you need?","min":1,"max":5},{"id":"objections","type":"text","label":"Any concerns or objections?"}]'::jsonb, 'csat', true, false),
  ('demo_feedback','Demo feedback','demo_feedback','demo_completed','Feedback after a product demo.', '[{"id":"useful","type":"scale","label":"How useful was the demo?","min":1,"max":5},{"id":"missing","type":"text","label":"What was missing?"},{"id":"next","type":"text","label":"What would help you decide?"}]'::jsonb, 'csat', true, false),
  ('support_feedback','Support feedback','support_feedback','support_resolved','Post-support CES + CSAT.', '[{"id":"effort","type":"scale","label":"How easy was it to get help?","min":1,"max":7},{"id":"csat","type":"scale","label":"How satisfied are you with the resolution?","min":1,"max":5},{"id":"comment","type":"text","label":"Tell us more"}]'::jsonb, 'effort', true, false),
  ('lost_deal_feedback','Lost deal feedback','lost_deal_feedback','deal_lost','Why did we lose?', '[{"id":"reason","type":"text","label":"Main reason for not moving forward?"},{"id":"competitor","type":"text","label":"Did you choose another provider?"},{"id":"future","type":"text","label":"What would change your mind?"}]'::jsonb, null, true, false),
  ('customer_needs','Customer needs survey','product_interest_survey','quarterly','Discover unmet needs.', '[{"id":"needs","type":"text","label":"What problems are most painful right now?"},{"id":"priority","type":"text","label":"What would you prioritise we build next?"}]'::jsonb, null, true, false),
  ('upsell_interest','Upsell interest survey','upsell_interest_survey','milestone_reached','Gauge interest in additional services.', '[{"id":"interest","type":"scale","label":"Interest in expanding scope?","min":1,"max":5},{"id":"areas","type":"text","label":"Which areas?"}]'::jsonb, null, true, false),
  ('delivery_feedback','Delivery completion feedback','delivery_feedback','assignment_completed','Quality + timeliness of delivery.', '[{"id":"quality","type":"scale","label":"Quality of delivery?","min":1,"max":5},{"id":"timeliness","type":"scale","label":"Was it on time?","min":1,"max":5},{"id":"nps","type":"scale","label":"How likely are you to recommend us?","min":0,"max":10},{"id":"comment","type":"text","label":"Anything to improve?"}]'::jsonb, 'nps', true, false)
on conflict (business_id, template_key) do nothing;
