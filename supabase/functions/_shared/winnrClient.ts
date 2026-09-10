/**
 * Winnr provider client — GSM mailbox/domain infrastructure.
 *
 * All endpoint paths live HERE and nowhere else, so that when the GSM Winnr
 * account exists the paths can be corrected in one file.
 *
 * Rules:
 *  - Server-side only. WINNR_API_TOKEN never reaches the browser.
 *  - Read paths are safe. Every mutation path defaults to preview/dry-run and
 *    must be gated by founder auth + an explicit external-action confirmation.
 *  - Errors (401/403/429/5xx) are returned truthfully, never as empty success.
 */

export const WINNR_BASE_URL = "https://api.winnr.app/v1";
export const WINNR_CLIENT_VERSION = "winnr-client-1.0.0";

export const WINNR_ENDPOINTS = {
  // Read
  listDomains: { method: "GET", path: "/domains" },
  listEmailUsers: { method: "GET", path: "/email-users" },
  listWarmings: { method: "GET", path: "/warmings" },
  // Mutations — NEVER executed without an explicit external-action confirmation.
  createDomain: { method: "POST", path: "/domains" },
  createEmailUser: { method: "POST", path: "/email-users" },
  startWarming: { method: "POST", path: "/warmings" },
} as const;

export type WinnrEndpointKey = keyof typeof WINNR_ENDPOINTS;

export const WINNR_MUTATION_ENDPOINTS: WinnrEndpointKey[] = [
  "createDomain",
  "createEmailUser",
  "startWarming",
];

export interface WinnrCallResult<T = unknown> {
  ok: boolean;
  http_status: number | null;
  error_code:
    | null
    | "token_missing"
    | "unauthorized"
    | "forbidden"
    | "rate_limited"
    | "not_found"
    | "provider_error"
    | "network_error"
    | "unparsable_response";
  error_message: string | null;
  data: T | null;
  endpoint: string;
}

function classify(status: number): WinnrCallResult["error_code"] {
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 429) return "rate_limited";
  if (status === 404) return "not_found";
  return "provider_error";
}

export function winnrTokenConfigured(token: string | null | undefined): boolean {
  return typeof token === "string" && token.trim().length > 0;
}

/** Perform one Winnr call. Mutations require allowMutation=true from the caller. */
export async function winnrCall<T = unknown>(
  key: WinnrEndpointKey,
  opts: {
    token: string | null | undefined;
    query?: Record<string, string | number | undefined>;
    body?: Record<string, unknown>;
    allowMutation?: boolean;
    fetchImpl?: typeof fetch;
  },
): Promise<WinnrCallResult<T>> {
  const ep = WINNR_ENDPOINTS[key];
  const endpoint = `${ep.method} ${ep.path}`;

  if (WINNR_MUTATION_ENDPOINTS.includes(key) && opts.allowMutation !== true) {
    return {
      ok: false,
      http_status: null,
      error_code: "forbidden",
      error_message: "mutation_blocked_dry_run_default",
      data: null,
      endpoint,
    };
  }

  if (!winnrTokenConfigured(opts.token)) {
    return {
      ok: false,
      http_status: null,
      error_code: "token_missing",
      error_message: "WINNR_API_TOKEN is not configured on the server.",
      data: null,
      endpoint,
    };
  }

  const url = new URL(`${WINNR_BASE_URL}${ep.path}`);
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined) url.searchParams.set(k, String(v));
  }

  const doFetch = opts.fetchImpl ?? fetch;
  let resp: Response;
  try {
    resp = await doFetch(url.toString(), {
      method: ep.method,
      headers: {
        Authorization: `Bearer ${opts.token}`,
        Accept: "application/json",
        ...(ep.method === "GET" ? {} : { "Content-Type": "application/json" }),
      },
      ...(ep.method === "GET" ? {} : { body: JSON.stringify(opts.body ?? {}) }),
    });
  } catch (e) {
    return {
      ok: false,
      http_status: null,
      error_code: "network_error",
      error_message: e instanceof Error ? e.message : "network failure",
      data: null,
      endpoint,
    };
  }

  const text = await resp.text();
  let parsed: unknown = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    if (resp.ok) {
      return {
        ok: false,
        http_status: resp.status,
        error_code: "unparsable_response",
        error_message: "Provider returned a non-JSON body.",
        data: null,
        endpoint,
      };
    }
  }

  if (!resp.ok) {
    return {
      ok: false,
      http_status: resp.status,
      error_code: classify(resp.status),
      error_message: `Winnr ${endpoint} failed with HTTP ${resp.status}.`,
      data: null,
      endpoint,
    };
  }

  return { ok: true, http_status: resp.status, error_code: null, error_message: null, data: parsed as T, endpoint };
}

/** Normalise a provider domain payload onto the canonical GSM registry shape. */
export function normaliseWinnrDomain(raw: Record<string, unknown>) {
  const domain = String(raw.domain ?? raw.name ?? "").trim().toLowerCase();
  const dns = String(raw.dns_status ?? raw.status ?? "unknown").toLowerCase();
  return {
    domain,
    provider: "winnr",
    provider_domain_id: raw.id != null ? String(raw.id) : null,
    provisioning_status: String(raw.provisioning_status ?? raw.state ?? raw.status ?? "pending").toLowerCase(),
    dns_status: dns,
    spf_ok: raw.spf === true || raw.spf_ok === true || String(raw.spf ?? "").toLowerCase() === "ok",
    dkim_ok: raw.dkim === true || raw.dkim_ok === true || String(raw.dkim ?? "").toLowerCase() === "ok",
    dmarc_ok: raw.dmarc === true || raw.dmarc_ok === true || String(raw.dmarc ?? "").toLowerCase() === "ok",
    warmup_eligible: raw.warmup_eligible === true,
  };
}

/** Normalise a provider mailbox payload onto the canonical GSM registry shape. */
export function normaliseWinnrMailbox(raw: Record<string, unknown>) {
  const email = String(raw.email ?? raw.address ?? raw.username ?? "").trim().toLowerCase();
  return {
    email,
    local_part: email.includes("@") ? email.split("@")[0] : null,
    provider: "winnr",
    provider_mailbox_id: raw.id != null ? String(raw.id) : null,
    sender_name: raw.display_name != null ? String(raw.display_name) : raw.name != null ? String(raw.name) : null,
    warmup_status: String(raw.warmup_status ?? raw.warming_status ?? "not_started").toLowerCase(),
    provider_health: String(raw.health ?? raw.status ?? "unknown").toLowerCase(),
    domain: email.includes("@") ? email.split("@")[1] : null,
  };
}
