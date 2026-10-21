# School admissions — review evidence, 21 October 2026

## Scope
- New founder-only `/founder/school-admissions` route behind the existing FounderRoute.
- Top-level Schools group contains Admissions Tracker, School Visit Assessments and School Register (GIAS); existing paths are unchanged.
- Only `founder_school_visit_records.structured_observations.admissions` is edited, plus the record update timestamp. No new tables, records, migrations or hosted writes were performed.
- Fresh ID-scoped reads and JSONB compare-and-set updates preserve visit fields, assessment, followups and history. Concurrent observation changes cause an error rather than an overwrite.
- Admissions status, entry route, latest email date/summary, application deadline, diary status/date, conflicts, next action, owner and follow-up date are editable. Requests/offers remain unconfirmed; unknown dates remain unknown. Confirming a booking requires an explicitly selected confirmed status and valid date.
- Search and status/diary/record-kind filters retain historical records; open applications sort by earliest deadline, then follow-up date, with unknown dates last.

## Verification
- 15 focused admissions/visit tests passed; full regression suite: 82 files, 1,002 tests passed.
- Changed admissions source lint passed; automatic application build reported `build OK`. Diff whitespace check passed; edits inspected for school-only scope.
- Signed-out local route redirected to founder login with zero school-record requests.
- Authorized founder local route loaded the existing 20 protected records. No real names, school observations or other private rows were logged or captured in screenshots.
- Browser editing/saving/read-back used intercepted isolated fixtures only: selected ID, preservation and requested-not-confirmed assertions passed. Desktop/mobile screenshots contained fixtures only; 390px layout had no horizontal overflow.
- Real database write/read-back is deliberately unverified: no real school record was changed during testing. Existing RLS was reused without modification.

## Still unchanged
No publication/deployment, emails, Calendar actions, campaigns, gates, sales/CRM outreach, finance, payments or other business changes. No blocker to source review; live save verification remains an operator check on an intentionally populated school record.