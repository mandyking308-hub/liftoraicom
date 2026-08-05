import { normaliseDsn } from "./socialRelationshipLogic.ts";

export interface UnipileConfig {
  dsn: string;
  apiKey: string;
  apiVersion: "v1" | "v2";
  timeoutMs: number;
}

export interface ProviderResult<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  errorCode?: string;
  errorMessage?: string;
  retryAfterSeconds?: number;
  ambiguous?: boolean;
}

export interface UnipileAccount {
  id: string;
  provider: string;
  name?: string | null;
  username?: string | null;
  status?: string | null;
  type?: string | null;
  profileUrl?: string | null;
}

export interface UnipileProfile {
  providerId: string;
  publicIdentifier?: string | null;
  profileUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  headline?: string | null;
  currentCompany?: string | null;
  jobTitle?: string | null;
  geography?: string | null;
  industry?: string | null;
  relationshipStatus?: string | null;
  raw: Record<string, unknown>;
}

export interface UnipileChat {
  id: string;
  accountId?: string | null;
  provider?: string | null;
  name?: string | null;
  unreadCount?: number | null;
  lastMessageAt?: string | null;
  raw: Record<string, unknown>;
}

export interface UnipileMessage {
  id: string;
  chatId?: string | null;
  accountId?: string | null;
  senderId?: string | null;
  text?: string | null;
  createdAt?: string | null;
  isSender?: boolean;
  raw: Record<string, unknown>;
}

function env(name: string): string {
  try { return (Deno.env.get(name) ?? "").trim(); } catch { return ""; }
}

export function getUnipileConfig(): UnipileConfig | null {
  const dsn = env("UNIPILE_DSN");
  const apiKey = env("UNIPILE_API_KEY");
  if (!dsn || !apiKey) return null;
  const rawTimeout = Number(env("UNIPILE_TIMEOUT_MS"));
  return {
    dsn: normaliseDsn(dsn),
    apiKey,
    apiVersion: env("UNIPILE_API_VERSION").toLowerCase() === "v2" ? "v2" : "v1",
    timeoutMs: Number.isFinite(rawTimeout) && rawTimeout >= 2_000 && rawTimeout <= 60_000 ? rawTimeout : 20_000,
  };
}

export function sanitiseProviderError(value: unknown): string {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const message = typeof value === "string" ? value : String(record.message ?? record.title ?? "provider_error");
  return message
    .replace(/X-API-KEY\s*[:=]\s*[^\s,;]+/gi, "X-API-KEY=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

export function buildUnipileUrl(
  config: UnipileConfig,
  path: string,
  query: Record<string, string | number | boolean | null | undefined> = {},
): string {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || path.includes("\\")) {
    throw new Error("invalid_provider_path");
  }
  const url = new URL(`${config.dsn}/api/${config.apiVersion}${path}`);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function retryAfterSeconds(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000)) : undefined;
}

