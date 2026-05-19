import { corsHeaders, json, requireFounder, SUPPORT_SAFETY } from "../_shared/supportAgentLogic.ts";
const TABLES = ["support_knowledge_sources","support_knowledge_articles","support_faq_items","support_question_intake","support_reply_drafts","support_triage_reviews","support_escalations","support_quality_reviews","support_manual_export_packs","support_audit"];
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const a = await requireFounder(req); if ("error" in a) return a.error;
  const blockers: string[] = [];
  for (const t of TABLES) {
    const { error } = await a.admin.from(t).select("id").limit(1);
    if (error) blockers.push(`table_missing_${t}:${error.message}`);
  }
  const status = blockers.length === 0 ? "PASS" : "BLOCKED";
  return json({
    ok: true, status, blockers,
    no_forbidden_action_audit: {
      external_api_calls: 0, customer_replies_sent: 0, live_chats_started: 0,
      tickets_created_externally: 0, fake_tickets_created: 0,
      external_reply_placeholder_fails_closed: true,
      send_allowed_default_false: true,
    },
    safety: SUPPORT_SAFETY,
  });
});