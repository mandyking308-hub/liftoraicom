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
  try {
    return (Deno.env.get(name) ?? "").trim();
  } catch {
    return "";
  }
}

export function getUnipileConfig(): UnipileConfig | null {
  const dsn = env("UNIPILE_DSN");
  const apiKey = env("UNIPILE_API_KEY");
  if (!dsn || !apiKey) return null;
  const apiVersion = env("UNIPILE_API_VERSION").toLowerCase() === "v2" ? "v2" : "v1";
  const timeout = Number(env("UNIPILE_TIMEOUT_MS"));
  return {
    dsn: normaliseDsn(dsn),
    apiKey,
    apiVersion,
    timeoutMs: Number.isFinite(timeout) && timeout >= 2_000 && timeout <= 60_000 ? timeout : 20_000,
  };
}

export function sanitiseProviderError(value: unknown): string {
  const message = typeof value === "string"
    ? value
    : value && typeof value === "object"
      ? String((value as Record<string, unknown>).message ?? (value as Record<string, unknown>).title ?? "provider_error")
      : "provider_error";
  return message
    .replace(/X-API-KEY\s*[:=]\s*[^\s,;]+/gi, "X-API-KEY=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric >= 0) return numeric;
  const date = new Date(raw);
  if (Number.isFinite(date.getTime())) return Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000));
  return undefined;
}

export function buildUnipileUrl(config: UnipileConfig, path: string, query?: Record<string, string | number | boolean | null | undefined>): string {
  if (!path.startsWith("/")) throw new Error("invalid_provider_path");
  if (path.includes("..") || path.includes("\\") || /^\/\//.test(path)) throw new Error("invalid_provider_path");
  const url = new URL(`${config.dsn}/api/${config.apiVersion}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
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
  const url = buildUnipileUrl(config, path, options.query);
  try {
    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers: {
        "X-API-KEY": config.apiKey,
        "Accept": "application/json",
        ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(options.idempotencyKey ? { "Idempotency-Key": options.idempotencyKey } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
    const text = await response.text();
    let parsed: unknown = null;
    if (text) {
      try { parsed = JSON.parse(text); } catch { parsed = { message: text.slice(0, 500) }; }
    }
    if (!response.ok) {
      const errorRecord = parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
      return {
        ok: false,
        status: response.status,
        errorCode: String(errorRecord.type ?? errorRecord.code ?? `http_${response.status}`),
        errorMessage: sanitiseProviderError(errorRecord),
        retryAfterSeconds: parseRetryAfter(response.headers),
        ambiguous: response.status >= 500,
      };
    }
    return { ok: true, status: response.status, data: parsed as T };
  } catch (error) {
    const aborted = error instanceof DOMException && error.name === "AbortError";
    return {
      ok: false,
      status: 0,
      errorCode: aborted ? "provider_timeout" : "provider_transport_error",
      errorMessage: sanitiseProviderError(error),
      ambiguous: true,
    };
  } finally {
    clearTimeout(timer);
  }
}

function arrayFromPayload(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["items", "data", "accounts", "chats", "messages", "results"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  return [];
}

function recordOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseAccounts(payload: unknown): UnipileAccount[] {
  return arrayFromPayload(payload).map((item) => {
    const row = recordOf(item);
    const connection = recordOf(row.connection_params);
    return {
      id: String(row.id ?? row.account_id ?? ""),
      provider: String(row.type ?? row.provider ?? row.account_type ?? "UNKNOWN").toLowerCase(),
      name: text(row.name ?? row.display_name),
      username: text(row.username ?? connection.username),
      status: text(row.status),
      type: text(row.type ?? row.account_type),
      profileUrl: text(row.profile_url),
    };
  }).filter((a) => a.id);
}

export function parseProfiles(payload: unknown): UnipileProfile[] {
  return arrayFromPayload(payload).map((item) => {
    const row = recordOf(item);
    const company = recordOf(row.current_company ?? row.company);
    const firstName = text(row.first_name ?? row.firstname);
    const lastName = text(row.last_name ?? row.lastname);
    return {
      providerId: String(row.provider_id ?? row.id ?? row.member_urn ?? ""),
      publicIdentifier: text(row.public_identifier ?? row.public_id),
      profileUrl: text(row.profile_url ?? row.url),
      firstName,
      lastName,
      fullName: text(row.full_name ?? row.name) ?? [firstName, lastName].filter(Boolean).join(" ") || null,
      headline: text(row.headline),
      currentCompany: text(company.name ?? row.current_company_name),
      jobTitle: text(row.job_title ?? row.title),
      geography: text(row.location ?? row.geography),
      industry: text(row.industry),
      relationshipStatus: text(row.relationship_status ?? row.network_distance),
      raw: row,
    };
  }).filter((profile) => profile.providerId);
}

export function parseChats(payload: unknown): UnipileChat[] {
  return arrayFromPayload(payload).map((item) => {
    const row = recordOf(item);
    return {
      id: String(row.id ?? row.chat_id ?? ""),
      accountId: text(row.account_id),
      provider: text(row.provider ?? row.account_type),
      name: text(row.name ?? row.subject),
      unreadCount: typeof row.unread_count === "number" ? row.unread_count : null,
      lastMessageAt: text(row.timestamp ?? row.last_message_at ?? row.updated_at),
      raw: row,
    };
  }).filter((chat) => chat.id);
}

export function parseMessages(payload: unknown): UnipileMessage[] {
  return arrayFromPayload(payload).map((item) => {
    const row = recordOf(item);
    const sender = recordOf(row.sender);
    return {
      id: String(row.id ?? row.message_id ?? ""),
      chatId: text(row.chat_id),
      accountId: text(row.account_id),
      senderId: text(row.sender_id ?? sender.id ?? sender.attendee_provider_id),
      text: text(row.text ?? row.content),
      createdAt: text(row.timestamp ?? row.created_at),
      isSender: typeof row.is_sender === "boolean" ? row.is_sender : undefined,
      raw: row,
    };
  }).filter((message) => message.id);
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
  if (config.apiVersion !== "v1") return { ok: false, status: 400, errorCode: "search_requires_v1_adapter", errorMessage: "LinkedIn search adapter is configured for the documented v1 route." };
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
  if (config.apiVersion !== "v1") return { ok: false, status: 400, errorCode: "invitation_requires_v1_adapter", errorMessage: "Invitation adapter is configured for the documented v1 route." };
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
