import "@testing-library/jest-dom";
import { webcrypto } from "node:crypto";
import { afterEach, vi } from "vitest";

// Keep WebCrypto in one Node realm under jsdom. Node 20 rejects BufferSource
// objects created across the jsdom/Node boundary; provider HMAC tests must use
// the same implementation as the production Web Crypto contract.
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: webcrypto,
});
if (typeof window !== "undefined") {
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: webcrypto,
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
