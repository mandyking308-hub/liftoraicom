import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KINDNESSS_PRIVACY_MAX_BODY_BYTES as CAP } from "../../../supabase/functions/_shared/kindnesssPrivacyHandoff";
import { readKindnesssPrivacyBody } from "../../../supabase/functions/_shared/kindnesssPrivacyBody";

const chunk = (size: number, fill = 65) => new Uint8Array(size).fill(fill);
const stream = (...chunks: Uint8Array[]) => new ReadableStream<Uint8Array>({
  start(controller) {
    for (const bytes of chunks) controller.enqueue(bytes);
    controller.close();
  },
});

describe("KND-003 privacy receiver bounded streaming body", () => {
  it("accepts the exact 4096-byte limit across chunks without changing signed bytes", async () => {
    const result = await readKindnesssPrivacyBody(stream(chunk(1000), chunk(3000, 66), chunk(CAP - 4000, 67)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bytes.byteLength).toBe(CAP);
    expect(result.bytes[0]).toBe(65);
    expect(result.bytes[1000]).toBe(66);
    expect(result.bytes[4000]).toBe(67);
  });

  it("rejects an extra byte even when the declared size is small", async () => {
    const result = await readKindnesssPrivacyBody(stream(chunk(CAP), chunk(1)), "1");
    expect(result).toEqual({ ok: false, status: 413, reason: "body_too_large" });
  });

  it("rejects an oversized first chunk and does not echo any request data", async () => {
    const result = await readKindnesssPrivacyBody(stream(chunk(CAP + 1)));
    expect(result).toEqual({ ok: false, status: 413, reason: "body_too_large" });
  });

  it("uses a too-large Content-Length as early rejection, even for an unreadable stream", async () => {
    const locked = stream(chunk(1));
    const originalReader = locked.getReader();
    const result = await readKindnesssPrivacyBody(locked, String(CAP + 1));
    expect(result).toEqual({ ok: false, status: 413, reason: "body_too_large" });
    originalReader.releaseLock();
  });

  it("does not trust absent, invalid or understated Content-Length headers", async () => {
    for (const claimed of [null, "not-a-number", "4"]) {
      const result = await readKindnesssPrivacyBody(stream(chunk(CAP - 2), chunk(3)), claimed);
      expect(result).toEqual({ ok: false, status: 413, reason: "body_too_large" });
    }
  });

  it("fails closed on stream failure or a locked stream without revealing an error message", async () => {
    const broken = new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error("private payload marker")); },
    });
    expect(await readKindnesssPrivacyBody(broken)).toEqual({
      ok: false, status: 400, reason: "body_unreadable",
    });
    const locked = stream(chunk(1));
    const reader = locked.getReader();
    expect(await readKindnesssPrivacyBody(locked)).toEqual({
      ok: false, status: 400, reason: "body_unreadable",
    });
    reader.releaseLock();
  });

  it("accepts an empty body as bytes for the normal authenticated handler to reject", async () => {
    expect(await readKindnesssPrivacyBody(null)).toEqual({ ok: true, bytes: new Uint8Array(0) });
  });

  it("is actually used by the disabled-by-default edge receiver before creating the database client", () => {
    const entry = readFileSync("supabase/functions/kindnesss-privacy-receiver/index.ts", "utf8");
    const bodyRead = entry.indexOf("await readKindnesssPrivacyBody(");
    const dbClient = entry.indexOf("createClient(supabaseUrl, serviceKey");
    expect(bodyRead).toBeGreaterThan(0);
    expect(dbClient).toBeGreaterThan(bodyRead);
    expect(entry).not.toContain("req.arrayBuffer()");
    expect(entry).toContain("KINDNESSS_PRIVACY_RECEIVER_ENABLED");
  });
});
