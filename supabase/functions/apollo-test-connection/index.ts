import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APOLLO_BASE = "https://api.apollo.io/api/v1";

type DiagnosticCategory =
  | "ok"
  | "key_invalid"
  | "endpoint_permission_missing"
  | "workspace_plan_lacks_api_access"
  | "endpoint_path_method_error"
  | "rate_limit"
  | "error";

type ProbeSpec = {
  label: string;
  path: string;
  method: "GET" | "POST";
  body?: unknown;
};

interface Body {
  business_name: string;
  api_key?: string;
  save?: boolean;
}

type ProbeResult = {
  label: string;
  status: number | null;
  error_code: string | null;
  response_preview: string;
  request: {
    base_url: string;
    endpoint_path: string;
    method: "GET" | "POST";
    x_api_key_header_present: boolean;
    key_last4: string;
  };
  raw_category: DiagnosticCategory;
  capability_ok: boolean;
  message: string;
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
        if (/api[_-]?key|authorization|token|secret/i.test(key)) return [key, "[redacted]"];
        return [key, redactSecrets(nested)];
      }),
    );
  }
  return value;
}

function toPreview(value: unknown) {
  if (value == null) return "";
  try {
    const raw = typeof value === "string" ? value : JSON.stringify(redactSecrets(value));
    return raw.slice(0, 600);
  } catch {
    return "[unserializable response]";
  }
}

function extractErrorCode(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const direct = record.error_code ?? record.code;
  if (typeof direct === "string" && direct.trim()) return direct;
  if (record.error && typeof record.error === "object") return extractErrorCode(record.error);
  return null;
}

async function runProbe(apiKey: string, spec: ProbeSpec) {
  const request = {
    base_url: APOLLO_BASE,
    endpoint_path: spec.path,
    method: spec.method,
    x_api_key_header_present: true,
    key_last4: apiKey.slice(-4),
  } as const;

  try {
    const response = await fetch(`${APOLLO_BASE}${spec.path}`, {
      method: spec.method,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "x-api-key": apiKey,
      },
      body: spec.body === undefined ? undefined : JSON.stringify(spec.body),
    });

    const rawText = await response.text();
    let parsed: unknown = null;
    try {
      parsed = rawText ? JSON.parse(rawText) : null;
    } catch {
      parsed = rawText;
    }

    const safeBody = redactSecrets(parsed);
    const result = {
      request,
      status: response.status,
      data: safeBody,
      error_code: extractErrorCode(safeBody),
      response_preview: toPreview(safeBody ?? rawText),
    };

    console.info("[apollo-diagnostic]", JSON.stringify({
      label: spec.label,
      request,
      status: result.status,
      error_code: result.error_code,
      response_preview: result.response_preview,
    }));

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = {
      request,
      status: null,
      data: null,
      error_code: null,
      response_preview: message,
    };

    console.info("[apollo-diagnostic]", JSON.stringify({
      label: spec.label,
      request,
      status: null,
      error_code: null,
      response_preview: message,
    }));

    return result;
  }
}

function isApiInaccessible(probe: { error_code: string | null; response_preview: string }) {
  return probe.error_code === "API_INACCESSIBLE" || /API_INACCESSIBLE/i.test(probe.response_preview);
}

function classifyKeyValidity(probe: Awaited<ReturnType<typeof runProbe>>): ProbeResult {
  if (probe.status && probe.status >= 200 && probe.status < 300) {
    return {
      label: "Key validity",
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "ok",
      capability_ok: true,
      message: "Apollo accepted the key on the low-risk validation endpoint.",
    };
  }

  if (probe.status === 401) {
    return {
      label: "Key validity",
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "key_invalid",
      capability_ok: false,
      message: "Apollo rejected the key as invalid or unauthorized.",
    };
  }

  if (probe.status === 429) {
    return {
      label: "Key validity",
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "rate_limit",
      capability_ok: false,
      message: "Apollo rate limited the validation request.",
    };
  }

  if (probe.status === 404 || probe.status === 405) {
    return {
      label: "Key validity",
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "endpoint_path_method_error",
      capability_ok: false,
      message: "The validation endpoint path or method appears incorrect.",
    };
  }

  if (probe.status === 403 && isApiInaccessible(probe)) {
    return {
      label: "Key validity",
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "endpoint_permission_missing",
      capability_ok: false,
      message: "Apollo accepted the request format, but the validation endpoint is inaccessible for this workspace/key.",
    };
  }

  return {
    label: "Key validity",
    status: probe.status,
    error_code: probe.error_code,
    response_preview: probe.response_preview,
    request: probe.request,
    raw_category: "error",
    capability_ok: false,
    message: probe.status
      ? `Apollo returned HTTP ${probe.status} on the validation endpoint.`
      : "Apollo validation request failed before a response was received.",
  };
}

