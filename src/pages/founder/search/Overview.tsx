import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { fetchSearchSummary, listSavedSearches, deleteSavedSearch, seedSearchIndexTestRows } from "@/lib/globalSearchIndex";
import { SearchLayout } from "./_shared";

export default function SearchOverview() {
  const s = useQuery({ queryKey: ["gsi-summary"], queryFn: fetchSearchSummary });
  const saved = useQuery({ queryKey: ["gsi-saved"], queryFn: listSavedSearches });
  const [busy, setBusy] = useState(false);
  const sum = s.data;
  return (
    <SearchLayout title="Global Search + Knowledge Index" subtitle="Search across customers, sellers, products, invoices, contracts, documents, incidents, decisions, communications, transcripts, audit, agents and workflows. Safe-summary index only — no raw secrets, no full sensitive bodies.">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Stat label="Indexed (active)" value={sum?.total_active ?? "—"} />
        <Stat label="Stale (>14d)" value={sum?.stale_count ?? 0} tone={(sum?.stale_count ?? 0) > 0 ? "warn" : "ok"} />
        <Stat label="Failed jobs 24h" value={sum?.failed_jobs_24h ?? 0} tone={(sum?.failed_jobs_24h ?? 0) > 0 ? "bad" : "ok"} />
        <Stat label="Sensitive (role-gated)" value={sum?.sensitive_blocked ?? 0} />
        <Stat label="Test rows" value={sum?.test_rows ?? 0} />
      </div>

      <Card className="tech-card p-4">
        <p className="text-xs text-muted-foreground">Recommended review</p>
        <p className="text-sm">{sum?.recommended_review ?? "Loading…"}</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card className="tech-card p-4 space-y-2">
          <p className="text-sm font-semibold">By record type</p>
          <div className="flex flex-wrap gap-2">
            {(sum?.by_type ?? []).map(t => <Badge key={t.record_type} variant="outline" className="text-[11px]">{t.record_type} · {t.count}</Badge>)}
            {!sum?.by_type.length && <span className="text-xs text-muted-foreground">No data.</span>}
          </div>
        </Card>
        <Card className="tech-card p-4 space-y-2">
          <p className="text-sm font-semibold">By source module</p>
          <div className="flex flex-wrap gap-2">
            {(sum?.by_module ?? []).map(m => <Badge key={m.source_module} variant="outline" className="text-[11px]">{m.source_module} · {m.count}</Badge>)}
            {!sum?.by_module.length && <span className="text-xs text-muted-foreground">No data.</span>}
          </div>
        </Card>
      </div>

      <Card className="tech-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">LIVE_INTERNAL_TEST</h3>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">test data only</Badge>
        </div>
        <p className="text-xs text-muted-foreground">Seed 9 sample index entries (business, customer, seller, invoice, contract, document, incident, decision, transcript summary). All rows are flagged <code>is_test_data=true</code>, summaries only — no secrets or full bodies.</p>
        <Button variant="outline" size="sm" disabled={busy}
          onClick={async () => {
            setBusy(true);
            const r = await seedSearchIndexTestRows();
            setBusy(false);
            if (r.ok) toast.success(`Seeded ${r.ids.length} index rows`);
            else toast.error(`Some failed: ${r.errors.join("; ")}`);
            s.refetch();
          }}>Seed LIVE_INTERNAL_TEST rows</Button>
      </Card>

      <Card className="tech-card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Saved searches</h3>
          <Link to="/founder/search/all" className="text-xs text-primary hover:underline">Search all →</Link>
        </div>
        <div className="space-y-1">
          {(saved.data ?? []).map((s: any) => (
            <div key={s.id} className="border border-border/40 rounded p-2 flex items-center gap-2 text-xs">
              <span className="font-medium">{s.search_name}</span>
              <code className="text-[10px] text-muted-foreground">{s.query_text || "(no query)"}</code>
              <span className="text-[10px] text-muted-foreground ml-auto">{s.updated_at.slice(0,19).replace("T"," ")}</span>
              <Button variant="ghost" size="sm" onClick={async () => { await deleteSavedSearch(s.id); saved.refetch(); }}>Delete</Button>
            </div>
          ))}
          {!saved.data?.length && <p className="text-xs text-muted-foreground">No saved searches yet.</p>}
        </div>
      </Card>
    </SearchLayout>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: "ok"|"warn"|"bad" }) {
  const cls = tone === "bad" ? "border-red-500/40" : tone === "warn" ? "border-yellow-500/40" : tone === "ok" ? "border-emerald-500/40" : "border-border/50";
  return (
    <div className={`border ${cls} rounded p-3`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}