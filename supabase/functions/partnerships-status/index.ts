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

    const { data: partners } = await admin.from('partnership_accounts').select('*').order('updated_at', { ascending: false }).limit(200);
    const { data: links } = await admin.from('referral_links').select('*').order('updated_at', { ascending: false }).limit(200);
    const { data: payouts } = await admin.from('affiliate_payouts').select('*').order('created_at', { ascending: false }).limit(100);

    const p = partners ?? []; const l = links ?? []; const po = payouts ?? [];
    const by = (arr: any[], k: string, v: string) => arr.filter((x) => x[k] === v).length;

    const summary = {
      total_partners: p.length,
      prospects: by(p, 'status', 'prospect'),
      active_partners: by(p, 'status', 'active'),
      paused: by(p, 'status', 'paused'),
      affiliates: by(p, 'partner_type', 'affiliate'),
      referral_partners: by(p, 'partner_type', 'referral'),
      strategic: by(p, 'partner_type', 'strategic'),
      total_links: l.length,
      active_links: by(l, 'status', 'active'),
      total_clicks: l.reduce((s: number, x: any) => s + (x.clicks_count ?? 0), 0),
      total_conversions: l.reduce((s: number, x: any) => s + (x.conversions_count ?? 0), 0),
      pending_payouts: by(po, 'status', 'pending'),
      pending_payout_total: po.filter((x: any) => x.status === 'pending').reduce((s: number, x: any) => s + Number(x.amount ?? 0), 0),
      awaiting_founder: p.filter((x: any) => x.founder_review_required && x.status === 'prospect').length,
    };

    const next_actions = [
      summary.prospects > 0 && `${summary.prospects} prospect partner(s) — review and qualify`,
      summary.pending_payouts > 0 && `${summary.pending_payouts} payout(s) pending founder approval (${summary.pending_payout_total})`,
      summary.active_links > 0 && summary.total_conversions === 0 && `${summary.active_links} active link(s) with 0 conversions — diagnose channel`,
      summary.awaiting_founder > 0 && `${summary.awaiting_founder} partner(s) awaiting founder review`,
    ].filter(Boolean);

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary,
      partners: p.slice(0, 25),
      links: l.slice(0, 25),
      payouts: po.slice(0, 25),
      next_actions,
      safety: {
        external_outreach: false,
        payout_executed: false,
        public_listing: false,
        founder_approval_required_for_payout: true,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});