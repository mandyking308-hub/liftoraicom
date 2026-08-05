/** Provider-neutral Social Relationship Provider Adapter. */
import { validateProviderBaseUrl, type CapabilityKey } from "./socialRelationshipLogic.ts";

export interface ProviderCallResult<T = unknown> {
  ok: boolean; http_status: number; data?: T; error?: string;
  transport_error?: boolean; ambiguous?: boolean; retry_after_seconds?: number; provider_calls: number;
}
export interface ProviderProfile {
  provider_profile_id: string; profile_url?: string | null; full_name?: string | null;
  headline?: string | null; job_title?: string | null; company_name?: string | null;
  industry?: string | null; location?: string | null; relationship_status?: string | null;
  raw?: Record<string, unknown>;
}
export interface ProviderAccount {
  provider_account_id: string; network: string; account_name?: string | null;
  account_handle?: string | null; account_status?: string | null; raw?: Record<string, unknown>;
}
export interface SearchCriteria {
  keywords?: string; job_title?: string; company?: string; industry?: string;
  location?: string; network_status?: string; limit?: number;
}
export interface SocialRelationshipAdapter {
  readonly provider: string;
  configured(): boolean;
  capabilities(network: string): Record<CapabilityKey, boolean>;
  testConnection(): Promise<ProviderCallResult<{ accounts: number }>>;
  listAccounts(): Promise<ProviderCallResult<ProviderAccount[]>>;
  searchProfiles(account_id: string, network: string, criteria: SearchCriteria): Promise<ProviderCallResult<ProviderProfile[]>>;
  sendInvitation(account_id: string, provider_profile_id: string, message?: string | null): Promise<ProviderCallResult<{ provider_id: string | null }>>;
  startChat(account_id: string, provider_profile_id: string, text: string): Promise<ProviderCallResult<{ provider_id: string | null; chat_id: string | null }>>;
  sendMessage(account_id: string, chat_id: string, text: string): Promise<ProviderCallResult<{ provider_id: string | null }>>;
  listChats(account_id: string, limit?: number): Promise<ProviderCallResult<Array<Record<string, unknown>>>>;
  listMessages(chat_id: string, limit?: number): Promise<ProviderCallResult<Array<Record<string, unknown>>>>;
  registerWebhook(callback_url: string, secret?: string | null): Promise<ProviderCallResult<{ webhook_id: string | null }>>;
}

const ALL_CAPS: CapabilityKey[] = [
  "profile_search","company_search","invite_connect","follow","start_chat","send_message",
  "read_chats","read_messages","webhook_support","relation_accepted_events","comments_mentions",
];
function matrix(partial: Partial<Record<CapabilityKey, boolean>>): Record<CapabilityKey, boolean> {
  const output = {} as Record<CapabilityKey, boolean>;
  for (const key of ALL_CAPS) output[key] = partial[key] === true;
  return output;
}
const UNIPILE_CAPS: Record<string, Partial<Record<CapabilityKey, boolean>>> = {
  linkedin: {
    profile_search: true, company_search: true, invite_connect: true, follow: false,
    start_chat: true, send_message: true, read_chats: true, read_messages: true,
    webhook_support: true, relation_accepted_events: true, comments_mentions: false,
  },
  instagram: {
    profile_search: false, company_search: false, invite_connect: false, follow: false,
    start_chat: false, send_message: true, read_chats: true, read_messages: true,
    webhook_support: true, relation_accepted_events: false, comments_mentions: false,
  },
  messenger: {
    profile_search: false, company_search: false, invite_connect: false, follow: false,
    start_chat: false, send_message: true, read_chats: true, read_messages: true,
    webhook_support: true, relation_accepted_events: false, comments_mentions: false,
  },
};

function safeError(value: unknown): string {
  const message = typeof value === "string" ? value : value && typeof value === "object"
    ? String((value as Record<string, unknown>).message ?? (value as Record<string, unknown>).title ?? "provider_error")
    : "provider_error";
  return message.replace(/X-API-KEY\s*[:=]\s*[^\s,;]+/gi, "X-API-KEY=[redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]").slice(0, 500);
}
function retryAfter(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds;
  const date = new Date(raw);
  return Number.isFinite(date.getTime()) ? Math.max(0, Math.ceil((date.getTime() - Date.now()) / 1000)) : undefined;
}

