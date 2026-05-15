import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const CONFIRMATION_PHRASE = 'EXECUTE APPROVED INTERNAL ACTIONS';

const INTERNAL_ACTIONS = new Set([
  'create_ai_draft_record',
  'create_crm_next_action',
  'create_commercial_handoff_review',
  'create_proposal_draft',
  'create_demo_readiness',
  'create_deal_review',
  'create_invoice_review',
  'create_supplier_assignment_review',
  'create_revenue_review',
  'create_founder_task',
  'park_item',
  'escalate_to_founder',
]);

const BLOCKED_ACTIONS = new Set([
  'send_email',
  'apollo_reveal',
  'smartlead_lead_push',
  'smartlead_campaign_start',
  'compliance_bulk_approval',
  'live_invoice_send',
  'payment_mutation',
]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function inferActionType(item: any): string {
  const fromMeta = item?.metadata?.action_type || item?.metadata?.execution_action_type;
  if (typeof fromMeta === 'string' && fromMeta.length > 0) return fromMeta;
  const t = (item?.approval_type || '').toLowerCase();
  if (t.includes('ai_draft') || t.includes('reply') || t.includes('conversation_draft')) return 'create_ai_draft_record';
  if (t.includes('next_action') || t.includes('crm_next')) return 'create_crm_next_action';
  if (t.includes('handoff') || t.includes('commercial')) return 'create_commercial_handoff_review';
  if (t.includes('proposal')) return 'create_proposal_draft';
  if (t.includes('demo')) return 'create_demo_readiness';
  if (t.includes('deal')) return 'create_deal_review';
  if (t.includes('invoice')) return 'create_invoice_review';
  if (t.includes('supplier')) return 'create_supplier_assignment_review';
  if (t.includes('revenue')) return 'create_revenue_review';
  if (t.includes('park')) return 'park_item';
  if (t.includes('escalat')) return 'escalate_to_founder';
  if (t.includes('send_email') || t.includes('email_send')) return 'send_email';
  if (t.includes('apollo')) return 'apollo_reveal';
  if (t.includes('smartlead_campaign')) return 'smartlead_campaign_start';
  if (t.includes('smartlead')) return 'smartlead_lead_push';
  return 'create_founder_task';
}

async function executeAction(supabase: any, item: any, actionType: string): Promise<{
  status: 'executed' | 'blocked' | 'failed';
  target_table?: string;
  target_id?: string;
  result_summary?: string;
  blocked_reason?: string;
}> {
  if (BLOCKED_ACTIONS.has(actionType)) {
    return {
      status: 'blocked',
      blocked_reason: `External action '${actionType}' requires controlled external action gate`,
    };
  }
  if (!INTERNAL_ACTIONS.has(actionType)) {
    return { status: 'blocked', blocked_reason: `Unknown action type '${actionType}'` };
  }

  const businessId = item.business_id ?? null;
  const baseMeta = {
    source: 'approved-action-executor',
    approval_id: item.id,
    approval_type: item.approval_type,
  };

  switch (actionType) {
    case 'create_crm_next_action':
    case 'create_commercial_handoff_review':
    case 'create_deal_review':
    case 'create_invoice_review':
    case 'create_supplier_assignment_review':
    case 'create_revenue_review':
    case 'create_demo_readiness':
    case 'park_item':
    case 'escalate_to_founder': {
      const reviewType = actionType.replace(/^create_/, '');
      const { data, error } = await supabase
        .from('crm_founder_review_queue')
        .insert({
          business_id: businessId,
          contact_id: item.contact_id ?? null,
          conversation_id: item.conversation_id ?? null,
          review_type: reviewType,
          priority_level: item.priority_level ?? 'normal',
          recommended_action: item.recommended_action ?? null,
          summary: item.summary ?? item.title,
          status: 'pending',
          metadata: { ...baseMeta, original_title: item.title },
        })
        .select('id')
        .single();
      if (error) return { status: 'failed', blocked_reason: error.message };
      return {
        status: 'executed',
        target_table: 'crm_founder_review_queue',
        target_id: data.id,
        result_summary: `Created ${reviewType} review record`,
      };
    }

    case 'create_proposal_draft': {
      const { data, error } = await supabase
        .from('crm_founder_review_queue')
        .insert({
          business_id: businessId,
          contact_id: item.contact_id ?? null,
          review_type: 'proposal_draft',
          priority_level: item.priority_level ?? 'normal',
          recommended_action: 'review_proposal_draft',
          summary: item.summary ?? item.title,
          status: 'pending',
          metadata: {
            ...baseMeta,
            draft_subject: item.draft_subject,
            draft_body: item.draft_body,
            proposal_id: item.proposal_id,
          },
        })
        .select('id')
        .single();
      if (error) return { status: 'failed', blocked_reason: error.message };
      return {
        status: 'executed',
        target_table: 'crm_founder_review_queue',
        target_id: data.id,
        result_summary: 'Created proposal draft review (no external send)',
      };
    }

    case 'create_ai_draft_record': {
      // Only create if conversation+contact exist; else fall back to review queue
      if (item.conversation_id && item.contact_id && item.draft_body) {
        const { data, error } = await supabase
          .from('ai_drafts')
          .insert({
            conversation_id: item.conversation_id,
            contact_id: item.contact_id,
            draft_body: item.draft_body,
            status: 'pending',
          })
          .select('id')
          .single();
        if (error) return { status: 'failed', blocked_reason: error.message };
        return {
          status: 'executed',
          target_table: 'ai_drafts',
          target_id: data.id,
          result_summary: 'Created AI draft (pending — not sent)',
        };
      }
      const { data, error } = await supabase
        .from('crm_founder_review_queue')
        .insert({
          business_id: businessId,
          contact_id: item.contact_id ?? null,
          conversation_id: item.conversation_id ?? null,
          review_type: 'ai_draft',
          priority_level: item.priority_level ?? 'normal',
          summary: item.summary ?? item.title,
          status: 'pending',
          metadata: { ...baseMeta, draft_body: item.draft_body, draft_subject: item.draft_subject },
        })
        .select('id')
        .single();
      if (error) return { status: 'failed', blocked_reason: error.message };
      return {
        status: 'executed',
        target_table: 'crm_founder_review_queue',
        target_id: data.id,
        result_summary: 'Created AI draft review (missing conversation context)',
      };
    }

    case 'create_founder_task': {
      const { data, error } = await supabase
        .from('crm_founder_review_queue')
        .insert({
          business_id: businessId,
          review_type: 'founder_task',
          priority_level: item.priority_level ?? 'normal',
          recommended_action: item.recommended_action ?? null,
          summary: item.summary ?? item.title,
          status: 'pending',
          metadata: baseMeta,
        })
        .select('id')
        .single();
      if (error) return { status: 'failed', blocked_reason: error.message };
      return {
        status: 'executed',
        target_table: 'crm_founder_review_queue',
        target_id: data.id,
        result_summary: 'Created founder task',
      };
    }
  }

  return { status: 'blocked', blocked_reason: 'No handler for action' };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
  const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const userId = userData.user.id;
  const { data: roleRows } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  const roles = (roleRows ?? []).map((r: any) => r.role);
  if (!roles.includes('admin') && !roles.includes('founder')) {
    return json({ error: 'forbidden_requires_founder_or_admin' }, 403);
  }

  let body: any = {};
  try { body = await req.json(); } catch { body = {}; }

  const dryRun: boolean = body.dry_run !== false; // default true
  const confirmation: string = body.confirmation ?? '';
  const approvedActionId: string | undefined = body.approved_action_id;
  const batchScope: any = body.batch_scope ?? null;

  if (!dryRun && confirmation !== CONFIRMATION_PHRASE) {
    return json({
      error: 'confirmation_required',
      message: `Set dry_run=false and confirmation="${CONFIRMATION_PHRASE}" to execute.`,
    }, 400);
  }

  // Fetch approved items
  let q = admin
    .from('founder_approval_items')
    .select('*')
    .in('status', ['approved'])
    .order('created_at', { ascending: true })
    .limit(50);
  if (approvedActionId) q = admin.from('founder_approval_items').select('*').eq('id', approvedActionId);
  if (batchScope?.business_id) q = q.eq('business_id', batchScope.business_id);
  if (batchScope?.approval_type) q = q.eq('approval_type', batchScope.approval_type);

  const { data: items, error: fetchErr } = await q;
  if (fetchErr) return json({ error: 'fetch_failed', detail: fetchErr.message }, 500);

  const results: any[] = [];
  let executedCount = 0;
  let blockedCount = 0;

  for (const item of (items ?? [])) {
    const actionType = inferActionType(item);
    const isExternalBlocked = BLOCKED_ACTIONS.has(actionType);
    const eligible = !!item.execution_enabled && !isExternalBlocked;

    if (dryRun) {
      results.push({
        approved_action_id: item.id,
        action_type: actionType,
        would_execute: eligible,
        blocked: isExternalBlocked,
        blocked_reason: isExternalBlocked
          ? 'External action — controlled by separate gate'
          : (!item.execution_enabled ? 'execution_enabled=false' : null),
      });
      continue;
    }

    if (!eligible) {
      const reason = isExternalBlocked
        ? `External action '${actionType}' requires controlled external action gate`
        : 'execution_enabled=false on approval item';
      blockedCount += 1;
      const { data: logRow } = await admin
        .from('execution_result_log')
        .insert({
          approved_action_id: item.id,
          business_id: item.business_id,
          action_type: actionType,
          execution_status: 'blocked',
          blocked_reason: reason,
          external_action_attempted: false,
          metadata: { approval_type: item.approval_type },
        })
        .select('id')
        .single();
      await admin.from('agent_action_audit_log').insert({
        agent_key: 'approved_action_executor',
        source_function: 'approved-action-executor',
        action_type: 'execution_blocked',
        action_status: 'blocked',
        business_id: item.business_id,
        target_table: 'founder_approval_items',
        target_id: item.id,
        founder_user_id: userId,
        confirmation_phrase: confirmation,
        dry_run: false,
        blocked_reason: reason,
        metadata: { action_type: actionType, log_id: logRow?.id },
      });
      results.push({
        approved_action_id: item.id,
        action_type: actionType,
        status: 'blocked',
        reason,
      });
      continue;
    }

    const out = await executeAction(admin, item, actionType);
    if (out.status === 'executed') executedCount += 1;
    else blockedCount += 1;

    const { data: logRow } = await admin
      .from('execution_result_log')
      .insert({
        approved_action_id: item.id,
        business_id: item.business_id,
        action_type: actionType,
        execution_status: out.status,
        target_table: out.target_table ?? null,
        target_id: out.target_id ?? null,
        result_summary: out.result_summary ?? null,
        blocked_reason: out.blocked_reason ?? null,
        external_action_attempted: false,
        email_sent: false,
        apollo_called: false,
        smartlead_post_called: false,
        metadata: { approval_type: item.approval_type },
      })
      .select('id')
      .single();

    if (out.status === 'executed') {
      await admin
        .from('founder_approval_items')
        .update({
          status: 'executed',
          metadata: {
            ...(item.metadata ?? {}),
            execution: {
              executed_at: new Date().toISOString(),
              executed_by: userId,
              target_table: out.target_table,
              target_id: out.target_id,
              log_id: logRow?.id,
            },
          },
        })
        .eq('id', item.id);
    }

    await admin.from('agent_action_audit_log').insert({
      agent_key: 'approved_action_executor',
      source_function: 'approved-action-executor',
      action_type: out.status === 'executed' ? 'internal_action_executed' : 'execution_failed',
      action_status: out.status,
      business_id: item.business_id,
      target_table: out.target_table ?? 'founder_approval_items',
      target_id: out.target_id ?? item.id,
      founder_user_id: userId,
      confirmation_phrase: confirmation,
      dry_run: false,
      blocked_reason: out.blocked_reason ?? null,
      metadata: {
        action_type: actionType,
        approval_id: item.id,
        result_summary: out.result_summary,
        log_id: logRow?.id,
      },
    });

    results.push({
      approved_action_id: item.id,
      action_type: actionType,
      status: out.status,
      target_table: out.target_table,
      target_id: out.target_id,
      result_summary: out.result_summary,
      blocked_reason: out.blocked_reason,
    });
  }

  return json({
    ok: true,
    dry_run: dryRun,
    candidates: items?.length ?? 0,
    executed: executedCount,
    blocked: blockedCount,
    results,
    safety: {
      emails_sent: 0,
      apollo_calls: 0,
      smartlead_posts: 0,
      external_action_attempted: false,
    },
  });
});