/**
 * Provider-neutral Social Relationship Provider Adapter.
 *
 * Business logic NEVER talks to a network directly — it talks to this
 * interface. Unipile is the first live adapter. ManyChat is present as an
 * optional engagement-trigger adapter boundary only (manual fallback is never
 * removed).
 *
 * Secrets are read from Deno env inside this module only, and are never
 * returned to callers, logged, or persisted.
 */

import { validateProviderBaseUrl, type CapabilityKey } from "./socialRelationshipLogic.ts";

export interface ProviderCallResult<T = unknown> {
  ok: boolean;
  http_status: number;
  data?: T;
  error?: string;
  transport_error?: boolean;
  provider_calls: number;
}

export interface ProviderProfile {
  provider_profile_id: string;
  profile_url?: string | null;
  full_name?: string | null;
  headline?: string | null;
  job_title?: string | null;
  company_name?: string | null;
  industry?: string | null;
  location?: string | null;
  relationship_status?: string | null;
  raw?: Record<string, unknown>;
}

export interface ProviderAccount {
  provider_account_id: string;
  network: string;
  account_name?: string | null;
  account_handle?: string | null;
  account_status?: string | null;
  raw?: Record<string, unknown>;
}

export interface SearchCriteria {
  keywords?: string;
  job_title?: string;
  company?: string;
  industry?: string;
  location?: string;
  network_status?: string;
  limit?: number;
}

export interface SocialRelationshipAdapter {
  readonly provider: string;
  configured(): boolean;
  /** Capability matrix for a given network — explicit, never assumed. */
  capabilities(network: string): Record<CapabilityKey, boolean>;
  testConnection(): Promise<ProviderCallResult<{ accounts: number }>>;
  listAccounts(): Promise<ProviderCallResult<ProviderAccount[]>>;
  searchProfiles(
    account_id: string,
    network: string,
    criteria: SearchCriteria,
  ): Promise<ProviderCallResult<ProviderProfile[]>>;
  sendInvitation(
    account_id: string,
    provider_profile_id: string,
    message?: string | null,
  ): Promise<ProviderCallResult<{ provider_id: string | null }>>;
  startChat(
    account_id: string,
    provider_profile_id: string,
    text: string,
  ): Promise<ProviderCallResult<{ provider_id: string | null; chat_id: string | null }>>;
  sendMessage(
    account_id: string,
    chat_id: string,
    text: string,
  ): Promise<ProviderCallResult<{ provider_id: string | null }>>;
  listChats(account_id: string, limit?: number): Promise<ProviderCallResult<Array<Record<string, unknown>>>>;
  listMessages(chat_id: string, limit?: number): Promise<ProviderCallResult<Array<Record<string, unknown>>>>;
  registerWebhook(callback_url: string, secret?: string | null): Promise<ProviderCallResult<{ webhook_id: string | null }>>;
}

/* ------------------------------------------------------------- Unipile */

const UNIPILE_CAPS: Record<string, Partial<Record<CapabilityKey, boolean>>> = {
  linkedin: {
    profile_search: true,
    company_search: true,
    invite_connect: true,
    follow: true,
    start_chat: true,
    send_message: true,
    read_chats: true,
    read_messages: true,
    webhook_support: true,
    relation_accepted_events: true,
    comments_mentions: false,
  },
  instagram: {
    profile_search: false,
    company_search: false,
    invite_connect: false,
    follow: false,
    start_chat: true,
    send_message: true,
    read_chats: true,
    read_messages: true,
    webhook_support: true,
    relation_accepted_events: false,
    comments_mentions: false,
  },
  messenger: {
    profile_search: false,
    company_search: false,
    invite_connect: false,
    follow: false,
    start_chat: true,
    send_message: true,
    read_chats: true,
    read_messages: true,
    webhook_support: true,
    relation_accepted_events: false,
    comments_mentions: false,
  },
};

const ALL_CAPS: CapabilityKey[] = [
  "profile_search",
  "company_search",
  "invite_connect",
  "follow",
  "start_chat",
  "send_message",
  "read_chats",
  "read_messages",
  "webhook_support",
  "relation_accepted_events",
  "comments_mentions",
];

