import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { ArrowRight, Clock, Database, Layers3, Search, UsersRound } from "lucide-react";
import {
  PORTFOLIO_BUSINESS_COUNT,
  PORTFOLIO_COMMERCIAL_MAP,
  PORTFOLIO_SOURCE_PROJECT_COUNT,
  REUSE_POOLS,
  getReusePoolLabel,
} from "@/data/portfolioCommercialMap";

const priorityClass: Record<string, string> = {
  high: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  medium: "bg-blue-500/10 text-blue-300 border-blue-500/30",
  low: "bg-secondary text-muted-foreground border-border",
  none: "bg-secondary text-muted-foreground border-border",
  review: "bg-amber-500/10 text-amber-300 border-amber-500/30",
};

const FounderProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"portfolio" | "client">("portfolio");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState("all");
  const [pool, setPool] = useState("all");

  useEffect(() => {
    const load = async () => {
      const [projRes, profRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, company_name"),
      ]);
      if (projRes.data) setProjects(projRes.data);
      if (profRes.data) {
        const map: Record<string, string> = {};
        profRes.data.forEach((p) => { map[p.id] = p.company_name || p.full_name || "Unknown"; });
        setProfiles(map);
      }
      setLoading(false);
    };
    load();
  }, []);

  const sectors = useMemo(
    () => Array.from(new Set(PORTFOLIO_COMMERCIAL_MAP.map((b) => b.sector))).sort(),
    [],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return PORTFOLIO_COMMERCIAL_MAP.filter((b) => {
      const text = [
        b.business,
        b.offer,
        b.sector,
        b.buyerType,
        b.decisionMakers.join(" "),
        b.overlapWith.join(" "),
        b.sourceProjects.join(" "),
      ].join(" ").toLowerCase();
      return (!q || text.includes(q)) && (sector === "all" || b.sector === sector) && (pool === "all" || b.reusePools.includes(pool));
    });
  }, [search, sector, pool]);

  const highPriorityCount = PORTFOLIO_COMMERCIAL_MAP.filter((b) => b.apolloPriority === "high").length;
  const reviewCount = PORTFOLIO_COMMERCIAL_MAP.filter((b) => b.status === "review").length;

  return (
    <FounderLayout>
      <div className="max-w-[1500px]">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Projects & Portfolio Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Client delivery projects plus the commercial map of the Lovable portfolio: what each business sells, who buys it and where contact data can be reused.
          </p>
        </div>

        <div className="flex gap-2 mb-6 border-b border-border/60">
          <button
            type="button"
            onClick={() => setView("portfolio")}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${view === "portfolio" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Portfolio commercial map
          </button>
          <button
            type="button"
            onClick={() => setView("client")}
            className={`px-4 py-2 text-sm border-b-2 transition-colors ${view === "client" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            Client projects
          </button>
        </div>

        {view === "portfolio" ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Lovable projects</p>
                <p className="text-2xl font-bold mt-1">{PORTFOLIO_SOURCE_PROJECT_COUNT}</p>
                <p className="text-xs text-muted-foreground mt-1">Raw source projects/remixes</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Business families</p>
                <p className="text-2xl font-bold mt-1">{PORTFOLIO_BUSINESS_COUNT}</p>
                <p className="text-xs text-muted-foreground mt-1">After duplicate/remix grouping</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Reusable buyer pools</p>
                <p className="text-2xl font-bold mt-1">{REUSE_POOLS.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Shared account/contact universes</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">High Apollo priority</p>
                <p className="text-2xl font-bold mt-1">{highPriorityCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Businesses suited to targeted B2B enrichment</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-card p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Needs review</p>
                <p className="text-2xl font-bold mt-1">{reviewCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Do not spend data credits yet</p>
              </div>
            </div>

            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <Database size={18} className="text-primary mt-0.5" />
                <div>
                  <h2 className="font-semibold">Reuse data before buying more data</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    The unit of planning is the buyer pool, not the website. One verified enterprise account can be relevant to several portfolio companies; role-level contacts are then selected for the specific offer. Existing wealth, education, philanthropy and relationship-intelligence assets should be matched here before any new Apollo allocation.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers3 size={16} className="text-primary" />
                <h2 className="font-semibold">Reusable buyer/data pools</h2>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
                {REUSE_POOLS.map((p) => {
                  const n = PORTFOLIO_COMMERCIAL_MAP.filter((b) => b.reusePools.includes(p.id)).length;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPool(pool === p.id ? "all" : p.id)}
                      className={`text-left rounded-lg border p-3 transition-colors ${pool === p.id ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/30"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{p.label}</span>
                        <span className="text-xs rounded-full bg-secondary px-2 py-0.5">{n}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-2">
              <label className="relative flex-1">
                <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search business, buyer, role, sector or overlap…"
                  className="w-full h-10 rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
                />
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="all">All sectors</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={pool}
                onChange={(e) => setPool(e.target.value)}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="all">All reusable pools</option>
                {REUSE_POOLS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {PORTFOLIO_BUSINESS_COUNT} business families · Lovable workspace snapshot: 23 Aug 2026.
            </p>

            <div className="space-y-3">
              {filtered.map((b) => (
                <article key={b.id} className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                  <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                    <div className="xl:w-[28%] min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-base">{b.business}</h3>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border ${priorityClass[b.apolloPriority]}`}>
                          Apollo: {b.apolloPriority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">{b.offer}</p>
                      <p className="text-xs mt-3"><span className="text-muted-foreground">Sector:</span> {b.sector}</p>
                      <p className="text-[11px] text-muted-foreground mt-2">Lovable source: {b.sourceProjects.join(" · ")}</p>
                    </div>

                    <div className="xl:w-[24%] min-w-0">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground mb-2">
                        <UsersRound size={13} /> Buyer
                      </div>
                      <p className="text-sm">{b.buyerType}</p>
                      {b.decisionMakers.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {b.decisionMakers.map((role) => (
                            <span key={role} className="text-[11px] px-2 py-1 rounded bg-secondary/70">{role}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="xl:w-[24%] min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Reusable data</p>
                      <div className="flex flex-wrap gap-1.5">
                        {b.reusePools.length ? b.reusePools.map((id) => (
                          <button
                            type="button"
                            key={id}
                            onClick={() => setPool(id)}
                            className="text-[11px] px-2 py-1 rounded border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10"
                          >
                            {getReusePoolLabel(id)}
                          </button>
                        )) : <span className="text-xs text-muted-foreground">No commercial pool assigned</span>}
                      </div>
                    </div>

                    <div className="xl:flex-1 min-w-0">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Portfolio overlap</p>
                      <p className="text-sm">{b.overlapWith.length ? b.overlapWith.join(" · ") : "None assigned"}</p>
                      {b.outreachConstraint && (
                        <p className="text-xs text-amber-300 mt-2">Control: {b.outreachConstraint}</p>
                      )}
                      {b.note && <p className="text-xs text-muted-foreground mt-2">Review note: {b.note}</p>}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : loading ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : projects.length === 0 ? (
          <div className="p-12 rounded-xl border border-border/50 bg-card text-center text-muted-foreground">No client projects yet.</div>
        ) : (
          <div className="space-y-3 max-w-5xl">
            {projects.map((p) => (
              <Link
                key={p.id}
                to={`/founder/projects/${p.id}`}
                className="flex items-center justify-between p-5 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "active" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{profiles[p.client_id] || "Unknown Client"} · {p.project_type}</p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock size={12} /> {p.current_stage}
                    {p.expected_timeline && <span className="ml-2">· {p.expected_timeline}</span>}
                  </div>
                </div>
                <ArrowRight size={16} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </FounderLayout>
  );
};

export default FounderProjects;
