const SIGNATURE_PREFIX = "sha256=";
const SHA256_HEX_LENGTH = 64;

/** The webhook stays unavailable until the deployment explicitly opts in. */
export function smartleadWebhookReceiverEnabled(value: string | null | undefined): boolean {
  return value === "true";
}

function parseDigest(signatureHeader: string | null): Uint8Array | null {
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

/** Verify Smartlead's raw-body `X-Smartlead-Signature: sha256=<hex>` HMAC. */
export async function verifySmartleadWebhookSignature(
  rawBody: Uint8Array | string,
  signatureHeader: string | null,
  secret: string | null | undefined,
): Promise<boolean> {
  const receivedDigest = parseDigest(signatureHeader);
  if (!receivedDigest || !secret) return false;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const bytes = typeof rawBody === "string" ? new TextEncoder().encode(rawBody) : Uint8Array.from(rawBody);
    const expectedDigest = new Uint8Array(await crypto.subtle.sign("HMAC", key, bytes.buffer));
    return constantTimeEqual(expectedDigest, receivedDigest);
  } catch {
    return false;
  }
}

/** X-Request-Id is the preferred retry key; callers scope its uniqueness by connection. */
export function smartleadRequestIdempotencyKey(requestId: string | null): string | null {
  const normalized = requestId?.trim();
  if (!normalized || normalized.length > 200 || /[\u0000-\u001f\u007f]/.test(normalized)) return null;
  return `req:${normalized}`;
}