function fullCapMatrix(partial: Partial<Record<CapabilityKey, boolean>>): Record<CapabilityKey, boolean> {
  const out = {} as Record<CapabilityKey, boolean>;
  for (const k of ALL_CAPS) out[k] = partial[k] === true;
  return out;
}

export class UnipileAdapter implements SocialRelationshipAdapter {
  readonly provider = "unipile";
  private apiKey: string;
  private baseUrl: string | null;
  private baseUrlError: string | null;

  constructor(env: { apiKey?: string | null; dsn?: string | null } = {}) {
    this.apiKey = (env.apiKey ?? Deno.env.get("UNIPILE_API_KEY") ?? "").trim();
    const raw = (env.dsn ?? Deno.env.get("UNIPILE_DSN") ?? "").trim();
    const v = validateProviderBaseUrl(raw);
    this.baseUrl = v.ok ? `${v.url}/api/v1` : null;
    this.baseUrlError = v.ok ? null : (v.reason ?? "base_url_invalid");
  }

  configured(): boolean {
    return Boolean(this.apiKey) && Boolean(this.baseUrl);
  }

  configurationError(): string | null {
    if (!this.apiKey) return "UNIPILE_API_KEY_missing";
    return this.baseUrlError;
  }

  capabilities(network: string): Record<CapabilityKey, boolean> {
    return fullCapMatrix(UNIPILE_CAPS[String(network).toLowerCase()] ?? {});
  }

  private async call<T>(
    path: string,
    init: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
  ): Promise<ProviderCallResult<T>> {
    if (!this.configured()) {
      return { ok: false, http_status: 0, error: this.configurationError() ?? "not_configured", provider_calls: 0 };
    }
    // Path is built internally only — no caller-supplied absolute URLs.
    const safePath = `/${String(path).replace(/^\/+/, "").replace(/\.\./g, "")}`;
    const url = new URL(`${this.baseUrl}${safePath}`);
    for (const [k, v] of Object.entries(init.query ?? {})) {
      if (v !== undefined && v !== null && `${v}` !== "") url.searchParams.set(k, String(v));
    }
    if (url.protocol !== "https:") {
      return { ok: false, http_status: 0, error: "non_https_blocked", provider_calls: 0 };
    }
    try {
      const res = await fetch(url.toString(), {
        method: init.method ?? "GET",
        headers: {
          "X-API-KEY": this.apiKey,
          accept: "application/json",
          ...(init.body ? { "content-type": "application/json" } : {}),
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
      });
      const text = await res.text();
      let parsed: unknown = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { raw: text.slice(0, 500) };
      }
      if (!res.ok) {
        return {
          ok: false,
          http_status: res.status,
          error: typeof parsed === "object" ? JSON.stringify(parsed).slice(0, 500) : String(text).slice(0, 500),
          provider_calls: 1,
        };
      }
      return { ok: true, http_status: res.status, data: parsed as T, provider_calls: 1 };
    } catch (e) {
      // Ambiguous: the provider may or may not have acted.
      return {
        ok: false,
        http_status: 0,
        error: String((e as Error)?.message ?? e).slice(0, 300),
        transport_error: true,
        provider_calls: 1,
      };
    }
  }

  async testConnection() {
    const r = await this.call<{ items?: unknown[] }>("accounts", { query: { limit: 1 } });
    if (!r.ok) return { ...r, data: undefined } as ProviderCallResult<{ accounts: number }>;
    const items = (r.data as { items?: unknown[] })?.items ?? [];
    return { ...r, data: { accounts: Array.isArray(items) ? items.length : 0 } };
  }

  async listAccounts(): Promise<ProviderCallResult<ProviderAccount[]>> {
    const r = await this.call<{ items?: Array<Record<string, unknown>> }>("accounts", { query: { limit: 50 } });
    if (!r.ok) return { ...r, data: undefined } as ProviderCallResult<ProviderAccount[]>;
    return { ...r, data: parseUnipileAccounts(r.data) };
  }

