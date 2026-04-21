-- Document new system pages added during go-live hardening + execution mode work
INSERT INTO public.system_pages_index (route_path, page_name, area, purpose, ui_elements, actions, linked_backend, data_sources, documented)
VALUES
  ('/founder/system/modes', 'Execution Modes', 'founder',
   'Control which workflows are active per business via execution modes (sales / outreach / hybrid). Toggle feature flags per mode, set the global default mode, and assign modes to specific businesses.',
   'Mode + feature flag matrix (proposals, deals, invoicing, suppliers, outreach, demos), Default badge, Per-business mode selector',
   'Toggle feature flag, Set default mode, Assign business to mode',
   'system_execution_modes, system_feature_flags, businesses, get_active_execution_mode, is_feature_enabled',
   'system_execution_modes, system_feature_flags, businesses', true),
  ('/founder/settings/system-mode', 'System Mode (Test/Live)', 'founder',
   'Global system mode control. Switch between TEST mode (all sends simulated, no SMTP calls) and LIVE mode (real outbound + financial flows). Visible mode banner shown across founder dashboard.',
   'TEST/LIVE toggle, mode banner indicator, audit trail of mode changes',
   'Set system_mode to test, Set system_mode to live',
   'system_settings (key=system_mode), outreach-send-worker, crm-send-check, activity_log',
   'system_settings, activity_log', true),
  ('/founder/sending', 'Sending Health & Domain Protection', 'founder',
   'Monitor inbox reputation, sending domains, SPF/DKIM/DMARC status, ramp progress and Domain Protection Alerts (bounce >5%, reply <1%, spam complaints).',
   'Inbox health table, domain usage summary, ramp progress per inbox, Domain Protection Alerts panel',
   'Pause campaign, Acknowledge alert, Override ramp (founder only)',
   'inboxes, sending_domains, domain_protection_alerts, run_domain_protection_check, enforce_inbox_ramp, validate_inbox_mapping',
   'inbox_health_summary, domain_usage_summary, warmup_progress, domain_protection_alerts', true)
ON CONFLICT (route_path) DO UPDATE
SET page_name = EXCLUDED.page_name,
    area = EXCLUDED.area,
    purpose = EXCLUDED.purpose,
    ui_elements = EXCLUDED.ui_elements,
    actions = EXCLUDED.actions,
    linked_backend = EXCLUDED.linked_backend,
    data_sources = EXCLUDED.data_sources,
    documented = true,
    updated_at = now();

-- Record explicit changes in the system change ledger
INSERT INTO public.system_changes (entity_type, entity_key, change_type, summary, manual_version)
SELECT 'feature', 'execution_mode_system', 'added',
       'Execution Mode System: sales/outreach/hybrid modes with feature flags gating proposals, deals, invoicing, suppliers, outreach, demos. Per-business overrides.',
       (SELECT MAX(version_number) FROM public.system_versions)
WHERE NOT EXISTS (SELECT 1 FROM public.system_changes WHERE entity_key = 'execution_mode_system');

INSERT INTO public.system_changes (entity_type, entity_key, change_type, summary, manual_version)
SELECT 'feature', 'go_live_hardening', 'added',
       'Go-Live Hardening: system_mode (test/live), inbox webhook mapping validation, domain protection (bounce/reply/spam thresholds), ramp enforcement (20/40/80), High Intent Review Queue, validate_go_live_readiness().',
       (SELECT MAX(version_number) FROM public.system_versions)
WHERE NOT EXISTS (SELECT 1 FROM public.system_changes WHERE entity_key = 'go_live_hardening');

-- Rebuild the manual to absorb the new pages + bump version
SELECT public.rebuild_full_manual();
SELECT public.validate_full_system_coverage();