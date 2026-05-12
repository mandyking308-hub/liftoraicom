import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Loader2, AlertTriangle, CheckCircle2, Sparkles, KeyRound } from "lucide-react";
import { toast } from "sonner";

type Overview = {
  total_leads: number;
  raw_leads: number;
  reviewed_leads: number;
  qualified_leads: number;
  rejected_leads: number;
  needs_verification: number;
  needs_founder_review: number;
  promoted_contacts: number;
  terminal_blocked: number;
  safe_to_queue: number;
  duplicate_or_risky: number;
};

const Tile = ({ label, value, tone = "default" }: { label: string; value: number | string; tone?: "default" | "good" | "warn" | "danger" }) => {
  const cls =
    tone === "good" ? "text-green-400" :
    tone === "warn" ? "text-yellow-400" :
    tone === "danger" ? "text-destructive" : "text-primary";
  return (
    <div className="rounded-md border border-border/50 bg-card/40 p-3">
      <p className={`text-2xl font-bold ${cls}`}>{value ?? 0}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
};

const ResultCard = ({ result }: { result: any }) => (
  <pre className="bg-muted/40 border border-border/50 rounded p-3 text-xs overflow-auto max-h-72">
    {JSON.stringify(result, null, 2)}
  </pre>
);

export default function LeadQualityPanel() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [batchSize, setBatchSize] = useState(25);
  const [perDomainCap, setPerDomainCap] = useState(2);
  const [aiBatchSize, setAiBatchSize] = useState(150);
  const [unlockBatchSize, setUnlockBatchSize] = useState(25);
  const [lastResult, setLastResult] = useState<any>(null);

  const { data: overview, isLoading } = useQuery({
    queryKey: ["lead-quality-overview"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("lead_quality_overview").select("*").maybeSingle();
      if (error) throw error;
      return data as Overview | null;
    },
  });

  const call = async (
    fn: "lead-quality-scan" | "lead-fit-classify" | "promote-leads-to-contacts" | "enqueue-eligible-contacts" | "apollo-unlock-shortlist",
    body: any,
    label: string,
  ) => {
    try {
      setBusy(label); setLastResult(null);
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      setLastResult(data);
      toast.success(`${label} complete`, { description: data?.dry_run ? "Dry-run preview" : "Applied" });
      qc.invalidateQueries({ queryKey: ["lead-quality-overview"] });
    } catch (e: any) {
      toast.error(`${label} failed`, { description: e?.message ?? String(e) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="bg-card border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck size={16} className="text-primary" /> Lead Quality + Queue Integrity Gate
          <Badge variant="outline" className="ml-2 text-xs">Dry-run by default</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <Tile label="Apollo total" value={overview?.total_leads ?? 0} />
            <Tile label="Raw" value={overview?.raw_leads ?? 0} />
            <Tile label="Reviewed" value={overview?.reviewed_leads ?? 0} />
            <Tile label="Qualified" value={overview?.qualified_leads ?? 0} tone="good" />
            <Tile label="Promoted contacts" value={overview?.promoted_contacts ?? 0} tone="good" />
            <Tile label="Needs verification" value={overview?.needs_verification ?? 0} tone="warn" />
            <Tile label="Needs founder review" value={overview?.needs_founder_review ?? 0} tone="warn" />
            <Tile label="Rejected" value={overview?.rejected_leads ?? 0} tone="danger" />
            <Tile label="Terminal blocked" value={overview?.terminal_blocked ?? 0} tone="danger" />
            <Tile label="Duplicate / risky" value={overview?.duplicate_or_risky ?? 0} tone="warn" />
            <Tile label="Safe to queue" value={overview?.safe_to_queue ?? 0} tone="good" />
          </div>
        )}

        <div className="space-y-3 pt-2 border-t border-border/40">
          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">1. Cheap quality scan (no AI)</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-quality-scan", { dry_run: true, limit: 5000 }, "Scan preview")}>
              {busy === "Scan preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview scan — all raw"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("lead-quality-scan", { dry_run: false, limit: 5000 }, "Scan apply")}>
              {busy === "Scan apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply scan — all raw"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">2. Campaign-fit classification (rules = whole batch · AI = selected, with cost confirmation)</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: true, method: "rules", limit: 5000 }, "Rules preview")}>
              {busy === "Rules preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview rules — all eligible"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: false, method: "rules", limit: 5000 }, "Rules apply")}>
              {busy === "Rules apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply rules — all eligible"}
            </Button>
            <span className="mx-2 text-muted-foreground">|</span>
            <Input type="number" className="w-24 h-8" value={aiBatchSize} min={1} max={500}
              onChange={(e) => setAiBatchSize(Math.min(500, Math.max(1, Number(e.target.value) || 25)))} />
            <span className="text-xs text-muted-foreground">selection size (chunked internally)</span>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("lead-fit-classify", { dry_run: true, method: "ai", limit: aiBatchSize, ai_chunk_size: 25 }, "AI preview")}>
              <Sparkles size={12} /> Preview AI ({aiBatchSize} selected)
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => {
                if (!confirm(`Run AI classification on ${aiBatchSize} leads?\nCost is per-lead via Lovable AI Gateway. Continue?`)) return;
                call("lead-fit-classify", { dry_run: false, method: "ai", limit: aiBatchSize, ai_chunk_size: 25, confirm_ai_cost: true }, "AI apply");
              }}>
              {busy === "AI apply" ? <Loader2 className="animate-spin" size={14} /> : `Apply AI (${aiBatchSize}, confirm cost)`}
            </Button>
            <span className="text-xs text-muted-foreground w-full">AI is internally chunked at 25 per request (one founder click). Absolute ceiling 500 / action.</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full flex items-center gap-1">
              <KeyRound size={12} /> 3. Apollo Unlock Shortlist (cheap rules ranking — NO Apollo calls)
            </p>
            <Input type="number" className="w-24 h-8" value={unlockBatchSize} min={1} max={200}
              onChange={(e) => setUnlockBatchSize(Math.min(200, Math.max(1, Number(e.target.value) || 25)))} />
            <span className="text-xs text-muted-foreground">suggested first unlock batch</span>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("apollo-unlock-shortlist", { batch_size: unlockBatchSize, min_score: 4 }, "Unlock shortlist")}>
              {busy === "Unlock shortlist" ? <Loader2 className="animate-spin" size={14} /> : "Build unlock shortlist"}
            </Button>
            <span className="text-xs text-muted-foreground w-full">Founder approval required before any Apollo unlock/enrichment spend.</span>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">4. Promote qualified leads to contacts</p>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("promote-leads-to-contacts", { dry_run: true, limit: 100 }, "Promote preview")}>
              {busy === "Promote preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview promote"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("promote-leads-to-contacts", { dry_run: false, limit: 100 }, "Promote apply")}>
              {busy === "Promote apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply promote"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground w-full">5. Enqueue eligible contacts (Step 1, balanced)</p>
            <Input type="number" className="w-24 h-8" value={batchSize} min={1} max={500}
              onChange={(e) => setBatchSize(Math.min(500, Math.max(1, Number(e.target.value) || 25)))} />
            <span className="text-xs text-muted-foreground">batch</span>
            <Input type="number" className="w-20 h-8" value={perDomainCap} min={1} max={50}
              onChange={(e) => setPerDomainCap(Math.min(50, Math.max(1, Number(e.target.value) || 2)))} />
            <span className="text-xs text-muted-foreground">per-domain cap</span>
            <Button size="sm" variant="outline" disabled={!!busy}
              onClick={() => call("enqueue-eligible-contacts", { dry_run: true, batch_size: batchSize, per_domain_cap: perDomainCap }, "Enqueue preview")}>
              {busy === "Enqueue preview" ? <Loader2 className="animate-spin" size={14} /> : "Preview enqueue"}
            </Button>
            <Button size="sm" disabled={!!busy}
              onClick={() => call("enqueue-eligible-contacts", { dry_run: false, batch_size: batchSize, per_domain_cap: perDomainCap }, "Enqueue apply")}>
              {busy === "Enqueue apply" ? <Loader2 className="animate-spin" size={14} /> : "Apply enqueue"}
            </Button>
          </div>
        </div>

        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-3 text-xs flex gap-2">
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5" />
          <div>
            All actions default to <strong>dry-run preview</strong>. No live emails are sent by this panel.
            Sending still requires the existing Controlled Live Batch step with founder confirmation.
          </div>
        </div>

        {lastResult && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CheckCircle2 size={12} /> Last result {lastResult?.dry_run ? "(dry-run)" : "(applied)"}
            </p>
            <ResultCard result={lastResult} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}