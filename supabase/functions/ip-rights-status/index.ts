import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const assets = (await admin.from('ip_asset_register').select('*').limit(1000)).data ?? [];
    const checklists = (await admin.from('ip_rights_checklists').select('*').limit(1000)).data ?? [];

    const ownership_unknown = assets.filter((a: any) => ['unknown', 'disputed', 'unclear'].includes(String(a.ownership_status)));
    const public_use_blocked = assets.filter((a: any) => a.public_use_allowed === false);
    const high_risk = assets.filter((a: any) => ['high', 'critical'].includes(String(a.rights_risk_level)));
    const not_registered = assets.filter((a: any) => ['not_registered', 'pending'].includes(String(a.registration_status)) && ['logo','trademark','brand_name','domain','character_IP'].includes(String(a.asset_type)));
    const licensable = assets.filter((a: any) => a.licensing_allowed === true && a.commercial_use_allowed === true);

    const distribution_types = ['music_distribution','video_distribution','social_publish','brand_launch','software_release'];
    const distribution_open = checklists.filter((c: any) => distribution_types.includes(c.checklist_type) && c.checklist_status !== 'complete');
    const distribution_missing = distribution_open.filter((c: any) => Array.isArray(c.missing_items) && c.missing_items.length > 0);

    const by_type: Record<string, number> = {};
    for (const a of assets) by_type[a.asset_type] = (by_type[a.asset_type] ?? 0) + 1;

    const next_actions: any[] = [];
    for (const a of ownership_unknown.slice(0, 5)) next_actions.push({ kind: 'confirm_ownership', label: a.asset_name, asset_type: a.asset_type });
    for (const a of high_risk.slice(0, 5)) next_actions.push({ kind: 'rights_risk_review', label: a.asset_name, risk: a.rights_risk_level });
    for (const c of distribution_missing.slice(0, 5)) next_actions.push({ kind: 'distribution_paperwork_missing', checklist_type: c.checklist_type, asset_id: c.asset_id });
    for (const a of not_registered.slice(0, 5)) next_actions.push({ kind: 'registration_review', label: a.asset_name, asset_type: a.asset_type });
    for (const a of licensable.slice(0, 5)) next_actions.push({ kind: 'licensing_opportunity', label: a.asset_name });

    return new Response(JSON.stringify({
      ok: true,
      asset_published: false,
      asset_licensed: false,
      external_send: false,
      ownership_claimed: false,
      disclaimer: 'Tracking only. No assets were published, licensed, or registered externally. Founder approval required for any rights action.',
      summary: {
        total_assets: assets.length,
        ownership_unknown: ownership_unknown.length,
        public_use_blocked: public_use_blocked.length,
        high_risk: high_risk.length,
        not_registered: not_registered.length,
        licensing_opportunities: licensable.length,
        distribution_open: distribution_open.length,
        distribution_missing_paperwork: distribution_missing.length,
        checklists_total: checklists.length,
      },
      by_type: Object.entries(by_type).map(([k, v]) => ({ asset_type: k, count: v })).sort((a: any, b: any) => b.count - a.count),
      ownership_unknown,
      public_use_blocked: public_use_blocked.slice(0, 30),
      high_risk,
      not_registered: not_registered.slice(0, 30),
      licensing_opportunities: licensable.slice(0, 30),
      distribution_open: distribution_open.slice(0, 30),
      next_actions: next_actions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});