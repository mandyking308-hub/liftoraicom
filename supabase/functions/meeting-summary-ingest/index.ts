import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SIGNAL_PATTERNS: Array<{ key: string; rx: RegExp[] }> = [
  { key: 'decisions', rx: [/\b(decided|agreed|we will|we'll|going with|chose|selected)\b/i] },
  { key: 'commitments', rx: [/\b(commit|promise|guarantee|deliver by|send by|i will|i'll|by (monday|tuesday|wednesday|thursday|friday|next week|end of week|eow|eom))\b/i] },
  { key: 'customer_needs', rx: [/\b(need|require|looking for|want|wish|would like|important to)\b/i] },
  { key: 'objections', rx: [/\b(too expensive|cost|price|worried|concern|not sure|hesitant|but |however|risk)\b/i] },
  { key: 'complaints', rx: [/\b(broken|doesn'?t work|issue|bug|problem|frustrat|disappoint|angry|complain|refund)\b/i] },
  { key: 'upsell_signals', rx: [/\b(more seats|upgrade|add(?:ing)? users?|enterprise|expand|scale|annual|larger plan)\b/i] },
  { key: 'support_issues', rx: [/\b(error|failing|outage|stuck|can'?t access|login problem|slow|crash|help with)\b/i] },
  { key: 'action_items', rx: [/\b(follow ?up|next step|to do|todo|action item|send|share|schedule|book|invite|prepare)\b/i] },
];

function extractFromText(text: string) {
  const lines = (text ?? '').split(/\r?\n|(?<=[.!?])\s+/).map(l => l.trim()).filter(Boolean);
  const out: Record<string, string[]> = {};
  for (const { key } of SIGNAL_PATTERNS) out[key] = [];
  for (const line of lines) {
    for (const { key, rx } of SIGNAL_PATTERNS) {
      if (rx.some(r => r.test(line)) && out[key].length < 20) out[key].push(line.slice(0, 280));
    }
  }
  return out;
}

async function tableExists(admin: any, name: string): Promise<boolean> {
  try { const r = await admin.from(name).select('*', { head: true, count: 'exact' }).limit(1); return !r.error; } catch { return false; }
}

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
    const meeting_title = String(body?.meeting_title ?? '').trim();
    if (!meeting_title) return new Response(JSON.stringify({ error: 'meeting_title required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const text = [body?.summary, body?.transcript, body?.notes].filter(Boolean).join('\n\n');
    const extracted = extractFromText(text);
    const risk_flags: string[] = [];
    if (extracted.complaints.length) risk_flags.push('complaint_detected');
    if (extracted.objections.length >= 3) risk_flags.push('multiple_objections');
    if (extracted.support_issues.length) risk_flags.push('support_issue');

    const confirm = String(body?.confirm ?? '').toUpperCase() === 'CREATE MEETING RECORD';

    const record = {
      business_id: body?.business_id ?? null,
      contact_id: body?.contact_id ?? null,
      organisation_id: body?.organisation_id ?? null,
      calendar_event_id: body?.calendar_event_id ?? null,
      meeting_title,
      meeting_type: body?.meeting_type ?? null,
      meeting_status: confirm ? 'captured' : 'draft',
      meeting_at: body?.meeting_at ?? null,
      attendees: Array.isArray(body?.attendees) ? body.attendees : [],
      summary: body?.summary ?? null,
      transcript: body?.transcript ?? null,
      decisions: extracted.decisions,
      commitments: extracted.commitments,
      followups: extracted.action_items,
      risk_flags,
      founder_review_required: true,
    };

    let created_id: string | null = null;
    let crm_mirrored = false;
    let memory_refreshed = false;
    let action_items_created = 0;

    if (confirm) {
      const { data: ins, error } = await admin.from('meeting_call_records').insert(record).select('id').single();
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      created_id = ins.id;

      const actions = extracted.action_items.slice(0, 20).map(a => ({
        meeting_id: created_id,
        business_id: record.business_id,
        contact_id: record.contact_id,
        action_title: a,
        owner_agent_key: 'customer_success_agent',
        status: 'pending',
        founder_review_required: false,
      }));
      if (actions.length) {
        const { error: aerr } = await admin.from('meeting_action_items').insert(actions);
        if (!aerr) action_items_created = actions.length;
      }

      if (await tableExists(admin, 'crm_interactions')) {
        try {
          await admin.from('crm_interactions').insert({
            business_id: record.business_id,
            contact_id: record.contact_id,
            interaction_type: 'meeting',
            channel: 'meeting',
            summary: (record.summary ?? meeting_title).slice(0, 2000),
            occurred_at: record.meeting_at ?? new Date().toISOString(),
            metadata: { meeting_id: created_id, source: 'meeting-summary-ingest' },
          });
          crm_mirrored = true;
        } catch {}
      }
      if (await tableExists(admin, 'customer_memory')) {
        try {
          await admin.from('customer_memory').insert({
            business_id: record.business_id,
            contact_id: record.contact_id,
            memory_type: 'meeting_summary',
            content: { meeting_id: created_id, decisions: extracted.decisions, commitments: extracted.commitments, needs: extracted.customer_needs, complaints: extracted.complaints, upsell: extracted.upsell_signals },
          });
          memory_refreshed = true;
        } catch {}
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      mode: confirm ? 'create' : 'dry_run',
      external_send: false,
      calendar_invite_sent: false,
      call_joined: false,
      call_recorded: false,
      followup_email_sent: false,
      transcript_exposed_publicly: false,
      disclaimer: 'Capture only. No call joining, no recording, no calendar invites, no follow-up emails. Founder approval required for any external action.',
      created_id,
      action_items_created,
      crm_mirrored,
      memory_refreshed,
      extracted,
      risk_flags,
      preview: record,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});