import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";

interface Body {
  business_name: string;
  // optional plaintext key only used in this single call (never stored unencrypted)
  api_key?: string;
  // when true, persist (encrypt + store) the supplied key on success
  save?: boolean;
}

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function probe(apiKey: string, path: string, body: unknown) {
  const resp = await fetch(`${APOLLO_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      "X-Api-Key": apiKey,
    },
    body: JSON.stringify(body),
  });
  let data: any = null;
  try { data = await resp.json(); } catch { /* ignore */ }
  return { status: resp.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const enc = Deno.env.get("APOLLO_ENCRYPTION_KEY");
    if (!enc) return json({ error: "APOLLO_ENCRYPTION_KEY missing" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    const body: Body = await req.json();
    const business = (body.business_name ?? "").trim();
    if (!business) return json({ error: "business_name required" }, 400);

    let apiKey = body.api_key?.trim();
    if (!apiKey) {
      // Pull existing encrypted key
      const { data: conn } = await supabase
        .from("apollo_connections")
        .select("api_key_cipher")
        .eq("business_name", business)
        .maybeSingle();
      if (!conn) return json({ error: "no_apollo_connection" }, 404);
      const { data: dec, error: decErr } = await supabase.rpc("apollo_decrypt_key", {
        cipher: conn.api_key_cipher, enc_key: enc,
      });
      if (decErr || !dec) return json({ error: "decrypt_failed" }, 500);
      apiKey = dec as string;
    }

    // 1) Search API probe — minimal mixed_people search, page 1, 1 per page
    const search = await probe(apiKey, "/mixed_people/search", { page: 1, per_page: 1 });
    let searchStatus = "ok";
    let searchError = "";
    if (search.status === 403) {
      searchStatus = "inaccessible";
      searchError = "API_INACCESSIBLE — this Apollo key does not have People Search API access. Use a master API key.";
    } else if (search.status === 401) {
      searchStatus = "unauthorized";
      searchError = "401 Unauthorized — Apollo rejected the key.";
    } else if (search.status >= 400) {
      searchStatus = "error";
      searchError = `HTTP ${search.status}: ${JSON.stringify(search.data).slice(0, 240)}`;
    }

    // 2) Bulk Enrichment probe — empty details list (Apollo accepts and returns 200 with empty matches)
    const enrich = await probe(apiKey, "/people/bulk_match", { reveal_personal_emails: false, details: [] });
    let enrichStatus = "ok";
    let enrichError = "";
    if (enrich.status === 403) {
      enrichStatus = "inaccessible";
      enrichError = "API_INACCESSIBLE — this Apollo key does not have Enrichment API access.";
    } else if (enrich.status === 401) {
      enrichStatus = "unauthorized";
      enrichError = "401 Unauthorized — Apollo rejected the key.";
    } else if (enrich.status >= 400) {
      enrichStatus = "error";
      enrichError = `HTTP ${enrich.status}: ${JSON.stringify(enrich.data).slice(0, 240)}`;
    }

    const allOk = searchStatus === "ok" && enrichStatus === "ok";

    if (body.save) {
      // Encrypt and upsert
      const { data: cipher, error: encErr } = await supabase.rpc("apollo_encrypt_key", {
        plain: apiKey, enc_key: enc,
      });
      if (encErr) return json({ error: "encrypt_failed", detail: encErr.message }, 500);
      const last4 = apiKey.slice(-4);
      const upsertPayload = {
        business_name: business,
        api_key_cipher: cipher,
        api_key_last4: last4,
        is_active: true,
        search_api_status: searchStatus,
        search_api_error: searchError,
        search_api_verified_at: searchStatus === "ok" ? new Date().toISOString() : null,
        enrichment_api_status: enrichStatus,
        enrichment_api_error: enrichError,
        enrichment_api_verified_at: enrichStatus === "ok" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };
      const { error: upErr } = await supabase
        .from("apollo_connections")
        .upsert(upsertPayload, { onConflict: "business_name" });
      if (upErr) return json({ error: "save_failed", detail: upErr.message }, 500);
    } else {
      // Just update verification status if a connection already exists
      await supabase.from("apollo_connections").update({
        search_api_status: searchStatus,
        search_api_error: searchError,
        search_api_verified_at: searchStatus === "ok" ? new Date().toISOString() : null,
        enrichment_api_status: enrichStatus,
        enrichment_api_error: enrichError,
        enrichment_api_verified_at: enrichStatus === "ok" ? new Date().toISOString() : null,
      }).eq("business_name", business);
    }

    return json({
      ok: allOk,
      search: { status: searchStatus, error: searchError, http: search.status },
      enrichment: { status: enrichStatus, error: enrichError, http: enrich.status },
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
