import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUBLIC_BASE = Deno.env.get("PUBLIC_BASE_URL") || "https://liftorai.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return j({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
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

    // Log via communications (handle_new_communication updates contacts.last_contacted_at)
    await supabase.from("communications").insert({
      contact_id: contact.id,
      channel: "email",
      direction: "outbound",
      message,
      inbox_id: contact.assigned_inbox_id,
      ai_generated: false,
    });

    await supabase.from("internal_proposals").update({
      status: "sent", sent_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", prop.id);

    return j({ ok: true, proposal_url: proposalUrl, accept_url: acceptUrl, demo_url: demoUrl }, 200);
  } catch (e) {
    return j({ error: (e as Error).message }, 500);
  }
});

function j(b: unknown, s: number) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}