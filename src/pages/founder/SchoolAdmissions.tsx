import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CalendarDays, Save } from "lucide-react";
import { toast } from "sonner";
import FounderLayout from "@/components/founder/FounderLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ADMISSIONS_STATUSES, DIARY_STATUSES, filterAdmissions, isConfirmedBooking, readAdmissions, saveAdmissions,
  type Admissions, type AdmissionsRecord, type AdmissionsStore } from "@/lib/schoolVisits/schoolAdmissions";
import { label, RECORD_KINDS } from "@/lib/schoolVisits/schoolVisits";

// This page mounts only inside FounderRoute; the existing database RLS is authoritative.
const schoolDb: SupabaseClient = supabase;
const kindLabels: Record<string, string> = { prospective_school: "Prospective", current_school: "Current", prior_school: "Historical" };
const diaryLabels: Record<string, string> = { unknown: "Unknown", not_requested: "Not requested", requested: "Requested — unconfirmed",
  offered: "Offered — unconfirmed", awaiting_confirmation: "Awaiting confirmation", confirmed: "Confirmed booking",
  completed: "Completed", cancelled: "Cancelled", conflict: "Date conflict" };

export const admissionsStore: AdmissionsStore = {
  async read(id) {
    const { data, error } = await schoolDb.from("founder_school_visit_records").select("structured_observations").eq("id", id).single();
    if (error) throw new Error("Could not read the school. Nothing was saved.");
    return data.structured_observations;
  },
  async compareAndSet(id, previous, next) {
    let update = schoolDb.from("founder_school_visit_records")
      .update({ structured_observations: next, updated_at: new Date().toISOString() }).eq("id", id);
    update = previous == null ? update.is("structured_observations", null) : update.eq("structured_observations", JSON.stringify(previous));
    const { data, error } = await update.select("id");
    if (error) throw new Error("Could not save admissions. Your edits are still here; try again.");
    return data?.length === 1 && data[0].id === id;
  },
};

function Choice({ id, title, value, options, onChange }: {
  id: string; title: string; value: string; options: readonly string[]; onChange: (v: string) => void;
}) {
  return <div className="min-w-0 space-y-1.5"><Label htmlFor={id}>{title}</Label>
    <Select value={value} onValueChange={onChange}><SelectTrigger id={id} className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((v) => <SelectItem key={v} value={v}>{v === "all" ? "All" : diaryLabels[v] ?? kindLabels[v] ?? label(v)}</SelectItem>)}</SelectContent>
    </Select></div>;
}

