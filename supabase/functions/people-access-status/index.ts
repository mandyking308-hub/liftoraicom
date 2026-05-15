import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

function redactEmail(e: any): string | null {
  if (!e || typeof e !== 'string') return null;
  const [u, d] = e.split('@');
  if (!d) return null;
  return `${u.slice(0, 2)}***@${d}`;
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
    if (!(roles ?? []).some((r: any) => ['admin','founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(); horizon.setDate(horizon.getDate() + 90);
    const horizonIso = horizon.toISOString().slice(0, 10);

    const people = await safe(async () => (await admin.from('people_register').select('*')).data ?? [], [] as any[]);
    const access = await safe(async () => (await admin.from('access_review_items').select('*')).data ?? [], [] as any[]);
    const sops = await safe(async () => (await admin.from('training_sop_records').select('*')).data ?? [], [] as any[]);

    const active = people.filter((p: any) => p.status === 'active');
    const departing = people.filter((p: any) => ['offboarding','leaving','terminated'].includes(String(p.status)));
    const missingNda = active.filter((p: any) => !['signed','exempt'].includes(String(p.nda_status)));
    const missingContract = active.filter((p: any) => !['signed','exempt'].includes(String(p.contract_status)) && p.role_type !== 'founder');
    const accessReviewsOverdue = access.filter((a: any) => a.next_review_due_at && a.next_review_due_at < today);
    const accessReviewsUpcoming = access.filter((a: any) => a.next_review_due_at && a.next_review_due_at >= today && a.next_review_due_at <= horizonIso);
    const riskyAccess = access.filter((a: any) => a.risk_level === 'high');
    const sopsTrainingDue = sops.filter((s: any) => s.training_required && !s.training_completed_at);
    const sopsReviewDue = sops.filter((s: any) => s.review_due_at && s.review_due_at <= horizonIso);

    const offboardingNeeded = departing.filter((p: any) => access.some((a: any) => a.person_id === p.id && a.access_status !== 'revoked'));

    const nextActions: any[] = [];
    for (const p of missingNda.slice(0, 5)) nextActions.push({ kind: 'missing_nda', person: p.person_name, role: p.role_type });
    for (const p of missingContract.slice(0, 5)) nextActions.push({ kind: 'missing_contract', person: p.person_name, role: p.role_type });
    for (const a of accessReviewsOverdue.slice(0, 5)) nextActions.push({ kind: 'access_review_overdue', system: a.system_name, due: a.next_review_due_at });
    for (const p of offboardingNeeded.slice(0, 5)) nextActions.push({ kind: 'offboarding_required', person: p.person_name });
    for (const s of sopsTrainingDue.slice(0, 5)) nextActions.push({ kind: 'training_due', sop: s.sop_name });

    return new Response(JSON.stringify({
      ok: true,
      credentials_exposed: false,
      access_granted_automatically: false,
      access_removed_automatically: false,
      documents_sent_externally: false,
      disclaimer: 'Operational tracking only. No credentials are stored or shown. No access changes performed automatically.',
      summary: {
        people_total: people.length,
        people_active: active.length,
        people_departing: departing.length,
        missing_nda_count: missingNda.length,
        missing_contract_count: missingContract.length,
        access_items_total: access.length,
        access_reviews_overdue: accessReviewsOverdue.length,
        access_reviews_upcoming_90d: accessReviewsUpcoming.length,
        risky_access_count: riskyAccess.length,
        offboarding_required: offboardingNeeded.length,
        sops_total: sops.length,
        sops_training_due: sopsTrainingDue.length,
        sops_review_due_90d: sopsReviewDue.length,
      },
      people: people.slice(0, 100).map((p: any) => ({
        id: p.id, person_name: p.person_name, role_type: p.role_type, status: p.status,
        email_masked: redactEmail(p.email), nda_status: p.nda_status, contract_status: p.contract_status,
        data_access_level: p.data_access_level, system_access_required: p.system_access_required,
      })),
      access_reviews_overdue: accessReviewsOverdue.slice(0, 30),
      risky_access: riskyAccess.slice(0, 30),
      sops_training_due: sopsTrainingDue.slice(0, 30),
      offboarding_required: offboardingNeeded.slice(0, 30).map((p: any) => ({ id: p.id, person_name: p.person_name, role_type: p.role_type })),
      next_actions: nextActions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});