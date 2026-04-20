import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LeadRow {
  email?: string;
  name?: string;
  company?: string;
  role?: string;
  country?: string;
  [k: string]: unknown;
}

interface Body {
  business_name: string;
  source_name?: string;
  file_name?: string;
  rows: LeadRow[];
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    if (!body?.rows?.length) return json({ error: "rows required" }, 400);
    const business = (body.business_name ?? "").trim();
    if (!business) return json({ error: "business_name required" }, 400);

    // Build the batch
    const { data: batch, error: batchErr } = await supabase
      .from("import_batches")
      .insert({
        business_name: business,
        source_name: body.source_name ?? "",
        file_name: body.file_name ?? "",
        total_rows: body.rows.length,
      })
      .select()
      .single();
    if (batchErr) return json({ error: batchErr.message }, 500);

    let valid = 0, invalid = 0, duplicate = 0;
    const leadInserts: Array<Record<string, unknown>> = [];

    // Pre-fetch existing emails to detect duplicates against contacts
    const emails = body.rows
      .map((r) => (r.email ?? "").toString().trim().toLowerCase())
      .filter(Boolean);
    const { data: existing } = await supabase
      .from("contacts")
      .select("email")
      .in("email", emails);
    const existingSet = new Set((existing ?? []).map((c) => c.email));

    // Track duplicates within the same upload
    const seen = new Set<string>();

    for (const r of body.rows) {
      const email = (r.email ?? "").toString().trim().toLowerCase();
      const name = (r.name ?? "").toString().trim();
      const company = (r.company ?? "").toString().trim();
      const role = (r.role ?? "").toString().trim();
      const country = (r.country ?? "").toString().trim();

      let status: "valid" | "invalid" | "duplicate" = "valid";
      if (!EMAIL_RE.test(email)) status = "invalid";
      else if (existingSet.has(email) || seen.has(email)) status = "duplicate";

      if (status === "valid") valid += 1;
      else if (status === "duplicate") duplicate += 1;
      else invalid += 1;

      seen.add(email);
      leadInserts.push({
        batch_id: batch.id,
        email,
        name,
        company,
        role,
        country,
        raw_data: r,
        validation_status: status,
        processed: false,
      });
    }

    const { data: insertedLeads, error: leadErr } = await supabase
      .from("imported_leads")
      .insert(leadInserts)
      .select();
    if (leadErr) return json({ error: leadErr.message }, 500);

    // Upsert valid leads into contacts and score them
    const validLeads = (insertedLeads ?? []).filter((l) => l.validation_status === "valid");
    let upserted = 0;
    for (const l of validLeads) {
      const { data: contact, error: upErr } = await supabase.rpc("upsert_contact", {
        _email: l.email,
        _name: l.name,
        _company: l.company,
        _role: l.role,
        _source: "dataset_import",
        _assigned_business: business,
      });
      if (upErr || !contact) continue;
      upserted += 1;
      const contactId = (contact as { id: string }).id;
      await supabase.from("imported_leads")
        .update({ processed: true, contact_id: contactId })
        .eq("id", l.id);
      await supabase.rpc("score_contact", { _contact_id: contactId, _business_name: business });
    }

    await supabase.from("import_batches")
      .update({ valid_rows: valid, invalid_rows: invalid, duplicate_rows: duplicate })
      .eq("id", batch.id);

    return json({ batch_id: batch.id, total: body.rows.length, valid, invalid, duplicate, contacts_upserted: upserted }, 200);
  } catch (err) {
    return json({ error: (err as Error).message }, 500);
  }
});

function json(b: unknown, status: number) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
