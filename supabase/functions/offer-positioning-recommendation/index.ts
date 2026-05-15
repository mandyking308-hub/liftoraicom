import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE OFFER POSITIONING RECOMMENDATIONS';

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
    if (!(roles ?? []).some((r: any) => ['admin', 'founder'].includes(r.role)))
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json().catch(() => ({}));
    const { business_id, dry_run = true, confirmation } = body ?? {};

    const competitors = await safe(async () => (await admin.from('competitor_business_profiles').select('*').order('updated_at', { ascending: false }).limit(50)).data ?? [], [] as any[]);
    const insights = await safe(async () => {
      let q = admin.from('competitor_learning_insights').select('*').limit(100);
      if (business_id) q = q.eq('business_id', business_id);
      return (await q).data ?? [];
    }, [] as any[]);
    const surveys = await safe(async () => (await admin.from('customer_survey_responses').select('csat_score, nps_score, sentiment, key_needs, competitor_mentions').limit(200)).data ?? [], [] as any[]);
    const proposals = await safe(async () => (await admin.from('proposals').select('id, status, lost_reason').limit(100)).data ?? [], [] as any[]);
    const support = await safe(async () => (await admin.from('support_interaction_reviews').select('objection, theme, severity').limit(100)).data ?? [], [] as any[]);

    const offerGaps = insights.filter((i: any) => i.insight_type === 'offer_gap').slice(0, 5);
    const contentGaps = insights.filter((i: any) => i.insight_type === 'content_gap').slice(0, 5);
    const objections = insights.filter((i: any) => i.insight_type === 'customer_objection').slice(0, 5);
    const upsellHints = insights.filter((i: any) => i.insight_type === 'upsell_opportunity').slice(0, 5);

    const lostReasons = proposals.filter((p: any) => (p.status ?? '').toLowerCase() === 'lost').map((p: any) => p.lost_reason).filter(Boolean);
    const supportObjections = support.map((s: any) => s.objection).filter(Boolean).slice(0, 10);

    const recommendations = [
      offerGaps.length && {
        kind: 'offer_positioning',
        title: 'Strengthen offer where competitors lead',
        detail: offerGaps.map((g: any) => g.recommended_offer_change || g.insight_title).filter(Boolean).join(' | '),
        risk_level: 'medium',
      },
      contentGaps.length && {
        kind: 'content_angle',
        title: 'Cover missing content angles',
        detail: contentGaps.map((g: any) => g.recommended_content_angle || g.insight_title).filter(Boolean).join(' | '),
        risk_level: 'low',
      },
      (objections.length || supportObjections.length || lostReasons.length) && {
        kind: 'objection_handling',
        title: 'Add objection-handling responses to proposals & sales replies',
        detail: [
          ...objections.map((o: any) => o.recommended_response || o.insight_title),
          ...supportObjections,
          ...lostReasons,
        ].filter(Boolean).slice(0, 8).join(' | '),
        risk_level: 'medium',
      },
      upsellHints.length && {
        kind: 'upsell_package',
        title: 'Package ideas based on unmet customer needs',
        detail: upsellHints.map((u: any) => u.recommended_offer_change || u.insight_title).filter(Boolean).join(' | '),
        risk_level: 'low',
      },
      {
        kind: 'differentiation',
        title: 'Reinforce differentiation in proposals',
        detail: 'Lead with measurable engineering outcomes (uptime, dry-runs, audit trail) vs generic AI-agency claims.',
        risk_level: 'low',
      },
    ].filter(Boolean);

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({
        dry_run: true,
        recommendations,
        sources: { competitors: competitors.length, insights: insights.length, surveys: surveys.length, proposals: proposals.length, support: support.length },
        external_send: false,
        note: `Provide confirmation "${CONFIRM}" with dry_run=false to persist as competitor_learning_insights of type proposal_positioning.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rows = recommendations.map((r: any) => ({
      business_id: business_id ?? null,
      competitor_id: null,
      insight_type: r.kind === 'upsell_package' ? 'upsell_opportunity' : r.kind === 'content_angle' ? 'content_gap' : r.kind === 'objection_handling' ? 'customer_objection' : 'proposal_positioning',
      insight_title: r.title,
      insight_summary: r.detail,
      evidence: [],
      recommended_response: r.kind === 'objection_handling' ? r.detail : null,
      recommended_offer_change: r.kind === 'offer_positioning' || r.kind === 'upsell_package' ? r.detail : null,
      recommended_content_angle: r.kind === 'content_angle' ? r.detail : null,
      recommended_sales_angle: r.kind === 'differentiation' ? r.detail : null,
      risk_level: r.risk_level ?? 'medium',
      founder_review_required: true,
      status: 'pending',
    }));
    const { data, error } = await admin.from('competitor_learning_insights').insert(rows).select('*');
    if (error) throw error;
    return new Response(JSON.stringify({ created: data ?? [], external_send: false }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});