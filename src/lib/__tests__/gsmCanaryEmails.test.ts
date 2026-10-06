import { describe, expect, it } from "vitest";
import {
  buildApplyBody,
  buildPreviewBody,
  canApplyCanary,
  parseCanaryEmails,
} from "../gsmCanaryEmails";

describe("GSM canary email field", () => {
  it("normalizes, trims, lowercases and de-duplicates comma/newline input", () => {
    expect(parseCanaryEmails(" A@getgsm.net,\nb@GETGSM.net\r\n a@getgsm.net ,, ")).toEqual(["a@getgsm.net", "b@getgsm.net"]);
    expect(parseCanaryEmails("")).toEqual([]);
  });
  it("gates apply on 1-10 entries", () => {
    expect(canApplyCanary([])).toBe(false);
    const eleven = Array.from({ length: 11 }, (_, i) => `m${i}@getgsm.net`);
    expect(canApplyCanary(eleven)).toBe(false);
    expect(canApplyCanary(eleven.slice(0, 10))).toBe(true);
    expect(canApplyCanary(eleven.slice(0, 1))).toBe(true);
    expect(() => buildApplyBody([])).toThrow();
    expect(() => buildApplyBody(eleven)).toThrow();
  });
  it("preview is whole-estate when blank and scoped when populated", () => {
    expect(buildPreviewBody([])).toEqual({ apply: false });
    expect(buildPreviewBody(["a@getgsm.net"])).toEqual({ apply: false, emails: ["a@getgsm.net"] });
  });
  it("apply payload is exactly the list plus exact confirmation", () => {
    expect(buildApplyBody(["a@getgsm.net", "b@getgsm.net"])).toEqual({
      apply: true,
      emails: ["a@getgsm.net", "b@getgsm.net"],
      external_action_confirmation: "CONNECT GSM MAILBOXES TO SMARTLEAD",
    });
  });
});
