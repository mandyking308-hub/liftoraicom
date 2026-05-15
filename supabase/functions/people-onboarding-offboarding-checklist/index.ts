import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ONBOARDING_CHECKLIST = [
  { sop_name: 'Welcome & introduction call', sop_category: 'onboarding', training_required: false },
  { sop_name: 'NDA signed (founder review)', sop_category: 'legal', training_required: false },
  { sop_name: 'Contractor/employment agreement signed (founder review)', sop_category: 'legal', training_required: false },
  { sop_name: 'Confidentiality & data handling SOP read', sop_category: 'security', training_required: true },
  { sop_name: 'Role-specific SOP review', sop_category: 'operations', training_required: true },
  { sop_name: 'System access requested (founder approval)', sop_category: 'access', training_required: false },
  { sop_name: '30-day check-in scheduled', sop_category: 'people', training_required: false },
];

const OFFBOARDING_CHECKLIST = [
  { sop_name: 'Notify founder of departure', sop_category: 'people', training_required: false },
  { sop_name: 'Knowledge handover document', sop_category: 'operations', training_required: false },
  { sop_name: 'Access review — list all systems (founder approval to revoke)', sop_category: 'access', training_required: false },
  { sop_name: 'Confidentiality reminder & exit acknowledgement', sop_category: 'legal', training_required: false },
  { sop_name: 'Final invoice / payroll reconciliation', sop_category: 'finance', training_required: false },
  { sop_name: 'Hardware / data return (if applicable)', sop_category: 'security', training_required: false },
  { sop_name: 'Mark person status = inactive (founder action)', sop_category: 'people', training_required: false },
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
    const { person_id = null, business_id = null, mode = 'onboarding', dry_run = true, confirm = '' } = body ?? {};

    const tpl = mode === 'offboarding' ? OFFBOARDING_CHECKLIST : ONBOARDING_CHECKLIST;
    const records = tpl.map((t) => ({
      business_id,
      sop_name: `${mode === 'offboarding' ? '[OFFBOARDING] ' : '[ONBOARDING] '}${t.sop_name}`,
      sop_category: t.sop_category,
      sop_status: 'pending',
      assigned_to_person_id: person_id,
      training_required: t.training_required,
    }));

    if (dry_run) {
      return new Response(JSON.stringify({
        ok: true, dry_run: true, mode, would_create: records.length, checklist_preview: records,
        access_granted: false, access_removed: false, documents_sent: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (confirm !== 'CREATE PEOPLE ACCESS CHECKLIST') {
      return new Response(JSON.stringify({ error: "confirmation required: send confirm='CREATE PEOPLE ACCESS CHECKLIST'" }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: inserted, error } = await admin.from('training_sop_records').insert(records).select('id, sop_name, sop_category, sop_status');
    if (error) throw error;

    return new Response(JSON.stringify({
      ok: true, dry_run: false, mode, created: inserted?.length ?? 0, checklist: inserted,
      access_granted: false, access_removed: false, documents_sent: false,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});