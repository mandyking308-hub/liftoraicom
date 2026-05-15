import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const CONFIRM = 'RUN PROSPECTING AGENT';

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> { try { return await fn(); } catch { return fb; } }

function clamp01(n: number) { return Math.max(0, Math.min(1, n)); }

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
    const { prospecting_job_id = null, business_id: bizParam = null, dry_run = true, max_candidates = 50, confirmation } = body ?? {};
    const willPersist = !dry_run && confirmation === CONFIRM;

    let job: any = null;
    if (prospecting_job_id) {
      job = (await admin.from('prospecting_search_jobs').select('*').eq('id', prospecting_job_id).maybeSingle()).data;
    }
    const business_id = job?.business_id ?? bizParam;
    if (!business_id) {
      return new Response(JSON.stringify({ error: 'business_id or prospecting_job_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (job?.external_search_allowed) {
      // Even if flagged, do not call external APIs from this function.
    }

    // Pull internal/safe candidate sources only.
    const apolloPool = await safe(async () => (await admin.from('apollo_leads').select('id,first_name,last_name,name,title,organization_name,linkedin_url,company_industry,country').limit(max_candidates)).data ?? [], [] as any[]);
    const orgs = await safe(async () => (await admin.from('organisations').select('id,name,industry').limit(max_candidates)).data ?? [], [] as any[]);
    const founderNotes = await safe(async () => (await admin.from('business_knowledge_assets').select('id,title,summary,asset_type,business_id').eq('business_id', business_id).eq('asset_type','founder_notes').limit(50)).data ?? [], [] as any[]);
    const competitors = await safe(async () => (await admin.from('competitor_profiles').select('id,name,industry').limit(50)).data ?? [], [] as any[]);
    const knowledge = await safe(async () => (await admin.from('business_knowledge_profiles').select('*').eq('business_id', business_id).maybeSingle()).data, null);

    const ranking = (await safe(async () => (await admin.from('prospect_ranking_models').select('*').eq('model_key','default_v1').maybeSingle()).data, null)) as any;
    const w = (ranking?.scoring_weights ?? { icp_fit_score:25, strategic_value_score:20, revenue_potential_score:20, accessibility_score:10, relationship_score:10, urgency_score:10, compliance_safety_score:5 }) as any;

    type Cand = { source_key: string; account_name: string; account_domain?: string|null; industry?: string|null; geography?: string|null; known_contact_name?: string|null; known_contact_title?: string|null; linkedin_url?: string|null; account_type: string; source_notes?: string|null };
    const cands: Cand[] = [];
    for (const a of apolloPool) {
      cands.push({
        source_key: 'apollo_existing_pool',
        account_name: a.organization_name ?? a.name ?? `${a.first_name ?? ''} ${a.last_name ?? ''}`.trim() ?? 'Unknown',
        industry: a.company_industry ?? null, geography: a.country ?? null,
        known_contact_name: [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name || null,
        known_contact_title: a.title ?? null, linkedin_url: a.linkedin_url ?? null,
        account_type: 'customer',
      });
    }
    for (const o of orgs) cands.push({ source_key: 'manual_import', account_name: o.name, industry: o.industry ?? null, account_type: 'customer' });
    for (const n of founderNotes) cands.push({ source_key: 'founder_notes', account_name: n.title, source_notes: n.summary ?? null, account_type: 'strategic_account' });
    for (const c of competitors) cands.push({ source_key: 'competitor_customer_research', account_name: `Customers of ${c.name}`, industry: c.industry ?? null, account_type: 'customer', source_notes: 'Competitor customer research seed (manual review).' });

    // Score & rank
    const ranked = cands.slice(0, max_candidates).map((c) => {
      const icp_fit_score = clamp01(0.4 + (knowledge && c.industry ? 0.3 : 0));
      const strategic_value_score = clamp01(c.account_type === 'partner' || c.account_type === 'strategic_account' ? 0.8 : 0.5);
      const revenue_potential_score = clamp01(c.account_type === 'enterprise_account' ? 0.9 : 0.5);
      const accessibility_score = clamp01(c.linkedin_url ? 0.7 : 0.4);
      const relationship_score = clamp01(c.source_key === 'partner_intro_list' || c.source_key === 'founder_notes' ? 0.8 : 0.3);
      const urgency_score = 0.5;
      const compliance_safety_score = clamp01(c.source_key === 'apollo_new_search' ? 0.4 : 0.8);
      const overall = (
        icp_fit_score * (w.icp_fit_score ?? 0) +
        strategic_value_score * (w.strategic_value_score ?? 0) +
        revenue_potential_score * (w.revenue_potential_score ?? 0) +
        accessibility_score * (w.accessibility_score ?? 0) +
        relationship_score * (w.relationship_score ?? 0) +
        urgency_score * (w.urgency_score ?? 0) +
        compliance_safety_score * (w.compliance_safety_score ?? 0)
      );
      const recommended_channel = c.account_type === 'creator' || c.account_type === 'influencer' || c.account_type === 'playlist_curator'
        ? 'social' : (c.account_type === 'partner' || c.account_type === 'strategic_account' ? 'manual' : 'smartlead');
      const reasons = [
        `source=${c.source_key}`,
        c.linkedin_url ? 'has_linkedin' : 'no_linkedin',
        knowledge ? 'icp_known' : 'icp_unknown',
      ];
      return {
        ...c,
        business_id,
        prospecting_job_id: prospecting_job_id ?? null,
        icp_fit_score, strategic_value_score, revenue_potential_score,
        accessibility_score, relationship_score, urgency_score,
        overall_priority_score: Number(overall.toFixed(2)),
        recommended_channel,
        recommended_next_action: 'Founder reviews. No outreach until promote-to-CRM and channel-specific approval.',
        ranking_reason: reasons.join(' · '),
        founder_review_required: true,
        approval_status: 'pending',
      };
    }).sort((a, b) => (b.overall_priority_score ?? 0) - (a.overall_priority_score ?? 0));

    let persisted: any = { accounts: 0, approvals: 0 };
    if (willPersist && ranked.length) {
      const rows = ranked.map((r) => ({
        business_id: r.business_id, prospecting_job_id: r.prospecting_job_id,
        account_name: r.account_name, industry: r.industry ?? null, geography: r.geography ?? null,
        account_type: r.account_type, known_contact_name: r.known_contact_name ?? null,
        known_contact_title: r.known_contact_title ?? null, linkedin_url: r.linkedin_url ?? null,
        source_key: r.source_key, source_notes: r.source_notes ?? null,
        icp_fit_score: r.icp_fit_score, strategic_value_score: r.strategic_value_score,
        revenue_potential_score: r.revenue_potential_score, accessibility_score: r.accessibility_score,
        relationship_score: r.relationship_score, urgency_score: r.urgency_score,
        overall_priority_score: r.overall_priority_score,
        recommended_channel: r.recommended_channel, recommended_next_action: r.recommended_next_action,
        ranking_reason: r.ranking_reason, founder_review_required: true, approval_status: 'pending',
      }));
      const ins = await admin.from('strategic_target_accounts').insert(rows).select('id,account_name,overall_priority_score');
      persisted.accounts = ins.data?.length ?? 0;
      const top = (ins.data ?? []).slice(0, 10);
      for (const t of top) {
        await safe(async () => admin.from('founder_approval_items').insert({
          approval_type: 'strategic_prospect',
          business_id, agent_key: 'prospecting_agent',
          source_system: 'prospecting_agent', source_table: 'strategic_target_accounts', source_id: t.id,
          title: `Strategic prospect: ${t.account_name}`,
          summary: `Top-ranked prospect (${t.overall_priority_score})`,
          recommended_action: 'Review prospect; promote to CRM if appropriate. No outreach without channel approval.',
          priority_level: 'normal', status: 'pending',
        }), null);
        persisted.approvals++;
      }
    }

    return new Response(JSON.stringify({
      ok: true, mode: willPersist ? 'persisted' : 'dry_run', confirmation_required: CONFIRM,
      external_send: false, apollo_credits_spent: false, smartlead_post: false, external_search_called: false,
      candidates: ranked.length, top: ranked.slice(0, 25), persisted,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});