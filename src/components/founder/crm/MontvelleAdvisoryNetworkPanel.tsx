import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Globe2, Network, Search, Send, ShieldCheck } from "lucide-react";
import {
  MONTVELLE_ADVISORY_CATEGORY_LABELS,
  MONTVELLE_ADVISORY_NETWORK,
  type MontvelleAdvisoryCategory,
} from "@/data/montvelleAdvisoryNetwork";

export default function MontvelleAdvisoryNetworkPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MontvelleAdvisoryCategory | "all">("all");
  const [emailReadyOnly, setEmailReadyOnly] = useState(false);
  const [leadersOnly, setLeadersOnly] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(MONTVELLE_ADVISORY_NETWORK.map((firm) => firm.category))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return MONTVELLE_ADVISORY_NETWORK.filter((firm) => {
      if (category !== "all" && firm.category !== category) return false;
      if (emailReadyOnly && !firm.publicEmail) return false;
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
  }, [category, emailReadyOnly, leadersOnly, query]);

  const emailReadyCount = MONTVELLE_ADVISORY_NETWORK.filter((firm) => Boolean(firm.publicEmail)).length;
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
              Global institutional firms for high-trust private-client routing. Public business routes are stored separately from relationship status so inclusion never implies partnership.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Badge variant="outline">Global institutions only</Badge>
            <Badge variant="outline">Official/public routes only</Badge>
            <Badge>Private-client advisory</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Building2} label="Organisations" value={MONTVELLE_ADVISORY_NETWORK.length} />
          <Stat icon={Globe2} label="Advisory verticals" value={categories.length} />
          <Stat icon={Send} label="Published email routes" value={emailReadyCount} />
          <Stat icon={ShieldCheck} label="Specific public routes" value={routedCount} />
        </div>

        <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-xs">
          <div className="font-medium">Montvelle advisory routing rule</div>
          <div className="text-muted-foreground mt-1">
            Start with the client outcome, then route to the strongest relevant institutional firm. A published inbox or enquiry form is a contact route only; no firm is described as a Montvelle partner, adviser or preferred provider until a real relationship has been established and recorded.
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-3 text-xs">
          <RuleCard
            title="Institutional threshold"
            text="Prioritise recognised international firms with meaningful cross-border capability; avoid small local providers unless a later client case requires a specialist exception."
          />
          <RuleCard
            title="Email integrity"
            text="Only supplier-published business inboxes are stored as email-ready. Never manufacture email patterns or use privacy/DPO addresses for outreach."
            icon={Send}
          />
          <RuleCard
            title="Relationship guardrail"
            text="Prospect, contacted, active and preferred are separate states. Database inclusion is sourcing intelligence, not endorsement or guaranteed access."
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
              checked={emailReadyOnly}
              onChange={(event) => setEmailReadyOnly(event.target.checked)}
            />
            Email-ready only
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
            <div>Public route / status</div>
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
                    <Badge variant="outline">{firm.relationshipStatus}</Badge>
                  </div>
                </div>
                <div>{MONTVELLE_ADVISORY_CATEGORY_LABELS[firm.category]}</div>
                <div className="text-muted-foreground">{firm.bestFor}</div>
                <div>
                  {firm.publicEmail ? (
                    <div className="font-medium break-all">{firm.publicEmail}</div>
                  ) : (
                    <div className="text-muted-foreground">No published business inbox stored</div>
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
                    {firm.routeStatus.replaceAll("_", " ")} · {firm.outreachStatus.replaceAll("_", " ")}
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
          <span>Public contact routes are evidence fields; relationship status must be earned and updated separately.</span>
          <span>{emailReadyCount} firms currently have a published business email stored for controlled outreach.</span>
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
