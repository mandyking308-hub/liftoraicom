import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE UPSELL RECOMMENDATIONS';

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

    const body = await req.json().catch(() => ({}));
    const { business_id, contact_id, dry_run = true, confirmation } = body ?? {};

    const memory = await safe(async () => contact_id ? (await admin.from('customer_memory_profiles').select('*').eq('contact_id', contact_id).maybeSingle()).data : null, null as any);
    const surveys = await safe(async () => {
      let q = admin.from('customer_survey_responses').select('csat_score, nps_score, key_needs, sentiment').limit(50);
      if (contact_id) q = q.eq('contact_id', contact_id);
      return (await q).data ?? [];
    }, [] as any[]);
    let pkgQ = admin.from('customer_package_catalog').select('*').eq('active', true).limit(100);
    if (business_id) pkgQ = pkgQ.eq('business_id', business_id);
    const packages = (await pkgQ).data ?? [];

    const needs: string[] = [];
    if (Array.isArray(memory?.known_needs)) for (const n of memory.known_needs) needs.push(String(n).toLowerCase());
    for (const s of surveys) if (Array.isArray(s.key_needs)) for (const n of s.key_needs) needs.push(String(n).toLowerCase());
    const needSet = Array.from(new Set(needs));

    const matches = packages.map((p: any) => {
      const kws: string[] = (Array.isArray(p.keywords) ? p.keywords : []).map((k: any) => String(k).toLowerCase());
      const hits = needSet.filter((n) => kws.some((k) => n.includes(k) || k.includes(n)));
      return { package: p, fit_score: hits.length / Math.max(1, kws.length), reason: hits.join(', '), customer_need_matched: hits };
    }).filter((m) => m.fit_score > 0).sort((a, b) => b.fit_score - a.fit_score).slice(0, 5);

    const proposed = matches.map((m: any) => ({
      business_id: business_id ?? null,
      contact_id: contact_id ?? null,
      package_id: m.package.id,
      fit_score: m.fit_score,
      reason: m.reason || 'memory match',
      customer_need_matched: m.customer_need_matched,
      suggested_timing: 'next_touchpoint',
      recommendation_status: 'pending',
      founder_review_required: true,
    }));

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({ dry_run: true, proposed_recommendations: proposed, external_send: false, note: `Provide confirmation "${CONFIRM}" with dry_run=false to persist.` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (proposed.length === 0) {
      return new Response(JSON.stringify({ created: [], external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data, error } = await admin.from('customer_upsell_recommendations').insert(proposed).select('*');
    if (error) throw error;
    return new Response(JSON.stringify({ created: data ?? [], external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});