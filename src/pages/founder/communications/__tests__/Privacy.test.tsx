import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import CommsPrivacy from "../Privacy";
import type { PrivacyOperationsSnapshot } from "@/lib/kindnesssPrivacyOperations";

const load = vi.hoisted(() => vi.fn());
const save = vi.hoisted(() => vi.fn());
vi.mock("@/lib/kindnesssPrivacyOperations", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/kindnesssPrivacyOperations")>();
  return { ...actual, loadKindnesssPrivacyOperations: load, saveKindnesssPrivacyOperation: save };
});
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "founder-user-1" } }) }));

const available: PrivacyOperationsSnapshot = {
  availability: "available",
  detail: "Durable delivery references are available.",
  cases: [{
    privacyRequestId: "privacy-case-1",
    businessId: "640de582-a112-4d16-a221-03c27f00c6ec",
    requestRef: "opaque-request-1",
    requestType: "deletion",
    dueAt: "2026-11-15T12:00:00.000Z",
    lastDeliveryAt: "2026-11-16T10:00:00.000Z",
    deliveryCount: 2,
    latestDeliveryKind: "overdue",
    deliveryAcknowledged: true,
    operatorStatus: "unacknowledged",
    ownerUserId: null,
    operatorAcknowledgedAt: null,
    operationsUpdatedAt: "2026-11-16T10:00:00.000Z",
    canonicalStatus: "received",
    canonicalCompletedAt: null,
  }],
};

function renderPrivacy() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><CommsPrivacy /></MemoryRouter></QueryClientProvider>);
}

describe("separate Kindnesss privacy operations queue", () => {
  it("shows not activated and unverified counts instead of reassuring zeros", async () => {
    load.mockResolvedValue({ availability: "unavailable", cases: [], detail: "Not activated: schema unavailable; counts unverified." });
    renderPrivacy();
    expect(await screen.findByTestId("privacy-activation-state")).toHaveTextContent("Not activated");
    expect(screen.getAllByText("Unverified")).toHaveLength(5);
    expect(await screen.findByTestId("privacy-empty-state")).toHaveTextContent("Not activated. No delivery, ownership or request count is inferred.");
  });

  it("keeps delivery acknowledgement, operator triage and Kindnesss authority distinct", async () => {
    load.mockResolvedValue(available);
    renderPrivacy();
    expect(await screen.findByText("privacy-case-1")).toBeInTheDocument();
    expect(screen.getAllByText("Overdue").length).toBeGreaterThan(0);
    expect(screen.getByText("1 · Delivery acknowledged")).toBeInTheDocument();
    expect(screen.getByText("2 · Operator acknowledgement")).toBeInTheDocument();
    expect(screen.getByText("3 · Kindnesss authoritative decision")).toBeInTheDocument();
    expect(screen.queryByLabelText("Draft body (not saved)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Send$/ })).not.toBeInTheDocument();
  });

  it("saves only explicit operator triage with compare-and-set and no canonical closure action", async () => {
    load.mockResolvedValue(available);
    save.mockResolvedValue(undefined);
    renderPrivacy();
    fireEvent.click(await screen.findByRole("button", { name: "Review" }));
    expect(screen.getByTestId("privacy-operation-review")).toHaveTextContent("Durable receipt recorded");
    expect(screen.getByLabelText("Operator triage status")).toHaveValue("acknowledged");
    fireEvent.click(screen.getByRole("button", { name: "Save triage and assign to me" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith({
      privacyRequestId: "privacy-case-1",
      ownerUserId: "founder-user-1",
      operationalStatus: "acknowledged",
      expectedUpdatedAt: "2026-11-16T10:00:00.000Z",
    }));
    expect(screen.queryByRole("button", { name: /approve|verify identity|close case/i })).not.toBeInTheDocument();
  });
});
