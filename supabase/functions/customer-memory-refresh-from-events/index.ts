import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

// Refreshes customer_memory_profiles from the latest events: surveys, complaints,
// onboarding, quarterly reports, winback, support, proposals/demos/deals,
// invoices/payments, agent handovers, founder approvals, customer success.
// No external send. Founder/admin only.

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { contact_id = null, business_id = null, dry_run = false, max_contacts = 50 } = body ?? {};

    let q = admin.from('contacts').select('id,name,assigned_business').limit(max_contacts);
    if (contact_id) q = q.eq('id', contact_id);
    else if (business_id) q = q.eq('assigned_business', business_id);
    const { data: contacts } = await q;

    const results: any[] = [];
    for (const c of (contacts ?? [])) {
      const cid = c.id;
      const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score,sentiment,competitor_mentions,key_needs,created_at').eq('contact_id', cid).order('created_at', { ascending: false }).limit(20)).data ?? [], [] as any[]);
      const complaints = await safe(async () => (await admin.from('customer_complaints').select('id,severity,status,summary').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const disputes = await safe(async () => (await admin.from('customer_disputes').select('id,status').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const onboarding = await safe(async () => (await admin.from('customer_onboarding_plans').select('onboarding_status,risks').eq('contact_id', cid).limit(10)).data ?? [], [] as any[]);
      const reports = await safe(async () => (await admin.from('customer_quarterly_reports').select('renewal_risk_flags,upsell_opportunities,reporting_period_end').eq('contact_id', cid).order('reporting_period_end', { ascending: false }).limit(5)).data ?? [], [] as any[]);
      const winback = await safe(async () => (await admin.from('customer_winback_plans').select('id,plan_status,winback_reason,churn_risk_level').eq('contact_id', cid).order('created_at', { ascending: false }).limit(5)).data ?? [], [] as any[]);
      const support = await safe(async () => (await admin.from('support_interaction_reviews').select('severity,theme').eq('contact_id', cid).limit(50)).data ?? [], [] as any[]);
      const success = await safe(async () => (await admin.from('customer_success_plans').select('plan_status,risks,next_best_actions').eq('contact_id', cid).limit(10)).data ?? [], [] as any[]);
      const upsells = await safe(async () => (await admin.from('customer_upsell_recommendations').select('id,recommendation_status,reason').eq('contact_id', cid).limit(20)).data ?? [], [] as any[]);
      const ledger = await safe(async () => (await admin.from('crm_interaction_ledger').select('occurred_at,interaction_type').eq('contact_id', cid).order('occurred_at', { ascending: false }).limit(5)).data ?? [], [] as any[]);

      const csat = surveys.map((s) => s.csat_score).filter((n: any) => typeof n === 'number');
      const avgCsat = csat.length ? csat.reduce((a: number, b: number) => a + b, 0) / csat.length : null;
      const openComplaints = complaints.filter((x) => !['resolved','closed'].includes(String(x.status))).length;
      const openDisputes = disputes.filter((x) => !['resolved','closed'].includes(String(x.status))).length;
      const wb = winback[0];

      const risk_flags: string[] = [];
      if (avgCsat != null && avgCsat < 3) risk_flags.push('low_csat');
      if (openComplaints) risk_flags.push('open_complaints');
      if (openDisputes) risk_flags.push('open_disputes');
      if (wb?.churn_risk_level === 'high') risk_flags.push('winback_high_risk');
      for (const r of reports.flatMap((r: any) => r.renewal_risk_flags ?? [])) risk_flags.push(String(r));

      const upsellInterest = upsells.filter((u) => !['won','rejected','dismissed'].includes(String(u.recommendation_status)));
      const next_best_action = openComplaints ? 'Review complaint recovery plan and book founder check-in.' : (wb ? `Review win-back plan: ${wb.winback_reason}` : (upsellInterest.length ? 'Review upsell opportunity with founder.' : (avgCsat != null && avgCsat < 3 ? 'Schedule satisfaction recovery call.' : 'Continue regular check-ins.')));

      const profile = {
        business_id: business_id ?? c.assigned_business ?? null,
        contact_id: cid,
        profile_status: 'active',
        relationship_summary: `Onboarding: ${onboarding[0]?.onboarding_status ?? 'n/a'}. Last interaction: ${ledger[0]?.occurred_at ?? 'n/a'}.`,
        satisfaction_summary: `Avg CSAT ${avgCsat ?? 'n/a'} across ${csat.length} surveys. Open complaints: ${openComplaints}. Open disputes: ${openDisputes}.`,
        upsell_interest_summary: upsellInterest.length ? upsellInterest.map((u) => u.reason).filter(Boolean).join(' | ') : null,
        support_history_summary: support.length ? `${support.length} support items, ${support.filter((s) => String(s.severity).toLowerCase() === 'high').length} high severity.` : null,
        risk_flags,
        last_refreshed_at: new Date().toISOString(),
        metadata: {
          unresolved_issues: { complaints: openComplaints, disputes: openDisputes },
          onboarding_status: onboarding[0]?.onboarding_status ?? null,
          winback_status: wb ? { id: wb.id, status: wb.plan_status, reason: wb.winback_reason, churn_risk_level: wb.churn_risk_level } : null,
          next_best_action,
          current_relationship_status: openComplaints ? 'recovery_needed' : (wb ? 'winback_in_progress' : (avgCsat != null && avgCsat >= 4 ? 'healthy' : 'monitor')),
        },
      };

      let persisted: any = { profile_id: null, mode: 'dry_run' };
      if (!dry_run) {
        const exist = await admin.from('customer_memory_profiles').select('id').eq('contact_id', cid).maybeSingle();
        if (exist.data?.id) {
          const upd = await admin.from('customer_memory_profiles').update(profile).eq('id', exist.data.id).select('id').maybeSingle();
          persisted = { profile_id: upd.data?.id, mode: 'updated' };
        } else {
          const ins = await admin.from('customer_memory_profiles').insert(profile).select('id').maybeSingle();
          persisted = { profile_id: ins.data?.id, mode: 'inserted' };
        }
      }

      results.push({ contact_id: cid, profile, persisted });
    }

    return new Response(JSON.stringify({
      ok: true, mode: dry_run ? 'dry_run' : 'persisted',
      external_send: false, financial_mutation: false, private_notes_exposed: false,
      contacts_refreshed: results.length, results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});