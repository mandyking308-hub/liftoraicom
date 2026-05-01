-- Reassign Neon Candy contacts to live inbox
UPDATE public.contacts
   SET assigned_inbox_id = '0a7096d1-8160-4243-97bc-c1615b6673b3'
 WHERE assigned_inbox_id = '0b5ce74b-b1d5-4e7a-bcd4-04c968577bf0'
   AND id IN (SELECT DISTINCT contact_id FROM public.email_queue WHERE business_name = 'Neon Candy');

-- Reassign pending/delayed/throttled queue items to live inbox
UPDATE public.email_queue
   SET inbox_id = '0a7096d1-8160-4243-97bc-c1615b6673b3'
 WHERE business_name = 'Neon Candy'
   AND inbox_id = '0b5ce74b-b1d5-4e7a-bcd4-04c968577bf0'
   AND status IN ('pending', 'delayed', 'throttled');

-- Zero out the simulated inbox counter (sends were not real)
UPDATE public.inboxes
   SET current_send_count = 0,
       hourly_send_count = 0
 WHERE id = '0b5ce74b-b1d5-4e7a-bcd4-04c968577bf0';