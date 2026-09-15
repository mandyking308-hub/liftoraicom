-- Founder meeting intelligence: Simon Livesey, 15 September 2026.
-- Idempotent and additive: only updates one unambiguous existing Relationship Intelligence record.
-- Does not create a duplicate if Simon cannot be matched safely.

WITH email_matches AS (
  SELECT id, count(*) OVER () AS cnt
  FROM public.relationship_intelligence_contacts
  WHERE lower(coalesce(email, '')) = 'simonlivesey@me.com'
),
name_matches AS (
  SELECT id, count(*) OVER () AS cnt
  FROM public.relationship_intelligence_contacts
  WHERE lower(trim(contact_name)) = 'simon livesey'
),
target AS (
  SELECT id FROM email_matches WHERE cnt = 1
  UNION ALL
  SELECT id FROM name_matches
  WHERE cnt = 1
    AND NOT EXISTS (SELECT 1 FROM email_matches)
)
UPDATE public.relationship_intelligence_contacts ric
SET
  relationship_status = CASE
    WHEN ric.relationship_status IN ('new','active','needs_follow_up','waiting_on_them','meeting_booked')
      THEN 'warm'::public.rni_relationship_status
    ELSE ric.relationship_status
  END,
  relationship_type = CASE
    WHEN ric.relationship_type = 'other'
      THEN 'referral_partner'::public.rni_relationship_type
    ELSE ric.relationship_type
  END,
  opportunity_role = CASE
    WHEN ric.opportunity_role = 'unknown'
      THEN 'introducer'::public.rni_opportunity_role
    ELSE ric.opportunity_role
  END,
  strategic_value_score = greatest(coalesce(ric.strategic_value_score, 1), 5),
  commercial_value_score = greatest(coalesce(ric.commercial_value_score, 1), 4),
  last_contact_at = greatest(
    coalesce(ric.last_contact_at, '1900-01-01'::timestamptz),
    '2026-09-15T10:30:00+01:00'::timestamptz
  ),
  meeting_summary = CASE
    WHEN coalesce(ric.meeting_summary, '') LIKE '%[MEETING 2026-09-15 — Mandy / Simon Livesey]%'
      THEN ric.meeting_summary
    ELSE concat_ws(E'\n\n', nullif(ric.meeting_summary, ''),
      '[MEETING 2026-09-15 — Mandy / Simon Livesey] Founder debrief: very useful first meeting. Simon came across as highly connected and deal-heavy, with many things happening at once. Core value is as a connector / introducer rather than simply an operator or investment thesis to follow. He said he can raise money where useful and described a network of roughly 100 family offices, plus long-standing City / hedge-fund relationships. He has moved to Guernsey and discussed people and businesses doing well there. He specifically mentioned Doug Scott in Guernsey and other Guernsey organisations / businesses that Mandy wants identified. Simon said he would send his telephone number and wants to reconnect because he had to leave for another engagement. Mandy liked him and sees the relationship as potentially trajectory-changing if handled selectively.'
    )
  END,
  founder_notes = CASE
    WHEN coalesce(ric.founder_notes, '') LIKE '%[FOUNDER NOTE 2026-09-15 — CONNECTOR / DILIGENCE]%'
      THEN ric.founder_notes
    ELSE concat_ws(E'\n\n', nullif(ric.founder_notes, ''),
      '[FOUNDER NOTE 2026-09-15 — CONNECTOR / DILIGENCE] Treat Simon as a high-value connector with high diligence required on individual deals. Founder view: he appears able to open doors across family offices, capital, City / hedge-fund circles and Guernsey; he may also be the kind of private connector who can be retained to get things done through his network. Founder reports that he referenced involvement with the King\'s Fund, a family-fund / family-office world and other major family offices; exact entity names should be verified before external use. Do not conflate relationship value with endorsement of every investment idea. Specific caution from the meeting: oil tokenisation and structures exposed to political / governmental change, including Turkey, require independent legal, regulatory, jurisdictional and investment diligence. Use Simon primarily for targeted introductions and intelligence, not blanket pitching.'
    )
  END,
  next_action_summary = CASE
    WHEN coalesce(ric.next_action_summary, '') LIKE '%[NEXT 2026-09-15 — Simon Livesey]%'
      THEN ric.next_action_summary
    ELSE concat_ws(E'\n\n', nullif(ric.next_action_summary, ''),
      '[NEXT 2026-09-15 — Simon Livesey] 1) Wait for Simon\'s mobile number and move the relationship onto direct contact / WhatsApp when received. 2) Reconnect for a second conversation. 3) Ask for a warm introduction to Doug Scott in Guernsey rather than cold outreach. 4) Get the exact names of the Guernsey organisations / businesses Simon said had moved there and were doing well. 5) Ask Simon which 1–3 people in his family-office network are most relevant to Mandy across private capital, Carren Estate, Liftor / AI and GHAT, and pursue targeted introductions only. 6) Keep any tokenisation / energy deal discussion in a separate diligence lane.'
    )
  END,
  source_evidence = CASE
    WHEN coalesce(ric.source_evidence, '') LIKE '%Founder meeting debrief, 15 September 2026%'
      THEN ric.source_evidence
    ELSE concat_ws(E'\n\n', nullif(ric.source_evidence, ''),
      'Founder meeting debrief, 15 September 2026. Direct first-person notes from Mandy immediately after the meeting. Claims about Simon\'s network, Guernsey activity, King\'s Fund / family-office involvement, capital-raising ability and named contacts are founder-reported from the conversation and should be externally verified where material.'
    )
  END,
  capital_lane = coalesce(nullif(ric.capital_lane, ''), 'deal_flow'),
  capital_role = coalesce(nullif(ric.capital_role, ''), 'connector / capital introducer'),
  relationship_angle = coalesce(nullif(ric.relationship_angle, ''), 'High-value family-office / private-capital connector; Guernsey and City network; targeted introductions.'),
  conversation_posture = coalesce(nullif(ric.conversation_posture, ''), 'Relationship-first. Keep close, ask for selective introductions, do not chase or endorse every deal.'),
  outreach_status = coalesce(nullif(ric.outreach_status, ''), 'met_in_person_or_video; follow_up_expected'),
  deal_relevance = coalesce(nullif(ric.deal_relevance, ''), 'Family offices, capital raising, deal flow, Guernsey network, City / hedge-fund introductions.'),
  alignment_quality = coalesce(nullif(ric.alignment_quality, ''), 'high relationship value; deal-specific diligence required'),
  priority_notes = CASE
    WHEN coalesce(ric.priority_notes, '') LIKE '%2026-09-15: Priority A connector%'
      THEN ric.priority_notes
    ELSE concat_ws(E'\n', nullif(ric.priority_notes, ''), '2026-09-15: Priority A connector. Potentially trajectory-changing network access if used selectively.')
  END,
  private_capital_notes = CASE
    WHEN coalesce(ric.private_capital_notes, '') LIKE '%2026-09-15: Simon says he can raise capital%'
      THEN ric.private_capital_notes
    ELSE concat_ws(E'\n', nullif(ric.private_capital_notes, ''), '2026-09-15: Simon says he can raise capital and has access to roughly 100 family offices plus City / hedge-fund relationships. Treat as an introduction / capital-access channel; independently diligence all transactions and structures.')
  END,
  elite_context_notes = CASE
    WHEN coalesce(ric.elite_context_notes, '') LIKE '%2026-09-15: Guernsey / family-office network%'
      THEN ric.elite_context_notes
    ELSE concat_ws(E'\n', nullif(ric.elite_context_notes, ''), '2026-09-15: Guernsey / family-office network. Mentioned Doug Scott and other Guernsey organisations / businesses. Founder reports references to King\'s Fund and major family-office circles; verify exact entities.')
  END,
  next_move_owner = coalesce(nullif(ric.next_move_owner, ''), 'Mandy'),
  compliance_boundary = coalesce(nullif(ric.compliance_boundary, ''), 'Relationship / introduction intelligence only. No investment endorsement. Independent legal, regulatory, jurisdictional and investment diligence required for any deal.'),
  tags = ARRAY(
    SELECT DISTINCT lower(tag)
    FROM unnest(
      coalesce(ric.tags, '{}'::text[]) || ARRAY[
        'priority-a',
        'connector',
        'family-office',
        'private-capital',
        'capital-raising',
        'guernsey',
        'city-network',
        'hedge-fund-network',
        'introducer',
        'doug-scott-intro',
        'high-diligence-deals'
      ]::text[]
    ) AS tag
    WHERE nullif(trim(tag), '') IS NOT NULL
  )
