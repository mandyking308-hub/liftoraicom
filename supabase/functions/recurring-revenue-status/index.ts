import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

function monthlyAmount(s: any): number {
  const a = Number(s.amount ?? 0);
  const f = String(s.billing_frequency ?? '').toLowerCase();
  if (f.includes('year') || f.includes('annual')) return a / 12;
  if (f.includes('quarter')) return a / 3;
  if (f.includes('week')) return a * 4.33;
  if (f.includes('day')) return a * 30;
  return a;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 60);
    const horizonIso = horizon.toISOString().slice(0, 10);

    const subs = (await admin.from('customer_subscriptions').select('*').limit(2000)).data ?? [];
    const tasks = (await admin.from('renewal_review_tasks').select('*').limit(2000)).data ?? [];
    const businesses = (await admin.from('businesses').select('id,name').limit(500)).data ?? [];

    const active = subs.filter((s: any) => ['active', 'trialing', 'past_due'].includes(String(s.subscription_status)));
    const mrr = active.reduce((s: number, x: any) => s + monthlyAmount(x), 0);
    const arr = mrr * 12;

    const renewals_due_60d = active.filter((s: any) => s.renewal_date && s.renewal_date >= today && s.renewal_date <= horizonIso)
      .sort((a: any, b: any) => String(a.renewal_date).localeCompare(String(b.renewal_date)));
    const renewals_overdue = active.filter((s: any) => s.renewal_date && s.renewal_date < today);
    const failed_payments = subs.filter((s: any) => ['failed', 'past_due', 'declined'].includes(String(s.payment_status ?? '').toLowerCase()));
    const high_churn = subs.filter((s: any) => ['high', 'critical'].includes(String(s.churn_risk ?? '').toLowerCase()));
    const cancelled_30d = subs.filter((s: any) => s.cancellation_date && s.cancellation_date >= new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10));

    const open_tasks = tasks.filter((t: any) => !['completed', 'dismissed'].includes(String(t.review_status)));
    const upgrades = open_tasks.filter((t: any) => t.review_type === 'upgrade_opportunity');
    const downgrades = open_tasks.filter((t: any) => t.review_type === 'downgrade_risk');
    const cancellations = open_tasks.filter((t: any) => t.review_type === 'cancellation_risk');

    const next_actions: any[] = [];
    for (const s of renewals_overdue.slice(0, 5)) next_actions.push({ kind: 'renewal_overdue', label: s.subscription_name, due: s.renewal_date });
    for (const s of failed_payments.slice(0, 5)) next_actions.push({ kind: 'failed_payment_review', label: s.subscription_name });
    for (const s of renewals_due_60d.slice(0, 5)) next_actions.push({ kind: 'renewal_due_60d', label: s.subscription_name, due: s.renewal_date });
    for (const s of high_churn.slice(0, 5)) next_actions.push({ kind: 'churn_risk_review', label: s.subscription_name, risk: s.churn_risk });
    for (const t of upgrades.slice(0, 3)) next_actions.push({ kind: 'upgrade_opportunity', label: t.recommendation ?? 'review' });

    return new Response(JSON.stringify({
      ok: true,
      money_moved: false,
      payment_charged: false,
      subscription_mutated: false,
      external_send: false,
      disclaimer: 'Tracking and recommendations only. No charges, no payment links, no cancellations, no customer-facing emails. Founder approval required before any billing action.',
      summary: {
        total_subscriptions: subs.length,
        active_subscriptions: active.length,
        mrr: +mrr.toFixed(2),
        arr: +arr.toFixed(2),
        renewals_due_60d: renewals_due_60d.length,
        renewals_overdue: renewals_overdue.length,
        failed_payments: failed_payments.length,
        high_churn_risk: high_churn.length,
        cancelled_30d: cancelled_30d.length,
        open_review_tasks: open_tasks.length,
        upgrade_opportunities: upgrades.length,
        downgrade_risks: downgrades.length,
        cancellation_risks: cancellations.length,
      },
      renewals_due_60d: renewals_due_60d.slice(0, 30).map((s: any) => ({ ...s, business_name: businesses.find((b: any) => b.id === s.business_id)?.name ?? null })),
      renewals_overdue: renewals_overdue.slice(0, 30),
      failed_payments: failed_payments.slice(0, 30),
      high_churn: high_churn.slice(0, 30),
      open_tasks: open_tasks.slice(0, 30),
      next_actions: next_actions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});