export class UnipileAdapter implements SocialRelationshipAdapter {
  readonly provider = "unipile";
  private readonly apiKey: string;
  private readonly origin: string | null;
  private readonly configError: string | null;
  private readonly timeoutMs: number;

  constructor(env: { apiKey?: string | null; dsn?: string | null; timeoutMs?: number } = {}) {
    this.apiKey = (env.apiKey ?? Deno.env.get("UNIPILE_API_KEY") ?? "").trim();
    const validation = validateProviderBaseUrl((env.dsn ?? Deno.env.get("UNIPILE_DSN") ?? "").trim());
    this.origin = validation.ok ? String(validation.url).replace(/\/+$/, "") : null;
    this.configError = validation.ok ? null : validation.reason ?? "base_url_invalid";
    const configuredTimeout = Number(env.timeoutMs ?? Deno.env.get("UNIPILE_TIMEOUT_MS") ?? 20000);
    this.timeoutMs = Number.isFinite(configuredTimeout) ? Math.max(2000, Math.min(60000, configuredTimeout)) : 20000;
  }
  configured() { return Boolean(this.apiKey && this.origin); }
  configurationError() { return !this.apiKey ? "UNIPILE_API_KEY_missing" : this.configError; }
  capabilities(network: string) { return matrix(UNIPILE_CAPS[String(network).toLowerCase()] ?? {}); }

