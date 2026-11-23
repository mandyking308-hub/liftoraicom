import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CandidateCard } from "../RetirementSuccession";
import { buildCandidate } from "@/lib/retirement/retirementAcquisition";

describe("Retirement candidate card", () => {
  it("shows a test-tagged candidate with source and honest labels", () => {
    const r = buildCandidate({ source_key: "rightbiz", source_url: "https://www.rightbiz.co.uk/test-listing-1", title: "TEST wholesale firm, owner retiring", asking_price: 250000, listing_text: "Bank finance available", is_test: true }, ["rightbiz"]);
    if (!r.ok) throw new Error();
    render(<MemoryRouter><CandidateCard c={{ ...r.row, id: "t", status: "new", first_seen_at: "", last_seen_at: "" } as never} /></MemoryRouter>);
    expect(screen.getByText("TEST")).toBeInTheDocument();
    expect(screen.getByText("Source: rightbiz").closest("a")).toHaveAttribute("href", "https://www.rightbiz.co.uk/test-listing-1");
    expect(screen.getByText("Seller finance unknown")).toBeInTheDocument();
    expect(screen.getByText("Profit: Unknown")).toBeInTheDocument();
    expect(screen.getByText("Interesting — not DD ready")).toBeInTheDocument();
    expect(screen.getByText(/Third-party finance mentioned \(not seller finance\)/)).toBeInTheDocument();
  });
});
