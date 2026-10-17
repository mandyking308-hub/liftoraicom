import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import {
  ASSESSMENT_STATUSES, VISIT_STATUSES, RECORD_KINDS, VISIT_FIELDS, allCriteria, emptyAnswer, hasStarted, label,
  mergeFollowups, mergeObservations, newSchoolKey, normaliseAnswer, startAssessment, summarise,
  type CriterionAnswer, type FollowUp, type VisitAssessment, type VisitFramework,
} from "@/lib/schoolVisits/schoolVisits";

const TEMPLATE_KEY = "christine-school-visit-v1";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic JSON columns
const db = supabase as any;

interface VisitRecord {
  id: string; school_key: string; school_name: string; record_kind: string; proposed_entry: string | null;
  visit_status: string; visit_date: string | null; template_key: string; decision: string;
  visit_assessment: VisitAssessment; structured_observations: Record<string, unknown>; contact_followups: unknown[];
}

const COLS = "id, school_key, school_name, record_kind, proposed_entry, visit_status, visit_date, template_key, decision, visit_assessment, structured_observations, contact_followups";

function useTemplate() {
  return useQuery({
    queryKey: ["school-visit-template"],
    queryFn: async () => {
      const { data, error } = await db.from("founder_school_visit_templates").select("template_key, title, framework").eq("template_key", TEMPLATE_KEY).maybeSingle();
      if (error) throw error;
      return data as { template_key: string; title: string; framework: VisitFramework } | null;
    },
  });
}
function useRecords() {
  return useQuery({
    queryKey: ["school-visit-records"],
    queryFn: async () => {
      const { data, error } = await db.from("founder_school_visit_records").select(COLS).order("school_name");
      if (error) throw error;
      return (data ?? []) as VisitRecord[];
    },
  });
}

const kindLabel: Record<string, string> = { prospective_school: "Prospective", current_school: "Current", prior_school: "Historical" };

