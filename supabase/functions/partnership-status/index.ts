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

    const { data: programs } = await admin.from('partnership_programs').select('*').order('updated_at', { ascending: false }).limit(200);
    const { data: refs } = await admin.from('partner_referral_records').select('*').order('updated_at', { ascending: false }).limit(200);

    const p = programs ?? []; const r = refs ?? [];
    const by = (arr: any[], k: string, v: string) => arr.filter((x) => x[k] === v).length;

    const summary = {
      total_programs: p.length,
      active_programs: by(p, 'status', 'active'),
      draft_programs: by(p, 'status', 'draft'),
      programs_awaiting_founder: p.filter((x: any) => x.founder_review_required && x.status === 'draft').length,
      total_referrals: r.length,
      new_referrals: by(r, 'referral_status', 'new'),
      qualified: by(r, 'referral_status', 'qualified'),
      won: by(r, 'referral_status', 'won'),
      lost: by(r, 'referral_status', 'lost'),
      pipeline_value: r.reduce((s: number, x: any) => s + Number(x.estimated_value ?? 0), 0),
      commission_due_total: r.filter((x: any) => x.commission_status === 'due').reduce((s: number, x: any) => s + Number(x.commission_due ?? 0), 0),
      commission_review: r.filter((x: any) => x.founder_review_required && x.commission_status === 'due').length,
    };

    const next_actions = [
      summary.programs_awaiting_founder > 0 && `${summary.programs_awaiting_founder} program draft(s) awaiting founder approval`,
      summary.new_referrals > 0 && `${summary.new_referrals} new referral(s) — qualify and route`,
      summary.commission_review > 0 && `${summary.commission_review} commission(s) need founder approval (${summary.commission_due_total})`,
    ].filter(Boolean);

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary,
      programs: p.slice(0, 25),
      referrals: r.slice(0, 25),
      next_actions,
      safety: {
        partner_contacted: false,
        commission_paid: false,
        agreement_sent: false,
        founder_approval_required_for_partner_action: true,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});