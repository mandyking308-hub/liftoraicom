import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe2, Network, Phone, Route, Search, Send, ShieldCheck } from "lucide-react";
import {
  MONTVELLE_SUPPLIER_BUILD_RULES,
  MONTVELLE_SUPPLIER_CATEGORY_LABELS,
  type MontvelleSupplierCategory,
} from "@/data/montvelleSupplierSeed";
import { ALL_MONTVELLE_SUPPLIERS } from "@/data/montvelleSupplierRegistry";
import {
  ALL_MONTVELLE_OPERATIONAL_ROUTES,
  getAllMontvelleOperationalRoutes,
} from "@/data/montvelleOperationalRouteRegistry";

export default function MontvelleSupplierNetworkPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MontvelleSupplierCategory | "all">("all");
  const [multipliersOnly, setMultipliersOnly] = useState(false);
  const [routesOnly, setRoutesOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(ALL_MONTVELLE_SUPPLIERS.map((supplier) => supplier.category))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return ALL_MONTVELLE_SUPPLIERS.filter((supplier) => {
      const routes = getAllMontvelleOperationalRoutes(supplier.id);
      if (category !== "all" && supplier.category !== category) return false;
      if (multipliersOnly && !supplier.networkMultiplier) return false;
      if (routesOnly && routes.length === 0) return false;
      if (!normalized) return true;
      return [
        supplier.name,
        supplier.coverage,
        supplier.multiplierReach,
        supplier.notes,
        ...routes.flatMap((route) => [
          route.label,
          route.geography,
          route.purpose,
          ...route.channels.map((channel) => channel.value),
        ]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, multipliersOnly, query, routesOnly]);

  const multiplierCount = ALL_MONTVELLE_SUPPLIERS.filter((supplier) => supplier.networkMultiplier).length;
  const globalCount = ALL_MONTVELLE_SUPPLIERS.filter((supplier) => supplier.coverage === "Global").length;
  const suppliersWithRoutes = new Set(ALL_MONTVELLE_OPERATIONAL_ROUTES.map((route) => route.supplierId)).size;

  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Montvelle Global Supplier Network
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Supplier universe plus the verified operational routes Liftor can use to fulfil Montvelle concierge requests. Relationship outreach remains a separate workstream.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Official routes only</Badge>
            <Badge variant="outline">Names, not logos</Badge>
            <Badge>Concierge fulfilment</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Suppliers" value={ALL_MONTVELLE_SUPPLIERS.length} />
          <Stat icon={Route} label="Operational routes" value={ALL_MONTVELLE_OPERATIONAL_ROUTES.length} />
          <Stat icon={Phone} label="Suppliers with routes" value={suppliersWithRoutes} />
          <Stat icon={Network} label="Network multipliers" value={multiplierCount} />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-medium">Concierge routing rule</div>
          <div className="text-muted-foreground mt-1">
            For each live request, Liftor should choose the most specific verified fulfilment route available — reservations, travel trade, concierge, reciprocal access or direct property — and respect any membership, advisor or account prerequisite before promising access.
          </div>
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
              placeholder="Search supplier, route, phone, region or capability…"
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
          <label className="h-9 rounded-md border border-input px-3 flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={routesOnly}
              onChange={(event) => setRoutesOnly(event.target.checked)}
            />
            Routes verified
          </label>
        </div>

        <div className="rounded-md border border-border/70 overflow-hidden">
          <div className="grid grid-cols-[minmax(180px,1.2fr)_minmax(140px,.9fr)_minmax(140px,.8fr)_minmax(260px,1.7fr)] gap-3 px-3 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground">
            <div>Organisation</div>
            <div>Category</div>
            <div>Coverage</div>
            <div>Operational route / status</div>
          </div>
          <div className="divide-y divide-border/60 max-h-[720px] overflow-auto">
            {filtered.map((supplier) => {
              const routes = getAllMontvelleOperationalRoutes(supplier.id);
              const primaryRoute = routes.find((route) => route.usableForFulfilment) ?? routes[0];
              const phone = primaryRoute?.channels.find((channel) => channel.channel === "phone" || channel.channel === "whatsapp");
              const email = primaryRoute?.channels.find((channel) => channel.channel === "email");
              return (
                <div
                  key={supplier.id}
                  className="grid grid-cols-1 md:grid-cols-[minmax(180px,1.2fr)_minmax(140px,.9fr)_minmax(140px,.8fr)_minmax(260px,1.7fr)] gap-2 md:gap-3 px-3 py-3 text-xs"
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
                      {routes.length > 0 ? <Badge>{routes.length} route{routes.length === 1 ? "" : "s"}</Badge> : <Badge variant="outline">Route research needed</Badge>}
                      <Badge variant="outline">{supplier.outreachStatus.replace(/_/g, " ")}</Badge>
                    </div>
                    {primaryRoute ? (
                      <div className="mt-2 space-y-1 text-muted-foreground">
                        <div className="font-medium text-foreground">{primaryRoute.label}</div>
                        {phone && <div>{phone.channel === "whatsapp" ? "WhatsApp" : "Phone"}: {phone.value}</div>}
                        {email && <div>Email: {email.value}</div>}
                        <div>{primaryRoute.purpose}</div>
                        {primaryRoute.accessPrerequisite && (
                          <div className="text-[11px]">Prerequisite: {primaryRoute.accessPrerequisite}</div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted-foreground mt-1.5">{supplier.multiplierReach}</div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">No supplier matches this filter.</div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-muted-foreground">
          <span>Current enrichment is deliberately based on supplier-published routes, not Apollo or guessed contact patterns.</span>
          <span>{globalCount} suppliers are marked Global.</span>
        </div>
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
