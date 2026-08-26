import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  deriveFromLiftor,
  runFidelityCheck,
  type ManifestField,
} from "../_shared/sourceManifest.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

/**
 * Deterministic Source Fidelity Check.
 * Compares the registered source manifest against Liftor's derived business
 * understanding (knowledge profile + starter pack). Read-only except for
 * writing the result back onto the manifest row metadata.
 * Missing source data is reported as MISSING — never invented.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return json({ ok: false, error: "auth_missing" }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false },
  });
  const { data: u, error: ue } = await userClient.auth.getUser(auth.replace("Bearer ", ""));
  if (ue || !u?.user) return json({ ok: false, error: "auth_invalid" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", u.user.id);
  const roleSet = new Set((roles ?? []).map((r: any) => r.role));
  if (!roleSet.has("founder") && !roleSet.has("admin")) {
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const business_id = String(body.business_id ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(business_id)) {
    return json({ ok: false, error: "business_id must be a uuid" }, 400);
  }

  const [{ data: business }, { data: manifests }, { data: profile }, { data: pack }] =
    await Promise.all([
      admin.from("businesses").select("id,name").eq("id", business_id).maybeSingle(),
      admin
        .from("business_knowledge_uploads")
        .select("id,metadata,created_at,upload_title")
        .eq("business_id", business_id)
        .eq("upload_type", "source_manifest")
        .order("created_at", { ascending: false }),
      admin.from("business_knowledge_profiles").select("*").eq("business_id", business_id).maybeSingle(),
      admin
        .from("business_execution_starter_packs")
        .select("*")
        .eq("business_id", business_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!business) return json({ ok: false, error: "business_not_found" }, 404);

  const current = (manifests ?? []).find((m: any) => m?.metadata?.superseded !== true) ??
    (manifests ?? [])[0];
  if (!current) {
    return json({
      ok: false,
      blocked: true,
      verdict: "NO_MANIFEST",
      reason: "no_source_manifest_registered",
      next_step: "Register a source manifest first (business-source-manifest-register).",
    });
  }

  const source = (current.metadata?.manifest_sections ?? {}) as Partial<
    Record<ManifestField, string>
  >;
  const derived = deriveFromLiftor(profile ?? null, pack ?? null, business);
  const result = runFidelityCheck(source, derived);
  const now = new Date().toISOString();

  await admin
    .from("business_knowledge_uploads")
    .update({
      metadata: {
        ...(current.metadata ?? {}),
        fidelity: {
          checked_at: now,
          verdict: result.verdict,
          score: result.score,
          blocks_activation: result.blocks_activation,
          mismatches: result.mismatches,
          missing_in_source: result.missing_in_source,
          not_found_in_derived: result.not_found_in_derived,
        },
      },
    })
    .eq("id", current.id);

  return json({
    ok: true,
    business: business.name,
    manifest_upload_id: current.id,
    source_type: current.metadata?.source_type ?? null,
    source_hash: current.metadata?.source_hash ?? null,
    checked_at: now,
    verdict: result.verdict,
    fidelity_score: result.score,
    blocks_internal_activation: result.blocks_activation,
    comparisons: result.comparisons,
    mismatches: result.mismatches,
    missing_in_source: result.missing_in_source,
    not_found_in_derived: result.not_found_in_derived,
    derived_present: { profile: !!profile, starter_pack: !!pack },
    note:
      "Deterministic comparison only. Missing source data is reported as MISSING / NEEDS SOURCE and is never invented.",
  });
});
