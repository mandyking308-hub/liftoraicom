/**
 * KND-003 privacy receiver body read: a hard byte cap BEFORE JSON/HMAC parsing.
 * A request's Content-Length is only a fast rejection hint; the stream itself
 * is always bounded, including when the header is absent or dishonest.
 * No payload content is included in errors or logs.
 */
import { KINDNESSS_PRIVACY_MAX_BODY_BYTES } from "./kindnesssPrivacyHandoff.ts";

export type PrivacyBodyRead =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: 400 | 413; reason: "body_unreadable" | "body_too_large" };

export async function readKindnesssPrivacyBody(
  body: ReadableStream<Uint8Array> | null,
  declaredLength: string | null = null,
): Promise<PrivacyBodyRead> {
  const cap = KINDNESSS_PRIVACY_MAX_BODY_BYTES;
  if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > cap) {
    return { ok: false, status: 413, reason: "body_too_large" };
  }
  if (!body) return { ok: true, bytes: new Uint8Array(0) };

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = body.getReader();
  } catch {
    return { ok: false, status: 400, reason: "body_unreadable" };
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > cap - size) {
        // Do not wait for an untrusted producer to acknowledge cancellation.
        void reader.cancel("body_too_large").catch(() => {});
        return { ok: false, status: 413, reason: "body_too_large" };
      }
      chunks.push(value.slice());
      size += value.byteLength;
    }
  } catch {
    return { ok: false, status: 400, reason: "body_unreadable" };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}
