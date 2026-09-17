/**
 * Winnr provider client — GSM mailbox/domain infrastructure.
 *
 * All endpoint paths live HERE and nowhere else so provider API changes are
 * reconciled in one audited server-side module.
 *
 * Rules:
 *  - Server-side only. WINNR_API_TOKEN never reaches the browser.
 *  - Read paths are safe. Every mutation path defaults to preview/dry-run and
 *    must be gated by founder auth + an explicit external-action confirmation.
 *  - Errors (401/403/429/5xx) are returned truthfully, never as empty success.
 *
 * Endpoint source reconciled 11 Sep 2026 against Winnr's current public API
 * documentation (api.winnr.app/v1): domains, email-users, warming and export.
 */

export const WINNR_BASE_URL = "https://api.winnr.app/v1";
export const WINNR_CLIENT_VERSION = "winnr-client-1.3.0";

/** Winnr paginates list endpoints at 25 by default; always ask for the full page. */
export const WINNR_LIST_PAGE_SIZE = 100;

export const WINNR_ENDPOINTS = {
  // Read
  getAccount: { method: "GET", path: "/account" },
  listDomains: { method: "GET", path: "/domains" },
  listEmailUsers: { method: "GET", path: "/email-users" },
  listWarmings: { method: "GET", path: "/warming" },
  warmingOverview: { method: "GET", path: "/warming/overview" },
  // Mutations — NEVER executed without an explicit external-action confirmation.
  createDomain: { method: "POST", path: "/domains" },
  createEmailUser: { method: "POST", path: "/email-users" },
  createEmailUsersBulk: { method: "POST", path: "/email-users/bulk" },
  // Keep the historic key name for compatibility; the current API path is /warming/enable.
  startWarming: { method: "POST", path: "/warming/enable" },
  startWarmingAsync: { method: "POST", path: "/warming/enable-async" },
  exportCredentials: { method: "POST", path: "/export" },
} as const;

export type WinnrEndpointKey = keyof typeof WINNR_ENDPOINTS;

