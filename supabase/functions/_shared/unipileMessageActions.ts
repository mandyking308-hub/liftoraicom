import {
  buildUnipileUrl,
  sanitiseProviderError,
  type ProviderResult,
  type UnipileConfig,
} from "./unipileClient.ts";

export async function sendUnipileChatMessage(
  config: UnipileConfig,
  chatId: string,
  accountId: string,
  message: string,
  idempotencyKey: string,
): Promise<ProviderResult<Record<string, unknown>>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const form = new FormData();
    form.set("text", message);
    form.set("account_id", accountId);
    const response = await fetch(buildUnipileUrl(config, `/chats/${encodeURIComponent(chatId)}/messages`), {
      method: "POST",
      signal: controller.signal,
      headers: {
        "X-API-KEY": config.apiKey,
        "Accept": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: form,
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
        ambiguous: response.status >= 500,
      };
    }
    return { ok: true, status: response.status, data: (payload ?? {}) as Record<string, unknown> };
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
