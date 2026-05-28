import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FundingRadarLayout, FRSection, FRStat } from "./_shared";
import { fetchMonthlyRuns, fetchCompanies, fetchClusters, fetchShortlist, fetchScoresForCompany } from "@/lib/fundingRadarEngine";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, Circle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const now = () => ({ month: new Date().getMonth() + 1, year: new Date().getFullYear() });

type StepState = "complete" | "current" | "todo";
type Step = { key: string; label: string; state: StepState; missing?: string; nextAction: string; href: string };

const SEED_ROUNDS = ["pre-seed", "preseed", "pre_seed", "seed"];

export default function FRMonthlyRun() {
  const [rows, setRows] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  const [shortlist, setShortlist] = useState<any[]>([]);
  const [scoredIds, setScoredIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<any>({ ...now(), notes: "", candidates_reviewed: 0, shortlist_size: 0 });
  const reload = async () => {
    try { setRows(await fetchMonthlyRuns()); } catch { setRows([]); }
    try { setCompanies(await fetchCompanies()); } catch { setCompanies([]); }
    try { setClusters(await fetchClusters()); } catch { setClusters([]); }
    try { setShortlist(await fetchShortlist()); } catch { setShortlist([]); }
    try {
      const { data } = await (supabase as any).from("funding_radar_scores").select("funding_company_id");
      setScoredIds(new Set((data ?? []).map((r: any) => r.funding_company_id)));
    } catch { setScoredIds(new Set()); }
  };
  useEffect(() => { reload(); }, []);

  const startRun = async () => {
    const { error } = await (supabase as any).from("funding_monthly_runs").insert({
      month: draft.month, year: draft.year, status: "draft",
      candidates_reviewed: Number(draft.candidates_reviewed) || 0,
      shortlist_size: Number(draft.shortlist_size) || 0,
      notes: draft.notes || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Run started");
    reload();
  };

  const finalise = async (id: string) => {
    const { error } = await (supabase as any).from("funding_monthly_runs").update({ status: "finalised", finalised_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    reload();
  };

  const latest = rows[0];

  // Build the live workflow state from the latest run + data.
  const isOpenRun = latest && latest.status !== "finalised";
  const beyondSeed = companies.filter((c) => {
    const r = String(c.last_funding_round ?? "").toLowerCase().replace(/\s+/g, "");
    return r && !SEED_ROUNDS.includes(r);
  });
  const scoredBeyondSeed = beyondSeed.filter((c) => scoredIds.has(c.id));
  const clusteredBeyondSeed = beyondSeed.filter((c) => !!c.cluster_id);
  const activeShortlist = shortlist.filter((s) => s.status === "shortlisted" || s.status === "promoted");
  const promoted = shortlist.filter((s) => s.status === "promoted");

  const steps: Step[] = [
    {
      key: "start",
      label: "Start monthly run",
      state: isOpenRun ? "complete" : "current",
      nextAction: isOpenRun ? "Run is open" : "Click Start / log run below",
      href: "#start",
    },
    {
      key: "import",
      label: "Import / add funded companies",
      state: !isOpenRun ? "todo" : companies.length > 0 ? "complete" : "current",
      missing: companies.length === 0 ? "No companies tracked yet" : undefined,
      nextAction: "Use Companies → Add or CSV import",
      href: "/founder/funding-radar/companies",
    },
    {
      key: "beyond_seed",
      label: "Review beyond-seed eligibility",
      state: !isOpenRun || companies.length === 0 ? "todo" : beyondSeed.length > 0 ? "complete" : "current",
      missing: beyondSeed.length === 0 ? "No companies past seed yet" : undefined,
      nextAction: "Mark each company's funding round; seed/pre-seed are excluded",
      href: "/founder/funding-radar/companies",
    },
    {
      key: "score",
      label: "Score capital efficiency",
      state:
        !isOpenRun || beyondSeed.length === 0
          ? "todo"
          : scoredBeyondSeed.length === beyondSeed.length
          ? "complete"
          : "current",
      missing:
        beyondSeed.length > scoredBeyondSeed.length
          ? `${beyondSeed.length - scoredBeyondSeed.length} unscored`
          : undefined,
      nextAction: "Open each company and answer the 8 capital-efficiency questions",
      href: "/founder/funding-radar/capital-efficiency",
    },
    {
      key: "cluster",
      label: "Group into problem clusters",
      state:
        !isOpenRun || scoredBeyondSeed.length === 0
          ? "todo"
          : clusteredBeyondSeed.length > 0
          ? "complete"
          : "current",
      missing: clusters.length === 0 ? "No clusters defined" : undefined,
      nextAction: "Create / assign problem clusters with a distinct execution route",
      href: "/founder/funding-radar/clusters",
    },
    {
      key: "shortlist",
      label: "Shortlist 5–10 opportunities",
      state:
        !isOpenRun || clusteredBeyondSeed.length === 0
          ? "todo"
          : activeShortlist.length >= 5
          ? "complete"
          : activeShortlist.length > 0
          ? "current"
          : "current",
      missing:
        activeShortlist.length < 5
          ? `Only ${activeShortlist.length} shortlisted (target 5–10)`
          : activeShortlist.length > 10
          ? `${activeShortlist.length} shortlisted — trim to 10`
          : undefined,
      nextAction: "Add 5–10 opportunities to Shortlist with build thesis",
      href: "/founder/funding-radar/shortlist",
    },
    {
      key: "promote",
      label: "Promote 0–3 to Quarterly Build Selector",
      state:
        !isOpenRun || activeShortlist.length === 0
          ? "todo"
          : promoted.length > 3
          ? "current"
          : promoted.length > 0
          ? "complete"
          : "current",
      missing: promoted.length > 3 ? `${promoted.length} promoted — cap at 3` : undefined,
      nextAction: "Promote 0–3 from Shortlist; final selection happens in Quarterly Build Selector",
      href: "/founder/funding-radar/shortlist",
    },
    {
      key: "finalise",
      label: "Mark monthly run complete",
      state: !isOpenRun ? "complete" : "todo",
      nextAction: "Click Finalise on the latest run row when steps above are done",
      href: "#history",
    },
  ];

  const currentStep = steps.find((s) => s.state === "current");

  return (
    <FundingRadarLayout title="Monthly run" subtitle="A monthly cadence for reviewing the funding radar and producing a shortlist.">
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <FRStat label="Latest month" value={`${latest.month}/${latest.year}`} />
          <FRStat label="Status" value={latest.status} />
          <FRStat label="Reviewed" value={latest.candidates_reviewed} />
          <FRStat label="Shortlist" value={latest.shortlist_size} />
        </div>
      )}

      <FRSection
        title="Workflow"
        description="Each step shows whether it is complete, in progress, or waiting. Click through to take action."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link to="/founder/funding-radar/decision-pack">Generate decision pack →</Link>
          </Button>
        }
      >
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const Icon = s.state === "complete" ? Check : s.state === "current" ? AlertTriangle : Circle;
            const tone =
              s.state === "complete"
                ? "text-emerald-400 border-emerald-500/30"
                : s.state === "current"
                ? "text-amber-400 border-amber-500/40 bg-amber-500/5"
                : "text-muted-foreground border-border/50";
            return (
              <li key={s.key} className={`border rounded p-3 ${tone}`}>
                <div className="flex items-start gap-3">
                  <Icon className="h-4 w-4 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">
                        {i + 1}. {s.label}
                      </p>
                      <Badge variant="outline" className="text-[10px]">{s.state}</Badge>
                    </div>
                    {s.missing && <p className="text-xs mt-1">⚠ {s.missing}</p>}
                    <p className="text-xs text-muted-foreground mt-1">Next: {s.nextAction}</p>
                    {s.href.startsWith("/") && (
                      <Link to={s.href} className="text-xs text-primary hover:underline">
                        Open →
                      </Link>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        {currentStep && (
          <p className="text-xs text-muted-foreground mt-3">
            Current founder action: <span className="text-foreground font-medium">{currentStep.label}</span> — {currentStep.nextAction}.
          </p>
        )}
      </FRSection>

      <FRSection title="Start / log a monthly run">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Month</Label><Input type="number" min={1} max={12} value={draft.month} onChange={(e) => setDraft({ ...draft, month: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Year</Label><Input type="number" value={draft.year} onChange={(e) => setDraft({ ...draft, year: Number(e.target.value) })} /></div>
          <div><Label className="text-xs">Reviewed</Label><Input type="number" value={draft.candidates_reviewed} onChange={(e) => setDraft({ ...draft, candidates_reviewed: e.target.value })} /></div>
          <div><Label className="text-xs">Shortlist size</Label><Input type="number" value={draft.shortlist_size} onChange={(e) => setDraft({ ...draft, shortlist_size: e.target.value })} /></div>
          <div className="flex items-end"><Button onClick={startRun}>Start / log run</Button></div>
          <div className="md:col-span-5"><Label className="text-xs">Notes</Label><Textarea rows={2} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></div>
        </div>
      </FRSection>

      <FRSection title="History">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground text-center py-8">No runs yet.</p> : (
          <Table>
            <TableHeader><TableRow>
              <TableHead>Month</TableHead><TableHead>Status</TableHead><TableHead>Reviewed</TableHead><TableHead>Shortlist</TableHead><TableHead>Notes</TableHead><TableHead></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-xs">{r.month}/{r.year}</TableCell>
                  <TableCell className="text-xs">{r.status}</TableCell>
                  <TableCell className="text-xs">{r.candidates_reviewed}</TableCell>
                  <TableCell className="text-xs">{r.shortlist_size}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[320px] truncate">{r.notes ?? "—"}</TableCell>
                  <TableCell className="text-xs">{r.status !== "finalised" && <Button size="sm" variant="outline" onClick={() => finalise(r.id)}>Finalise</Button>}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </FRSection>
    </FundingRadarLayout>
  );
}