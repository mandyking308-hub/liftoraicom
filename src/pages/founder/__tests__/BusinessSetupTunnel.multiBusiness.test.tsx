import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BusinessSetupTunnel from "../BusinessSetupTunnel";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  fieldCounts: vi.fn(() => ({})),
  load: vi.fn(),
  listAll: vi.fn(() => []),
  listAllRemote: vi.fn(async () => []),
  overallCompleteness: vi.fn(() => 0),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("@/components/founder/FounderLayout", () => ({
  default: ({ children }: { children: unknown }) => <div>{children as any}</div>,
}));

vi.mock("@/lib/businessSetupTunnel", () => ({
  TUNNEL_STEPS: [],
  STEP_FIELDS: {},
  fieldCounts: mocks.fieldCounts,
  load: mocks.load,
  save: vi.fn(),
  listAll: mocks.listAll,
  newState: vi.fn(),
  stepCompleteness: vi.fn(),
  overallCompleteness: mocks.overallCompleteness,
  loadRemote: vi.fn(),
  saveRemote: vi.fn(),
  listAllRemote: mocks.listAllRemote,
  promoteDraftToBusiness: vi.fn(),
  promoteIntoLiftorModules: vi.fn(),
  MODULE_AREAS: [],
}));

vi.mock("@/lib/commercialPace", () => ({
  calculatePace: vi.fn(),
  saveSalesTarget: vi.fn(),
  savePaceCalculation: vi.fn(),
  loadCurrentRevenueRollup: vi.fn(),
}));

type BusinessRow = { id: string; name: string };
type PageRequest = { start: number; end: number; search: string | null };

const businesses: BusinessRow[] = Array.from({ length: 512 }, (_, index) => ({
  id: `business-${String(index).padStart(3, "0")}`,
  name: `Portfolio Business ${String(index).padStart(3, "0")}`,
}));

let pageRequests: PageRequest[];

function makeBusinessesQuery() {
  let search: string | null = null;
  const query: Record<string, (...args: any[]) => any> = {};

  query.select = () => query;
  query.ilike = (_column: string, pattern: string) => {
    search = pattern;
    return query;
  };
  query.eq = () => query;
  query.neq = () => query;
  query.order = () => query;
  query.range = async (start: number, end: number) => {
    pageRequests.push({ start, end, search });
    const term = search?.replace(/%/g, "").toLowerCase();
    const matches = term
      ? businesses.filter((business) => business.name.toLowerCase().includes(term))
      : businesses;
    return { data: matches.slice(start, end + 1), error: null };
  };

  return query;
}

function renderTunnel() {
  return render(
    <MemoryRouter>
      <BusinessSetupTunnel />
    </MemoryRouter>,
  );
}

describe("Business Setup Tunnel multi-business harness", () => {
  beforeEach(() => {
    pageRequests = [];
    mocks.from.mockReset();
    mocks.from.mockImplementation(() => makeBusinessesQuery());
    mocks.listAllRemote.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("pages through 512 businesses past the old 200-row limit and searches the final record", async () => {
    renderTunnel();

    expect(await screen.findByText(businesses[0].name)).toBeInTheDocument();
    expect(screen.getByText(businesses[49].name)).toBeInTheDocument();
    expect(screen.queryByText(businesses[50].name)).not.toBeInTheDocument();

    for (let page = 1; page <= 5; page += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Load more businesses" }));
      expect(await screen.findByText(businesses[page * 50].name)).toBeInTheDocument();
    }

    expect(pageRequests.slice(0, 6)).toEqual([
      { start: 0, end: 49, search: null },
      { start: 50, end: 99, search: null },
      { start: 100, end: 149, search: null },
      { start: 150, end: 199, search: null },
      { start: 200, end: 249, search: null },
      { start: 250, end: 299, search: null },
    ]);

    fireEvent.change(screen.getByLabelText("Search businesses by name"), {
      target: { value: businesses[511].name },
    });

    expect(await screen.findByText(businesses[511].name)).toBeInTheDocument();
    expect(pageRequests.at(-1)).toEqual({
      start: 0,
      end: 49,
      search: `%${businesses[511].name}%`,
    });
    expect(screen.queryByText(businesses[0].name)).not.toBeInTheDocument();
  }, 15_000);
});
