import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import GhatSmartleadControls, { GHAT_CONNECT_CONFIRMATION } from "../GhatSmartleadControls";

// Fail-closed: the component must never reach the network itself.
const realFetch = globalThis.fetch;
beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("REAL NETWORK CALL BLOCKED IN TEST");
  }) as typeof fetch;
});
afterEach(() => {
  globalThis.fetch = realFetch;
});

function setup() {
  const onPreview = vi.fn();
  const onApply = vi.fn();
  const confirm = vi.fn(() => true);
  render(<GhatSmartleadControls busy={false} onPreview={onPreview} onApply={onApply} confirm={confirm} />);
  const box = screen.getByLabelText(/GHAT mailbox list/i);
  const type = (v: string) => fireEvent.change(box, { target: { value: v } });
  const preview = () => fireEvent.click(screen.getByRole("button", { name: "Preview connection" }));
  const connect = screen.getByRole("button", { name: "Connect mailboxes" }) as HTMLButtonElement;
  return { onPreview, onApply, confirm, type, preview, connect, box };
}

describe("GhatSmartleadControls", () => {
  it("is blank by default; blank preview is whole-estate and Connect is disabled", () => {
    const h = setup();
    expect((h.box as HTMLTextAreaElement).value).toBe("");
    expect(h.connect.disabled).toBe(true);
    h.preview();
    expect(h.onPreview).toHaveBeenCalledWith({ apply: false });
    fireEvent.click(h.connect);
    expect(h.onApply).not.toHaveBeenCalled();
  });

  it("normalizes (trim, lowercase, de-duplicate) and scopes preview to the list", () => {
    const h = setup();
    h.type("  A@GlobalHealthAccessTrust.NET ,\n a@globalhealthaccesstrust.net\nb@globalhealthaccesstrust.co,, ");
    expect(screen.getByTestId("ghat-list-count").textContent).toContain("2 unique");
    h.preview();
    expect(h.onPreview).toHaveBeenCalledWith({
      apply: false,
      emails: ["a@globalhealthaccesstrust.net", "b@globalhealthaccesstrust.co"],
    });
  });

  it("disables Connect for more than 10 addresses", () => {
    const h = setup();
    h.type(Array.from({ length: 11 }, (_, i) => `m${i}@globalhealthaccesstrust.org`).join("\n"));
    expect(h.connect.disabled).toBe(true);
    fireEvent.click(h.connect);
    expect(h.onApply).not.toHaveBeenCalled();
  });

  it("applies exactly the normalized list with the exact confirmation, after the dialog", () => {
    const h = setup();
    const ten = Array.from({ length: 10 }, (_, i) => `m${i}@globalhealthaccesstrust.org`);
    h.type(ten.map((e) => e.toUpperCase()).join(", "));
    expect(h.connect.disabled).toBe(false);
    fireEvent.click(h.connect);
    expect(h.confirm).toHaveBeenCalledTimes(1);
    expect(h.onApply).toHaveBeenCalledTimes(1);
    expect(h.onApply.mock.calls[0][0]).toEqual({
      apply: true,
      emails: ten,
      external_action_confirmation: GHAT_CONNECT_CONFIRMATION,
    });
    expect(GHAT_CONNECT_CONFIRMATION).toBe("CONNECT GHAT MAILBOXES TO SMARTLEAD");
  });

  it("does nothing if the confirmation dialog is cancelled", () => {
    const h = setup();
    h.confirm.mockReturnValue(false);
    h.type("a@globalhealthaccesstrust.org");
    fireEvent.click(h.connect);
    expect(h.onApply).not.toHaveBeenCalled();
  });
});
