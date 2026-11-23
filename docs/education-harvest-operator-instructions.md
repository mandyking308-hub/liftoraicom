# Daily Education Harvest — ChatGPT Work task instructions (2026-11-23)

Schedule lives in ChatGPT (two tasks per day: AM and PM). Liftor has no cron for this.
Run each step with the Lovable `query_database` tool. No secrets needed. Research only:
never send email, never enrol in Smartlead, never write to CRM tables, never guess names/emails.

Run key = today's UK date + slot, e.g. `2026-11-24-AM` / `2026-11-24-PM`.

1. Claim (idempotent; re-running returns the same schools, never more than 500):
   SELECT * FROM edu_harvest.claim('2026-11-24-AM', 500);
2. Research each school from public sources only (school website, GIAS, trust site, DfE).
3. Save results in batches of at most 100:
   SELECT edu_harvest.complete('2026-11-24-AM', '[
     {"urn":"100000","outcome":"institution_screened",
      "evidence_urls":["https://school.example/about"],"retrieved_at":"2026-11-24T09:10:00Z",
      "confidence":"medium","website":"https://school.example","verified_trust_or_group":"Example Trust",
      "organisation_id":null,"purchasing_route":"trust central procurement","product_fit":"PSHE/kindness"},
     {"urn":"100001","outcome":"buyer_researched","evidence_urls":["https://..."],
      "buyers":[{"buyer_role":"Head of PSHE","named_person":null,"source_url":"https://...","confidence":"low"}]},
     {"urn":"100002","outcome":"held"},
     {"urn":"100003","outcome":"error","error":"website unreachable"}
   ]'::jsonb);
   Outcomes: institution_screened | buyer_researched | held | error.
   institution_screened/buyer_researched require evidence_urls; buyer_researched requires sourced buyers[].
   Only set organisation_id when the canonical CRM organisation is proven.
4. Finish (returns unfinished schools to the queue):
   SELECT edu_harvest.finish('2026-11-24-AM', 'optional note');

Friday review: SELECT * FROM public.education_harvest_weekly ORDER BY week_start DESC;
(counts completed unique school URNs only, not attempts).
