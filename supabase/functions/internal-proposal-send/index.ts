/**
 * Internal proposal — PREPARE pack.
 *
 * STAGE 1 CORRECTION (state integrity):
 * This function does NOT transmit anything. It composes the proposal message,
 * resolves the public view/accept/demo links, records the prepared message on
 * the contact timeline (explicitly flagged as not transmitted) and moves the
 * proposal to the `prepared` state. It must never mark a proposal `sent`,
 * because no provider delivery occurs here and there is no delivery receipt.
 *
 * Authorization: founder/admin only. Previously this endpoint ran with the
 * service role and no caller check at all.
 */
import { requireFounderOrAdmin, isCallerError } from "../_shared/callerAuth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUBLIC_BASE = Deno.env.get("PUBLIC_BASE_URL") || "https://liftorai.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);

  const caller = await requireFounderOrAdmin(req, corsHeaders);
  if (isCallerError(caller)) return caller.error;
  const supabase = caller.admin;

  try {
    const { proposal_id } = await req.json().catch(() => ({}));
    if (!proposal_id) return j({ error: "proposal_id required" }, 400);

    const { data: prop } = await supabase.from("internal_proposals")
      .select("*").eq("id", proposal_id).maybeSingle();
    if (!prop) return j({ error: "proposal not found" }, 404);

    const { data: contact } = await supabase.from("contacts")
      .select("*").eq("id", prop.contact_id).maybeSingle();
    if (!contact) return j({ error: "contact not found" }, 404);

    // Find linked demo (if any)
    const { data: demo } = await supabase.from("demo_access")
      .select("*").eq("proposal_id", prop.id).maybeSingle();

    const proposalUrl = `${PUBLIC_BASE}/proposals/view/${prop.view_token}`;
    const acceptUrl = `${PUBLIC_BASE}/proposals/accept/${prop.accept_token}`;
    const demoUrl = demo ? `${PUBLIC_BASE}/demo/${demo.demo_token}` : null;

    const lines: string[] = [
      `Hi ${contact.name || "there"},`,
      ``,
      `Following our conversation, here is the proposal for ${contact.company || "your team"}.`,
      ``,
      `Solution: ${prop.suggested_solution}`,
      `Investment: ${prop.estimated_cost_range}`,
      `Timeline: ${prop.estimated_timeline}`,
      ``,
      `Full proposal: ${proposalUrl}`,
      `Accept proposal: ${acceptUrl}`,
    ];
    if (demoUrl) {
      lines.push(``, `Live Demo Access: ${demoUrl}`, `(Expires in 7 days. No real client data is shown.)`);
    }
    lines.push(``, `— Liftor AI`);

    const message = lines.join("\n");

    // Timeline record of the PREPARED message. Explicitly flagged as not
    // transmitted so it is never mistaken for a delivered email.
    await supabase.from("communications").insert({
      contact_id: contact.id,
      channel: "email",
      direction: "outbound",
      message,
      inbox_id: contact.assigned_inbox_id,
      ai_generated: false,
      ignored_for_send_check: true,
      ignored_reason: "internal_proposal_prepared_not_transmitted",
    });

    await supabase.from("internal_proposals").update({
      status: "prepared",
      prepared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", prop.id);

    return j({
      ok: true,
      transmitted: false,
      state: "prepared",
      note: "Proposal pack prepared. No email was transmitted and no provider was called.",
      message,
      proposal_url: proposalUrl,
      accept_url: acceptUrl,
      demo_url: demoUrl,
    }, 200);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
