const SIGNATURE_PREFIX = "sha256=";
const SHA256_HEX_LENGTH = 64;
export const SMARTLEAD_STANDARD_MAX_SKEW_SECONDS = 300;

export type SmartleadWebhookProtocol = "legacy_hex" | "standard_webhooks" | "body_secret_key";

export interface SmartleadWebhookHeaders {
  legacySignature: string | null;
  requestId: string | null;
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

export type SmartleadWebhookVerification =
  | { ok: true; protocol: SmartleadWebhookProtocol; requestId: string | null }
  | { ok: false; reason: "invalid_signature" | "invalid_timestamp" | "missing_webhook_id" };

/** The webhook stays unavailable until the deployment explicitly opts in. */
export function smartleadWebhookReceiverEnabled(value: string | null | undefined): boolean {
  return value === "true";
}

/** Protocol is explicit per connection; there is no unsigned or cross-protocol fallback. */
export function smartleadWebhookProtocol(settings: unknown): SmartleadWebhookProtocol | null {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) return null;
  const value = (settings as Record<string, unknown>).webhook_protocol;
  return value === "legacy_hex" || value === "standard_webhooks" || value === "body_secret_key" ? value : null;
}

function parseDigest(signatureHeader: string | null): Uint8Array<ArrayBuffer> | null {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) return null;
  const hex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  if (hex.length !== SHA256_HEX_LENGTH || !/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  const digest = new Uint8Array(SHA256_HEX_LENGTH / 2);
  for (let i = 0; i < digest.length; i += 1) {
    digest[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return digest;
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let i = 0; i < left.length; i += 1) difference |= left[i] ^ right[i];
  return difference === 0;
}

function rawBytes(rawBody: Uint8Array | string): Uint8Array<ArrayBuffer> {
  const bytes = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : rawBody;
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

async function hmac(keyBytes: Uint8Array<ArrayBuffer>, message: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, message));
}

/** Verify Smartlead's legacy raw-body `X-Smartlead-Signature: sha256=<hex>` HMAC. */
export async function verifySmartleadWebhookSignature(
  rawBody: Uint8Array | string,
  signatureHeader: string | null,
  secret: string | null | undefined,
): Promise<boolean> {
  const receivedDigest = parseDigest(signatureHeader);
  if (!receivedDigest || !secret) return false;

  try {
    const expectedDigest = await hmac(new TextEncoder().encode(secret), rawBytes(rawBody));
    return constantTimeEqual(expectedDigest, receivedDigest);
  } catch {
    return false;
  }
}

function hasControlCharacters(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code <= 31 || code === 127;
  });
}

function validHeaderId(value: string | null): value is string {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 && normalized.length <= 200 && !hasControlCharacters(normalized);
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) return null;
  try {
    return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function standardSecretBytes(secret: string): Uint8Array<ArrayBuffer> | null {
  if (!secret.startsWith("whsec_")) return null;
  const bytes = decodeBase64(secret.slice("whsec_".length));
  return bytes && bytes.length >= 24 && bytes.length <= 64 ? bytes : null;
}

function concatSignedContent(id: string, timestamp: string, body: Uint8Array): Uint8Array<ArrayBuffer> {
  const prefix = new TextEncoder().encode(`${id}.${timestamp}.`);
  const content = new Uint8Array(prefix.length + body.length);
  content.set(prefix, 0);
  content.set(body, prefix.length);
  return content;
}

/** Verify Standard Webhooks v1, including timestamp freshness and stable delivery ID. */
export async function verifySmartleadStandardWebhook(
  rawBody: Uint8Array | string,
  headers: Pick<SmartleadWebhookHeaders, "webhookId" | "webhookTimestamp" | "webhookSignature">,
  secret: string | null | undefined,
  nowSeconds: number,
): Promise<SmartleadWebhookVerification> {
  if (!secret || !validHeaderId(headers.webhookId)) return { ok: false, reason: "missing_webhook_id" };
  const timestamp = headers.webhookTimestamp;
  if (!timestamp || !/^\d{9,11}$/.test(timestamp) || Math.abs(nowSeconds - Number(timestamp)) > SMARTLEAD_STANDARD_MAX_SKEW_SECONDS) {
    return { ok: false, reason: "invalid_timestamp" };
  }
  const keyBytes = standardSecretBytes(secret);
  if (!keyBytes || !headers.webhookSignature) return { ok: false, reason: "invalid_signature" };

  try {
    const expected = await hmac(keyBytes, concatSignedContent(headers.webhookId, timestamp, rawBytes(rawBody)));
    const signatures = headers.webhookSignature.split(" ").filter(Boolean);
    for (const candidate of signatures) {
      if (!candidate.startsWith("v1,")) continue;
      const received = decodeBase64(candidate.slice(3));
      if (received && constantTimeEqual(expected, received)) {
        return { ok: true, protocol: "standard_webhooks", requestId: headers.webhookId };
      }
    }
  } catch {
    return { ok: false, reason: "invalid_signature" };
  }
  return { ok: false, reason: "invalid_signature" };
}

/** Verify only the explicitly configured protocol and return its retry/idempotency identity. */
export async function verifySmartleadWebhookRequest(input: {
  protocol: SmartleadWebhookProtocol;
  rawBody: Uint8Array | string;
  headers: SmartleadWebhookHeaders;
  secret: string | null | undefined;
  nowSeconds: number;
}): Promise<SmartleadWebhookVerification> {
  if (input.protocol === "body_secret_key") {
    // Smartlead's current webhooks carry the configured secret as JSON `secret_key` (no signature header).
    // Constant-time comparison; the field is stripped before anything is stored.
    if (!input.secret) return { ok: false, reason: "invalid_signature" };
    let received: unknown;
    try { received = (JSON.parse(new TextDecoder().decode(rawBytes(input.rawBody))) as Record<string, unknown>)?.secret_key; } catch { return { ok: false, reason: "invalid_signature" }; }
    if (typeof received !== "string" || !received) return { ok: false, reason: "invalid_signature" };
    const enc = new TextEncoder();
    const [a, b] = await Promise.all([crypto.subtle.digest("SHA-256", enc.encode(received)), crypto.subtle.digest("SHA-256", enc.encode(input.secret))]);
    if (!constantTimeEqual(new Uint8Array(a), new Uint8Array(b))) return { ok: false, reason: "invalid_signature" };
    const id = input.headers.webhookId;
    return { ok: true, protocol: input.protocol, requestId: validHeaderId(id) ? id.trim() : null };
  }
  if (input.protocol === "legacy_hex") {
    const valid = await verifySmartleadWebhookSignature(input.rawBody, input.headers.legacySignature, input.secret);
    return valid
      ? { ok: true, protocol: input.protocol, requestId: validHeaderId(input.headers.requestId) ? input.headers.requestId.trim() : null }
      : { ok: false, reason: "invalid_signature" };
  }
  return verifySmartleadStandardWebhook(input.rawBody, input.headers, input.secret, input.nowSeconds);
}

/** X-Request-Id is the legacy retry key; Standard Webhooks uses webhook-id. */
export function smartleadRequestIdempotencyKey(requestId: string | null): string | null {
  const normalized = requestId?.trim();
  if (!normalized || normalized.length > 200 || hasControlCharacters(normalized)) return null;
  return `req:${normalized}`;
}
