import "@testing-library/jest-dom";
import { Buffer } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, vi } from "vitest";

function nodeBufferSource(value: unknown): Buffer {
  if (ArrayBuffer.isView(value)) {
    const view = value as ArrayBufferView;
    return Buffer.from(view.buffer as ArrayBuffer, view.byteOffset, view.byteLength);
  }
  return Buffer.from(value as ArrayBuffer);
}

// jsdom and Node 20 can create BufferSource objects in different realms.
// Normalize HMAC byte inputs at the test boundary while leaving production
// provider code unchanged.
const nodeSubtle = webcrypto.subtle;
const testSubtle = new Proxy(nodeSubtle, {
  get(target, property) {
    if (property === "importKey") {
      return (
        format: "raw",
        keyData: BufferSource,
        algorithm: AlgorithmIdentifier | RsaHashedImportParams | EcKeyImportParams | HmacImportParams | AesKeyAlgorithm,
        extractable: boolean,
        keyUsages: readonly KeyUsage[],
      ) => target.importKey(format, nodeBufferSource(keyData), algorithm, extractable, keyUsages);
    }
    if (property === "sign") {
      return (algorithm: AlgorithmIdentifier | RsaPssParams | EcdsaParams, key: CryptoKey, data: BufferSource) =>
        target.sign(algorithm, key, nodeBufferSource(data));
    }
    const member = Reflect.get(target, property, target);
    return typeof member === "function" ? member.bind(target) : member;
  },
});

const testCrypto = new Proxy(webcrypto, {
  get(target, property) {
    if (property === "subtle") return testSubtle;
    const member = Reflect.get(target, property, target);
    return typeof member === "function" ? member.bind(target) : member;
  },
});

Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: testCrypto,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: testCrypto,
  });
}

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

// Deterministic suite: no test may reach a real network/provider, and mocks/timers never leak.
const blockedFetch = vi.fn(async (input: unknown) => {
  throw new Error(`network_blocked_in_tests: ${String(input)}`);
});
if (!vi.isMockFunction(globalThis.fetch)) {
  globalThis.fetch = blockedFetch as unknown as typeof fetch;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});
