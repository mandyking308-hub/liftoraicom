import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  campaign_id: string;
  contact_ids?: string[]; // optional explicit list, otherwise picks NEW contacts for the business
  max_contacts?: number;
}

const STEP_DELAYS: Record<number, number> = { 1: 0, 2: 3, 3: 7, 4: 14 };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const body: Body = await req.json();
    if (!body.campaign_id) return json({ error: "campaign_id required" }, 400);

    const { data: campaign } = await supabase.from("outreach_campaigns").select("*").eq("id", body.campaign_id).single();
    if (!campaign) return json({ error: "campaign not found" }, 404);
    if (campaign.status !== "active") return json({ error: "campaign not active" }, 400);

    const { data: sequences } = await supabase.from("outreach_sequences")
      .select("*").eq("campaign_id", body.campaign_id).order("step_number");
    if (!sequences?.length) return json({ error: "campaign has no sequences" }, 400);

    // Pick contacts
    let contactIds = body.contact_ids ?? [];
    if (!contactIds.length) {
      const { data: contacts } = await supabase.from("contacts")
        .select("id")
        .eq("assigned_business", campaign.business_name)
        .eq("status", "NEW")
        .is("active_campaign_id", null)
        .limit(body.max_contacts ?? 50);
      contactIds = (contacts ?? []).map((c) => c.id);
    }
    if (!contactIds.length) return json({ scheduled: 0, contacts: 0 }, 200);

    // Resolve a base "now" anchored at 09:00 UTC today (windowed 08:00–17:00 by send worker)
    const baseDate = new Date();
    baseDate.setUTCHours(9, 0, 0, 0);

    let scheduled = 0;
    for (const cid of contactIds) {
      // Hard stop: skip contacts already in another active campaign or already queued anywhere
      const { data: existing } = await supabase.from("email_queue")
        .select("id, campaign_id")
        .eq("contact_id", cid)
        .in("status", ["pending", "sent"])
        .limit(1);
      if (existing && existing.length && existing[0].campaign_id !== body.campaign_id) {
        continue;
      }

      // Assign inbox if missing
      const { data: inboxId } = await supabase.rpc("assign_inbox_for_contact", { _contact_id: cid });
      if (!inboxId) continue;

      for (const seq of sequences) {
        const delay = STEP_DELAYS[seq.step_number] ?? seq.delay_days ?? 0;
        const sched = new Date(baseDate.getTime() + delay * 86_400_000);
        const { error } = await supabase.from("email_queue").insert({
          contact_id: cid,
          campaign_id: body.campaign_id,
          sequence_step: seq.step_number,
          scheduled_at: sched.toISOString(),
          status: "pending",
          inbox_id: inboxId as string,
          business_name: campaign.business_name,
        });
        if (!error) scheduled += 1;
      }
    }

    return json({ scheduled, contacts: contactIds.length }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