  async searchProfiles(account_id: string, network: string, criteria: SearchCriteria) {
    const r = await this.call<Record<string, unknown>>("linkedin/search", {
      method: "POST",
      query: { account_id, limit: Math.min(50, Math.max(1, criteria.limit ?? 25)) },
      body: {
        api: "classic",
        category: "people",
        keywords: criteria.keywords ?? undefined,
        title: criteria.job_title ?? undefined,
        company: criteria.company ?? undefined,
        industry: criteria.industry ?? undefined,
        location: criteria.location ?? undefined,
        network_distance: criteria.network_status ?? undefined,
      },
    });
    if (!r.ok) return { ...r, data: undefined } as ProviderCallResult<ProviderProfile[]>;
    return { ...r, data: parseUnipileProfiles(r.data, network) };
  }

  async sendInvitation(account_id: string, provider_profile_id: string, message?: string | null) {
    const r = await this.call<Record<string, unknown>>("users/invite", {
      method: "POST",
      body: { account_id, provider_id: provider_profile_id, message: message ?? undefined },
    });
    return { ...r, data: { provider_id: extractProviderId(r.data) } };
  }

  async startChat(account_id: string, provider_profile_id: string, text: string) {
    const r = await this.call<Record<string, unknown>>("chats", {
      method: "POST",
      body: { account_id, attendees_ids: [provider_profile_id], text },
    });
    const d = (r.data ?? {}) as Record<string, unknown>;
    return {
      ...r,
      data: {
        provider_id: extractProviderId(r.data),
        chat_id: (d.chat_id as string) ?? (d.id as string) ?? null,
      },
    };
  }

  async sendMessage(account_id: string, chat_id: string, text: string) {
    const r = await this.call<Record<string, unknown>>(`chats/${encodeURIComponent(chat_id)}/messages`, {
      method: "POST",
      body: { account_id, text },
    });
    return { ...r, data: { provider_id: extractProviderId(r.data) } };
  }

  async listChats(account_id: string, limit = 25) {
    const r = await this.call<{ items?: Array<Record<string, unknown>> }>("chats", {
      query: { account_id, limit: Math.min(100, limit) },
    });
    return { ...r, data: (r.data as { items?: Array<Record<string, unknown>> })?.items ?? [] };
  }

  async listMessages(chat_id: string, limit = 50) {
    const r = await this.call<{ items?: Array<Record<string, unknown>> }>(
      `chats/${encodeURIComponent(chat_id)}/messages`,
      { query: { limit: Math.min(100, limit) } },
    );
    return { ...r, data: (r.data as { items?: Array<Record<string, unknown>> })?.items ?? [] };
  }

  async registerWebhook(callback_url: string, secret?: string | null) {
    const v = validateProviderBaseUrl(callback_url);
    // callback must be an https URL; allowlist check does not apply to our own host
    let ok = false;
    try {
      const u = new URL(callback_url);
      ok = u.protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok && !v.ok) {
      return { ok: false, http_status: 0, error: "callback_url_invalid", provider_calls: 0, data: { webhook_id: null } };
    }
    const r = await this.call<Record<string, unknown>>("webhooks", {
      method: "POST",
      body: {
        request_url: callback_url,
        source: "messaging",
        format: "json",
        // Secret travels in a header, never in the URL.
        headers: secret ? [{ key: "x-social-relationship-secret", value: secret }] : undefined,
      },
    });
    return { ...r, data: { webhook_id: extractProviderId(r.data) } };
  }
}

/* ------------------------------------------------------- response parsing */