function classifyCapabilityProbe(
  label: "Search API" | "Enrichment API",
  probe: Awaited<ReturnType<typeof runProbe>>,
  context: { keyValidityOk: boolean; bothApiInaccessible: boolean },
): ProbeResult {
  const accessibleValidationFailure = label === "Enrichment API" && (probe.status === 400 || probe.status === 422);
  if ((probe.status && probe.status >= 200 && probe.status < 300) || accessibleValidationFailure) {
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "ok",
      capability_ok: true,
      message: accessibleValidationFailure
        ? `${label} endpoint is reachable; Apollo rejected the zero-credit diagnostic payload as expected.`
        : `${label} is accessible with this Apollo key.`,
    };
  }

  if (probe.status === 401) {
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "key_invalid",
      capability_ok: false,
      message: `${label} rejected the Apollo key as invalid or unauthorized.`,
    };
  }

  if (probe.status === 429) {
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "rate_limit",
      capability_ok: false,
      message: `${label} is currently rate limited by Apollo.`,
    };
  }

  if (probe.status === 404 || probe.status === 405) {
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "endpoint_path_method_error",
      capability_ok: false,
      message: `${label} endpoint path or method appears incorrect.`,
    };
  }

  if (probe.status === 403 && isApiInaccessible(probe)) {
    const sharedMessage = "Apollo key appears valid, but this Apollo workspace/plan does not currently allow People Search API and/or Enrichment API access. Contact Apollo support or upgrade API access.";
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: context.keyValidityOk && context.bothApiInaccessible
        ? "workspace_plan_lacks_api_access"
        : "endpoint_permission_missing",
      capability_ok: false,
      message: context.keyValidityOk && context.bothApiInaccessible
        ? sharedMessage
        : label === "Search API"
          ? "Apollo key appears valid, but this Apollo workspace/key does not currently have People Search API access."
          : "Apollo key appears valid, but this Apollo workspace/key does not currently have Enrichment API access.",
    };
  }

  if (probe.status === 403) {
    return {
      label,
      status: probe.status,
      error_code: probe.error_code,
      response_preview: probe.response_preview,
      request: probe.request,
      raw_category: "endpoint_permission_missing",
      capability_ok: false,
      message: `${label} is forbidden for this Apollo workspace/key.`,
    };
  }

  return {
    label,
    status: probe.status,
    error_code: probe.error_code,
    response_preview: probe.response_preview,
    request: probe.request,
    raw_category: "error",
    capability_ok: false,
    message: probe.status
      ? `${label} returned HTTP ${probe.status}.`
      : `${label} request failed before a response was received.`,
  };
}

function toStoredError(result: ProbeResult) {
  if (result.raw_category === "ok") return "";
  const parts = [result.message];
  if (result.status) parts.push(`HTTP ${result.status}`);
  if (result.error_code) parts.push(result.error_code);
  return parts.join(" • ");
}

