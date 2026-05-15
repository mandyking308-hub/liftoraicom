import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function json(p: unknown, status = 200) {
  return new Response(JSON.stringify(p), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const svc = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const auth = req.headers.get('Authorization') ?? '';
    if (!auth) return json({ error: 'unauthorized' }, 401);
    const u = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: who } = await u.auth.getUser();
    if (!who?.user) return json({ error: 'unauthorized' }, 401);
    const admin = createClient(url, svc);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', who.user.id);
    if (!(roles ?? []).some((r: any) => r.role === 'admin' || r.role === 'founder')) return json({ error: 'forbidden' }, 403);

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const confirm: boolean = !!body?.confirm;

    const { data: rules } = await admin.from('founder_alert_rules').select('*').eq('enabled', true);
    const ruleByCat: Record<string, any> = {};
    (rules ?? []).forEach((r: any) => { ruleByCat[r.alert_category] = r; });

    type Signal = { category: string; title: string; summary: string; severity: string; source_table?: string; source_id?: string; business_id?: string };
    const signals: Signal[] = [];

    const safeCount = async (table: string, builder: (q: any) => any): Promise<any[]> => {
      try {
        const q = builder(admin.from(table).select('id,business_id,created_at').limit(20));
        const { data } = await q;
        return data ?? [];
      } catch { return []; }
    };

    // urgent customer / complaints
    const complaints = await safeCount('brand_reputation_events', (q: any) =>
      q.in('event_type', ['public_complaint', 'crisis_signal']).eq('status', 'open').order('created_at', { ascending: false }));
    complaints.forEach((c: any) => signals.push({ category: 'complaint', title: 'Open public complaint or crisis signal', summary: 'Reputation event needs review', severity: 'high', source_table: 'brand_reputation_events', source_id: c.id, business_id: c.business_id }));

    // overdue invoices
    const overdue = await safeCount('affiliate_payouts', (q: any) => q.eq('status', 'pending'));
    overdue.forEach((p: any) => signals.push({ category: 'invoice_overdue', title: 'Pending payout awaiting founder', summary: 'Affiliate payout pending approval', severity: 'high', source_table: 'affiliate_payouts', source_id: p.id, business_id: p.business_id }));

    // approvals needed (proposals/programs)
    const programs = await safeCount('partnership_programs', (q: any) => q.eq('status', 'draft').eq('founder_review_required', true));
    programs.forEach((p: any) => signals.push({ category: 'approval_needed', title: 'Partner program awaits approval', summary: 'Draft partner program ready for founder review', severity: 'medium', source_table: 'partnership_programs', source_id: p.id, business_id: p.business_id }));

    // retention risk via underperforming KPIs
    const kpis = await safeCount('business_kpis', (q: any) => q.eq('status', 'at_risk'));
    kpis.forEach((k: any) => signals.push({ category: 'retention_risk', title: 'KPI flagged at risk', summary: 'Business KPI requires intervention', severity: 'high', source_table: 'business_kpis', source_id: k.id, business_id: k.business_id }));

    // dedupe vs existing unread queue
    const { data: existing } = await admin.from('founder_notification_queue')
      .select('source_table,source_id,status').neq('status', 'resolved').limit(1000);
    const existsKey = new Set((existing ?? []).map((e: any) => `${e.source_table}:${e.source_id}`));
    const fresh = signals.filter((s) => !existsKey.has(`${s.source_table}:${s.source_id}`));

    const summary = {
      detected: signals.length,
      new: fresh.length,
      by_category: signals.reduce((acc: any, s) => { acc[s.category] = (acc[s.category] ?? 0) + 1; return acc; }, {}),
    };

    let inserted = 0;
    if (confirm && fresh.length) {
      const rows = fresh.map((s) => ({
        business_id: s.business_id ?? null,
        alert_rule_id: ruleByCat[s.category]?.id ?? null,
        alert_title: s.title,
        alert_summary: s.summary,
        severity: s.severity,
        source_table: s.source_table ?? null,
        source_id: s.source_id ?? null,
        delivery_channel: 'command_centre',
        external_delivery_status: 'not_sent',
      }));
      const { error } = await admin.from('founder_notification_queue').insert(rows);
      if (!error) inserted = rows.length;
    }

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      dry_run: !confirm,
      inserted,
      summary,
      sample: fresh.slice(0, 25),
      safety: {
        external_notification_sent: false,
        customer_message_sent: false,
        sensitive_payload_exposed: false,
        founder_approval_required_for_external: true,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});