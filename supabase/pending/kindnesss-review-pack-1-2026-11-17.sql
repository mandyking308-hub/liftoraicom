-- Kindnesss founder review pack 1 (internal drafts only; approved=false; idempotent)
begin;
insert into public.social_post_drafts (id,business_id,calendar_id,platform_key,post_type,post_date,suggested_time,content_pillar,hook,caption,cta,hashtags,visual_direction,asset_requirements,approval_status,founder_review_required,publish_allowed,scheduled_externally,metadata) values
('6b1f0e2a-1a01-4c11-9a01-000000000001','640de582-a112-4d16-a221-03c27f00c6ec','d0ba8a41-20bd-c21b-4e91-f289b56356d9','linkedin','text','2026-11-24','09:30','organisations','Volunteering days: bookings, check-in and approved hours in one place.',
$c$Running a team volunteering day usually means a spreadsheet, a sign-up form and a lot of chasing.

Kindnesss is building one place for it: a site publishes a session, colleagues choose to book, check in on the day, and an authorised admin approves the hours.

You can try it now in our public demo, which uses fictional sample data only.

Company plans are not on sale yet. We are lining up a small pilot and would welcome a conversation with people who run workplace volunteering.$c$,
'https://joinkindnesss.com/demo?area=company-volunteering&utm_source=linkedin&utm_medium=organic_social&utm_campaign=knd_review_pack_1&utm_content=org_volunteering_post1',
'["#EmployeeVolunteering","#WorkplaceCulture"]'::jsonb,'Screenshot of public demo (fictional Willow Works data), no real people','["public demo screenshot (fictional data)"]'::jsonb,'draft',true,false,false,
jsonb_build_object('kit','KINDNESSS_LAUNCH_KIT_2026_11','review_pack','1','approved',false,'sale_status','NOT ON SALE / PILOT PENDING','stable_key','knd-review-pack-1:post-1','platform_variants',jsonb_build_object('linkedin','Volunteering days: bookings, check-in and approved hours in one place. (see caption)'))),
('6b1f0e2a-1a01-4c11-9a01-000000000002','640de582-a112-4d16-a221-03c27f00c6ec','d0ba8a41-20bd-c21b-4e91-f289b56356d9','linkedin','text','2026-11-26','09:30','organisations','What does head office actually see?',
$c$A fair question for any volunteering tool: what does head office see?

In the Kindnesss demo, organisers see bookings and check-ins for their own site, and approved hours roll up for authorised head-office admins. Taking part is always a choice, and hours are recorded only once another admin approves them.

The demo uses fictional sample data. Company plans are not on sale yet — this is pilot preparation, and we would value feedback from HR, CSR and people teams.$c$,
'https://joinkindnesss.com/demo?area=company-volunteering&utm_source=linkedin&utm_medium=organic_social&utm_campaign=knd_review_pack_1&utm_content=org_volunteering_post2',
'["#CSR","#EmployeeVolunteering"]'::jsonb,'Demo organiser view (fictional data)','["public demo screenshot (fictional data)"]'::jsonb,'draft',true,false,false,
jsonb_build_object('kit','KINDNESSS_LAUNCH_KIT_2026_11','review_pack','1','approved',false,'sale_status','NOT ON SALE / PILOT PENDING','stable_key','knd-review-pack-1:post-2','platform_variants',jsonb_build_object('linkedin','What does head office actually see? (see caption)')))
on conflict (id) do nothing;
update public.social_post_drafts set metadata = metadata || '{"unsafe_superseded":"\"Kindnesss is open\" implies on sale; replaced by review pack 1"}'::jsonb
 where id='2ffb9a91-6924-c3bb-afbd-af4f0378b485' and not (metadata ? 'unsafe_superseded');
insert into public.master_work_items (business_id,source_module,source_table,source_record_id,work_type,title,description,priority,status,owner_type,approval_required,recommended_action,action_url,audit_metadata) values
('640de582-a112-4d16-a221-03c27f00c6ec','kindnesss_review_pack','founder_review','knd-review-pack-1:choose-first-product-channel','approval','Choose first adult-facing product and channel','Recommended: Companies & Workplaces volunteering on LinkedIn, offered as demo + pilot conversation, labelled NOT ON SALE / PILOT PENDING. Alternative: Individual Plus (adult 18+) on LinkedIn/Instagram.','high','waiting_approval','founder',true,'Confirm or swap the recommended product/channel','/founder/marketing','{"approved":false,"pack":"knd-review-pack-1"}'),
('640de582-a112-4d16-a221-03c27f00c6ec','kindnesss_review_pack','founder_review','knd-review-pack-1:approve-two-linkedin-drafts','approval','Review two LinkedIn drafts (review pack 1)','Drafts 6b1f0e2a-...0001 and ...0002. Not scheduled, publish_allowed=false.','normal','waiting_approval','founder',true,'Approve wording or request edits','/founder/marketing','{"approved":false,"pack":"knd-review-pack-1"}'),
('640de582-a112-4d16-a221-03c27f00c6ec','kindnesss_review_pack','founder_review','knd-review-pack-1:verify-hosted-checkout','approval','Verify real hosted Dodo checkout before any purchase advertising','Checkout page /checkout/plan loads and requires sign-in; a completed hosted payment and activation have not been verified. All plans stay NOT ON SALE / PILOT PENDING in marketing.','high','blocked','founder',true,'Run a founder sandbox purchase on the Kindnesss side and record evidence','/founder/marketing','{"approved":false,"pack":"knd-review-pack-1"}')
on conflict (source_module,source_table,source_record_id) do nothing;
commit;
