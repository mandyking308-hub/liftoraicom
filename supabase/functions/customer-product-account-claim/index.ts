import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ ok: false, error: "server_configuration_missing" }, 500);

  // Establish the caller's authenticated identity before privileged access.
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser(authorization.slice("Bearer ".length));
  const user = authData?.user;
  if (authError || !user?.id || !user.email) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const email = user.email.trim().toLowerCase();
  const { data: contactId, error: identityError } = await admin.rpc("customer_sales_link_contact_by_email", { p_email: email });
  if (identityError) {
    if (String(identityError.message ?? "").includes("ambiguous_contact_email")) {
      return json({ ok: false, error: "ambiguous_contact_identity_review_required" }, 409);
    }
    return json({ ok: false, error: "customer_identity_lookup_failed" }, 503);
  }
  if (!contactId || typeof contactId !== "string") return json({ ok: false, error: "customer_identity_not_found" }, 404);

  const accounts = await admin.from("customer_product_accounts").select("*")
    .eq("contact_id", contactId).in("access_status", ["pending_user", "active"]).limit(100);
  if (accounts.error) return json({ ok: false, error: "customer_product_account_lookup_failed" }, 503);
  if (!accounts.data?.length) return json({ ok: false, error: "customer_product_account_not_found" }, 404);

  const claimed: string[] = [];
  for (const account of accounts.data) {
    if (account.account_scope !== "customer_product" || account.account_role !== "product_customer") {
      return json({ ok: false, error: "forbidden_product_account_role" }, 409);
    }
    const relationship = await admin.from("business_contact_relationships").select("id,contact_id,business_id")
      .eq("id", account.business_contact_relationship_id).maybeSingle();
    if (relationship.error || !relationship.data || relationship.data.contact_id !== contactId || relationship.data.business_id !== account.business_id) {
      return json({ ok: false, error: "business_contact_relationship_mismatch" }, 409);
    }
    const product = await admin.from("customer_sales_products").select("id,business_id,requires_customer_account")
      .eq("id", account.product_id).eq("business_id", account.business_id).maybeSingle();
    if (product.error || !product.data || product.data.requires_customer_account !== true) {
      return json({ ok: false, error: "customer_product_context_mismatch" }, 409);
    }
    if (account.auth_user_id && account.auth_user_id !== user.id) {
      return json({ ok: false, error: "product_account_already_claimed" }, 409);
    }
    if (account.auth_user_id === user.id && account.access_status === "active") {
      claimed.push(account.id);
    } else {
      const update = await admin.from("customer_product_accounts").update({
        auth_user_id: user.id,
        access_status: "active",
        metadata: { ...(account.metadata ?? {}), claimed_by_auth_user_id: user.id, claimed_at: new Date().toISOString() },
      }).eq("id", account.id).is("auth_user_id", null).eq("access_status", "pending_user")
        .select("id,account_role,account_scope,access_status").maybeSingle();
      if (update.error) return json({ ok: false, error: "product_account_activation_failed" }, 503);
      if (update.data) {
        if (update.data.account_role !== "product_customer" || update.data.account_scope !== "customer_product" || update.data.access_status !== "active") {
          return json({ ok: false, error: "forbidden_product_account_role" }, 409);
        }
        claimed.push(update.data.id);
      } else {
        const raced = await admin.from("customer_product_accounts").select("id,auth_user_id,account_role,account_scope,access_status")
          .eq("id", account.id).maybeSingle();
        if (raced.data?.auth_user_id !== user.id || raced.data.account_role !== "product_customer" || raced.data.account_scope !== "customer_product" || raced.data.access_status !== "active") {
          return json({ ok: false, error: "product_account_claim_race" }, 409);
        }
        claimed.push(raced.data.id);
      }
    }

    const { data: intent } = await admin.from("customer_sales_checkout_intents").select("*").eq("id", account.checkout_id).maybeSingle();
    if (intent) {
      const audit = await admin.from("customer_commercial_audit_events").upsert({
        idempotency_key: `checkout:${intent.id}:product_account_claimed:${user.id}`,
        event_type: "customer_product_account_activated",
        business_id: account.business_id,
        contact_id: contactId,
        business_contact_relationship_id: account.business_contact_relationship_id,
        checkout_id: intent.id,
        payment_id: account.payment_id,
        event_payload: { account_id: account.id, account_role: "product_customer", auth_user_id: user.id },
      }, { onConflict: "idempotency_key" });
      if (audit.error) return json({ ok: false, error: "product_account_audit_failed" }, 503);
    }
  }

  // This function only links customer_product_accounts. It never writes user_roles.
  return json({ ok: true, activated_accounts: claimed.length, account_ids: claimed, role: "product_customer" });
});
