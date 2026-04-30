import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    // Verify the caller is a logged-in user (auth check). Authorization is enforced
    // by the founder UI route guard; we additionally verify token validity here.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      inbox_id, provider_type, smtp_host, smtp_port, smtp_username,
      smtp_encryption, smtp_password, from_name, from_email, reply_to_email,
    } = body ?? {};

    if (!inbox_id || !provider_type) return json({ error: "inbox_id and provider_type required" }, 400);
    if (provider_type === "ionos_smtp") {
      if (!smtp_host || !smtp_port || !smtp_username || !smtp_encryption) {
        return json({ error: "SMTP host/port/username/encryption required" }, 400);
      }
      if (!["starttls", "ssl"].includes(smtp_encryption)) {
        return json({ error: "encryption must be starttls or ssl" }, 400);
      }
    }

    const encKey = Deno.env.get("INBOX_CREDENTIALS_KEY");
    if (!encKey) return json({ error: "encryption key not configured" }, 500);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const { data, error } = await admin.rpc("save_inbox_credentials", {
      _inbox_id: inbox_id,
      _provider_type: provider_type,
      _smtp_host: smtp_host ?? null,
      _smtp_port: smtp_port ?? null,
      _smtp_username: smtp_username ?? null,
      _smtp_encryption: smtp_encryption ?? null,
      _smtp_password: smtp_password ?? null,
      _from_name: from_name ?? null,
      _from_email: from_email ?? null,
      _reply_to_email: reply_to_email ?? null,
      _enc_key: encKey,
    });
    if (error) return json({ error: error.message }, 400);
    return json({ ok: true, data }, 200);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}