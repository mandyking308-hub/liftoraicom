import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, DownloadCloud, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const GEO_OPTIONS = ["UK", "US", "Canada", "Europe", "Australia"];

type PullResult = {
  ok: boolean;
  apollo_results_scanned: number;
  leads_pulled_into_staging: number;
  verified_emails_imported: number;
  duplicates_collapsed: number;
  already_in_crm: number;
  poor_fit_archived: number;
  active_candidates: number;
  safe_to_promote: number;
  safe_to_queue: number;
  decisions_waiting: number;
  source_quality_score: number | null;
  next_recommended_action: string | null;
  errors?: string[];
};

export default function ApolloPullPanel() {
  const [searchSize, setSearchSize] = useState(500);
  const [importLimit, setImportLimit] = useState(75);
  const [geo, setGeo] = useState<string[]>(["UK", "US", "Europe"]);
  const [running, setRunning] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PullResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleGeo = (g: string) =>
    setGeo((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("apollo-pull-verified", {
        body: { search_size: searchSize, import_limit: importLimit, geography: geo, confirm: true },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        setError((data as any).message ?? (data as any).error);
        toast.error("Apollo pull failed", { description: (data as any).message ?? (data as any).error });
      } else {
        setResult(data as PullResult);
        toast.success("Apollo pull complete", {
          description: `${(data as PullResult).verified_emails_imported} verified-email leads in staging.`,
        });
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
      toast.error("Apollo pull failed", { description: e?.message ?? String(e) });
    } finally {
      setRunning(false);
      setConfirming(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2 flex-wrap">
          <DownloadCloud size={16} /> Pull verified Apollo leads
          <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-300">
            verified-email only
          </Badge>
          <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-300">
            no unlock credits
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Pulls verified-email leads directly from Apollo using the NeonCandy Source Quality Brief
          into staging, then runs Lead Quality Autopilot. No unlock credits spent. No locked / no-email
          profiles imported. No promotions, no queue rows, no sends.
        </p>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Search size</label>
            <Input type="number" min={50} max={2000} value={searchSize}
              onChange={(e) => setSearchSize(Math.max(50, Math.min(2000, Number(e.target.value) || 500)))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Import limit</label>
            <Input type="number" min={10} max={500} value={importLimit}
              onChange={(e) => setImportLimit(Math.max(10, Math.min(500, Number(e.target.value) || 75)))} />
          </div>
          <div className="space-y-1">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Geography</label>
            <div className="flex flex-wrap gap-1">
              {GEO_OPTIONS.map((g) => (
                <button key={g} type="button" onClick={() => toggleGeo(g)}
                  className={`text-[11px] px-2 py-0.5 rounded border ${
                    geo.includes(g)
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border/60 text-muted-foreground"
                  }`}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border/60 bg-card/40 p-2 text-[11px] text-muted-foreground">
          Estimated Apollo API calls: ~{Math.ceil(importLimit / 25)} search pages (no unlock calls).
        </div>

        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-2 text-xs text-destructive flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <div>{error}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {!confirming ? (
            <Button size="sm" onClick={() => setConfirming(true)} disabled={running}>
              <DownloadCloud size={14} className="mr-1" /> Pull verified Apollo leads
            </Button>
          ) : (
            <>
              <span className="text-xs text-yellow-300 flex items-center gap-1">
                <ShieldCheck size={12} /> Confirm: pull up to {importLimit} verified-email leads — no unlock credits
              </span>
              <Button size="sm" onClick={run} disabled={running}>
                {running ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Confirm pull
              </Button>
              <Button size="sm" variant="outline" onClick={() => setConfirming(false)} disabled={running}>
                Cancel
              </Button>
            </>
          )}
        </div>

        {result && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Apollo pull result</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Tile label="Apollo results scanned" value={result.apollo_results_scanned} />
              <Tile label="Leads pulled into staging" value={result.leads_pulled_into_staging} />
              <Tile label="Verified emails imported" value={result.verified_emails_imported} tone="good" />
              <Tile label="Duplicates collapsed" value={result.duplicates_collapsed} />
              <Tile label="Already in CRM" value={result.already_in_crm} />
              <Tile label="Poor fit archived" value={result.poor_fit_archived} />
              <Tile label="Active candidates" value={result.active_candidates} tone="good" />
              <Tile label="Safe to promote" value={result.safe_to_promote} tone="good" />
              <Tile label="Safe to queue" value={result.safe_to_queue} tone="good" />
              <Tile label="Decisions waiting" value={result.decisions_waiting} tone="warn" />
              <Tile label="Source quality score" value={result.source_quality_score ?? "—"} />
            </div>
            {result.next_recommended_action && (
              <div className="rounded-md border border-primary/40 bg-primary/10 p-2 text-xs">
                <span className="text-muted-foreground">Next recommended action: </span>
                <span className="text-foreground">{result.next_recommended_action}</span>
              </div>
            )}
            {result.errors && result.errors.length > 0 && (
              <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-[11px] text-yellow-200">
                {result.errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Tile({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" }) {
  const cls = tone === "good" ? "text-green-300" : tone === "warn" ? "text-yellow-300" : "text-foreground";
  return (
    <div className="rounded border border-border/50 bg-card/40 p-2">
      <div className={`text-base font-semibold ${cls}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