export function extractProviderId(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  for (const key of ["message_id", "invitation_id", "webhook_id", "provider_id", "id", "object_id"]) {
    const v = d[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

export function parseUnipileAccounts(data: unknown): ProviderAccount[] {
  const items = ((data as { items?: unknown[] })?.items ?? []) as Array<Record<string, unknown>>;
  return items
    .map((it) => {
      const id = String(it.id ?? it.account_id ?? "").trim();
      if (!id) return null;
      const type = String(it.type ?? it.provider ?? "other").toLowerCase();
      const network = ["linkedin", "instagram", "messenger", "whatsapp"].includes(type) ? type : "other";
      const sources = (it.sources as Array<Record<string, unknown>>) ?? [];
      const status = String(sources[0]?.status ?? it.status ?? "unknown").toUpperCase();
      return {
        provider_account_id: id,
        network,
        account_name: (it.name as string) ?? null,
        account_handle: ((it.username as string) ?? null) as string | null,
        account_status: status === "OK" ? "ok" : status === "CREDENTIALS" ? "credentials" : "unknown",
        raw: { type, status },
      } as ProviderAccount;
    })
    .filter(Boolean) as ProviderAccount[];
}

export function parseUnipileProfiles(data: unknown, network: string): ProviderProfile[] {
  const items = ((data as { items?: unknown[] })?.items ?? []) as Array<Record<string, unknown>>;
  return items
    .map((it) => {
      const pid = String(it.id ?? it.provider_id ?? it.public_identifier ?? "").trim();
      if (!pid) return null;
      const first = String(it.first_name ?? "").trim();
      const last = String(it.last_name ?? "").trim();
      const name = String(it.name ?? `${first} ${last}`).trim();
      const rel = String(it.network_distance ?? "").toUpperCase();
      return {
        provider_profile_id: pid,
        profile_url: (it.profile_url as string) ?? (it.public_profile_url as string) ?? null,
        full_name: name || null,
        headline: (it.headline as string) ?? null,
        job_title: (it.title as string) ?? (it.headline as string) ?? null,
        company_name: (it.company as string) ?? (it.current_company as string) ?? null,
        industry: (it.industry as string) ?? null,
        location: (it.location as string) ?? null,
        relationship_status:
          rel === "FIRST_DEGREE" ? "connected" : rel === "OUT_OF_NETWORK" || rel ? "none" : "unknown",
        raw: { network },
      } as ProviderProfile;
    })
    .filter(Boolean) as ProviderProfile[];
}

/* ----------------------------------------------------------- ManyChat */

/**
 * ManyChat stays an OPTIONAL Instagram/Facebook engagement-trigger connector.
 * No relationship actions are executed through it — manual export/blueprint
 * remains the supported path. This adapter exists only so business logic has
 * a uniform boundary and so capabilities are explicitly declared FALSE.
 */
export class ManyChatAdapter implements SocialRelationshipAdapter {
  readonly provider = "manychat";
  configured(): boolean {
    return Boolean((Deno.env.get("MANYCHAT_API_KEY") ?? "").trim());
  }
  capabilities(): Record<CapabilityKey, boolean> {
    return fullCapMatrix({ webhook_support: true });
  }
  private blocked<T>(): ProviderCallResult<T> {
    return { ok: false, http_status: 0, error: "manychat_relationship_actions_not_enabled", provider_calls: 0 };
  }
  async testConnection() {
    return this.configured()
      ? { ok: true, http_status: 200, data: { accounts: 0 }, provider_calls: 0 }
      : this.blocked<{ accounts: number }>();
  }
  async listAccounts() {
    return this.blocked<ProviderAccount[]>();
  }
  async searchProfiles() {
    return this.blocked<ProviderProfile[]>();
  }
  async sendInvitation() {
    return { ...this.blocked<{ provider_id: string | null }>(), data: { provider_id: null } };
  }
  async startChat() {
    return { ...this.blocked<{ provider_id: string | null; chat_id: string | null }>(), data: { provider_id: null, chat_id: null } };
  }
  async sendMessage() {
    return { ...this.blocked<{ provider_id: string | null }>(), data: { provider_id: null } };
  }
  async listChats() {
    return this.blocked<Array<Record<string, unknown>>>();
  }
  async listMessages() {
    return this.blocked<Array<Record<string, unknown>>>();
  }
  async registerWebhook() {
    return { ...this.blocked<{ webhook_id: string | null }>(), data: { webhook_id: null } };
  }
}

export function getRelationshipAdapter(provider: string): SocialRelationshipAdapter {
  return String(provider).toLowerCase() === "manychat" ? new ManyChatAdapter() : new UnipileAdapter();
}
