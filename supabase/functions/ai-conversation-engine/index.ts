import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANTI_LOOP_MINUTES = 2;
const DAILY_ACTION_CAP = 5;
const MAX_CONTEXT_MESSAGES = 10;
const MAX_REPLY_WORDS = 120;
const ESCALATION_LENGTH = 500;

const LEGAL_KEYWORDS = [
  "lawyer","attorney","sue","lawsuit","legal action","gdpr","subpoena",
  "litigation","compliance officer","regulator","cease and desist",
];
const HIGH_VALUE_KEYWORDS = [
  "enterprise","procurement","rfp","budget","six figure","seven figure",
  "$1m","$500k","large rollout","group-wide","global rollout",
];
const NEGATIVE_KEYWORDS = [
  "angry","furious","unacceptable","disgusted","outrageous","terrible",
  "appalling","scam","fraud","report you",
];

interface Body { conversation_id?: string; contact_id?: string; }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body: Body = await req.json().catch(() => ({}));
    if (!body.conversation_id || !body.contact_id) {
      return json({ error: "conversation_id and contact_id required" }, 400);
    }

    // Load conversation + contact
    const { data: conv } = await supabase.from("conversations")
      .select("*").eq("id", body.conversation_id).maybeSingle();
    if (!conv) return json({ error: "conversation not found" }, 404);

    const { data: contact } = await supabase.from("contacts")
      .select("*").eq("id", body.contact_id).maybeSingle();
    if (!contact) return json({ error: "contact not found" }, 404);

    // Anti-loop: skip if AI ran in the last 2 minutes
    if (conv.ai_last_used_at) {
      const since = (Date.now() - new Date(conv.ai_last_used_at).getTime()) / 60000;
      if (since < ANTI_LOOP_MINUTES) {
        return json({ skipped: "ANTI_LOOP", minutes_since_last: since }, 200);
      }
    }

    // Daily cap
    const { data: capCheck } = await supabase.rpc("ai_actions_today", { _conversation_id: conv.id });
    if ((capCheck as number) >= DAILY_ACTION_CAP) {
      return json({ skipped: "DAILY_CAP", count: capCheck }, 200);
    }

    // Don't reply if contact is DO_NOT_CONTACT or already QUALIFIED/CLIENT
    if (["DO_NOT_CONTACT","CLIENT","SUPPLIER"].includes(contact.status)) {
      return json({ skipped: "STATUS_BLOCKED", status: contact.status }, 200);
    }

    // Pull last 10 messages
    const { data: msgs } = await supabase.from("messages")
      .select("direction, content, created_at, ai_generated")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: false })
      .limit(MAX_CONTEXT_MESSAGES);
    const ordered = (msgs ?? []).slice().reverse();
    const lastInbound = [...ordered].reverse().find((m) => m.direction === "inbound");
    if (!lastInbound) return json({ skipped: "NO_INBOUND" }, 200);

    // Escalation rules — short-circuit before AI
    const text = (lastInbound.content || "").toLowerCase();
    const escalationReasons: string[] = [];
    if (lastInbound.content && lastInbound.content.length > ESCALATION_LENGTH) {
      escalationReasons.push("LONG_MESSAGE");
    }
    if (LEGAL_KEYWORDS.some((k) => text.includes(k))) escalationReasons.push("LEGAL_KEYWORD");
    if (HIGH_VALUE_KEYWORDS.some((k) => text.includes(k))) escalationReasons.push("HIGH_VALUE");
    if (NEGATIVE_KEYWORDS.some((k) => text.includes(k))) escalationReasons.push("NEGATIVE_SENTIMENT");

    if (escalationReasons.length) {
      await supabase.from("ai_actions").insert({
        conversation_id: conv.id,
        contact_id: contact.id,
        action_type: "escalate",
        classification: "escalated",
        reply_preview: `Escalation reasons: ${escalationReasons.join(", ")}`,
        tokens_used: 0,
        status: "success",
      });
      await supabase.from("conversations").update({
        escalation_pending: true,
        escalation_reason: escalationReasons.join(", "),
        ai_last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", conv.id);
      return json({ escalated: true, reasons: escalationReasons }, 200);
    }

    // Build AI context
    const history = ordered.map((m) =>
      `${m.direction === "inbound" ? "PROSPECT" : "US"}: ${m.content}`
    ).join("\n");

    const systemPrompt = `You are the AI conversation assistant for ${conv.business_name || "our company"} replying to ${contact.name || "a prospect"} (${contact.role || "unknown role"}, ${contact.company || "unknown company"}).

RULES — never break:
- Reply in MAX ${MAX_REPLY_WORDS} words.
- Match the prospect's language.
- No pricing unless they explicitly asked.
- No fabricated facts, names, or commitments.
- If the message is unclear, ask exactly ONE clarifying question.
- If they want to unsubscribe, confirm removal in one sentence.
- Tone: human, direct, no fluff, no apologies.

Use the classify_and_reply tool. Classifications:
- interested: positive engagement, asking about scope/fit/next steps
- not_interested: declining or saying no
- neutral: factual / informational with no clear signal
- unsubscribe: explicit opt-out request
- question: needs more info before deciding`;

    const userPrompt = `Conversation so far (oldest → newest):\n${history}\n\nThe LAST message from the prospect is what you must respond to.`;

    // Call Lovable AI
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "classify_and_reply",
            description: "Classify the prospect's intent and produce a reply.",
            parameters: {
              type: "object",
              properties: {
                classification: {
                  type: "string",
                  enum: ["interested","not_interested","neutral","unsubscribe","question"],
                },
                reply: { type: "string", description: `Reply text, max ${MAX_REPLY_WORDS} words` },
              },
              required: ["classification","reply"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "classify_and_reply" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      await supabase.from("ai_actions").insert({
        conversation_id: conv.id,
        contact_id: contact.id,
        action_type: "reply",
        status: "failed",
        error_message: `gateway_${aiRes.status}: ${errText.slice(0, 400)}`,
      });
      if (aiRes.status === 429) return json({ error: "Rate limit. Try again shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted." }, 402);
      return json({ error: "AI gateway error", status: aiRes.status }, 500);
    }

    const aiJson = await aiRes.json();
    const tc = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    const args = tc ? JSON.parse(tc.function.arguments) : null;
    const classification: string = args?.classification ?? "neutral";
    let replyText: string = args?.reply ?? "";
    const tokensUsed: number = aiJson?.usage?.total_tokens ?? 0;

    // Hard truncate to 120 words as belt-and-braces
    const words = replyText.trim().split(/\s+/);
    if (words.length > MAX_REPLY_WORDS) replyText = words.slice(0, MAX_REPLY_WORDS).join(" ");

    // Status updates from classification
    let newContactStatus: string | null = null;
    if (classification === "interested") newContactStatus = "QUALIFIED";
    if (classification === "not_interested" || classification === "unsubscribe") {
      newContactStatus = "DO_NOT_CONTACT";
    }
    if (newContactStatus) {
      await supabase.from("contacts").update({
        status: newContactStatus,
        active_campaign_id: null,
        updated_at: new Date().toISOString(),
      }).eq("id", contact.id);
    }

    // Log classify action
    await supabase.from("ai_actions").insert({
      conversation_id: conv.id,
      contact_id: contact.id,
      action_type: "classify",
      classification,
      tokens_used: 0,
      status: "success",
    });

    // Log outbound reply via communications (the mirror trigger will create the message row)
    if (replyText.trim()) {
      await supabase.from("communications").insert({
        contact_id: contact.id,
        channel: "email",
        direction: "outbound",
        message: replyText,
        inbox_id: contact.assigned_inbox_id,
        ai_generated: true,
      });

      await supabase.from("ai_actions").insert({
        conversation_id: conv.id,
        contact_id: contact.id,
        action_type: "reply",
        classification,
        reply_preview: replyText.slice(0, 280),
        tokens_used: tokensUsed,
        status: "success",
      });
    }

    // Update conversation status if qualified
    const convPatch: Record<string, unknown> = {
      ai_last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (classification === "interested") convPatch.status = "QUALIFIED";
    if (classification === "unsubscribe" || classification === "not_interested") convPatch.status = "CLOSED";
    await supabase.from("conversations").update(convPatch).eq("id", conv.id);

    return json({
      ok: true, classification, reply_words: replyText.trim().split(/\s+/).length,
      contact_status: newContactStatus,
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}