  private async call<T>(version: "v1" | "v2", path: string, init: {
    method?: string; body?: Record<string, unknown> | FormData;
    query?: Record<string, string | number | undefined>; idempotencyKey?: string;
  } = {}): Promise<ProviderCallResult<T>> {
    if (!this.configured()) return { ok: false, http_status: 0, error: this.configurationError() ?? "not_configured", provider_calls: 0 };
    if (!path.startsWith("/") || path.startsWith("//") || path.includes("..") || path.includes("\\")) {
      return { ok: false, http_status: 0, error: "provider_path_invalid", provider_calls: 0 };
    }
    const url = new URL(`${this.origin}/api/${version}${path}`);
    for (const [key, value] of Object.entries(init.query ?? {})) if (value !== undefined && `${value}` !== "") url.searchParams.set(key, String(value));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const isForm = init.body instanceof FormData;
      const response = await fetch(url, {
        method: init.method ?? "GET", signal: controller.signal,
        headers: {
          "X-API-KEY": this.apiKey, accept: "application/json",
          ...(isForm || init.body === undefined ? {} : { "content-type": "application/json" }),
          ...(init.idempotencyKey ? { "Idempotency-Key": init.idempotencyKey } : {}),
        },
        body: init.body === undefined ? undefined : isForm ? init.body : JSON.stringify(init.body),
      });
      const raw = await response.text();
      let parsed: unknown = null;
      if (raw) { try { parsed = JSON.parse(raw); } catch { parsed = { message: raw.slice(0, 500) }; } }
      if (!response.ok) return {
        ok: false, http_status: response.status, error: safeError(parsed), provider_calls: 1,
        retry_after_seconds: retryAfter(response.headers), ambiguous: response.status >= 500,
      };
      return { ok: true, http_status: response.status, data: parsed as T, provider_calls: 1 };
    } catch (error) {
      const timeout = error instanceof DOMException && error.name === "AbortError";
      return {
        ok: false, http_status: 0, error: timeout ? "provider_timeout" : safeError(error),
        transport_error: true, ambiguous: true, provider_calls: 1,
      };
    } finally { clearTimeout(timer); }
  }

  async testConnection() {
    const result = await this.call<{ items?: unknown[] }>("v1", "/accounts", { query: { limit: 1 } });
    return result.ok
      ? { ...result, data: { accounts: Array.isArray(result.data?.items) ? result.data!.items!.length : 0 } }
      : { ...result, data: undefined } as ProviderCallResult<{ accounts: number }>;
  }
  async listAccounts(): Promise<ProviderCallResult<ProviderAccount[]>> {
    const result = await this.call<{ items?: Array<Record<string, unknown>> }>("v1", "/accounts", { query: { limit: 50 } });
    return result.ok ? { ...result, data: parseUnipileAccounts(result.data) } : { ...result, data: undefined } as ProviderCallResult<ProviderAccount[]>;
  }
  async searchProfiles(account_id: string, network: string, criteria: SearchCriteria) {
    if (network !== "linkedin") return { ok: false, http_status: 400, error: "profile_search_unsupported", provider_calls: 0 };
    const result = await this.call<Record<string, unknown>>("v1", "/linkedin/search", {
      method: "POST", query: { account_id },
      body: {
        api: "classic", category: "people", keywords: criteria.keywords ?? undefined,
        title: criteria.job_title ?? undefined, company: criteria.company ?? undefined,
        industry: criteria.industry ?? undefined, location: criteria.location ?? undefined,
        network_distance: criteria.network_status ?? undefined,
        limit: Math.min(50, Math.max(1, criteria.limit ?? 25)),
      },
    });
    return result.ok ? { ...result, data: parseUnipileProfiles(result.data, network) } : { ...result, data: undefined } as ProviderCallResult<ProviderProfile[]>;
  }
  async sendInvitation(account_id: string, provider_profile_id: string, message?: string | null) {
    const result = await this.call<Record<string, unknown>>("v1", "/users/invite", {
      method: "POST", body: { account_id, provider_id: provider_profile_id, ...(message ? { message } : {}) },
    });
    return { ...result, data: { provider_id: extractProviderId(result.data) } };
  }
  async startChat(account_id: string, provider_profile_id: string, text: string) {
    const form = new FormData();
    form.set("account_id", account_id); form.set("text", text); form.append("attendees_ids", provider_profile_id);
    const result = await this.call<Record<string, unknown>>("v1", "/chats", { method: "POST", body: form });
    const data = (result.data ?? {}) as Record<string, unknown>;
    return { ...result, data: { provider_id: extractProviderId(data), chat_id: String(data.chat_id ?? data.id ?? "") || null } };
  }
  async sendMessage(account_id: string, chat_id: string, text: string) {
    const form = new FormData();
    form.set("account_id", account_id); form.set("text", text);
    const result = await this.call<Record<string, unknown>>("v1", `/chats/${encodeURIComponent(chat_id)}/messages`, { method: "POST", body: form });
    return { ...result, data: { provider_id: extractProviderId(result.data) } };
  }
  async listChats(account_id: string, limit = 25) {
    const result = await this.call<{ items?: Array<Record<string, unknown>> }>("v1", "/chats", { query: { account_id, limit: Math.min(100, limit) } });
    return { ...result, data: result.data?.items ?? [] };
  }
  async listMessages(chat_id: string, limit = 50) {
    const result = await this.call<{ items?: Array<Record<string, unknown>> }>("v1", `/chats/${encodeURIComponent(chat_id)}/messages`, { query: { limit: Math.min(100, limit) } });
    return { ...result, data: result.data?.items ?? [] };
  }
  async registerWebhook(callback_url: string, _secret?: string | null) {
    const configuredCallback = (Deno.env.get("SOCIAL_RELATIONSHIP_WEBHOOK_CALLBACK_URL") ?? "").trim();
    const candidate = configuredCallback || callback_url;
    let valid = false;
    try {
      const callback = new URL(candidate);
      const supabase = new URL(Deno.env.get("SUPABASE_URL") ?? "https://invalid.invalid");
      valid = callback.protocol === "https:" && (configuredCallback ? callback.toString() === new URL(configuredCallback).toString() : callback.hostname === supabase.hostname);
    } catch { valid = false; }
    if (!valid) return { ok: false, http_status: 0, error: "callback_url_not_allowlisted", provider_calls: 0, data: { webhook_id: null } };
    const result = await this.call<Record<string, unknown>>("v2", "/webhooks/endpoints", {
      method: "POST", body: { request_url: candidate, source: "messaging", format: "json" },
    });
    return { ...result, data: { webhook_id: extractProviderId(result.data) } };
  }
}