export const WINNR_MUTATION_ENDPOINTS: WinnrEndpointKey[] = [
  "createDomain",
  "createEmailUser",
  "createEmailUsersBulk",
  "startWarming",
  "startWarmingAsync",
  "exportCredentials",
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

/**
 * Normalise a provider domain payload onto the canonical registry shape.
 *
 * Observed Winnr domain payload: { id, name, status, dns_provider, dns_status,
 * ns_status, registrar, tags, email_users_count, payment_status }.
 * Winnr hosts and manages the DNS zone for domains it provisions, so
 * `dns_status: "complete"` is the provider's own statement that SPF/DKIM/DMARC
 * are in place. No authentication state is invented when it is not complete.
 */
export function normaliseWinnrDomain(raw: Record<string, unknown>) {
  const domain = String(raw.domain ?? raw.name ?? "").trim().toLowerCase();
  const dnsRaw = String(raw.dns_status ?? raw.status ?? "unknown").toLowerCase();
  const statusRaw = String(raw.provisioning_status ?? raw.state ?? raw.status ?? "pending").toLowerCase();
  const dnsComplete = dnsRaw === "complete" || dnsRaw === "verified" || dnsRaw === "ok";
  const managedByProvider = String(raw.dns_provider ?? "").toLowerCase().startsWith("winnr");
  const authenticated = dnsComplete && managedByProvider;
  return {
    domain,
    provider: "winnr",
    provider_domain_id: raw.id != null ? String(raw.id) : null,
    provisioning_status: statusRaw === "complete" ? "provisioned" : statusRaw,
    dns_status: dnsComplete ? "verified" : dnsRaw,
    spf_ok: authenticated || raw.spf === true || raw.spf_ok === true,
    dkim_ok: authenticated || raw.dkim === true || raw.dkim_ok === true,
    dmarc_ok: authenticated || raw.dmarc === true || raw.dmarc_ok === true,
    warmup_eligible: raw.warmup_eligible === true || authenticated,
  };
}

/** Raw provider tags for a domain row (used only for estate classification). */
export function winnrDomainTags(raw: Record<string, unknown>): unknown {
  return raw.tags ?? null;
}

/**
 * Normalise a provider mailbox payload onto the canonical registry shape.
 *
 * Observed Winnr email-user payload: { id, username, domain, full_address,
 * name, status, type, daily_send_limit, imap_host/port, smtp_host/port }.
 * Credentials are never present in this payload and are never requested here.
 */
export function normaliseWinnrMailbox(raw: Record<string, unknown>) {
  const email = String(
    raw.full_address ?? raw.email ?? raw.address ?? "",
  ).trim().toLowerCase();
  const status = String(raw.status ?? "unknown").toLowerCase();
  const limit = typeof raw.daily_send_limit === "number" ? raw.daily_send_limit : null;
  return {
    email,
    local_part: raw.username != null ? String(raw.username) : email.includes("@") ? email.split("@")[0] : null,
    provider: "winnr",
    provider_mailbox_id: raw.id != null ? String(raw.id) : null,
    sender_name: raw.name != null ? String(raw.name) : raw.display_name != null ? String(raw.display_name) : null,
    warmup_status: String(raw.warmup_status ?? raw.warming_status ?? "not_started").toLowerCase(),
    provider_health: status === "active" ? "healthy" : status,
    active: status === "active",
    configured_daily_limit: limit,
    domain: raw.domain != null
      ? String(raw.domain).trim().toLowerCase()
      : email.includes("@") ? email.split("@")[1] : null,
  };
}

/** Provider entitlement/usage only. Secret-shaped provider fields are never copied. */
export function normaliseWinnrAccount(raw: Record<string, unknown> | null | undefined) {
  const o = (raw ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    account_name: o.name != null ? String(o.name) : null,
    plan: o.plan != null ? String(o.plan) : null,
    subscription_status: o.stripe_subscription_status != null ? String(o.stripe_subscription_status) : null,
    domains_limit: num(o.domains_limit),
    domains_used: num(o.domains_used),
    domain_credits: num(o.domain_credits),
    email_users_limit: num(o.email_users_limit),
    email_users_used: num(o.email_users_used),
  };
}

/** Distinguishes a paid plan from actual provisioned sender infrastructure. */
export function deriveWinnrEstateState(account: ReturnType<typeof normaliseWinnrAccount>): {
  estate_state: "no_subscription" | "subscription_active_no_infrastructure" | "domains_only_no_mailboxes" | "infrastructure_present";
  next_action: string;
} {
  const active = account.subscription_status === "active";
  const domains = account.domains_used ?? 0;
  const mailboxes = account.email_users_used ?? 0;
  if (!active) return { estate_state: "no_subscription", next_action: "The Winnr subscription is not active. Reactivate the plan before sender infrastructure can exist." };
  if (domains === 0) return {
    estate_state: "subscription_active_no_infrastructure",
    next_action: `The Winnr plan is active with capacity for ${account.domains_limit ?? 0} domains and ${account.email_users_limit ?? 0} mailboxes, but no sending domain exists yet. Buy/verify the GSM sending domains in Winnr, then create the mailboxes, then run Sync registry.`,
  };
  if (mailboxes === 0) return { estate_state: "domains_only_no_mailboxes", next_action: "Sending domains exist in Winnr but no mailboxes have been created. Create the mailboxes, then run Sync registry." };
  return { estate_state: "infrastructure_present", next_action: "Run Sync registry to import the Winnr estate, then start warm-up." };
}

/**
 * Cursor-paginated read of a Winnr list endpoint.
 *
 * Winnr returns `{ <rows>, pagination: { has_more, cursor, count } }` and caps a
 * single page at 100 rows. Reading only the first page silently under-reports the
 * estate, so every registry read must exhaust the cursor. Read-only by design:
 * only GET list endpoints may be passed in.
 */
export async function winnrList(
  key: Extract<WinnrEndpointKey, "listDomains" | "listEmailUsers" | "listWarmings">,
  opts: { token: string | null | undefined; query?: Record<string, string | number | undefined>; fetchImpl?: typeof fetch; maxPages?: number },
): Promise<WinnrCallResult<Record<string, unknown>[]> & { pages: number }> {
  const maxPages = opts.maxPages ?? 25;
  const rows: Record<string, unknown>[] = [];
  let cursor: string | undefined = undefined;
  let pageNumber = 1;
  let pages = 0;
  let last: WinnrCallResult<unknown> | null = null;

  while (pages < maxPages) {
    const res: WinnrCallResult<unknown> = await winnrCall<unknown>(key, {
      token: opts.token,
      fetchImpl: opts.fetchImpl,
      query: {
        limit: WINNR_LIST_PAGE_SIZE,
        ...(opts.query ?? {}),
        ...(cursor ? { cursor } : {}),
        ...(pageNumber > 1 ? { page: pageNumber } : {}),
      },
    });
    last = res;
    if (!res.ok) return { ...res, data: null, pages } as WinnrCallResult<Record<string, unknown>[]> & { pages: number };
    pages += 1;

    const d = res.data as Record<string, unknown> | unknown[] | null;
    let page: Record<string, unknown>[] = [];
    if (Array.isArray(d)) page = d as Record<string, unknown>[];
    else if (d && typeof d === "object") {
      const o = d as Record<string, unknown>;
      for (const k of ["data", "results", "items", "domains", "email_users", "users"]) {
        if (Array.isArray(o[k])) { page = o[k] as Record<string, unknown>[]; break; }
      }
    }
    rows.push(...page);

    const pag = (d && typeof d === "object" && !Array.isArray(d))
      ? (d as Record<string, unknown>).pagination as
        { has_more?: boolean; cursor?: string | null; page?: number; per_page?: number; total?: number } | undefined
      : undefined;
    if (page.length === 0) break;
    if (pag?.has_more && pag?.cursor) {
      cursor = String(pag.cursor);
      continue;
    }
    // Page-numbered endpoints (e.g. /warming) report page/per_page/total instead.
    if (typeof pag?.total === "number" && rows.length < pag.total) {
      pageNumber = (typeof pag.page === "number" ? pag.page : pageNumber) + 1;
      continue;
    }
    break;
  }

  return {
    ok: true,
    http_status: last?.http_status ?? 200,
    error_code: null,
    error_message: null,
    data: rows,
    endpoint: `${WINNR_ENDPOINTS[key].method} ${WINNR_ENDPOINTS[key].path}`,
    pages,
  };
}


/**
 * Normalise a provider warm-up row. Warm-up is NEVER readiness: an active
 * warm-up maps to `warming`, never to `campaign_ready`.
 */
export function normaliseWinnrWarming(raw: Record<string, unknown>) {
  const email = String(raw.full_address ?? raw.email ?? "").trim().toLowerCase();
  const status = String(raw.warming_status ?? "").toLowerCase();
  const enabled = raw.warming_enabled === true;
  const health = typeof raw.warming_health_score === "number" ? Math.round(raw.warming_health_score) : null;
  const warmup_status = status === "completed"
    ? "completed"
    : status === "paused"
    ? "paused"
    : enabled || status === "active"
    ? "warming"
    : "not_started";
  return {
    email,
    warmup_status,
    warmup_started_at: raw.warming_started_at != null ? String(raw.warming_started_at) : null,
    health_score: health,
    warming_emails_per_day: typeof raw.warming_emails_per_day === "number" ? raw.warming_emails_per_day : null,
  };
}
