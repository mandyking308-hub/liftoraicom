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

    const sources = await safe(async () => (await admin.from('knowledge_source_registry').select('*').order('updated_at', { ascending: false }).limit(1000)).data ?? [], [] as any[]);
    const conflicts = await safe(async () => (await admin.from('knowledge_conflict_flags').select('*').order('created_at', { ascending: false }).limit(500)).data ?? [], [] as any[]);

    const now = Date.now();
    const isOutdated = (s: any) => {
      if (s.freshness_status === 'outdated') return true;
      if (s.review_due_at && new Date(s.review_due_at).getTime() < now) return true;
      if (s.last_reviewed_at) {
        const days = (now - new Date(s.last_reviewed_at).getTime()) / 86400000;
        if (days > 180) return true;
      } else if (s.created_at) {
        const days = (now - new Date(s.created_at).getTime()) / 86400000;
        if (days > 365) return true;
      }
      return false;
    };

    const approved = sources.filter((s: any) => s.approval_status === 'approved');
    const unreviewed = sources.filter((s: any) => s.approval_status === 'unreviewed');
    const disputed = sources.filter((s: any) => s.approval_status === 'disputed');
    const rejected = sources.filter((s: any) => s.approval_status === 'rejected');
    const outdated = sources.filter(isOutdated);
    const risky = sources.filter((s: any) => ['high','critical'].includes(String(s.risk_level)));
    const lowReliability = sources.filter((s: any) => s.reliability_score != null && Number(s.reliability_score) < 0.5);
    const internalLeakRisk = sources.filter((s: any) => s.internal_only && s.customer_visible_allowed);
    const reviewDueSoon = sources.filter((s: any) => s.review_due_at && new Date(s.review_due_at).getTime() < now + 14 * 86400000);

    const openConflicts = conflicts.filter((c: any) => c.status === 'open');
    const highSeverityConflicts = openConflicts.filter((c: any) => ['high','critical'].includes(String(c.severity)));

    const next_actions: any[] = [];
    for (const s of internalLeakRisk.slice(0, 5)) next_actions.push({ kind: 'internal_leak_risk', label: s.source_title, fix: 'Set customer_visible_allowed=false or remove internal_only flag.' });
    for (const c of highSeverityConflicts.slice(0, 5)) next_actions.push({ kind: 'conflict_high_severity', label: c.conflict_summary ?? c.conflict_type, fix: c.recommended_resolution ?? 'Founder review required.' });
    for (const s of unreviewed.slice(0, 5)) next_actions.push({ kind: 'unreviewed_source', label: s.source_title, fix: 'Review and approve or reject.' });
    for (const s of outdated.slice(0, 5)) next_actions.push({ kind: 'outdated_source', label: s.source_title, fix: 'Refresh content and mark current.' });
    for (const s of risky.slice(0, 3)) next_actions.push({ kind: 'risky_source', label: s.source_title, fix: 'Founder review required before AI use.' });

    const avg = (arr: number[]) => arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : null;

    return new Response(JSON.stringify({
      ok: true,
      private_knowledge_exposed: false,
      auto_deleted: false,
      disclaimer: 'Knowledge truth read-only view. No sources deleted, exported, or published.',
      summary: {
        sources_total: sources.length,
        approved: approved.length,
        unreviewed: unreviewed.length,
        disputed: disputed.length,
        rejected: rejected.length,
        outdated: outdated.length,
        risky: risky.length,
        low_reliability: lowReliability.length,
        internal_leak_risk: internalLeakRisk.length,
        review_due_soon: reviewDueSoon.length,
        avg_reliability: avg(sources.map((s: any) => Number(s.reliability_score ?? 0)).filter((n: number) => n > 0)),
        conflicts_open: openConflicts.length,
        conflicts_high_severity: highSeverityConflicts.length,
      },
      unreviewed: unreviewed.slice(0, 20),
      outdated: outdated.slice(0, 20),
      risky: risky.slice(0, 20),
      internal_leak_risk: internalLeakRisk.slice(0, 20),
      review_due_soon: reviewDueSoon.slice(0, 20),
      open_conflicts: openConflicts.slice(0, 20),
      next_actions: next_actions.slice(0, 12),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});