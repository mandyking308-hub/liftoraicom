import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface IntakeBody {
  channel_key: string;
  business_id?: string | null;
  external_event_id?: string | null;
  external_thread_id?: string | null;
  contact_email?: string | null;
  contact_name?: string | null;
  contact_handle?: string | null;
  subject?: string | null;
  message_text?: string | null;
  message_language?: string | null;
  raw_payload?: Record<string, unknown>;
  source?: "manual" | "internal" | "test";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub;
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: roles } = await admin
      .from("user_roles").select("role").eq("user_id", userId);
    const ok = (roles ?? []).some((r: any) => ["founder", "admin"].includes(r.role));
    if (!ok) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as IntakeBody;
    if (!body?.channel_key) {
      return new Response(JSON.stringify({ error: "channel_key required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const source = body.source ?? "manual";

    const { data: channel, error: chErr } = await admin
      .from("communication_channels")
      .select("*")
      .eq("channel_key", body.channel_key)
      .maybeSingle();
    if (chErr || !channel) {
      return new Response(JSON.stringify({ error: "Unknown channel" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!channel.inbound_supported) {
      return new Response(JSON.stringify({ error: "Inbound not supported on this channel" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency
    if (body.external_event_id) {
      const { data: existing } = await admin
        .from("multi_channel_inbound_events")
        .select("id")
        .eq("channel_key", body.channel_key)
        .eq("external_event_id", body.external_event_id)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({
          event_id: existing.id, idempotent: true, channel: channel.channel_key,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: inserted, error: insErr } = await admin
      .from("multi_channel_inbound_events")
      .insert({
        business_id: body.business_id ?? null,
        channel_key: body.channel_key,
        provider_type: channel.provider_type ?? null,
        external_event_id: body.external_event_id ?? null,
        external_thread_id: body.external_thread_id ?? null,
        contact_email: body.contact_email ?? null,
        contact_name: body.contact_name ?? null,
        contact_handle: body.contact_handle ?? null,
        subject: body.subject ?? null,
        message_text: body.message_text ?? null,
        message_language: body.message_language ?? null,
        raw_payload: body.raw_payload ?? {},
        processed_status: "received",
        founder_review_required: true,
        metadata: { source, intake_user: userId, outbound_disabled: true },
      })
      .select("id")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      event_id: inserted.id,
      channel: channel.channel_key,
      outbound_disabled: true,
      crm_capture_enqueued: false,
      notes: "Inbound recorded. No outbound, no provider mutation.",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});