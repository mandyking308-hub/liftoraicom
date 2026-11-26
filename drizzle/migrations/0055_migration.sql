insert into public.external_action_gates (gate_key, gate_label, action_type, provider_type, enabled, requires_founder_confirmation, confirmation_phrase, max_batch_size, risk_level, metadata)
values ('smartlead_reply_send_gate', 'Smartlead Approved Reply Send', 'smartlead_reply_send', 'smartlead', false, true, 'SEND THIS REPLY', 1, 'high',
  jsonb_build_object('test_recipients', jsonb_build_array('mandyking308@gmail.com'), 'note', 'Off until controlled end-to-end test passes; founder test address only while off.'))
on conflict (gate_key) do nothing;