export default function SchoolVisits() {
  const tpl = useTemplate();
  const recs = useRecords();
  const [selected, setSelected] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("all");
  const [compare, setCompare] = useState<string[]>([]);
  const fw = tpl.data?.framework;
  const rows = useMemo(() => (recs.data ?? []).filter((r) =>
    (kind === "all" || r.record_kind === kind) && r.school_name.toLowerCase().includes(q.trim().toLowerCase())), [recs.data, q, kind]);
  const current = recs.data?.find((r) => r.id === selected);

  return (
    <FounderLayout>
      <div className="space-y-4 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-semibold">School Visit Assessments</h1>
          <p className="text-sm text-muted-foreground">Private founder workspace. Unchecked criteria are unknown, not failures. Ratings only where evidence is recorded.</p>
        </div>
        {(tpl.error || recs.error) && <p className="text-sm text-destructive">Could not load: {((tpl.error || recs.error) as Error).message}</p>}
        {tpl.isSuccess && !fw && <p className="text-sm text-destructive">Assessment template not found.</p>}
        {current && fw ? (
          <Editor key={current.id} rec={current} fw={fw} onBack={() => setSelected(null)} />
        ) : (
          <Tabs defaultValue="list">
            <TabsList><TabsTrigger value="list">Schools</TabsTrigger><TabsTrigger value="compare">Compare ({compare.length})</TabsTrigger></TabsList>
            <TabsContent value="list" className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input placeholder="Search school" value={q} onChange={(e) => setQ(e.target.value)} />
                <Select value={kind} onValueChange={setKind}>
                  <SelectTrigger className="sm:w-48" aria-label="Record type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    {RECORD_KINDS.map((k) => <SelectItem key={k} value={k}>{kindLabel[k]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <AddSchool existing={(recs.data ?? []).map((r) => r.school_key)} />
              </div>
              {recs.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
              {recs.isSuccess && rows.length === 0 && <p className="text-sm text-muted-foreground">No schools match.</p>}
              <div className="grid gap-2">
                {rows.map((r) => {
                  const s = summarise(fw, r.visit_assessment);
                  return (
                    <Card key={r.id} className="p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Checkbox aria-label={`Compare ${r.school_name}`} checked={compare.includes(r.id)}
                          onCheckedChange={(c) => setCompare(c ? [...compare, r.id].slice(-4) : compare.filter((x) => x !== r.id))} />
                        <button className="flex-1 text-left font-medium hover:text-primary" onClick={() => setSelected(r.id)}>{r.school_name}</button>
                        <Badge variant="outline">{kindLabel[r.record_kind] ?? r.record_kind}</Badge>
                        <Badge variant="secondary">{label(r.visit_status)}</Badge>
                        <Badge variant="outline">Visit date: {r.visit_date ?? "unknown"}</Badge>
                        <Badge variant="outline">{label(r.decision)}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {hasStarted(r.visit_assessment) ? `${s.confirmed} confirmed · ${s.concern} concerns · ${s.not_checked} unchecked` : "Not started"}
                        </span>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="compare">
              <Compare fw={fw} recs={(recs.data ?? []).filter((r) => compare.includes(r.id))} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </FounderLayout>
  );
}

function AddSchool({ existing }: { existing: string[] }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("prospective_school");
  const qc = useQueryClient();
  const add = async () => {
    const n = name.trim();
    if (!n) return;
    // Insert only: never upserts, so no existing record or pipeline data is overwritten.
    const { error } = await db.from("founder_school_visit_records").insert({
      school_key: newSchoolKey(n, existing), school_name: n, record_kind: kind, template_key: TEMPLATE_KEY,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("School added");
    setName("");
    qc.invalidateQueries({ queryKey: ["school-visit-records"] });
  };
  return (
    <div className="flex gap-2">
      <Input placeholder="New school name" value={name} onChange={(e) => setName(e.target.value)} className="sm:w-48" />
      <Select value={kind} onValueChange={setKind}>
        <SelectTrigger className="w-36" aria-label="New school type"><SelectValue /></SelectTrigger>
        <SelectContent>{RECORD_KINDS.map((k) => <SelectItem key={k} value={k}>{kindLabel[k]}</SelectItem>)}</SelectContent>
      </Select>
      <Button onClick={add} disabled={!name.trim()} aria-label="Add school"><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

function Editor({ rec, fw, onBack }: { rec: VisitRecord; fw: VisitFramework; onBack: () => void }) {
  const qc = useQueryClient();
  const [va, setVa] = useState<VisitAssessment>(rec.visit_assessment ?? {});
  const [visitStatus, setVisitStatus] = useState(rec.visit_status);
  const [visitDate, setVisitDate] = useState(rec.visit_date ?? "");
  const [decision, setDecision] = useState(rec.decision);
  const [fields, setFields] = useState<Record<string, string>>(((rec.structured_observations?.visit_fields ?? {}) as Record<string, string>));
  const [followups, setFollowups] = useState<FollowUp[]>(
    (Array.isArray(rec.contact_followups) ? rec.contact_followups : []).filter((e): e is FollowUp => !!e && (e as FollowUp).kind === "visit_followup"));
  const [saving, setSaving] = useState(false);
  const started = hasStarted(va);
  const statusOpts = Array.from(new Set([rec.visit_status, ...VISIT_STATUSES]));
  const decisionOpts = Array.from(new Set([rec.decision, ...(fw.decision_options ?? ["not_decided"])]));
  const prior = rec.structured_observations as { note?: string; reported_strengths?: unknown; reported_concerns?: unknown };

  const setAnswer = (key: string, patch: Partial<CriterionAnswer>) =>
    setVa((v) => ({ ...v, criteria: { ...(v.criteria ?? {}), [key]: { ...(v.criteria?.[key] ?? emptyAnswer()), ...patch } } }));

  const save = async () => {
    setSaving(true);
    const criteria = Object.fromEntries(Object.entries(va.criteria ?? {}).map(([k, a]) => [k, normaliseAnswer(a)]));
    const { data: fresh, error: readErr } = await db.from("founder_school_visit_records").select("structured_observations, contact_followups").eq("id", rec.id).single();
    if (readErr) { setSaving(false); toast.error(readErr.message); return; }
    const { error } = await db.from("founder_school_visit_records").update({
      visit_status: visitStatus, visit_date: visitDate || null, decision,
      visit_assessment: started ? { ...va, criteria, updated_at: new Date().toISOString() } : va,
      structured_observations: mergeObservations(fresh.structured_observations, fields),
      contact_followups: mergeFollowups(fresh.contact_followups, followups),
      updated_at: new Date().toISOString(),
    }).eq("id", rec.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Saved");
    qc.invalidateQueries({ queryKey: ["school-visit-records"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-1 h-4 w-4" />All schools</Button>
        <h2 className="flex-1 text-xl font-semibold">{rec.school_name}</h2>
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Visit</CardTitle><CardDescription>Status and date change only when you set them.</CardDescription></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div><Label className="text-xs">Visit status</Label>
            <Select value={visitStatus} onValueChange={setVisitStatus}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{statusOpts.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Visit date (blank = unknown)</Label><Input type="date" value={visitDate} onChange={(e) => setVisitDate(e.target.value)} /></div>
          <div><Label className="text-xs">Decision</Label>
            <Select value={decision} onValueChange={setDecision}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{decisionOpts.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent></Select></div>
          {(prior?.note || prior?.reported_strengths || prior?.reported_concerns) && (
            <details className="md:col-span-3 text-sm text-muted-foreground"><summary className="cursor-pointer">Existing notes (unchanged)</summary>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{JSON.stringify({ note: prior.note, reported_strengths: prior.reported_strengths, reported_concerns: prior.reported_concerns }, null, 2)}</pre></details>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Visit details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {VISIT_FIELDS.map((f) => (
            <div key={f.key} className={f.long ? "md:col-span-2" : ""}>
              <Label className="text-xs">{f.label}</Label>
              {f.long
                ? <Textarea rows={2} value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />
                : <Input value={fields[f.key] ?? ""} onChange={(e) => setFields({ ...fields, [f.key]: e.target.value })} />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Follow-ups</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {followups.map((f, i) => {
            const upd = (p: Partial<FollowUp>) => setFollowups(followups.map((x, j) => (j === i ? { ...x, ...p } : x)));
            return (
              <div key={f.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Checkbox aria-label="Done" checked={f.done} onCheckedChange={(c) => upd({ done: !!c })} />
                <Input placeholder="Action" value={f.action} onChange={(e) => upd({ action: e.target.value })} />
                <Input placeholder="Owner" className="sm:w-40" value={f.owner} onChange={(e) => upd({ owner: e.target.value })} />
                <Input type="date" className="sm:w-44" value={f.due_date ?? ""} onChange={(e) => upd({ due_date: e.target.value || null })} />
                <Button variant="ghost" size="icon" aria-label="Remove follow-up" onClick={() => setFollowups(followups.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            );
          })}
          <Button variant="outline" size="sm" onClick={() => setFollowups([...followups, { id: crypto.randomUUID(), kind: "visit_followup", action: "", owner: "", due_date: null, done: false }])}>
            <Plus className="mr-1 h-4 w-4" />Add follow-up</Button>
        </CardContent>
      </Card>

      {!started ? (
        <Card><CardContent className="space-y-3 pt-6 text-center">
          <p className="text-sm text-muted-foreground">Assessment not started. Starting it does not mark the school as visited or booked.</p>
          <Button onClick={() => setVa(startAssessment(rec.template_key))}>Start assessment</Button>
        </CardContent></Card>
      ) : (
        <>
          {fw.scoring_guidance && <p className="text-xs text-muted-foreground">{fw.scoring_guidance}</p>}
          {fw.sections.map((sec) => (
            <Card key={sec.title}>
              <CardHeader><CardTitle className="text-base">{sec.title}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {sec.criteria.map((c) => {
                  const a = va.criteria?.[c.key] ?? emptyAnswer();
                  const canRate = (a.assessment === "confirmed" || a.assessment === "concern") && a.evidence.trim().length > 0;
                  return (
                    <div key={c.key} className="space-y-2 border-b border-border/50 pb-3 last:border-0">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-mono text-xs text-muted-foreground">{c.key}</span>
                        <span className="flex-1">{c.label}</span>
                        <Badge variant="outline" className="text-[10px]">{c.dimension}</Badge>
                      </div>
                      <div className="grid gap-2 md:grid-cols-[180px_120px_1fr_1fr]">
                        <Select value={a.assessment} onValueChange={(v) => setAnswer(c.key, { assessment: v as CriterionAnswer["assessment"] })}>
                          <SelectTrigger aria-label={`${c.key} status`}><SelectValue /></SelectTrigger>
                          <SelectContent>{ASSESSMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{label(s)}</SelectItem>)}</SelectContent>
                        </Select>
                        <Select disabled={!canRate} value={a.rating != null && canRate ? String(a.rating) : "none"} onValueChange={(v) => setAnswer(c.key, { rating: v === "none" ? null : Number(v) })}>
                          <SelectTrigger aria-label={`${c.key} rating`}><SelectValue placeholder="No rating" /></SelectTrigger>
                          <SelectContent><SelectItem value="none">No rating</SelectItem>{[1, 2, 3, 4, 5].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}</SelectContent>
                        </Select>
                        <Textarea rows={1} placeholder="Observation / evidence" value={a.evidence} onChange={(e) => setAnswer(c.key, { evidence: e.target.value })} />
                        <Textarea rows={1} placeholder="Follow-up" value={a.follow_up} onChange={(e) => setAnswer(c.key, { follow_up: e.target.value })} />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </>
      )}
      <div className="flex justify-end"><Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
    </div>
  );
}

function Compare({ fw, recs }: { fw: VisitFramework | undefined; recs: VisitRecord[] }) {
  if (!fw) return null;
  if (recs.length < 2) return <p className="text-sm text-muted-foreground">Tick two to four schools in the list to compare.</p>;
  const cell = (r: VisitRecord, key: string) => {
    const a = normaliseAnswer(r.visit_assessment?.criteria?.[key] ?? {});
    if (a.assessment === "not_checked") return <span className="text-muted-foreground">—</span>;
    return <span title={a.evidence}>{label(a.assessment)}{a.rating != null ? ` (${a.rating})` : ""}</span>;
  };
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-xs text-muted-foreground">“—” means not yet checked (unknown), not a failure. Ratings shown only where evidence was recorded.</p>
      <table className="w-full text-sm">
        <thead><tr className="border-b border-border"><th className="p-2 text-left">Criterion</th>{recs.map((r) => <th key={r.id} className="p-2 text-left">{r.school_name}</th>)}</tr></thead>
        <tbody>
          <tr className="border-b border-border/50"><td className="p-2 text-muted-foreground">Evidence summary</td>
            {recs.map((r) => { const s = summarise(fw, r.visit_assessment); return <td key={r.id} className="p-2 text-xs">{s.confirmed} confirmed · {s.concern} concerns · {s.follow_up} follow-up · {s.not_checked} unchecked{s.avgRating != null ? ` · avg ${s.avgRating} of ${s.rated} rated` : ""}</td>; })}</tr>
          {allCriteria(fw).map((c) => (
            <tr key={c.key} className="border-b border-border/30"><td className="p-2"><span className="font-mono text-xs text-muted-foreground">{c.key}</span> {c.label}</td>
              {recs.map((r) => <td key={r.id} className="p-2">{cell(r, c.key)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
