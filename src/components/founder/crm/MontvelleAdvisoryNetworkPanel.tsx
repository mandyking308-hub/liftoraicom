import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe2, Network, Search, Send, ShieldCheck } from "lucide-react";
import {
  MONTVELLE_ADVISORY_CATEGORY_LABELS,
  MONTVELLE_ADVISORY_NETWORK,
  type MontvelleAdvisoryCategory,
} from "@/data/montvelleAdvisoryNetworkAll";

export default function MontvelleAdvisoryNetworkPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MontvelleAdvisoryCategory | "all">("all");
  const [publishedEmailOnly, setPublishedEmailOnly] = useState(false);
  const [leadersOnly, setLeadersOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(MONTVELLE_ADVISORY_NETWORK.map((firm) => firm.category))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return MONTVELLE_ADVISORY_NETWORK.filter((firm) => {
      if (category !== "all" && firm.category !== category) return false;
      if (publishedEmailOnly && !firm.publicEmail) return false;
      if (leadersOnly && firm.tier !== "global_leader") return false;
      if (!normalized) return true;
      return [
        firm.name,
        firm.coverage,
        firm.bestFor,
        firm.websiteUrl,
        firm.contactUrl,
        firm.publicEmail ?? "",
        MONTVELLE_ADVISORY_CATEGORY_LABELS[firm.category],
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
    });
  }, [category, publishedEmailOnly, leadersOnly, query]);

  const publishedEmailCount = MONTVELLE_ADVISORY_NETWORK.filter((firm) => Boolean(firm.publicEmail)).length;
  const routedCount = MONTVELLE_ADVISORY_NETWORK.filter(
    (firm) => firm.routeStatus !== "official_site_only",
  ).length;

  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Network className="h-4 w-4 text-primary" /> Montvelle Professional Advisory Network
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1 max-w-3xl">
              Global institutional advisory database for high-trust client routing. Build the complete public-route asset first; outreach remains a separate later stage.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Global institutions only</Badge>
            <Badge variant="outline">Official/public routes only</Badge>
            <Badge>Database build only</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Organisations" value={MONTVELLE_ADVISORY_NETWORK.length} />
          <Stat icon={Globe2} label="Advisory verticals" value={categories.length} />
          <Stat icon={Send} label="Published email routes" value={publishedEmailCount} />
          <Stat icon={ShieldCheck} label="Specific public routes" value={routedCount} />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-medium">Montvelle database rule</div>
          <div className="text-muted-foreground mt-1">
            Capture the strongest global institutional firms first, together with their official website, public enquiry route and any genuinely published general business inbox. No Apollo, no guessed email patterns and no outreach during the database-build stage.
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 text-xs">
          <RuleCard
            title="Institutional threshold"
            text="Prioritise recognised international firms with meaningful cross-border capability; avoid small local providers unless a later client case requires a specialist exception."
          />
          <RuleCard
            title="Public-route integrity"
            text="Store supplier-published business inboxes and official web routes only. Never manufacture email patterns or use privacy/DPO addresses as business contacts."
            icon={Send}
          />
          <RuleCard
            title="Relationship guardrail"
            text="Database inclusion is sourcing intelligence only. It does not mean partner, approved adviser, preferred provider or guaranteed client access."
            icon={ShieldCheck}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <label className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search firm, capability, email or category…"
              className="w-full h-9 rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as MontvelleAdvisoryCategory | "all")}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All advisory categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {MONTVELLE_ADVISORY_CATEGORY_LABELS[item]}
              </option>
            ))}
          </select>
          <label className="h-9 rounded-md border border-input px-3 flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={publishedEmailOnly}
              onChange={(event) => setPublishedEmailOnly(event.target.checked)}
            />
            Published email only
          </label>
          <label className="h-9 rounded-md border border-input px-3 flex items-center gap-2 text-xs cursor-pointer select-none">
            <input
              type="checkbox"
              checked={leadersOnly}
              onChange={(event) => setLeadersOnly(event.target.checked)}
            />
            Global leaders only
          </label>
        </div>

        <div className="rounded-md border border-border/70 overflow-hidden">
          <div className="grid grid-cols-[minmax(190px,1.1fr)_minmax(165px,.85fr)_minmax(250px,1.45fr)_minmax(245px,1.25fr)] gap-3 px-3 py-2 bg-muted/50 text-[11px] font-medium text-muted-foreground">
            <div>Organisation</div>
            <div>Category</div>
            <div>Best for</div>
            <div>Public route</div>
          </div>
          <div className="divide-y divide-border/60 max-h-[760px] overflow-auto">
            {filtered.map((firm) => (
              <div
                key={firm.id}
                className="grid grid-cols-1 md:grid-cols-[minmax(190px,1.1fr)_minmax(165px,.85fr)_minmax(250px,1.45fr)_minmax(245px,1.25fr)] gap-2 md:gap-3 px-3 py-3 text-xs"
              >
                <div>
                  <div className="font-medium">{firm.name}</div>
                  <div className="flex gap-1.5 flex-wrap mt-1.5">
                    <Badge variant={firm.tier === "global_leader" ? "secondary" : "outline"}>
                      {firm.tier === "global_leader" ? "Global leader" : "Global specialist"}
                    </Badge>
                    <Badge variant="outline">database record</Badge>
                  </div>
                </div>
                <div>{MONTVELLE_ADVISORY_CATEGORY_LABELS[firm.category]}</div>
                <div className="text-muted-foreground">{firm.bestFor}</div>
                <div>
                  {firm.publicEmail ? (
                    <div className="font-medium break-all">{firm.publicEmail}</div>
                  ) : (
                    <div className="text-muted-foreground">Official public route stored</div>
                  )}
                  <div className="mt-1.5 flex gap-2 flex-wrap">
                    <a
                      href={firm.contactUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Official route
                    </a>
                    <a
                      href={firm.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      Website
                    </a>
                  </div>
                  <div className="mt-1.5 text-[11px] text-muted-foreground">
                    {firm.routeStatus.replace(/_/g, " ")}
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No advisory firm matches this filter.
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap text-[11px] text-muted-foreground">
          <span>Public routes are evidence fields. No outreach is triggered by this database panel.</span>
          <span>{publishedEmailCount} firms currently have a published business email stored.</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Building2;
  label: string;
  value: number;
}) {
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
      <div className="font-medium flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {title}
      </div>
      <div className="text-muted-foreground mt-1.5">{text}</div>
    </div>
  );
}
