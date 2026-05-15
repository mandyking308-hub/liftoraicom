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

    const { data: events } = await admin
      .from('brand_reputation_events')
      .select('id,business_id,event_type,severity,status,sentiment,public_response_needed,event_title,source_channel,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    const { data: plans } = await admin
      .from('crisis_response_plans')
      .select('id,business_id,reputation_event_id,plan_status,escalation_required,legal_review_recommended,founder_review_required,created_at,approved_at')
      .order('created_at', { ascending: false })
      .limit(100);

    const list = events ?? [];
    const by = (k: string, v: string) => list.filter((e: any) => e[k] === v).length;
    const summary = {
      total_events: list.length,
      open: by('status', 'open'),
      reviews: by('event_type', 'review'),
      testimonials: by('event_type', 'testimonial'),
      press_mentions: by('event_type', 'press_mention'),
      social_mentions: by('event_type', 'social_mention'),
      public_complaints: by('event_type', 'public_complaint'),
      crisis_signals: by('event_type', 'crisis_signal'),
      brand_opportunities: by('event_type', 'brand_opportunity'),
      negative: list.filter((e: any) => e.sentiment === 'negative').length,
      high_severity: list.filter((e: any) => e.severity === 'high' || e.severity === 'critical').length,
      response_needed: list.filter((e: any) => e.public_response_needed).length,
    };
    const planSummary = {
      total_plans: (plans ?? []).length,
      drafts: (plans ?? []).filter((p: any) => p.plan_status === 'draft').length,
      awaiting_founder: (plans ?? []).filter((p: any) => p.founder_review_required && !p.approved_at).length,
      legal_review_recommended: (plans ?? []).filter((p: any) => p.legal_review_recommended).length,
    };

    const next_actions = [
      summary.crisis_signals > 0 && `${summary.crisis_signals} crisis signal(s) — draft a holding statement`,
      summary.public_complaints > 0 && `${summary.public_complaints} public complaint(s) — open recovery + draft response`,
      planSummary.awaiting_founder > 0 && `${planSummary.awaiting_founder} response plan(s) waiting founder approval`,
      summary.testimonials > 0 && `${summary.testimonials} testimonial(s) — request permission for marketing`,
    ].filter(Boolean);

    return json({
      ok: true,
      generated_at: new Date().toISOString(),
      summary,
      plan_summary: planSummary,
      events: list.slice(0, 25),
      plans: (plans ?? []).slice(0, 15),
      next_actions,
      safety: {
        public_response_published: false,
        press_release_sent: false,
        external_post: false,
        liability_admitted: false,
        founder_approval_required_for_external: true,
      },
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});