export function extractProviderId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  for (const key of ["message_id","invitation_id","webhook_id","provider_id","id","object_id"]) {
    const value = row[key]; if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const key of ["data","message","chat","invitation"]) {
    const nested = extractProviderId(row[key]); if (nested) return nested;
  }
  return null;
}
function itemsFrom(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  const row = data && typeof data === "object" ? data as Record<string, unknown> : {};
  for (const key of ["items","data","results"]) if (Array.isArray(row[key])) return row[key] as Array<Record<string, unknown>>;
  return [];
}
export function parseUnipileAccounts(data: unknown): ProviderAccount[] {
  return itemsFrom(data).map((item) => {
    const id = String(item.id ?? item.account_id ?? "").trim();
    if (!id) return null;
    const type = String(item.type ?? item.provider ?? "other").toLowerCase();
    const sources = Array.isArray(item.sources) ? item.sources as Array<Record<string, unknown>> : [];
    const rawStatus = String(sources[0]?.status ?? item.status ?? "unknown").toUpperCase();
    return {
      provider_account_id: id,
      network: ["linkedin","instagram","messenger","whatsapp"].includes(type) ? type : "other",
      account_name: typeof item.name === "string" ? item.name : null,
      account_handle: typeof item.username === "string" ? item.username : null,
      account_status: rawStatus === "OK" ? "ok" : rawStatus === "CREDENTIALS" ? "credentials" : rawStatus === "CHECKPOINT" ? "challenge" : "unknown",
      raw: { type, status: rawStatus },
    } as ProviderAccount;
  }).filter(Boolean) as ProviderAccount[];
}
export function parseUnipileProfiles(data: unknown, network: string): ProviderProfile[] {
  return itemsFrom(data).map((item) => {
    const id = String(item.id ?? item.provider_id ?? item.public_identifier ?? "").trim();
    if (!id) return null;
    const first = String(item.first_name ?? "").trim(); const last = String(item.last_name ?? "").trim();
    const distance = String(item.network_distance ?? "").toUpperCase();
    return {
      provider_profile_id: id,
      profile_url: typeof item.profile_url === "string" ? item.profile_url : typeof item.public_profile_url === "string" ? item.public_profile_url : null,
      full_name: String(item.name ?? `${first} ${last}`).trim() || null,
      headline: typeof item.headline === "string" ? item.headline : null,
      job_title: typeof item.title === "string" ? item.title : typeof item.headline === "string" ? item.headline : null,
      company_name: typeof item.company === "string" ? item.company : typeof item.current_company === "string" ? item.current_company : null,
      industry: typeof item.industry === "string" ? item.industry : null,
      location: typeof item.location === "string" ? item.location : null,
      relationship_status: distance === "FIRST_DEGREE" ? "connected" : distance ? "none" : "unknown",
      raw: { network },
    } as ProviderProfile;
  }).filter(Boolean) as ProviderProfile[];
}

export class ManyChatAdapter implements SocialRelationshipAdapter {
  readonly provider = "manychat";
  configured() { return Boolean((Deno.env.get("MANYCHAT_API_KEY") ?? "").trim()); }
  capabilities() { return matrix({ webhook_support: true }); }
  private blocked<T>(): ProviderCallResult<T> { return { ok: false, http_status: 0, error: "manychat_relationship_actions_not_enabled", provider_calls: 0 }; }
  async testConnection() { return this.configured() ? { ok: true, http_status: 200, data: { accounts: 0 }, provider_calls: 0 } : this.blocked<{ accounts: number }>(); }
  async listAccounts() { return this.blocked<ProviderAccount[]>(); }
  async searchProfiles() { return this.blocked<ProviderProfile[]>(); }
  async sendInvitation() { return { ...this.blocked<{ provider_id: string | null }>(), data: { provider_id: null } }; }
  async startChat() { return { ...this.blocked<{ provider_id: string | null; chat_id: string | null }>(), data: { provider_id: null, chat_id: null } }; }
  async sendMessage() { return { ...this.blocked<{ provider_id: string | null }>(), data: { provider_id: null } }; }
  async listChats() { return this.blocked<Array<Record<string, unknown>>>(); }
  async listMessages() { return this.blocked<Array<Record<string, unknown>>>(); }
  async registerWebhook() { return { ...this.blocked<{ webhook_id: string | null }>(), data: { webhook_id: null } }; }
}
export function getRelationshipAdapter(provider: string): SocialRelationshipAdapter {
  return String(provider).toLowerCase() === "manychat" ? new ManyChatAdapter() : new UnipileAdapter();
}
