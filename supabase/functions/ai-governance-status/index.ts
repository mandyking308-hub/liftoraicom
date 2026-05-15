import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

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

    const reviews = await safe(async () => (await admin.from('ai_draft_quality_reviews').select('*').order('created_at', { ascending: false }).limit(500)).data ?? [], [] as any[]);
    const prompts = await safe(async () => (await admin.from('ai_prompt_registry').select('*').order('updated_at', { ascending: false }).limit(500)).data ?? [], [] as any[]);

    const lowQuality = reviews.filter((r: any) => Number(r.quality_score ?? 100) < 70);
    const lowGrounding = reviews.filter((r: any) => Number(r.grounding_score ?? 100) < 60);
    const lowCompliance = reviews.filter((r: any) => Number(r.compliance_score ?? 100) < 70);
    const withClaims = reviews.filter((r: any) => Array.isArray(r.unsupported_claims) && r.unsupported_claims.length > 0);
    const missingCtx = reviews.filter((r: any) => Array.isArray(r.missing_context) && r.missing_context.length > 0);
    const awaitingFounder = reviews.filter((r: any) => r.founder_review_required && !r.approved_for_customer_view);

    const promptsActive = prompts.filter((p: any) => p.prompt_status === 'active');
    const promptsUnapproved = prompts.filter((p: any) => !p.approved_by_founder && p.prompt_status === 'active');
    const promptsHighRisk = prompts.filter((p: any) => ['high','critical'].includes(String(p.risk_level)));
    const promptsNeedReview = prompts.filter((p: any) => {
      if (!p.last_reviewed_at) return true;
      const d = new Date(p.last_reviewed_at).getTime();
      return Date.now() - d > 90 * 86400 * 1000;
    });

    const agentMap = new Map<string, { drafts: number; low: number }>();
    for (const r of reviews) {
      const k = r.agent_key ?? 'unknown';
      const e = agentMap.get(k) ?? { drafts: 0, low: 0 };
      e.drafts++;
      if (Number(r.quality_score ?? 100) < 70) e.low++;
      agentMap.set(k, e);
    }
    const agentWarnings = Array.from(agentMap.entries())
      .map(([agent, v]) => ({ agent, drafts: v.drafts, low_quality: v.low, low_rate: v.drafts ? +(v.low / v.drafts * 100).toFixed(1) : 0 }))
      .filter((a) => a.drafts >= 3 && a.low_rate >= 25)
      .sort((a, b) => b.low_rate - a.low_rate);

    const next_actions: any[] = [];
    for (const r of withClaims.slice(0, 5)) next_actions.push({ kind: 'unsupported_claims', label: r.draft_type, fix: r.recommended_fix });
    for (const r of missingCtx.slice(0, 5)) next_actions.push({ kind: 'missing_context', label: r.draft_type, fix: r.recommended_fix });
    for (const p of promptsUnapproved.slice(0, 3)) next_actions.push({ kind: 'prompt_unapproved', label: p.prompt_name });
    for (const p of promptsNeedReview.slice(0, 3)) next_actions.push({ kind: 'prompt_review_overdue', label: p.prompt_name });

    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : null;

    return new Response(JSON.stringify({
      ok: true,
      external_send_performed: false,
      published: false,
      disclaimer: 'Governance read-only view. No drafts sent or published.',
      summary: {
        reviews_total: reviews.length,
        avg_quality: avg(reviews.map((r: any) => Number(r.quality_score ?? 0))),
        avg_grounding: avg(reviews.map((r: any) => Number(r.grounding_score ?? 0))),
        avg_compliance: avg(reviews.map((r: any) => Number(r.compliance_score ?? 0))),
        low_quality: lowQuality.length,
        low_grounding: lowGrounding.length,
        low_compliance: lowCompliance.length,
        with_unsupported_claims: withClaims.length,
        missing_context: missingCtx.length,
        awaiting_founder_review: awaitingFounder.length,
        prompts_total: prompts.length,
        prompts_active: promptsActive.length,
        prompts_unapproved: promptsUnapproved.length,
        prompts_high_risk: promptsHighRisk.length,
        prompts_review_overdue: promptsNeedReview.length,
      },
      risky_drafts: withClaims.slice(0, 20),
      missing_context_drafts: missingCtx.slice(0, 20),
      awaiting_founder_review: awaitingFounder.slice(0, 20),
      prompts_unapproved: promptsUnapproved.slice(0, 20),
      prompts_review_overdue: promptsNeedReview.slice(0, 20),
      agent_warnings: agentWarnings.slice(0, 20),
      next_actions: next_actions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