function buildSummary(keyValidity: ProbeResult, search: ProbeResult, enrichment: ProbeResult) {
  if (keyValidity.capability_ok && search.capability_ok && enrichment.capability_ok) {
    return {
      category: "ok" as DiagnosticCategory,
      message: "Apollo key is valid and both Search and Enrichment APIs are accessible.",
    };
  }

  if (keyValidity.raw_category === "key_invalid" || search.raw_category === "key_invalid" || enrichment.raw_category === "key_invalid") {
    return {
      category: "key_invalid" as DiagnosticCategory,
      message: "Apollo rejected this key. Please confirm the master API key and workspace.",
    };
  }

  if (search.raw_category === "workspace_plan_lacks_api_access" || enrichment.raw_category === "workspace_plan_lacks_api_access") {
    return {
      category: "workspace_plan_lacks_api_access" as DiagnosticCategory,
      message: "Apollo key appears valid, but this Apollo workspace/plan does not currently allow People Search API and/or Enrichment API access. Contact Apollo support or upgrade API access.",
    };
  }

  if (keyValidity.capability_ok && search.raw_category === "endpoint_permission_missing" && enrichment.capability_ok) {
    return {
      category: "endpoint_permission_missing" as DiagnosticCategory,
      message: "Apollo key appears valid, but this Apollo workspace/key does not currently have People Search API access.",
    };
  }

  if (keyValidity.capability_ok && enrichment.raw_category === "endpoint_permission_missing" && search.capability_ok) {
    return {
      category: "endpoint_permission_missing" as DiagnosticCategory,
      message: "Apollo key appears valid, but this Apollo workspace/key does not currently have Enrichment API access.",
    };
  }

  if (keyValidity.raw_category === "rate_limit" || search.raw_category === "rate_limit" || enrichment.raw_category === "rate_limit") {
    return {
      category: "rate_limit" as DiagnosticCategory,
      message: "Apollo rate limited one or more diagnostic requests. Retry in a moment.",
    };
  }

  if (keyValidity.raw_category === "endpoint_path_method_error" || search.raw_category === "endpoint_path_method_error" || enrichment.raw_category === "endpoint_path_method_error") {
    return {
      category: "endpoint_path_method_error" as DiagnosticCategory,
      message: "One of the Apollo diagnostic endpoints appears to be using the wrong path or HTTP method.",
    };
  }

  return {
    category: "error" as DiagnosticCategory,
    message: "Apollo diagnostics did not fully pass. Review the safe raw results below for the failing endpoint.",
  };
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
      const { data: conn } = await supabase
        .from("apollo_connections")
        .select("api_key_cipher")
        .eq("business_name", business)
        .maybeSingle();
      if (!conn) return json({ error: "no_apollo_connection" }, 404);
      const { data: dec, error: decErr } = await supabase.rpc("apollo_decrypt_key", {
        cipher: conn.api_key_cipher,
        enc_key: enc,
      });
      if (decErr || !dec) return json({ error: "decrypt_failed" }, 500);
      apiKey = dec as string;
    }

    const validityRaw = await runProbe(apiKey, {
      label: "Key validity",
      path: "/contacts/search",
      method: "POST",
      body: { page: 1, per_page: 1 },
    });
    const searchRaw = await runProbe(apiKey, {
      label: "Search API",
      path: "/mixed_people/api_search",
      method: "POST",
      body: { "person_titles[]": ["DJ"], page: 1, per_page: 1 },
    });
    const enrichmentRaw = await runProbe(apiKey, {
      label: "Enrichment API",
      path: "/people/bulk_match",
      method: "POST",
      body: { reveal_personal_emails: false, details: [] },
    });

    const keyValidity = classifyKeyValidity(validityRaw);
    const bothApiInaccessible = isApiInaccessible(searchRaw) && isApiInaccessible(enrichmentRaw);
    const search = classifyCapabilityProbe("Search API", searchRaw, {
      keyValidityOk: keyValidity.capability_ok,
      bothApiInaccessible,
    });
    const enrichment = classifyCapabilityProbe("Enrichment API", enrichmentRaw, {
      keyValidityOk: keyValidity.capability_ok,
      bothApiInaccessible,
    });
    const summary = buildSummary(keyValidity, search, enrichment);
    const allOk = keyValidity.capability_ok && search.capability_ok && enrichment.capability_ok;

    if (body.save) {
      const { data: cipher, error: encErr } = await supabase.rpc("apollo_encrypt_key", {
        plain: apiKey,
        enc_key: enc,
      });
      if (encErr) return json({ error: "encrypt_failed", detail: encErr.message }, 500);
      const { error: upsertError } = await supabase
        .from("apollo_connections")
        .upsert({
          business_name: business,
          api_key_cipher: cipher,
          api_key_last4: apiKey.slice(-4),
          is_active: true,
          search_api_status: search.raw_category,
          search_api_error: toStoredError(search),
          search_api_verified_at: search.capability_ok ? new Date().toISOString() : null,
          enrichment_api_status: enrichment.raw_category,
          enrichment_api_error: toStoredError(enrichment),
          enrichment_api_verified_at: enrichment.capability_ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "business_name" });
      if (upsertError) return json({ error: "save_failed", detail: upsertError.message }, 500);
    } else {
      await supabase
        .from("apollo_connections")
        .update({
          search_api_status: search.raw_category,
          search_api_error: toStoredError(search),
          search_api_verified_at: search.capability_ok ? new Date().toISOString() : null,
          enrichment_api_status: enrichment.raw_category,
          enrichment_api_error: toStoredError(enrichment),
          enrichment_api_verified_at: enrichment.capability_ok ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("business_name", business);
    }

    return json({
      ok: allOk,
      summary,
      key_validity: keyValidity,
      search,
      enrichment,
    }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
