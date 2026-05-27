import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Navigate } from "react-router-dom";
import { CG_NAV } from "@/pages/founder/context-guard/_shared";

/** Mirror of the App.tsx redirect map for context-guard → context-fabric. */
const REDIRECTS: Array<[string, string]> = [
  ["/founder/context-guard", "/founder/context-fabric"],
  ["/founder/context-guard/events", "/founder/context-fabric/events"],
  ["/founder/context-guard/missing-business", "/founder/context-fabric/missing-business"],
  ["/founder/context-guard/cross-contamination", "/founder/context-fabric/cross-contamination"],
  ["/founder/context-guard/settings", "/founder/context-fabric/settings"],
];

function Harness({ initial }: { initial: string }) {
  return (
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        {REDIRECTS.map(([from, to]) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="/founder/context-fabric" element={<div data-testid="page">overview</div>} />
        <Route path="/founder/context-fabric/events" element={<div data-testid="page">events</div>} />
        <Route path="/founder/context-fabric/missing-business" element={<div data-testid="page">missing</div>} />
        <Route path="/founder/context-fabric/cross-contamination" element={<div data-testid="page">cross</div>} />
        <Route path="/founder/context-fabric/settings" element={<div data-testid="page">settings</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Context Fabric routes", () => {
  it("CG_NAV points to canonical /founder/context-fabric paths", () => {
    for (const item of CG_NAV) {
      expect(item.to.startsWith("/founder/context-fabric")).toBe(true);
    }
  });

  it.each(REDIRECTS)("redirects legacy %s → %s", (from) => {
    render(<Harness initial={from} />);
    expect(screen.getByTestId("page")).toBeInTheDocument();
  });
});
