import RelatedToolTabs from "@/components/founder/RelatedToolTabs";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  TUNNEL_STEPS, STEP_FIELDS, fieldCounts, load, save, listAll, newState,
  stepCompleteness, overallCompleteness, type TunnelState, type StepKey,
  loadRemote, saveRemote, listAllRemote, promoteDraftToBusiness,
  promoteIntoLiftorModules as runPromoteIntoLiftorModules,
  MODULE_AREAS, type ModuleConnections,
} from "@/lib/businessSetupTunnel";
import {
  calculatePace, saveSalesTarget, savePaceCalculation, loadCurrentRevenueRollup,
  type SalesTargetInput,
} from "@/lib/commercialPace";

type BusinessRow = { id: string; name: string };
type ArchivedBusinessRow = { id: string; name: string; archived_at: string | null; archived_reason: string | null };
const BUSINESS_PAGE_SIZE = 50;

function slugify(s: string): string {
  return "draft:" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "draft:unnamed";
}

export default function BusinessSetupTunnel() {
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") || "existing") as "existing" | "new" | "continue";
  const [mode, setMode] = useState(initialMode);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [businessSearch, setBusinessSearch] = useState("");
  const [businessOffset, setBusinessOffset] = useState(0);
  const [hasMoreBusinesses, setHasMoreBusinesses] = useState(false);
  const [loadingMoreBusinesses, setLoadingMoreBusinesses] = useState(false);
  const [businessLoadError, setBusinessLoadError] = useState(false);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [state, setState] = useState<TunnelState | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [newName, setNewName] = useState("");
  const businessRequestId = useRef(0);

  const counts = useMemo(fieldCounts, []);

  useEffect(() => {
    let active = true;
    const requestId = ++businessRequestId.current;
    setLoadingBiz(true);
    setLoadingMoreBusinesses(false);
    setBusinessLoadError(false);

    const timer = window.setTimeout(async () => {
      try {
        let query = supabase.from("businesses").select("id, name").eq("portfolio_status", "active");
        const term = businessSearch.trim();
        if (term) query = query.ilike("name", `%${term}%`);

        const { data, error } = await query.order("name").range(0, BUSINESS_PAGE_SIZE - 1);
        if (!active || requestId !== businessRequestId.current) return;

        const rows = (data ?? []) as unknown as BusinessRow[];
        setBusinesses(rows);
        setBusinessOffset(rows.length);
        setHasMoreBusinesses(!error && rows.length === BUSINESS_PAGE_SIZE);
        setBusinessLoadError(!!error);
        setLoadingBiz(false);
      } catch {
        if (!active || requestId !== businessRequestId.current) return;
        setBusinessLoadError(true);
        setLoadingBiz(false);
      }
    }, 200);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [businessSearch]);

  async function loadMoreBusinesses() {
    if (loadingMoreBusinesses || !hasMoreBusinesses) return;
    const requestId = businessRequestId.current;
    const start = businessOffset;
    const term = businessSearch.trim();
    setLoadingMoreBusinesses(true);
    try {
      let query = supabase.from("businesses").select("id, name").eq("portfolio_status", "active");
      if (term) query = query.ilike("name", `%${term}%`);
      const { data, error } = await query.order("name").range(start, start + BUSINESS_PAGE_SIZE - 1);
      if (requestId !== businessRequestId.current) return;

      const rows = (data ?? []) as unknown as BusinessRow[];
      if (error) {
        toast.error("Could not load more businesses.");
        return;
      }
      setBusinesses((current) => [...current, ...rows]);
      setBusinessOffset(start + rows.length);
      setHasMoreBusinesses(rows.length === BUSINESS_PAGE_SIZE);
    } catch {
      if (requestId === businessRequestId.current) toast.error("Could not load more businesses.");
    } finally {
      if (requestId === businessRequestId.current) setLoadingMoreBusinesses(false);
    }
  }

  const [archivedBusinesses, setArchivedBusinesses] = useState<ArchivedBusinessRow[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id, name, archived_at, archived_reason")
        .neq("portfolio_status", "active")
        .order("name");
      setArchivedBusinesses((data ?? []) as ArchivedBusinessRow[]);
    })();
  }, []);

  const [remoteDrafts, setRemoteDrafts] = useState<TunnelState[]>([]);
  useEffect(() => {
    (async () => { setRemoteDrafts(await listAllRemote()); })();
  }, [state?.updatedAt, mode]);
  const drafts = useMemo(() => {
    const local = listAll();
    const seen = new Set(remoteDrafts.map((d) => d.businessId));
    const combined = [...remoteDrafts, ...local.filter((d) => !seen.has(d.businessId))];
    // Archived businesses must not surface in "Continue setup already in progress".
    // Draft entries (ids like "draft:...") never match real business ids, so they stay.
    const archivedIds = new Set(archivedBusinesses.map((b) => b.id));
    return combined.filter((d) => !archivedIds.has(d.businessId));
  }, [remoteDrafts, archivedBusinesses, state?.updatedAt, mode]);

  const neonCandy = useMemo(
    () => businesses.find((b) => /neon\s*candy/i.test(b.name || "")),
    [businesses],
  );

  async function pick(b: BusinessRow) {
    const remote = await loadRemote(b.id);
    const local = load(b.id);
    setState(remote ?? local ?? newState(b.id, b.name, false));
    setStepIdx(0);
  }
  // Deep link: ?business=<id> opens that ACTIVE business directly (archived ids are ignored).
  const deepLinked = useRef(false);
  useEffect(() => {
    const id = params.get("business");
    if (!id || deepLinked.current || state) return;
    deepLinked.current = true;
    (async () => {
      const { data } = await supabase.from("businesses").select("id, name").eq("id", id).eq("portfolio_status", "active").maybeSingle();
      if (data) await pick(data as unknown as BusinessRow);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  function pickDraft(s: TunnelState) { setState(s); setStepIdx(0); }
  function createNew() {
    if (!newName.trim()) { toast.error("Enter a name."); return; }
    const id = slugify(newName);
    const s = newState(id, newName.trim(), true);
    save(s); setState(s); setStepIdx(0);
    saveRemote(s, counts);
  }

  function updateField(stepKey: StepKey, fieldKey: string, value: string) {
    if (!state) return;
    const next: TunnelState = {
      ...state,
      steps: {
        ...state.steps,
        [stepKey]: {
          ...state.steps[stepKey],
          status: state.steps[stepKey].status === "saved" ? "saved" : "in_progress",
          fields: { ...state.steps[stepKey].fields, [fieldKey]: value },
        },
      },
    };
    setState(next); save(next);
    saveRemote(next, counts);
  }

  function markStep(stepKey: StepKey, status: "saved" | "skipped") {
    if (!state) return;
    const next: TunnelState = {
      ...state,
      steps: { ...state.steps, [stepKey]: { ...state.steps[stepKey], status, updatedAt: new Date().toISOString() } },
    };
    setState(next); save(next);
    saveRemote(next, counts);
    if (stepIdx < TUNNEL_STEPS.length - 1) setStepIdx(stepIdx + 1);
    toast.success(status === "saved" ? "Saved. Next step ready." : "Skipped (still incomplete).");
  }

  async function promoteIntoLiftorModules() {
    if (!state || syncing) return;
    setSyncing(true);
    try {
      let current = state;
      if (current.isDraft) {
        const newId = await promoteDraftToBusiness(current);
        current = { ...current, businessId: newId, isDraft: false };
        setState(current); save(current);
        await saveRemote(current, counts);
      }
      const moduleConnections = await runPromoteIntoLiftorModules(current);
      const next: TunnelState = { ...current, moduleConnections };
      setState(next); save(next);
      await saveRemote(next, counts);
      const vals = Object.values(moduleConnections);
      const connected = vals.filter((c) => c?.status === "connected").length;
      const manual = vals.filter((c) => c?.status === "manual_action_needed").length;
      const failed = vals.filter((c) => c?.status === "failed");
      if (failed.length) {
        toast.error(`${failed.length} section(s) need attention. Successful sections were saved; rerun safely after fixing the shown error.`);
      } else {
        toast.success(`Company synchronised: ${connected} sections connected${manual ? `, ${manual} optional/manual` : ""}. Nothing sent or activated.`);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Company setup could not be synchronised.");
    } finally {
      setSyncing(false);
    }
  }

  // ---------- No business selected ----------
  if (!state) {
    return (
      <FounderLayout>
        <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Business Setup Tunnel</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Founder-only guided setup. No external sending. No provider activation. Saves as draft.
            </p>
          </div>

          <div className="flex gap-2">
            {(["existing", "new", "continue"] as const).map((m) => (
              <Button key={m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => setMode(m)}>
                {m === "existing" ? "Wire existing" : m === "new" ? "Create new" : "Continue in progress"}
              </Button>
            ))}
          </div>

          {mode === "existing" && (
            <Card><CardHeader><CardTitle>Select an existing business</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {neonCandy && (
                  <Card className="border-primary/40">
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">Wire NeonCandy</div>
                        <div className="text-xs text-muted-foreground">Detected business: {neonCandy.name}. Continue its setup tunnel.</div>
                      </div>
                      <Button size="sm" onClick={() => pick(neonCandy)}>Open NeonCandy</Button>
                    </CardContent>
                  </Card>
                )}
                <Input
                  value={businessSearch}
                  onChange={(e) => setBusinessSearch(e.target.value)}
                  placeholder="Search businesses by name"
                  aria-label="Search businesses by name"
                />
                {loadingBiz && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loadingBiz && businessLoadError && (
                  <p className="text-sm text-destructive">Could not load businesses. Try changing the search or reload the page.</p>
                )}
                {!loadingBiz && !businessLoadError && businesses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active portfolio businesses yet. Fresh onboarding can start whenever you're ready — use "Create new" to begin a draft, or browse the archived businesses below.
                  </p>
                )}
                {!loadingBiz && !businessLoadError && businesses.filter((b) => b.id !== neonCandy?.id).map((b) => {
                  const t = load(b.id);
                  const score = t ? overallCompleteness(t, counts) : 0;
                  return (
                    <div key={b.id} className="flex items-center justify-between border border-border/40 rounded p-2">
                      <div>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">Setup: {score}%</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => pick(b)}>Open</Button>
                    </div>
                  );
                })}
                {!loadingBiz && !businessLoadError && hasMoreBusinesses && (
                  <Button size="sm" variant="outline" onClick={loadMoreBusinesses} disabled={loadingMoreBusinesses}>
                    {loadingMoreBusinesses ? "Loading…" : "Load more businesses"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {mode === "existing" && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-base">LEGACY / PRE-LAUNCH BUSINESSES</CardTitle>
                <p className="text-xs text-muted-foreground">
                  Archived, read-only. Original IDs and all linked records are retained for manual review and selective reuse. Not used by onboarding.
                </p>
              </CardHeader>
              <CardContent className="space-y-1">
                {archivedBusinesses.length === 0 && <p className="text-sm text-muted-foreground">No archived businesses.</p>}
                {archivedBusinesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between border border-border/30 rounded p-2 opacity-80">
                    <div>
                      <div className="text-sm">{b.name}</div>
                      <div className="text-[11px] font-mono text-muted-foreground">{b.id}</div>
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border/40 rounded px-2 py-0.5">Legacy</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {mode === "new" && (
            <Card><CardHeader><CardTitle>Create new draft business</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Label htmlFor="new-business-name">Draft business name (e.g. "Acme Marketing")</Label>
                <Input id="new-business-name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Business name" />
                <p className="text-xs text-muted-foreground">Draft is saved to your founder-only workspace. No external action. No live launch until you explicitly approve.</p>
                <Button onClick={createNew}>Create draft & start tunnel</Button>
              </CardContent>
            </Card>
          )}

          {mode === "continue" && (
            <Card><CardHeader><CardTitle>Continue setup already in progress</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {drafts.length === 0 && <p className="text-sm text-muted-foreground">No setup in progress yet.</p>}
                {drafts.map((d) => {
                  const score = overallCompleteness(d, counts);
                  return (
                    <div key={d.businessId} className="flex items-center justify-between border border-border/40 rounded p-2">
                      <div>
                        <div className="text-sm font-medium">{d.businessName}</div>
                        <div className="text-xs text-muted-foreground">{d.isDraft ? "Draft" : "Existing"} · Setup: {score}% · Updated {new Date(d.updatedAt).toLocaleString()}</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => pickDraft(d)}>Resume</Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/founder/start-here">← Back to Start Here</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to="/founder/copilot">Ask Liftor</Link></Button>
          </div>
        </div>
      </FounderLayout>
    );
  }

  // ---------- Step view ----------
  const stepDef = TUNNEL_STEPS[stepIdx];
  const fields = STEP_FIELDS[stepDef.key];
  const stepState = state.steps[stepDef.key];
  const overall = overallCompleteness(state, counts);
  const nextStep = stepIdx < TUNNEL_STEPS.length - 1 ? TUNNEL_STEPS[stepIdx + 1] : null;

  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <RelatedToolTabs tabs={[{ to: "/founder/business-setup-tunnel", label: "Add a business" }, { to: "/founder/business-onboarding-factory", label: "Onboarding factory" }, { to: "/founder/business-archetypes", label: "Business types" }, { to: "/founder/business-templates", label: "Templates" }, { to: "/founder/starter-pack-materialiser", label: "Starter packs" }, { to: "/founder/first-use-configuration", label: "First-use setup" }, { to: "/founder/expansion", label: "Expansion" }]} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{state.businessName}</h1>
            <p className="text-xs text-muted-foreground">{state.isDraft ? "Draft business" : "Existing business"} · Setup: {overall}%</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setState(null)}>Switch business</Button>
        </div>

        <Progress value={overall} />

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Step completeness</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-1 text-xs">
            {TUNNEL_STEPS.map((s, i) => {
              const c = stepCompleteness(state.steps[s.key], counts[s.key]);
              const active = i === stepIdx;
              return (
                <button key={s.key} onClick={() => setStepIdx(i)}
                  className={`text-left p-2 rounded border ${active ? "border-primary bg-primary/10" : "border-border/40 hover:bg-secondary"}`}>
                  <div className="font-medium">{i + 1}. {s.label}</div>
                  <div className="text-muted-foreground">{state.steps[s.key].status} · {c}%</div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Step {stepIdx + 1} · {stepDef.label}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-xs text-muted-foreground space-y-1">
              <div><strong>What this step means:</strong> Capture the {stepDef.label.toLowerCase()} so Liftor knows enough to operate this business safely.</div>
              <div><strong>What Liftor already knows:</strong> Whatever you've saved here previously (status: {stepState.status}).</div>
              <div><strong>What is missing:</strong> Any blank field below.</div>
              <div><strong>What will be created:</strong> A founder-only draft record attached to this business. Nothing is sent externally.</div>
              <div><strong>Where it goes:</strong> Local founder-only draft, ready to be promoted into existing Liftor modules when you say so.</div>
              <div className="text-amber-500"><strong>Do not activate externally</strong> — no emails, social posts, provider calls, healthcare go-live, data room tokens or buyer outreach happen from this screen.</div>
            </div>

            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {f.long
                    ? <Textarea rows={2} value={stepState.fields[f.key] || ""} onChange={(e) => updateField(stepDef.key, f.key, e.target.value)} />
                    : <Input value={stepState.fields[f.key] || ""} onChange={(e) => updateField(stepDef.key, f.key, e.target.value)} />}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => markStep(stepDef.key, "saved")}>Save and continue</Button>
              <Button variant="outline" onClick={() => markStep(stepDef.key, "skipped")}>Skip for now</Button>
              {stepDef.key === "commercial" && (
                <Button variant="secondary" onClick={async () => {
                  if (!state) return;
                  const f = state.steps.commercial.fields;
                  const input: SalesTargetInput = {
                    target_monthly_revenue: Number(f.target_monthly_revenue) || 0,
                    target_annual_revenue: Number(f.target_annual_revenue) || 0,
                    target_mrr: Number(f.target_mrr) || 0,
                    target_arr: Number(f.target_arr) || 0,
                    currency: f.currency || "GBP",
                    average_order_value: Number(f.average_order_value) || 0,
                    subscription_price: Number(f.subscription_price) || 0,
                    conversion_rate: Number(f.conversion_rate) || 0,
                    lead_to_call_rate: Number(f.lead_to_call_rate) || 0,
                    call_to_sale_rate: Number(f.call_to_sale_rate) || 0,
                    churn_rate: Number(f.churn_rate) || 0,
                    gross_margin: Number(f.gross_margin) || 0,
                    sales_cycle_days: Number(f.sales_cycle_days) || 0,
                    target_first_sale_date: f.target_first_sale_date || null,
                    target_first_1k_date: f.target_first_1k_date || null,
                    target_first_10k_month_date: f.target_first_10k_month_date || null,
                    commercial_stage: (f.commercial_stage || "setup") as any,
                    max_safe_outreach_per_day: Number(f.max_safe_outreach_per_day) || 0,
                    founder_approval_required: (f.founder_approval_required || "yes").toLowerCase() !== "no",
                  };
                  const bizId = state.businessId.startsWith("draft:") ? null : state.businessId;
                  const targetId = await saveSalesTarget(bizId, state.businessName, input);
                  const rollup = await loadCurrentRevenueRollup(bizId);
                  const pace = calculatePace(input, rollup.mtd, rollup.mrr, rollup.arr);
                  await savePaceCalculation(bizId, state.businessName, targetId, pace);
                  toast.success(`Pace: ${pace.pace_status.toUpperCase()} · ${pace.recommended_daily_action}`);
                }}>Save target & calculate pace</Button>
              )}
              <Button asChild variant="ghost"><Link to="/founder/copilot">Ask Liftor</Link></Button>
              {stepIdx > 0 && <Button variant="ghost" onClick={() => setStepIdx(stepIdx - 1)}>← Previous</Button>}
              {stepIdx < TUNNEL_STEPS.length - 1 && <Button variant="ghost" onClick={() => setStepIdx(stepIdx + 1)}>Next →</Button>}
            </div>

            {nextStep && (
              <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
                Next step: <strong>{nextStep.label}</strong>.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Where this connects in Liftor</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {[
              ["Business Onboarding Factory", "/founder/business-onboarding-factory"],
              ["Starter Pack Materialiser", "/founder/starter-pack-materialiser"],
              ["External Activation Readiness", "/founder/business-activation"],
              ["Marketing Hub", "/founder/marketing"],
              ["Finance Hub", "/founder/finance"],
              ["CRM / Outreach", "/founder/crm"],
              ["Healthcare Overlay (BLOCKED)", "/founder/healthcare-overlay"],
              ["Data Room (CLOSED)", "/founder/data-room"],
              ["Buyer Warm-Up (quiet)", "/founder/portfolio-exit/buyer-warmup"],
              ["Daily Operator", "/founder/daily-operator"],
            ].map(([l, t]) => (
              <Button key={t} asChild variant="outline" size="sm" className="justify-start"><Link to={t}>{l}</Link></Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border-primary/40">
          <CardHeader className="pb-2"><CardTitle className="text-sm">One company setup across Liftor</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-xs text-muted-foreground">
            <p>
              Synchronise now with whatever you have saved. The first run creates the canonical company if needed, then creates or refreshes native records across all 14 sections. Blank information stays visibly missing; you can rerun this safely after adding it.
            </p>
            <p>
              Drafts only: no emails, provider campaigns, mailbox bookings, social publishing, payments, buyer outreach, data-room access, AI execution or go-live changes.
            </p>
            <Button size="sm" onClick={promoteIntoLiftorModules} disabled={syncing}>
              {syncing ? "Synchronising company…" : state.isDraft ? "Create company & synchronise 14 sections" : "Synchronise all 14 sections"}
            </Button>

            <div className="pt-3 border-t border-border/40 space-y-2" aria-live="polite">
              <div className="text-foreground font-medium">Section connections</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {MODULE_AREAS.map((a) => {
                  const c = state.moduleConnections?.[a.key];
                  const status = c?.status ?? "not_attempted";
                  const color = status === "connected" ? "text-emerald-500"
                    : status === "failed" ? "text-destructive"
                    : status === "manual_action_needed" ? "text-amber-500" : "text-muted-foreground";
                  const actionCounts = c?.records?.reduce<Record<string, number>>((acc, record) => {
                    acc[record.action] = (acc[record.action] ?? 0) + 1;
                    return acc;
                  }, {}) ?? {};
                  return (
                    <div key={a.key} className="border border-border/40 rounded p-2 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-foreground">{a.label}</div>
                        <span className={`text-[10px] uppercase ${color}`}>{status.replace(/_/g, " ")}</span>
                      </div>
                      <div className="text-[11px]">{c?.note ?? "Not synchronised yet — run company setup."}</div>
                      {c?.records && <div className="text-[10px]">{Object.entries(actionCounts).map(([action, count]) => `${count} ${action}`).join(" · ")}</div>}
                      {c?.target_table && <div className="text-[10px] text-muted-foreground">Native: {c.target_table}</div>}
                      <Link to={a.route} className="inline-block text-[11px] text-primary hover:underline">Open section →</Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
}
