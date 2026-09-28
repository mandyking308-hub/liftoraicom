import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { authorizeOutreachImport } from "../_shared/outreachImportAuth.ts";

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
const MAX_IMPORT_ROWS = 5000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    let body: Body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "invalid JSON body" }, 400);
    }
    if (!Array.isArray(body?.rows) || !body.rows.length) return json({ error: "rows required" }, 400);
    if (body.rows.length > MAX_IMPORT_ROWS) return json({ error: `maximum ${MAX_IMPORT_ROWS} rows per import` }, 413);

    const authz = await authorizeOutreachImport(req.headers.get("authorization"), body.business_name, {
      verifyAccessToken: async (token) => {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) throw error;
        return data.user ? { id: data.user.id } : null;
      },
      getRoles: async (userId) => {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .in("role", ["founder", "admin"]);
        if (error) throw error;
        return (data ?? []).map((row) => row.role);
      },
      resolveBusiness: async (businessName) => {
        const { data, error } = await supabase
          .from("businesses")
          .select("id,name")
          .eq("name", businessName)
          .maybeSingle();
        if (error) throw error;
        return data;
      },
    });
    if (!authz.authorized) return json({ error: authz.error }, authz.status);
    const business = authz.business.name;

    // The service-role client is used only after verifying the user's JWT,
    // founder/admin role, and canonical businesses.name on the server.
    const emails = [...new Set(body.rows
      .map((r) => (r.email ?? "").toString().trim().toLowerCase())
      .filter(Boolean))];
    const existingByEmail = new Map<string, string>();
    if (emails.length) {
      const { data: existing, error: existingErr } = await supabase
        .from("contacts")
        .select("id,email")
        .in("email", emails);
      if (existingErr) return json({ error: "contact_scope_lookup_failed" }, 500);
      for (const contact of existing ?? []) {
        if (contact.email) existingByEmail.set(contact.email.toLowerCase(), contact.id);
      }
    }

    const existingContactIds = [...new Set(existingByEmail.values())];
    const alreadyLinked = new Set<string>();
    if (existingContactIds.length) {
      const { data: links, error: linksErr } = await supabase
        .from("business_contact_relationships")
        .select("contact_id")
        .eq("business_name", business)
        .in("contact_id", existingContactIds);
      if (linksErr) return json({ error: "business_relationship_scope_lookup_failed" }, 500);
      for (const link of links ?? []) alreadyLinked.add(link.contact_id);
    }

    // Batch only after the caller and business scope have both been resolved.
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
      else if (seen.has(email) || (existingByEmail.has(email) && alreadyLinked.has(existingByEmail.get(email)!))) status = "duplicate";

      if (status === "valid") valid += 1;
      else if (status === "duplicate") duplicate += 1;
      else invalid += 1;

      if (EMAIL_RE.test(email)) seen.add(email);
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

    // Upsert global people and let upsert_contact create an idempotent
    // business_contact_relationships row for this canonical business.
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