export default function SchoolAdmissions() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [diary, setDiary] = useState("all");
  const [kind, setKind] = useState("all");
  const [selected, setSelected] = useState<string | null>(null);
  const records = useQuery({
    queryKey: ["school-admissions-records", user?.id], enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await schoolDb.from("founder_school_visit_records")
        .select("id, school_name, record_kind, structured_observations").order("school_name");
      if (error) throw new Error("Could not load admissions. Please try again.");
      return (data ?? []) as AdmissionsRecord[];
    },
  });
  const rows = useMemo(() => filterAdmissions(records.data ?? [], search, status, diary, kind), [records.data, search, status, diary, kind]);
  const current = records.data?.find((r) => r.id === selected);
  const today = new Date();
  const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  return <FounderLayout><div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Schools · Private</p>
        <h1 className="text-2xl font-semibold">School Admissions Tracker</h1></div>
      <Button variant="outline" asChild><Link to="/founder/school-visits">Visit assessments<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
    </header>
    {records.isError && <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
      {records.error.message}<Button variant="outline" onClick={() => records.refetch()}>Try again</Button></div>}
    {current ? <AdmissionsEditor key={current.id} record={current} onBack={() => setSelected(null)} /> : <>
      <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5"><Label htmlFor="admissions-search">Search</Label><Input id="admissions-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="School, action or owner" /></div>
        <Choice id="admissions-filter" title="Admissions status" value={status} options={["all", ...ADMISSIONS_STATUSES]} onChange={setStatus} />
        <Choice id="diary-filter" title="Visit / diary status" value={diary} options={["all", ...DIARY_STATUSES]} onChange={setDiary} />
        <Choice id="kind-filter" title="School record" value={kind} options={["all", ...RECORD_KINDS]} onChange={setKind} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{rows.length} school records</span><span>Open applications first · earliest deadlines first · unknown dates last</span>
      </div>
      {records.isLoading && <p role="status" className="text-sm text-muted-foreground">Loading admissions…</p>}
      {records.isSuccess && !rows.length && <p className="py-8 text-sm text-muted-foreground">No matching school records.</p>}
      <div className="grid gap-3">
        {rows.map((r) => {
          const a = readAdmissions(r.structured_observations);
          const overdue = a.application_deadline && a.application_deadline < localToday && !["accepted", "declined", "withdrawn"].includes(a.status);
          return <article key={r.id} className="min-w-0 rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2"><Button variant="link" className="h-auto max-w-full whitespace-normal p-0 text-left text-base text-foreground" onClick={() => setSelected(r.id)}>{r.school_name}</Button>
                <div className="flex flex-wrap gap-2"><Badge variant="outline">{kindLabels[r.record_kind] ?? label(r.record_kind)}</Badge>
                  <Badge variant="secondary">{label(a.status)}</Badge><Badge variant={isConfirmedBooking(a) ? "default" : "outline"}>{diaryLabels[a.diary_status]}</Badge></div></div>
              <Button variant="ghost" size="icon" aria-label="Edit admissions" onClick={() => setSelected(r.id)}><ArrowRight className="h-4 w-4" /></Button>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
              <div><dt className="text-xs text-muted-foreground">Application deadline</dt><dd className={overdue ? "mt-1 text-destructive" : "mt-1"}>{a.application_deadline || "Unknown"}{overdue ? " · overdue" : ""}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Visit / diary date</dt><dd className="mt-1">{a.diary_date || "Unknown"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Next action</dt><dd className="mt-1 whitespace-pre-wrap break-words">{a.next_action || "Not recorded"}</dd></div>
              <div><dt className="text-xs text-muted-foreground">Owner · follow-up</dt><dd className="mt-1 break-words">{a.action_owner || "Unassigned"} · {a.follow_up_date || "Unknown"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Entry route</dt><dd className="mt-1 break-words">{a.entry_route || "Not recorded"}</dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Latest email · summary</dt><dd className="mt-1 whitespace-pre-wrap break-words">{a.latest_email_date || "Unknown"} · {a.latest_email_summary || "Not recorded"}</dd></div>
              {a.conflict_notes && <div className="sm:col-span-2 xl:col-span-4"><dt className="text-xs text-muted-foreground">Conflict notes</dt><dd className="mt-1 whitespace-pre-wrap break-words">{a.conflict_notes}</dd></div>}
            </dl>
          </article>;
        })}
      </div>
    </>}
  </div></FounderLayout>;
}

function AdmissionsEditor({ record, onBack }: { record: AdmissionsRecord; onBack: () => void }) {
  const [draft, setDraft] = useState<Admissions>(() => readAdmissions(record.structured_observations));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const qc = useQueryClient();
  const patch = <K extends keyof Admissions>(key: K, value: Admissions[K]) => { setDraft((v) => ({ ...v, [key]: value })); setDirty(true); };
  const save = async () => {
    setSaving(true); setError("");
    try {
      await saveAdmissions(admissionsStore, record.id, draft);
      setDirty(false); toast.success("Admissions saved");
      await Promise.all([qc.invalidateQueries({ queryKey: ["school-admissions-records"] }), qc.invalidateQueries({ queryKey: ["school-visit-records"] })]);
    } catch (e) { setError(e instanceof Error ? e.message : "Nothing was saved. Please try again."); }
    finally { setSaving(false); }
  };
  const textField = (key: keyof Admissions, title: string, type = "text", long = false) => <div className={`min-w-0 space-y-1.5 ${long ? "sm:col-span-2" : ""}`}>
    <Label htmlFor={`edit-${key}`}>{title}</Label>{long
      ? <Textarea id={`edit-${key}`} rows={3} value={draft[key]} onChange={(e) => patch(key, e.target.value as Admissions[typeof key])} />
      : <Input id={`edit-${key}`} type={type} value={draft[key]} onChange={(e) => patch(key, e.target.value as Admissions[typeof key])} />}</div>;

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Button variant="ghost" onClick={() => { if (!dirty || window.confirm("Discard unsaved admissions changes?")) onBack(); }} disabled={saving}><ArrowLeft className="mr-2 h-4 w-4" />All schools</Button>
      <Button onClick={save} disabled={saving || !dirty}><Save className="mr-2 h-4 w-4" />{saving ? "Saving…" : "Save admissions"}</Button>
    </div>
    <h2 className="break-words text-xl font-semibold">{record.school_name}</h2>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <fieldset disabled={saving} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Choice id="edit-status" title="Admissions status" value={draft.status} options={ADMISSIONS_STATUSES} onChange={(v) => patch("status", v as Admissions["status"])} />
      {textField("entry_route", "Entry route")}
      {textField("application_deadline", "Application deadline", "date")}
      {textField("latest_email_date", "Latest email date", "date")}
      {textField("latest_email_summary", "Latest email / status summary", "text", true)}
      <Choice id="edit-diary-status" title="Visit / diary status" value={draft.diary_status} options={DIARY_STATUSES} onChange={(v) => patch("diary_status", v as Admissions["diary_status"])} />
      {textField("diary_date", "Visit / diary date", "date")}
      <p className="flex items-start gap-2 text-xs text-muted-foreground sm:col-span-2"><CalendarDays className="h-4 w-4 shrink-0" />Requests and offered dates remain unconfirmed. Blank dates are unknown.</p>
      {textField("conflict_notes", "Conflict notes", "text", true)}
      {textField("next_action", "Next action", "text", true)}
      {textField("action_owner", "Action owner")}
      {textField("follow_up_date", "Follow-up date", "date")}
    </fieldset>
  </div>;
}