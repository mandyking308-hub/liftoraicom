import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import CommsInbox from "../Inbox";
import type { UnifiedInboxSnapshot } from "@/lib/unifiedInbox";

const load = vi.hoisted(() => vi.fn());
vi.mock("@/lib/unifiedInbox", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/unifiedInbox")>();
  return { ...actual, loadUnifiedInboxSnapshot: load };
});

const snapshot: UnifiedInboxSnapshot = {
  businesses: [
    { id: "business-a", name: "Kindnesss", portfolio_status: "active", archived_at: null },
    { id: "business-b", name: "Other Co", portfolio_status: "active", archived_at: null },
  ],
  rows: [
    { id: "a", source: "smartlead", channel: "email", businessId: "business-a", receivedAt: new Date().toISOString(), status: "mapped", subject: "Commercial reply", threadReference: "thread-a", mailboxId: "mailbox-a", mailboxIdentity: "sender-a@gsm.example", replied: true, optOut: false, needsReview: false, failed: false, quarantine: false, quarantineReason: null, reference: "event-a", privacy: false },
    { id: "b", source: "legacy_imap", channel: "email", businessId: "business-b", receivedAt: new Date().toISOString(), status: "received", subject: "Other business", threadReference: "thread-b", mailboxId: "mailbox-b", mailboxIdentity: "sender-b@gsm.example", replied: false, optOut: false, needsReview: false, failed: false, quarantine: false, quarantineReason: null, reference: "event-b", privacy: false },
    { id: "q", source: "smartlead", channel: "email", businessId: null, receivedAt: new Date().toISOString(), status: "ignored", subject: "Unknown", threadReference: null, mailboxId: null, mailboxIdentity: null, replied: false, optOut: false, needsReview: true, failed: false, quarantine: true, quarantineReason: "mailbox_mapping_missing", reference: "event-q", privacy: false },
  ],
  diagnostics: [
    { key: "smartlead", label: "Smartlead signed replies", health: "not_configured", detail: "Not configured: no inbound-enabled Smartlead connection.", lastSync: null, failed: 0, retry: 0, deadLetter: 0 },
    { key: "kindnesss_handoff", label: "Kindnesss signed commercial handoff", health: "unverified", detail: "Sync missing or schema not deployed.", lastSync: null, failed: null, retry: null, deadLetter: null },
  ],
  senders: [],
  allocations: [],
  drafts: [],
  estateCounts: { gsm: 200, ghat: 20, allocations: 0 },
  errors: [],
};

function renderInbox() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><CommsInbox /></MemoryRouter></QueryClientProvider>);
}

describe("founder unified inbox", () => {
  it("shows truthful source configuration and unread state instead of reassuring zeros", async () => {
    load.mockResolvedValue(snapshot);
    renderInbox();
    expect((await screen.findAllByText("Kindnesss")).length).toBeGreaterThan(0);
    expect(screen.getByText("Not tracked")).toBeInTheDocument();
    expect(screen.getByTestId("diagnostic-smartlead")).toHaveTextContent("Not configured");
    expect(screen.getByTestId("diagnostic-kindnesss_handoff")).toHaveTextContent("Unverified");
    expect(screen.getByTestId("phase1-read-only")).toHaveTextContent("durable fan-in disabled");
  });

  it("filters the cross-business view using actual registry IDs", async () => {
    load.mockResolvedValue(snapshot);
    renderInbox();
    await screen.findByText("Commercial reply");
    fireEvent.change(screen.getByLabelText("Filter inbox by business"), { target: { value: "business-a" } });
    await waitFor(() => expect(screen.queryByText("Other business")).not.toBeInTheDocument());
    expect(screen.getByText("Commercial reply")).toBeInTheDocument();
  });

  it("keeps quarantine founder-only and blocks unverified drill-down", async () => {
    load.mockResolvedValue(snapshot);
    renderInbox();
    const inspect = await screen.findByRole("button", { name: "Inspect" });
    fireEvent.click(inspect);
    expect(screen.getByTestId("inbox-drilldown")).toHaveTextContent("business scope not verified");
    expect(screen.getByTestId("inbox-drilldown")).toHaveTextContent("mailbox_mapping_missing");
    expect(screen.queryByLabelText("Draft body (not saved)")).not.toBeInTheDocument();
  });

  it("provides a local review draft but no save or send path without an approved sender", async () => {
    load.mockResolvedValue(snapshot);
    renderInbox();
    const review = (await screen.findAllByRole("button", { name: "Review" }))[0];
    fireEvent.click(review);
    expect(screen.getByLabelText("Draft body (not saved)")).toBeEnabled();
    expect(screen.getByText(/Unavailable · original_sender_not_verified/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save for approval · pending migration/ })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /^Send$/ })).not.toBeInTheDocument();
  });
});
