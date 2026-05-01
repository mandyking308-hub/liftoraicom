import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";
const HARD_CAP = 25;

interface Body {
  segment_id: string;
}

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    if (!body?.segment_id) return json({ error: "segment_id required" }, 400);

    const { data: segment, error: segErr } = await supabase
      .from("apollo_sync_segments")
      .select("*")
      .eq("id", body.segment_id)
      .maybeSingle();
    if (segErr || !segment) return json({ error: "segment_not_found" }, 404);

    const { data: conn, error: connErr } = await supabase
      .from("apollo_connections")
      .select("*")
      .eq("business_name", segment.business_name)
      .maybeSingle();
    if (connErr || !conn) return json({ error: "no_apollo_connection" }, 404);
    if (conn.search_api_status !== "ok") {
      return json({ error: "search_api_not_verified", detail: conn.search_api_error }, 412);
    }

    const { data: dec } = await supabase.rpc("apollo_decrypt_key", { cipher: conn.api_key_cipher, enc_key: enc });
    const apiKey = dec as string;
    if (!apiKey) return json({ error: "decrypt_failed" }, 500);

    // Create the run
    const { data: run, error: runErr } = await supabase
      .from("apollo_sync_runs")
      .insert({
        segment_id: segment.id,
        business_name: segment.business_name,
        status: "search_running",
      })
      .select()
      .single();
    if (runErr) return json({ error: "run_create_failed", detail: runErr.message }, 500);

    const cap = Math.min(segment.max_contacts_per_run ?? HARD_CAP, HARD_CAP);

    // Build search payload
    const searchBody: Record<string, unknown> = { page: 1, per_page: cap };
    if (segment.mode === "saved_list" && segment.saved_list_id) {
      searchBody.label_ids = [segment.saved_list_id];
    } else if (segment.mode === "people_search") {
      Object.assign(searchBody, segment.search_criteria || {});
      searchBody.page = 1;
      searchBody.per_page = cap;
    }

    const errors: any[] = [];
    const resp = await fetch(`${APOLLO_BASE}/mixed_people/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache", "X-Api-Key": apiKey },
      body: JSON.stringify(searchBody),
    });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      const errMsg = resp.status === 403
        ? "API_INACCESSIBLE — Apollo Search API not enabled on this key"
        : `HTTP ${resp.status}: ${JSON.stringify(data).slice(0, 240)}`;
      await supabase.from("apollo_sync_runs").update({
        status: "failed", errors: [errMsg], completed_at: new Date().toISOString(),
      }).eq("id", run.id);
      return json({ error: errMsg, run_id: run.id }, 502);
    }

    const people = (data?.people ?? data?.contacts ?? []) as any[];
    let withEmailFlag = 0;

    // Insert apollo_leads (idempotent on (run_id, apollo_person_id))
    const leadRows = people.slice(0, cap).map((p) => {
      const hasEmail = !!p.email_status && p.email_status !== "no_email";
      if (hasEmail) withEmailFlag += 1;
      return {
        run_id: run.id,
        segment_id: segment.id,
        business_name: segment.business_name,
        apollo_person_id: p.id,
        apollo_org_id: p.organization?.id ?? p.organization_id ?? null,
        has_email_flag: hasEmail,
        search_payload: p,
        first_name: p.first_name ?? null,
        last_name: p.last_name ?? null,
        title: p.title ?? null,
        company: p.organization?.name ?? p.organization_name ?? null,
        linkedin_url: p.linkedin_url ?? null,
        country: p.country ?? null,
        status: hasEmail ? "has_email" : "found",
      };
    });

    if (leadRows.length) {
      const { error: insErr } = await supabase.from("apollo_leads").insert(leadRows);
      if (insErr) errors.push(`lead_insert: ${insErr.message}`);
    }

    await supabase.from("apollo_sync_runs").update({
      status: "awaiting_enrichment_approval",
      search_pages_fetched: 1,
      people_found: people.length,
      people_with_email_flag: withEmailFlag,
      errors,
    }).eq("id", run.id);

    return json({
      run_id: run.id,
      people_found: people.length,
      people_with_email_flag: withEmailFlag,
      cap,
      next_step: "approve enrichment via apollo-sync-enrich",
    }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});
