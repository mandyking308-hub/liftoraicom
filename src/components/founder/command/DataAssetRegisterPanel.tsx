import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Database, ExternalLink, FolderGit2, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DATA_ASSETS, type DataAsset, type DataAssetStatus } from "@/lib/dataAssetRegistry";

const sb: any = supabase as any;

type LocalMetrics = {
  billionaires: number | null;
  billionaireVerifiedRoutes: number | null;
  billionaireOutreachReady: number | null;
  nextGenNetworks: number | null;
  nextGenContacts: number | null;
  nextGenPublicEmails: number | null;
  educationContacts: number | null;
  educationOrganisations: number | null;
  educationVerifiedEmails: number | null;
  educationRevealRequired: number | null;
  educationNoEmail: number | null;
};

const EDU_TAG = "education_customer_universe";

async function educationOrganisationCount(): Promise<number | null> {
  try {
    const names = new Set<string>();
    const pageSize = 1000;
    for (let from = 0; from < 20000; from += pageSize) {
      const { data, error } = await sb
        .from("relationship_intelligence_contacts")
        .select("organisation_name")
        .contains("tags", [EDU_TAG])
        .not("organisation_name", "is", null)
        .range(from, from + pageSize - 1);
      if (error) return null;
      for (const row of data ?? []) {
        const name = (row.organisation_name ?? "").trim();
        if (name) names.add(name);
      }
      if (!data || data.length < pageSize) break;
    }
    return names.size;
  } catch {
    return null;
  }
}

