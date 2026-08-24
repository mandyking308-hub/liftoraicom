import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe2, Network, Search, Send, ShieldCheck } from "lucide-react";
import {
  MONTVELLE_SUPPLIERS,
  MONTVELLE_SUPPLIER_BUILD_RULES,
  MONTVELLE_SUPPLIER_CATEGORY_LABELS,
  type MontvelleSupplierCategory,
} from "@/data/montvelleSupplierSeed";

export default function MontvelleSupplierNetworkPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MontvelleSupplierCategory | "all">("all");
  const [multipliersOnly, setMultipliersOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(MONTVELLE_SUPPLIERS.map((supplier) => supplier.category))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return MONTVELLE_SUPPLIERS.filter((supplier) => {
      if (category !== "all" && supplier.category !== category) return false;
      if (multipliersOnly && !supplier.networkMultiplier) return false;
      if (!normalized) return true;
      return [supplier.name, supplier.coverage, supplier.multiplierReach, supplier.notes]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, multipliersOnly, query]);

  const multiplierCount = MONTVELLE_SUPPLIERS.filter((supplier) => supplier.networkMultiplier).length;
  const globalCount = MONTVELLE_SUPPLIERS.filter((supplier) => supplier.coverage === "Global").length;
  const clubCount = MONTVELLE_SUPPLIERS.filter(
    (supplier) => supplier.category === "private_members_club" || supplier.category === "private_club_network",
  ).length;

  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Montvelle Global Supplier Network
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Private supplier universe for Montvelle. Build the base first, prioritise organisations that unlock many underlying providers, then run supplier outreach as a separate tracked workstream.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Base first</Badge>
            <Badge variant="outline">Names, not logos</Badge>
            <Badge>Supplier build</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Seed suppliers" value={MONTVELLE_SUPPLIERS.length} />
          <Stat icon={Network} label="Network multipliers" value={multiplierCount} />
          <Stat icon={Globe2} label="Global coverage" value={globalCount} />
          <Stat icon={ShieldCheck} label="Club routes" value={clubCount} />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-medium">Multiplier rule</div>
          <div className="text-muted-foreground mt-1">{MONTVELLE_SUPPLIER_BUILD_RULES.multiplierPriority}</div>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 text-xs">
          <RuleCard title="Relationship lifecycle" text={MONTVELLE_SUPPLIER_BUILD_RULES.lifecycle} />
          <RuleCard title="Outreach separation" text={MONTVELLE_SUPPLIER_BUILD_RULES.outreach} icon={Send} />
          <RuleCard title="Public-name guardrail" text={MONTVELLE_SUPPLIER_BUILD_RULES.publicWording} icon={ShieldCheck} />
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search supplier, region or capability…"
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as MontvelleSupplierCategory | "all")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>{MONTVELLE_SUPPLIER_CATEGORY_LABELS[item]}</option>
            ))}
          </select>
          <label className="h-9 rounded-md border border-input px-3 flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={multipliersOnly}
              onChange={(event) => setMultipliersOnly(event.target.checked)}
            />
            Multipliers only
          </label>
        </div>

        <div className="rounded-md border border-border/70 overflow-hidden">
          <div className="grid grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(130px,.8fr)_minmax(170px,1.2fr)] gap-3 px-3 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground">
            <div>Organisation</div>
            <div>Category</div>
            <div>Coverage</div>
            <div>Leverage / status</div>
          </div>
          <div className="divide-y divide-border/60 max-h-[620px] overflow-auto">
            {filtered.map((supplier) => (
              <div
                key={supplier.id}
                className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.3fr)_minmax(150px,1fr)_minmax(130px,.8fr)_minmax(170px,1.2fr)] gap-2 md:gap-3 px-3 py-3 text-xs"
              >
                <div>
                  <div className="font-medium">{supplier.name}</div>
                  <div className="text-muted-foreground mt-1 line-clamp-2">{supplier.notes}</div>
                </div>
                <div>{MONTVELLE_SUPPLIER_CATEGORY_LABELS[supplier.category]}</div>
                <div>{supplier.coverage}</div>
                <div>
                  <div className="flex gap-1.5 flex-wrap">
                    {supplier.networkMultiplier && <Badge variant="secondary">Multiplier</Badge>}
                    <Badge variant="outline">Identified</Badge>
                    <Badge variant="outline">Not contacted</Badge>
                  </div>
                  <div className="text-muted-foreground mt-1.5">{supplier.multiplierReach}</div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No supplier matches this filter.</div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground">
          This is the initial curated seed, not a ceiling. Keep all useful candidates and grow by category and geography; outreach/contact enrichment is intentionally tracked separately from inclusion in the sourcing base.
        </p>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <Icon className="h-4 w-4 text-primary" />
      <div className="text-xl font-semibold mt-2">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function RuleCard({
  title,
  text,
  icon: Icon = Network,
}: {
  title: string;
  text: string;
  icon?: typeof Network;
}) {
  return (
    <div className="rounded-md border border-border/60 p-3">
      <div className="font-medium flex items-center gap-1.5"><Icon className="h-3.5 w-3.5 text-primary" />{title}</div>
      <div className="text-muted-foreground mt-1.5">{text}</div>
    </div>
  );
}