export async function unipileRequest<T>(
  config: UnipileConfig,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: {
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
    idempotencyKey?: string;
  } = {},
): Promise<ProviderResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(buildUnipileUrl(config, path, options.query), {
      method,
      signal: controller.signal,
      headers: {
        "X-API-KEY": config.apiKey,
        "Accept": "application/json",
        ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try { payload = JSON.parse(raw); } catch { payload = { message: raw.slice(0, 500) }; }
    }
    if (!response.ok) {
      const row = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      return {
        ok: false,
        status: response.status,
        errorCode: String(row.type ?? row.code ?? `http_${response.status}`),
        errorMessage: sanitiseProviderError(payload),
        retryAfterSeconds: retryAfterSeconds(response.headers),
        ambiguous: response.status >= 500,
      };
    }
    return { ok: true, status: response.status, data: payload as T };
  } catch (error) {
    const timeout = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      errorCode: timeout ? "provider_timeout" : "provider_transport_error",
      errorMessage: sanitiseProviderError(error),
      ambiguous: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function list(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  const row = record(value);
  for (const key of ["items", "data", "accounts", "chats", "messages", "results"]) {
    if (Array.isArray(row[key])) return row[key] as unknown[];
  }
  return [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseAccounts(payload: unknown): UnipileAccount[] {
  return list(payload).map((item) => {
    const row = record(item);
    const connection = record(row.connection_params);
    return {
      id: String(row.id ?? row.account_id ?? ""),
      provider: String(row.type ?? row.provider ?? row.account_type ?? "unknown").toLowerCase(),
      name: stringOrNull(row.name ?? row.display_name),
      username: stringOrNull(row.username ?? connection.username),
      status: stringOrNull(row.status),
      type: stringOrNull(row.type ?? row.account_type),
      profileUrl: stringOrNull(row.profile_url),
    };
  }).filter((item) => item.id);
}

export function parseProfiles(payload: unknown): UnipileProfile[] {
  return list(payload).map((item) => {
    const row = record(item);
    const company = record(row.current_company ?? row.company);
    const firstName = stringOrNull(row.first_name ?? row.firstname);
    const lastName = stringOrNull(row.last_name ?? row.lastname);
    const composedName = [firstName, lastName].filter(Boolean).join(" ") || null;
    return {
      providerId: String(row.provider_id ?? row.id ?? row.member_urn ?? ""),
      publicIdentifier: stringOrNull(row.public_identifier ?? row.public_id),
      profileUrl: stringOrNull(row.profile_url ?? row.url),
      firstName,
      lastName,
      fullName: stringOrNull(row.full_name ?? row.name) ?? composedName,
      headline: stringOrNull(row.headline),
      currentCompany: stringOrNull(company.name ?? row.current_company_name),
      jobTitle: stringOrNull(row.job_title ?? row.title),
      geography: stringOrNull(row.location ?? row.geography),
      industry: stringOrNull(row.industry),
      relationshipStatus: stringOrNull(row.relationship_status ?? row.network_distance),
      raw: row,
    };
  }).filter((item) => item.providerId);
}

export function parseChats(payload: unknown): UnipileChat[] {
  return list(payload).map((item) => {
    const row = record(item);
    return {
      id: String(row.id ?? row.chat_id ?? ""),
      accountId: stringOrNull(row.account_id),
      provider: stringOrNull(row.provider ?? row.account_type),
      name: stringOrNull(row.name ?? row.subject),
      unreadCount: typeof row.unread_count === "number" ? row.unread_count : null,
      lastMessageAt: stringOrNull(row.timestamp ?? row.last_message_at ?? row.updated_at),
      raw: row,
    };
  }).filter((item) => item.id);
}

export function parseMessages(payload: unknown): UnipileMessage[] {
  return list(payload).map((item) => {
    const row = record(item);
    const sender = record(row.sender);
    return {
      id: String(row.id ?? row.message_id ?? ""),
      chatId: stringOrNull(row.chat_id),
      accountId: stringOrNull(row.account_id),
      senderId: stringOrNull(row.sender_id ?? sender.id ?? sender.attendee_provider_id),
      text: stringOrNull(row.text ?? row.content),
      createdAt: stringOrNull(row.timestamp ?? row.created_at),
      isSender: typeof row.is_sender === "boolean" ? row.is_sender : undefined,
      raw: row,
    };
  }).filter((item) => item.id);
}

export async function listUnipileAccounts(config: UnipileConfig): Promise<ProviderResult<UnipileAccount[]>> {
  const result = await unipileRequest<unknown>(config, "GET", "/accounts", { query: { limit: 100 } });
  return result.ok ? { ...result, data: parseAccounts(result.data) } : result as ProviderResult<UnipileAccount[]>;
}

export async function searchLinkedInProfiles(
  config: UnipileConfig,
  accountId: string,
  criteria: Record<string, unknown>,
): Promise<ProviderResult<UnipileProfile[]>> {
  if (config.apiVersion !== "v1") {
    return { ok: false, status: 400, errorCode: "search_requires_v1_adapter", errorMessage: "LinkedIn search is configured for the documented v1 route." };
  }
  const result = await unipileRequest<unknown>(config, "POST", "/linkedin/search", {
    query: { account_id: accountId },
    body: criteria,
  });
  return result.ok ? { ...result, data: parseProfiles(result.data) } : result as ProviderResult<UnipileProfile[]>;
}

export async function sendLinkedInInvitation(
  config: UnipileConfig,
  accountId: string,
  providerId: string,
  message: string | null,
  idempotencyKey: string,
): Promise<ProviderResult<Record<string, unknown>>> {
  if (config.apiVersion !== "v1") {
    return { ok: false, status: 400, errorCode: "invitation_requires_v1_adapter", errorMessage: "LinkedIn invitations are configured for the documented v1 route." };
  }
  return unipileRequest(config, "POST", "/users/invite", {
    body: { account_id: accountId, provider_id: providerId, ...(message ? { message } : {}) },
    idempotencyKey,
  });
}

export async function sendChatMessage(
  config: UnipileConfig,
  chatId: string,
  content: string,
  idempotencyKey: string,
): Promise<ProviderResult<Record<string, unknown>>> {
  return unipileRequest(config, "POST", `/chats/${encodeURIComponent(chatId)}/messages`, {
    body: { text: content },
    idempotencyKey,
  });
}

export async function listChats(
  config: UnipileConfig,
  accountId: string,
  cursor?: string | null,
): Promise<ProviderResult<UnipileChat[]>> {
  const result = await unipileRequest<unknown>(config, "GET", "/chats", { query: { account_id: accountId, limit: 100, cursor } });
  return result.ok ? { ...result, data: parseChats(result.data) } : result as ProviderResult<UnipileChat[]>;
}

export async function listChatMessages(
  config: UnipileConfig,
  chatId: string,
  cursor?: string | null,
): Promise<ProviderResult<UnipileMessage[]>> {
  const result = await unipileRequest<unknown>(config, "GET", `/chats/${encodeURIComponent(chatId)}/messages`, { query: { limit: 100, cursor } });
  return result.ok ? { ...result, data: parseMessages(result.data) } : result as ProviderResult<UnipileMessage[]>;
}
