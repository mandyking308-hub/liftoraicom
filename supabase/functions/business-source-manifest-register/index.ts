import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  MANIFEST_SOURCE_TYPES,
  manifestHash,
  parseManifest,
  type ManifestSourceType,
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
 * Business Source Manifest intake — stores a manifest snapshot as a durable
 * business knowledge source (reuses business_knowledge_uploads).
 * No external action, no provider call, no continuous polling of the source.
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
    return json({ ok: false, error: "invalid_json_body" }, 400);
  }

  const business_id = String(body.business_id ?? "").trim();
  const source_type = String(body.source_type ?? "").trim() as ManifestSourceType;
  const manifest_text = String(body.manifest_text ?? "").trim();
  const source_ref = body.source_ref ? String(body.source_ref).trim() : null;
  const source_project_id = body.source_project_id ? String(body.source_project_id).trim() : null;
  const source_url = body.source_url ? String(body.source_url).trim() : null;
  const source_version = body.source_version ? String(body.source_version).trim() : null;
  const title = String(body.title ?? "").trim() || "Business source manifest";

  const errors: string[] = [];
  if (!/^[0-9a-f-]{36}$/i.test(business_id)) errors.push("business_id must be a uuid");
  if (!(MANIFEST_SOURCE_TYPES as readonly string[]).includes(source_type)) {
    errors.push(`source_type must be one of ${MANIFEST_SOURCE_TYPES.join(", ")}`);
  }
  if (manifest_text.length < 40) errors.push("manifest_text too short (min 40 chars)");
  if (manifest_text.length > 200_000) errors.push("manifest_text too large (max 200000 chars)");
  if (errors.length) return json({ ok: false, error: errors }, 400);

  const { data: business } = await admin
    .from("businesses")
    .select("id,name")
    .eq("id", business_id)
    .maybeSingle();
  if (!business) return json({ ok: false, error: "business_not_found" }, 404);

  const parsed = parseManifest(manifest_text);
  const hash = manifestHash(manifest_text);
  const now = new Date().toISOString();

  // Supersede any prior manifest snapshot with a different hash (audit history kept).
  const { data: prior } = await admin
    .from("business_knowledge_uploads")
    .select("id,metadata")
    .eq("business_id", business_id)
    .eq("upload_type", "source_manifest");

  const existingSame = (prior ?? []).find((p: any) => p?.metadata?.source_hash === hash);
  if (existingSame) {
    await admin
      .from("business_knowledge_uploads")
      .update({
        metadata: { ...(existingSame.metadata ?? {}), last_synced_at: now, superseded: false },
      })
      .eq("id", existingSame.id);
    return json({
      ok: true,
      unchanged: true,
      upload_id: existingSame.id,
      source_hash: hash,
      parsed_fields: Object.keys(parsed.sections),
      missing_fields: parsed.missing_fields,
      note: "Identical manifest snapshot already registered — last_synced_at refreshed only.",
    });
  }

  for (const p of prior ?? []) {
    await admin
      .from("business_knowledge_uploads")
      .update({ metadata: { ...((p as any).metadata ?? {}), superseded: true, superseded_at: now } })
      .eq("id", (p as any).id);
  }

  const { data: inserted, error: insErr } = await admin
    .from("business_knowledge_uploads")
    .insert({
      business_id,
      upload_type: "source_manifest",
      upload_title: title,
      source_kind: source_type,
      source_url,
      upload_status: "uploaded",
      processing_status: "not_started",
      privacy_level: "internal",
      customer_visible_allowed: false,
      founder_review_required: true,
      summary: parsed.sections.purpose ?? null,
      metadata: {
        is_source_manifest: true,
        source_type,
        source_ref,
        source_project_id,
        source_version,
        source_hash: hash,
        last_synced_at: now,
        manifest_format: parsed.format,
        manifest_sections: parsed.sections,
        missing_fields: parsed.missing_fields,
        unknown_headings: parsed.unknown_headings,
        manifest_text,
        superseded: false,
        external_action_locked: true,
        provenance_note:
          "Snapshot of an external source (project/manual/site). Not invented current truth. Anything absent is UNKNOWN / NEEDS SOURCE.",
      },
    })
    .select("id")
    .maybeSingle();

  if (insErr) return json({ ok: false, error: insErr.message }, 500);

  return json({
    ok: true,
    upload_id: inserted?.id ?? null,
    business: business.name,
    source_type,
    source_hash: hash,
    manifest_format: parsed.format,
    parsed_fields: Object.keys(parsed.sections),
    missing_fields: parsed.missing_fields,
    unknown_headings: parsed.unknown_headings,
    next_step: "Run business-source-fidelity-check before internal activation.",
  });
});
