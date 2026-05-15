import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const TASK_TEMPLATES: Array<{ task_name: string; task_type: string; adviser_required?: boolean }> = [
  { task_name: 'Bank reconciliation', task_type: 'bank_reconciliation' },
  { task_name: 'Invoice reconciliation', task_type: 'invoice_reconciliation' },
  { task_name: 'Receipt collection', task_type: 'receipt_collection' },
  { task_name: 'Bookkeeping review', task_type: 'bookkeeping_review' },
  { task_name: 'VAT review', task_type: 'VAT_review', adviser_required: true },
  { task_name: 'Corporation tax review', task_type: 'corporation_tax_review', adviser_required: true },
  { task_name: 'Management accounts', task_type: 'management_accounts' },
  { task_name: 'Payroll review', task_type: 'payroll_review' },
  { task_name: 'Supplier reconciliation', task_type: 'supplier_reconciliation' },
  { task_name: 'Intercompany review', task_type: 'intercompany_review' },
  { task_name: 'Adviser pack', task_type: 'adviser_pack', adviser_required: true },
];

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
    const { entity_id = null, business_id = null, period_start = null, period_end = null, due_date = null, dry_run = true, confirm = '' } = body ?? {};

    const tasks = TASK_TEMPLATES.map((t) => ({
      entity_id, business_id, period_start, period_end,
      task_name: t.task_name, task_type: t.task_type, status: 'pending',
      due_date, adviser_required: !!t.adviser_required,
    }));

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true, would_create: tasks.length, tasks_preview: tasks,
        filings_submitted: false, payments_made: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (confirm !== 'CREATE ACCOUNTING CLOSE TASKS') {
      return new Response(JSON.stringify({ error: "confirmation required: send confirm='CREATE ACCOUNTING CLOSE TASKS'" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: inserted, error } = await admin.from('accounting_close_tasks').insert(tasks).select('id, task_name, task_type, adviser_required, status, due_date');
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true, dry_run: false, created: inserted?.length ?? 0, tasks: inserted,
      filings_submitted: false, payments_made: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});