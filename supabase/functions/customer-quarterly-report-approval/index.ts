import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'APPROVE CUSTOMER REPORT';

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
    const { report_id, decision, allow_customer_share = false, edited_customer_summary, confirmation } = body ?? {};
    if (!report_id || !decision) return new Response(JSON.stringify({ error: 'report_id and decision required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const allowed = ['approve','reject','edit_required','park'];
    if (!allowed.includes(decision)) return new Response(JSON.stringify({ error: 'invalid decision' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (decision === 'approve' && confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ error: 'confirmation_required', expected: CONFIRM }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const update: any = { report_status: decision === 'approve' ? 'approved' : decision };
    if (decision === 'approve') {
      update.approved_at = new Date().toISOString();
      update.customer_share_allowed = !!allow_customer_share;
      if (typeof edited_customer_summary === 'string') update.customer_facing_summary = edited_customer_summary;
    }
    const { data, error } = await admin.from('customer_quarterly_reports').update(update).eq('id', report_id).select('*').single();
    if (error) throw error;

    let queued: any = null;
    if (decision === 'approve' && allow_customer_share) {
      try {
        const { data: q } = await admin.from('approved_action_queue').insert({
          action_type: 'customer_report_share',
          target_table: 'customer_quarterly_reports',
          target_id: report_id,
          status: 'pending',
          gate_key: 'customer_report_share_gate',
          metadata: { report_token: data.report_token, contact_id: data.contact_id },
        }).select('*').single();
        queued = q;
      } catch { /* table may not exist; founder can share manually */ }
    }

    return new Response(JSON.stringify({ report: data, queued, external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});