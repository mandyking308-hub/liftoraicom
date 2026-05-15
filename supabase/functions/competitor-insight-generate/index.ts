import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'CREATE COMPETITOR INSIGHTS';

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
    const {
      business_id,
      competitor_id,
      competitor_name,
      website_url,
      market_category,
      offer_summary,
      pricing_notes,
      strengths = [],
      weaknesses = [],
      content_patterns = [],
      customer_objections = [],
      differentiation_notes,
      source_notes,
      insights = [],
      enable_external_scrape = false,
      dry_run = true,
      confirmation,
    } = body ?? {};

    if (!competitor_id && !competitor_name) {
      return new Response(JSON.stringify({ error: 'competitor_name or competitor_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (enable_external_scrape) {
      return new Response(JSON.stringify({ error: 'external_scrape_disabled', note: 'External scraping is disabled. Provide notes/source text manually.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const ALLOWED = new Set([
      'pricing_position','offer_gap','content_gap','customer_objection','competitor_strength',
      'competitor_weakness','social_content_pattern','proposal_positioning','upsell_opportunity','retention_risk'
    ]);

    const cleanInsights = (Array.isArray(insights) ? insights : []).filter((i: any) => i && ALLOWED.has(i.insight_type) && i.insight_title);

    const proposedProfile = {
      business_id: business_id ?? null,
      competitor_name: competitor_name ?? null,
      website_url: website_url ?? null,
      market_category: market_category ?? null,
      offer_summary: offer_summary ?? null,
      pricing_notes: pricing_notes ?? null,
      strengths, weaknesses, content_patterns, customer_objections,
      differentiation_notes: differentiation_notes ?? null,
      source_notes: source_notes ?? null,
      status: 'watching',
    };

    if (dry_run || confirmation !== CONFIRM) {
      return new Response(JSON.stringify({
        dry_run: true,
        proposed_profile: proposedProfile,
        proposed_insights: cleanInsights,
        external_send: false,
        external_scrape: false,
        note: `Provide confirmation "${CONFIRM}" with dry_run=false to persist.`,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let profileId = competitor_id as string | undefined;
    let profileRow: any = null;
    if (profileId) {
      const { data, error } = await admin.from('competitor_business_profiles').update(proposedProfile).eq('id', profileId).select('*').single();
      if (error) throw error; profileRow = data;
    } else {
      const { data, error } = await admin.from('competitor_business_profiles').insert(proposedProfile).select('*').single();
      if (error) throw error; profileRow = data; profileId = data.id;
    }

    const insightRows = cleanInsights.map((i: any) => ({
      business_id: business_id ?? null,
      competitor_id: profileId,
      insight_type: i.insight_type,
      insight_title: String(i.insight_title).slice(0, 500),
      insight_summary: i.insight_summary ?? null,
      evidence: Array.isArray(i.evidence) ? i.evidence : [],
      recommended_response: i.recommended_response ?? null,
      recommended_offer_change: i.recommended_offer_change ?? null,
      recommended_content_angle: i.recommended_content_angle ?? null,
      recommended_sales_angle: i.recommended_sales_angle ?? null,
      risk_level: ['low','medium','high'].includes(i.risk_level) ? i.risk_level : 'medium',
      founder_review_required: true,
      status: 'pending',
    }));
    let insertedInsights: any[] = [];
    if (insightRows.length) {
      const { data, error } = await admin.from('competitor_learning_insights').insert(insightRows).select('*');
      if (error) throw error; insertedInsights = data ?? [];
    }

    return new Response(JSON.stringify({ profile: profileRow, insights: insertedInsights, external_send: false, external_scrape: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});