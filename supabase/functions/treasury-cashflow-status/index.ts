import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 90);
    const horizonIso = horizon.toISOString().slice(0, 10);

    const banks = await safe(async () => (await admin.from('group_bank_accounts').select('*')).data ?? [], [] as any[]);
    const forecasts = await safe(async () => (await admin.from('cashflow_forecasts').select('*').order('period_start', { ascending: true })).data ?? [], [] as any[]);
    const items = await safe(async () => (await admin.from('cashflow_forecast_items').select('*')).data ?? [], [] as any[]);
    const closeTasks = await safe(async () => (await admin.from('accounting_close_tasks').select('*').order('due_date', { ascending: true, nullsFirst: false })).data ?? [], [] as any[]);
    const invoices = await safe(async () => (await admin.from('invoices').select('id,business_id,status,total_amount,due_date,issued_date').order('due_date', { ascending: true, nullsFirst: false }).limit(500)).data ?? [], [] as any[]);

    const overdueReceivables = invoices.filter((i: any) => i.due_date && i.due_date < today && !['paid','cancelled','void'].includes(String(i.status)));
    const expectedReceivables = invoices.filter((i: any) => i.due_date && i.due_date >= today && i.due_date <= horizonIso && !['paid','cancelled','void'].includes(String(i.status)));

    const totalEstBalance = banks.reduce((acc: number, b: any) => acc + Number(b.current_balance_estimate ?? 0), 0);
    const expectedIn = items.filter((i: any) => ['invoice_expected','payment_expected'].includes(String(i.item_type))).reduce((a: number, b: any) => a + Number(b.amount ?? 0), 0)
      + expectedReceivables.reduce((a: number, b: any) => a + Number(b.total_amount ?? 0), 0);
    const expectedOut = items.filter((i: any) => !['invoice_expected','payment_expected'].includes(String(i.item_type))).reduce((a: number, b: any) => a + Number(b.amount ?? 0), 0);
    const taxReserveEst = forecasts.reduce((a: number, f: any) => a + Number(f.tax_reserve ?? 0), 0);
    const netPosition = totalEstBalance + expectedIn - expectedOut - taxReserveEst;
    const monthlyBurn = expectedOut > 0 && forecasts.length ? expectedOut / Math.max(1, forecasts.length) : 0;
    const runwayMonths = monthlyBurn > 0 ? Number((totalEstBalance / monthlyBurn).toFixed(1)) : null;

    const closeOverdue = closeTasks.filter((t: any) => t.due_date && t.due_date < today && t.status !== 'completed');
    const closeUpcoming = closeTasks.filter((t: any) => t.due_date && t.due_date >= today && t.due_date <= horizonIso && t.status !== 'completed');
    const adviserTasks = closeTasks.filter((t: any) => t.adviser_required && t.status !== 'completed');

    let cashRisk: 'low'|'medium'|'high' = 'low';
    if (overdueReceivables.length > 5 || (runwayMonths !== null && runwayMonths < 3)) cashRisk = 'high';
    else if (overdueReceivables.length > 0 || (runwayMonths !== null && runwayMonths < 6)) cashRisk = 'medium';

    const nextActions: any[] = [];
    for (const i of overdueReceivables.slice(0, 5)) nextActions.push({ kind: 'overdue_invoice', invoice_id: i.id, amount: i.total_amount, due_date: i.due_date });
    for (const t of closeOverdue.slice(0, 5)) nextActions.push({ kind: 'overdue_close_task', task: t.task_name, due_date: t.due_date });
    for (const t of adviserTasks.slice(0, 5)) nextActions.push({ kind: 'adviser_task', task: t.task_name, due_date: t.due_date });

    return new Response(JSON.stringify({
      ok: true,
      money_movement_attempted: false,
      banking_api_called: false,
      payments_created: false,
      tax_filings_submitted: false,
      disclaimer: 'Operational tracking only. Tax reserve and runway shown as estimates — not financial or tax advice.',
      summary: {
        bank_accounts_count: banks.length,
        total_estimated_balance: totalEstBalance,
        expected_inflows: expectedIn,
        expected_outflows: expectedOut,
        tax_reserve_estimate: taxReserveEst,
        net_cash_position_estimate: netPosition,
        runway_months_estimate: runwayMonths,
        overdue_receivables_count: overdueReceivables.length,
        overdue_receivables_amount: overdueReceivables.reduce((a: number, b: any) => a + Number(b.total_amount ?? 0), 0),
        forecasts_count: forecasts.length,
        forecast_items_count: items.length,
        close_tasks_overdue: closeOverdue.length,
        close_tasks_upcoming_90d: closeUpcoming.length,
        adviser_tasks_open: adviserTasks.length,
        cash_risk: cashRisk,
      },
      bank_accounts: banks.map((b: any) => ({ id: b.id, label: b.account_label, bank_name: b.bank_name, currency: b.currency, country: b.country, status: b.account_status, balance_estimate: b.current_balance_estimate, last_reconciled_at: b.last_reconciled_at })),
      forecasts,
      overdue_receivables: overdueReceivables.slice(0, 20),
      close_tasks: closeTasks.slice(0, 50),
      next_actions: nextActions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});