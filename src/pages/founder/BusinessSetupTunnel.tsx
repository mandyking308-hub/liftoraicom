import { useEffect, useMemo, useState } from "react";
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
} from "@/lib/businessSetupTunnel";

type BusinessRow = { id: string; name: string; status?: string | null };

function slugify(s: string): string {
  return "draft:" + s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "draft:unnamed";
}

export default function BusinessSetupTunnel() {
  const [params] = useSearchParams();
  const initialMode = (params.get("mode") || "existing") as "existing" | "new" | "continue";
  const [mode, setMode] = useState(initialMode);
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [state, setState] = useState<TunnelState | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [newName, setNewName] = useState("");

  const counts = useMemo(fieldCounts, []);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from("businesses").select("id, name, status").limit(200);
        setBusinesses((data as BusinessRow[]) || []);
      } catch { setBusinesses([]); }
      setLoadingBiz(false);
    })();
  }, []);

  const drafts = useMemo(() => listAll(), [state?.updatedAt, mode]);

  const neonCandy = useMemo(
    () => businesses.find((b) => /neon\s*candy/i.test(b.name || "")),
    [businesses],
  );

  function pick(b: BusinessRow) {
    const existing = load(b.id);
    setState(existing ?? newState(b.id, b.name, false));
    setStepIdx(0);
  }
  function pickDraft(s: TunnelState) { setState(s); setStepIdx(0); }
  function createNew() {
    if (!newName.trim()) { toast.error("Enter a name."); return; }
    const id = slugify(newName);
    const s = newState(id, newName.trim(), true);
    save(s); setState(s); setStepIdx(0);
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
  }

  function markStep(stepKey: StepKey, status: "saved" | "skipped") {
    if (!state) return;
    const next: TunnelState = {
      ...state,
      steps: { ...state.steps, [stepKey]: { ...state.steps[stepKey], status, updatedAt: new Date().toISOString() } },
    };
    setState(next); save(next);
    if (stepIdx < TUNNEL_STEPS.length - 1) setStepIdx(stepIdx + 1);
    toast.success(status === "saved" ? "Saved. Next step ready." : "Skipped (still incomplete).");
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
                {loadingBiz && <p className="text-sm text-muted-foreground">Loading…</p>}
                {!loadingBiz && businesses.length === 0 && (
                  <p className="text-sm text-muted-foreground">No businesses found. Use "Create new" to start a draft.</p>
                )}
                {businesses.filter((b) => b !== neonCandy).map((b) => {
                  const t = load(b.id);
                  const score = t ? overallCompleteness(t, counts) : 0;
                  return (
                    <div key={b.id} className="flex items-center justify-between border border-border/40 rounded p-2">
                      <div>
                        <div className="text-sm font-medium">{b.name}</div>
                        <div className="text-xs text-muted-foreground">Status: {b.status || "—"} · Setup: {score}%</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => pick(b)}>Open</Button>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {mode === "new" && (
            <Card><CardHeader><CardTitle>Create new draft business</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <Label>Draft business name (e.g. "Acme Marketing")</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Business name" />
                <p className="text-xs text-muted-foreground">Draft is saved locally only. No external action. No live launch.</p>
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
      </div>
    </FounderLayout>
  );
}