WHERE ric.id IN (SELECT id FROM target);

WITH email_matches AS (
  SELECT id, count(*) OVER () AS cnt
  FROM public.relationship_intelligence_contacts
  WHERE lower(coalesce(email, '')) = 'simonlivesey@me.com'
),
name_matches AS (
  SELECT id, count(*) OVER () AS cnt
  FROM public.relationship_intelligence_contacts
  WHERE lower(trim(contact_name)) = 'simon livesey'
),
target AS (
  SELECT id FROM email_matches WHERE cnt = 1
  UNION ALL
  SELECT id FROM name_matches
  WHERE cnt = 1
    AND NOT EXISTS (SELECT 1 FROM email_matches)
)
INSERT INTO public.relationship_intelligence_events (
  contact_id,
  event_type,
  summary,
  metadata
)
SELECT
  id,
  'meeting',
  '15 Sep 2026 meeting: Simon assessed as Priority A family-office / private-capital connector. Strong Guernsey and City / hedge-fund network; follow up for mobile, Doug Scott introduction, exact Guernsey entities and selective family-office introductions. Keep deal-specific tokenisation / energy ideas in a separate high-diligence lane.',
  jsonb_build_object(
    'meeting_date', '2026-09-15',
    'source', 'founder_debrief',
    'priority', 'A',
    'contact_email', 'simonlivesey@me.com',
    'next_steps', jsonb_build_array(
      'Await mobile number',
      'Reconnect',
      'Request warm introduction to Doug Scott',
      'Identify exact Guernsey organisations / businesses',
      'Request selective family-office introductions',
      'Separate tokenisation / energy ideas into diligence lane'
    )
  )
FROM target
WHERE NOT EXISTS (
  SELECT 1
  FROM public.relationship_intelligence_events rie
  WHERE rie.contact_id = target.id
    AND rie.event_type = 'meeting'
    AND rie.summary LIKE '15 Sep 2026 meeting:%'
);