async function safeCount(table: string, build: (q: any) => any = (q) => q): Promise<number | null> {
  try {
    const q = build(sb.from(table).select("id", { count: "exact", head: true }));
    const { count, error } = await q;
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

async function loadLocalMetrics(): Promise<LocalMetrics> {
  const [
    billionaires,
    billionaireVerifiedRoutes,
    billionaireOutreachReady,
    nextGenNetworks,
    nextGenContacts,
    nextGenPublicEmails,
  ] = await Promise.all([
    safeCount("billionaire_coverage"),
    safeCount("billionaire_coverage", (q) => q.or("verified_institutional_routes.gt.0,verified_intermediary_routes.gt.0")),
    safeCount("billionaire_coverage", (q) => q.in("outreach_readiness", ["ready", "ready_low_confidence"])),
    safeCount("philanthropy_network_registry", (q) => q.eq("status", "active")),
    safeCount("philanthropy_network_contacts"),
    safeCount("philanthropy_network_contacts", (q) => q.not("public_email", "is", null)),
  ]);

  const [
    educationContacts,
    educationOrganisations,
    educationVerifiedEmails,
    educationRevealRequired,
    educationNoEmail,
  ] = await Promise.all([
    safeCount("relationship_intelligence_contacts", (q) => q.contains("tags", [EDU_TAG])),
    educationOrganisationCount(),
    safeCount("relationship_intelligence_contacts", (q) =>
      q.contains("tags", [EDU_TAG]).is("email_status", null).not("email", "is", null),
    ),
    safeCount("relationship_intelligence_contacts", (q) => q.contains("tags", [EDU_TAG]).eq("email_status", "reveal_required")),
    safeCount("relationship_intelligence_contacts", (q) => q.contains("tags", [EDU_TAG]).eq("email_status", "no_email_on_file")),
  ]);

  return {
    billionaires,
    billionaireVerifiedRoutes,
    billionaireOutreachReady,
    nextGenNetworks,
    nextGenContacts,
    nextGenPublicEmails,
    educationContacts,
    educationOrganisations,
    educationVerifiedEmails,
    educationRevealRequired,
    educationNoEmail,
  };
}

const STATUS: Record<DataAssetStatus, { label: string; className: string }> = {
  live: {
    label: "Live in Liftor",
    className: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
  repo_ready: {
    label: "Preserved in GitHub",
    className: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  },
  external_live: {
    label: "Live in portfolio app",
    className: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  },
};

function metricText(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString();
}

function liveStats(asset: DataAsset, metrics?: LocalMetrics) {
  if (!metrics) return [] as Array<{ label: string; value: string }>;
  if (asset.id === "billionaire-intelligence") {
    return [
      { label: "Live records", value: metricText(metrics.billionaires) },
      { label: "Verified routes", value: metricText(metrics.billionaireVerifiedRoutes) },
      { label: "Outreach-ready", value: metricText(metrics.billionaireOutreachReady) },
    ];
  }
  if (asset.id === "next-gen-wealth-networks") {
    return [
      { label: "Active networks", value: metricText(metrics.nextGenNetworks) },
      { label: "Contact routes", value: metricText(metrics.nextGenContacts) },
      { label: "Public emails", value: metricText(metrics.nextGenPublicEmails) },
    ];
  }
  if (asset.id === "global-education-sales") {
    return [
      { label: "Organisations represented", value: metricText(metrics.educationOrganisations) },
      { label: "Contacts in Liftor", value: metricText(metrics.educationContacts) },
      { label: "Verified work emails", value: metricText(metrics.educationVerifiedEmails) },
      { label: "Email reveal required", value: metricText(metrics.educationRevealRequired) },
      { label: "No email on file", value: metricText(metrics.educationNoEmail) },
      { label: "Original target 2,500", value: (metrics.educationContacts ?? 0) > 2500 ? "Exceeded" : "In progress" },
    ];
  }
  return [] as Array<{ label: string; value: string }>;
}

export default function DataAssetRegisterPanel() {
  const metrics = useQuery({
    queryKey: ["founder-data-asset-register"],
    queryFn: loadLocalMetrics,
    staleTime: 60_000,
  });

  const liveLocal = DATA_ASSETS.filter((a) => a.status === "live").length;
  const repoReady = DATA_ASSETS.filter((a) => a.status === "repo_ready").length;
  const externalLive = DATA_ASSETS.filter((a) => a.status === "external_live").length;

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[260px]">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-primary" />
            <h3 className="text-sm font-semibold">Data Asset Register</h3>
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
              {DATA_ASSETS.length} strategic datasets
            </Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1 max-w-3xl">
            Master map of what data the portfolio has built, where the source of truth sits, what each record means, which reusable buyer pools it feeds and what it is used for. Historical, stale, unmatched and currently unusable research is retained and statused rather than silently discarded.
          </p>
        </div>
        <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-emerald-400" /> Last register review: 23 Aug 2026
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <div className="rounded border border-border/60 p-2">
          <p className="text-[9px] uppercase text-muted-foreground">Registered assets</p>
          <p className="text-lg font-semibold tabular-nums">{DATA_ASSETS.length}</p>
        </div>
        <div className="rounded border border-border/60 p-2">
          <p className="text-[9px] uppercase text-muted-foreground">Liftor live</p>
          <p className="text-lg font-semibold tabular-nums">{liveLocal}</p>
        </div>
        <div className="rounded border border-border/60 p-2">
          <p className="text-[9px] uppercase text-muted-foreground">GitHub preserved</p>
          <p className="text-lg font-semibold tabular-nums">{repoReady}</p>
        </div>
        <div className="rounded border border-border/60 p-2">
          <p className="text-[9px] uppercase text-muted-foreground">Other portfolio app</p>
          <p className="text-lg font-semibold tabular-nums">{externalLive}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {DATA_ASSETS.map((asset) => {
          const status = STATUS[asset.status];
          const live = liveStats(asset, metrics.data);
          return (
            <div key={asset.id} className="rounded-lg border border-border/60 bg-background/50 p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-semibold">{asset.name}</h4>
                    <Badge variant="outline" className={`text-[9px] ${status.className}`}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{asset.description}</p>
                </div>
                <a
                  href={asset.repositoryUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  title="Open repository location"
                >
                  <FolderGit2 size={14} />
                </a>
              </div>

              {(live.length > 0 || (asset.knownStats?.length ?? 0) > 0) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {live.map((s) => (
                    <div key={s.label} className="rounded border border-border/50 px-2 py-1.5">
                      <p className="text-[8px] uppercase text-muted-foreground">{s.label}</p>
                      <p className="text-xs font-semibold tabular-nums">{metrics.isLoading ? "…" : s.value}</p>
                    </div>
                  ))}
                  {(asset.knownStats ?? []).slice(0, live.length ? 0 : 6).map((s) => (
                    <div key={s.label} className="rounded border border-border/50 px-2 py-1.5" title={s.note}>
                      <p className="text-[8px] uppercase text-muted-foreground">{s.label}</p>
                      <p className="text-xs font-semibold tabular-nums">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-1 text-[10px]">
                <p><span className="text-muted-foreground">Source of truth:</span> <span className="font-medium">{asset.sourceOfTruth}</span></p>
                <p><span className="text-muted-foreground">System:</span> {asset.system}</p>
                <p><span className="text-muted-foreground">Repository:</span> {asset.repository}</p>
                <p><span className="text-muted-foreground">Record means:</span> {asset.recordDefinition}</p>
                <p><span className="text-muted-foreground">Used for:</span> {asset.primaryUse}</p>
              </div>

              {(asset.buyerPools?.length ?? 0) > 0 && (
                <div className="rounded border border-primary/20 bg-primary/5 p-2">
                  <p className="text-[8px] uppercase text-muted-foreground mb-1">Reusable portfolio buyer pools</p>
                  <div className="flex flex-wrap gap-1">
                    {asset.buyerPools?.map((pool) => (
                      <Badge key={pool} variant="outline" className="text-[9px] border-primary/30 text-primary">
                        {pool.replaceAll("-", " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {(asset.historicalStats?.length ?? 0) > 0 && (
                <details className="rounded border border-border/50 px-2 py-1.5">
                  <summary className="cursor-pointer text-[10px] font-medium">Provenance / historical checkpoint (not current holdings)</summary>
                  <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {asset.historicalStats?.map((s) => (
                      <div key={s.label} className="rounded border border-border/50 px-2 py-1.5" title={s.note}>
                        <p className="text-[8px] uppercase text-muted-foreground">{s.label}</p>
                        <p className="text-xs font-semibold tabular-nums">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-1.5">
                    Historical GitHub checkpoint figures are preserved for provenance only and never overwrite live production counts.
                  </p>
                </details>
              )}

              <details className="rounded border border-border/50 px-2 py-1.5">
                <summary className="cursor-pointer text-[10px] font-medium">Physical locations ({asset.locations.length})</summary>
                <div className="mt-1.5 space-y-1">
                  {asset.locations.map((location) => (
                    <div key={location} className="text-[9px] text-muted-foreground font-mono break-all">
                      {location}
                    </div>
                  ))}
                </div>
              </details>

              <p className="text-[9px] text-muted-foreground border-l-2 border-amber-500/40 pl-2">
                Retention rule: {asset.retentionRule}
              </p>

              <div className="flex items-center gap-3 text-[10px]">
                {asset.drillThrough && (
                  <Link to={asset.drillThrough} className="text-primary hover:underline inline-flex items-center gap-1">
                    Open in Liftor <ExternalLink size={10} />
                  </Link>
                )}
                <a href={asset.repositoryUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  Repository source <ExternalLink size={10} />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[10px] text-muted-foreground">
        <strong className="text-foreground">New-data rule:</strong> every material dataset must be added to this register with a source of truth, physical storage path, record definition, reusable buyer-pool mapping, purpose, counts/completeness where available, last review date and retention rule. Data can be held, archived or marked stale; useful research should not disappear because it is not actionable today.
      </div>
    </div>
  );
}
