import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";

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
