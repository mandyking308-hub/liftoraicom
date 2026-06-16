import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ShieldAlert, Stethoscope, FileCheck2, AlertTriangle, ClipboardList, Lock, Loader2, Plus, Ban, CheckCircle2 } from "lucide-react";

const sb: any = supabase;

const STATUS_TONE: Record<string, string> = {
  not_started: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  not_recorded: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  missing: "bg-red-500/15 text-red-300 border-red-500/30",
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  draft: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  present: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  verified: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ready: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  expired: "bg-red-500/15 text-red-300 border-red-500/30",
  rejected: "bg-red-500/15 text-red-300 border-red-500/30",
  adviser_review_required: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  open: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  under_review: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  escalated: "bg-red-500/15 text-red-300 border-red-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  closed: "bg-secondary text-muted-foreground border-border/50",
  logged: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  triage_required: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

function StatusBadge({ value }: { value?: string | null }) {
  if (!value) return <Badge variant="outline" className="text-[10px]">—</Badge>;
  return <Badge variant="outline" className={`${STATUS_TONE[value] ?? "bg-secondary"} text-[10px]`}>{value.replace(/_/g, " ")}</Badge>;
}

async function writeAudit(entity_type: string, entity_id: string | null, event_type: string, new_value: any, actor_id: string | null, actor_email: string | null, business_id: string | null = null, notes: string | null = null) {
  await sb.from("healthcare_audit_events").insert({
    entity_type, entity_id, event_type, new_value, actor_id, actor_email, business_id, notes,
  });
}

function daysUntil(d?: string | null) {
  if (!d) return null;
  return Math.floor((new Date(d).getTime() - Date.now()) / 86400000);
}

function credentialBadge(row: any) {
  if (row.verification_status === "adviser_review_required") return <StatusBadge value="adviser_review_required" />;
  if (row.verification_status === "expired") return <StatusBadge value="expired" />;
  if (row.verification_status === "missing") return <StatusBadge value="missing" />;
  if (row.verification_status === "rejected") return <StatusBadge value="rejected" />;
  if (row.verification_status === "pending") return <StatusBadge value="pending" />;
  const dleft = daysUntil(row.expiry_date);
  if (dleft !== null && dleft < 0) return <StatusBadge value="expired" />;
  if (dleft !== null && dleft <= 30) return <Badge variant="outline" className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px]">expiring soon</Badge>;
  if (row.verification_status === "verified") return <StatusBadge value="verified" />;
  return <StatusBadge value={row.verification_status} />;
}

/* ----------------------------- READINESS TAB ----------------------------- */
function ReadinessTab() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["hc_readiness"],
    queryFn: async () => (await sb.from("healthcare_readiness").select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const create = async () => {
    if (!name.trim()) return toast.error("Business name required");
    const { data: row, error } = await sb.from("healthcare_readiness").insert({
      business_name: name.trim(), created_by: user?.id ?? null,
    }).select().single();
    if (error) return toast.error(error.message);
    await writeAudit("readiness", row.id, "created", { business_name: name }, user?.id ?? null, user?.email ?? null);
    toast.success("Healthcare business registered — defaults to BLOCKED");
    setName(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["hc_readiness"] });
  };

  const updateStatus = async (id: string, field: string, value: string) => {
    const { error } = await sb.from("healthcare_readiness").update({ [field]: value }).eq("id", id);
    if (error) return toast.error(error.message);
    await writeAudit("readiness", id, `${field}_changed`, { [field]: value }, user?.id ?? null, user?.email ?? null);
    qc.invalidateQueries({ queryKey: ["hc_readiness"] });
  };

  const toggleGoLive = async (row: any) => {
    const next = !row.go_live_blocked;
    const allReady = ["credentialing_status","safeguarding_status","clinical_incident_status","special_category_data_status","regulatory_evidence_status"]
      .every((f) => ["ready","approved","present"].includes(row[f]));
    if (!next && !allReady) {
      return toast.error("Cannot unblock — all readiness areas must be ready/approved/present and adviser review recorded");
    }
    const patch: any = { go_live_blocked: next };
    if (!next) {
      patch.founder_approved = true;
      patch.founder_approved_by = user?.id ?? null;
      patch.founder_approved_at = new Date().toISOString();
    }
    const { error } = await sb.from("healthcare_readiness").update(patch).eq("id", row.id);
    if (error) return toast.error(error.message);
    await writeAudit("readiness", row.id, next ? "go_live_blocked" : "go_live_unblocked", patch, user?.id ?? null, user?.email ?? null);
    qc.invalidateQueries({ queryKey: ["hc_readiness"] });
  };

  const STATUSES = ["not_started", "in_progress", "ready", "adviser_review_required"];
  const ADVISER = ["not_recorded", "pending", "approved", "rejected"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Healthcare Readiness Gate</h2>
          <p className="text-xs text-muted-foreground">Every healthcare business defaults to <span className="text-red-400 font-medium">NOT LIVE / BLOCKED</span>. Manual founder approval required to unblock.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Register healthcare business</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Register healthcare business</DialogTitle><DialogDescription>Will default to BLOCKED. Use only internal placeholder names — no patient data.</DialogDescription></DialogHeader>
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Internal — clinical marketplace v1" />
            <DialogFooter><Button onClick={create}>Register (blocked)</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <div className="space-y-3">
          {(data ?? []).length === 0 && <Card><CardContent className="py-6 text-sm text-muted-foreground">No healthcare businesses registered yet.</CardContent></Card>}
          {(data ?? []).map((row: any) => (
            <Card key={row.id} className="tech-card">
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Stethoscope className="h-4 w-4 text-primary" />{row.business_name}
                    {row.go_live_blocked
                      ? <Badge variant="outline" className="bg-red-500/15 text-red-300 border-red-500/30 text-[10px]"><Ban className="h-3 w-3 mr-1" /> NOT LIVE / BLOCKED</Badge>
                      : <Badge variant="outline" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-1" /> Founder-approved</Badge>}
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground mt-1">Governance/evidence only — not a live clinical decision system.</p>
                </div>
                <Button size="sm" variant={row.go_live_blocked ? "default" : "destructive"} onClick={() => toggleGoLive(row)}>
                  {row.go_live_blocked ? "Approve & Unblock" : "Re-block"}
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {[
                  ["provider_onboarding_status", "Provider onboarding"],
                  ["credentialing_status", "Credentialing"],
                  ["safeguarding_status", "Safeguarding"],
                  ["clinical_incident_status", "Clinical incident flow"],
                  ["special_category_data_status", "Special-category data"],
                  ["regulatory_evidence_status", "Regulatory evidence"],
                ].map(([f, label]) => (
                  <div key={f} className="flex flex-col gap-1">
                    <Label className="text-[10px] text-muted-foreground">{label}</Label>
                    <Select value={row[f]} onValueChange={(v) => updateStatus(row.id, f, v)}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] text-muted-foreground">External adviser review</Label>
                  <Select value={row.external_adviser_review_status} onValueChange={(v) => updateStatus(row.id, "external_adviser_review_status", v)}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{ADVISER.map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ----------------------------- GENERIC TABLE TAB ----------------------------- */
type Field = { name: string; label: string; type?: "text"|"textarea"|"date"|"select"|"bool"|"datetime"; options?: string[]; required?: boolean };

function RecordTab({
  title, subtitle, table, queryKey, fields, columns, entityType, statusField,
}: {
  title: string; subtitle: string; table: string; queryKey: string;
  fields: Field[]; columns: { key: string; label: string; render?: (v: any, row: any) => any }[];
  entityType: string; statusField?: string;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => (await sb.from(table).select("*").order("created_at", { ascending: false })).data ?? [],
  });

  const filtered = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return data ?? [];
    return (data ?? []).filter((r: any) => JSON.stringify(r).toLowerCase().includes(f));
  }, [data, filter]);

  const save = async () => {
    for (const f of fields) {
      if (f.required && !vals[f.name]) return toast.error(`${f.label} required`);
    }
    const payload: Record<string, any> = { ...vals, created_by: user?.id ?? null };
    const { data: row, error } = await sb.from(table).insert(payload).select().single();
    if (error) return toast.error(error.message);
    await writeAudit(entityType, row.id, "created", payload, user?.id ?? null, user?.email ?? null, payload.business_id ?? null);
    toast.success("Saved");
    setVals({}); setOpen(false);
    qc.invalidateQueries({ queryKey: [queryKey] });
  };

  const updateField = async (row: any, field: string, value: any) => {
    const { error } = await sb.from(table).update({ [field]: value }).eq("id", row.id);
    if (error) return toast.error(error.message);
    await writeAudit(entityType, row.id, `${field}_changed`, { [field]: value }, user?.id ?? null, user?.email ?? null, row.business_id ?? null);
    qc.invalidateQueries({ queryKey: [queryKey] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Filter…" value={filter} onChange={(e) => setFilter(e.target.value)} className="h-9 w-56" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add</Button></DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader><DialogTitle>New {title}</DialogTitle><DialogDescription>Founder/admin only. Do not enter patient-identifying information.</DialogDescription></DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {fields.map((f) => (
                  <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
                    <Label className="text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
                    {f.type === "textarea" ? (
                      <Textarea value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} rows={3} />
                    ) : f.type === "select" ? (
                      <Select value={vals[f.name] ?? ""} onValueChange={(v) => setVals({ ...vals, [f.name]: v })}>
                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                        <SelectContent>{f.options?.map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : f.type === "bool" ? (
                      <Select value={vals[f.name] === undefined ? "false" : String(vals[f.name])} onValueChange={(v) => setVals({ ...vals, [f.name]: v === "true" })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="false">No</SelectItem><SelectItem value="true">Yes</SelectItem></SelectContent>
                      </Select>
                    ) : (
                      <Input type={f.type === "date" ? "date" : f.type === "datetime" ? "datetime-local" : "text"}
                        value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} />
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? <Loader2 className="animate-spin" /> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>{columns.map((c) => <TableHead key={c.key} className="text-xs">{c.label}</TableHead>)}{statusField && <TableHead className="text-xs">Update status</TableHead>}</TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={columns.length + (statusField ? 1 : 0)} className="text-xs text-muted-foreground py-6 text-center">No records.</TableCell></TableRow>}
                {filtered.map((row: any) => (
                  <TableRow key={row.id}>
                    {columns.map((c) => <TableCell key={c.key} className="text-xs">{c.render ? c.render(row[c.key], row) : (row[c.key] ?? "—")}</TableCell>)}
                    {statusField && (
                      <TableCell>
                        <Select value={row[statusField]} onValueChange={(v) => updateField(row, statusField, v)}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {(fields.find((f) => f.name === statusField)?.options ?? []).map((o) => <SelectItem key={o} value={o}>{o.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/* ----------------------------- AUDIT TAB ----------------------------- */
function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["hc_audit"],
    queryFn: async () => (await sb.from("healthcare_audit_events").select("*").order("created_at", { ascending: false }).limit(200)).data ?? [],
  });
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Audit Trail (last 200)</h2>
      {isLoading ? <Loader2 className="animate-spin" /> : (
        <Card><CardContent className="p-0"><Table>
          <TableHeader><TableRow><TableHead className="text-xs">When</TableHead><TableHead className="text-xs">Entity</TableHead><TableHead className="text-xs">Event</TableHead><TableHead className="text-xs">Actor</TableHead><TableHead className="text-xs">Value</TableHead></TableRow></TableHeader>
          <TableBody>{(data ?? []).map((e: any) => (
            <TableRow key={e.id}>
              <TableCell className="text-[11px]">{new Date(e.created_at).toLocaleString()}</TableCell>
              <TableCell className="text-[11px]">{e.entity_type}</TableCell>
              <TableCell className="text-[11px]">{e.event_type}</TableCell>
              <TableCell className="text-[11px]">{e.actor_email ?? "—"}</TableCell>
              <TableCell className="text-[10px] font-mono truncate max-w-[260px]">{JSON.stringify(e.new_value)}</TableCell>
            </TableRow>
          ))}</TableBody>
        </Table></CardContent></Card>
      )}
    </div>
  );
}

/* ----------------------------- PAGE ----------------------------- */
export default function HealthcareOverlay() {
  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" /> Healthcare Overlay Pack</h1>
            <p className="text-sm text-muted-foreground mt-1">Founder/admin-only governance & evidence layer for credentialing, safeguarding, clinical incidents, regulatory evidence and special-category health data. <span className="text-amber-300">This is not a live clinical system.</span> External clinical/legal/regulatory adviser approval is still required before any healthcare marketplace activation.</p>
          </div>
        </div>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="py-3 text-xs text-amber-200 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Safety guardrails active:</strong> no automated clinical triage, no clinical recommendations, no patient/provider/customer access, no automatic emails, no external sharing. All status changes are audit-logged. Healthcare businesses default to <span className="font-semibold text-red-300">NOT LIVE / BLOCKED</span>.
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="readiness">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="readiness"><Stethoscope className="h-4 w-4 mr-1" /> Readiness</TabsTrigger>
            <TabsTrigger value="credentials"><FileCheck2 className="h-4 w-4 mr-1" /> Credentialing</TabsTrigger>
            <TabsTrigger value="safeguarding"><ShieldAlert className="h-4 w-4 mr-1" /> Safeguarding</TabsTrigger>
            <TabsTrigger value="incidents"><AlertTriangle className="h-4 w-4 mr-1" /> Clinical incidents</TabsTrigger>
            <TabsTrigger value="evidence"><ClipboardList className="h-4 w-4 mr-1" /> Regulatory evidence</TabsTrigger>
            <TabsTrigger value="data"><Lock className="h-4 w-4 mr-1" /> Special-category data</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="readiness" className="mt-4"><ReadinessTab /></TabsContent>

          <TabsContent value="credentials" className="mt-4">
            <RecordTab
              title="Credentialing Register"
              subtitle="Manual founder/admin evidence tracking. Verification is not automatic against external registers."
              table="healthcare_credentials"
              queryKey="hc_credentials"
              entityType="credential"
              statusField="verification_status"
              fields={[
                { name: "person_name", label: "Person/provider name", required: true },
                { name: "role", label: "Role" },
                { name: "credential_type", label: "Credential type", type: "select", required: true,
                  options: ["DBS","GMC","HCPC","NMC","CQC","professional_insurance","right_to_work","qualification","training","safeguarding_training","other"] },
                { name: "credential_body", label: "Issuing body" },
                { name: "registration_number", label: "Registration / reference number" },
                { name: "issue_date", label: "Issue date", type: "date" },
                { name: "expiry_date", label: "Expiry date", type: "date" },
                { name: "verification_status", label: "Verification status", type: "select",
                  options: ["missing","pending","verified","expired","rejected","adviser_review_required"] },
                { name: "evidence_link", label: "Evidence link / reference" },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              columns={[
                { key: "person_name", label: "Person" },
                { key: "credential_type", label: "Type" },
                { key: "credential_body", label: "Body" },
                { key: "expiry_date", label: "Expiry" },
                { key: "verification_status", label: "Status", render: (_, row) => credentialBadge(row) },
              ]}
            />
          </TabsContent>

          <TabsContent value="safeguarding" className="mt-4">
            <RecordTab
              title="Safeguarding Register"
              subtitle="Manual record only. No AI safeguarding advice or automated decisions."
              table="healthcare_safeguarding_records"
              queryKey="hc_safeguarding"
              entityType="safeguarding"
              statusField="status"
              fields={[
                { name: "concern_title", label: "Concern title", required: true },
                { name: "person_reference", label: "Person/provider reference (internal code only — no patient PII)" },
                { name: "concern_type", label: "Concern type" },
                { name: "severity", label: "Severity", type: "select", options: ["low","medium","high","critical"] },
                { name: "reported_by", label: "Reported by" },
                { name: "safeguarding_lead", label: "Safeguarding lead" },
                { name: "immediate_action", label: "Immediate action taken", type: "textarea" },
                { name: "external_referral_required", label: "External referral required", type: "bool" },
                { name: "external_adviser_review_required", label: "External adviser review required", type: "bool" },
                { name: "status", label: "Status", type: "select", options: ["open","under_review","escalated","resolved","closed"] },
                { name: "resolution_notes", label: "Resolution notes", type: "textarea" },
              ]}
              columns={[
                { key: "concern_title", label: "Concern" },
                { key: "severity", label: "Severity", render: (v) => <StatusBadge value={v} /> },
                { key: "safeguarding_lead", label: "Lead" },
                { key: "status", label: "Status", render: (v) => <StatusBadge value={v} /> },
                { key: "reported_at", label: "Reported", render: (v) => v ? new Date(v).toLocaleDateString() : "—" },
              ]}
            />
          </TabsContent>

          <TabsContent value="incidents" className="mt-4">
            <RecordTab
              title="Clinical Incident Flow"
              subtitle="Governance tracking only. The system may flag adviser review but must not decide clinical outcomes."
              table="healthcare_clinical_incidents"
              queryKey="hc_incidents"
              entityType="clinical_incident"
              statusField="status"
              fields={[
                { name: "incident_title", label: "Incident title", required: true },
                { name: "incident_type", label: "Incident type" },
                { name: "severity", label: "Severity", type: "select", options: ["low","medium","high","critical"] },
                { name: "occurred_at", label: "Occurred at", type: "datetime" },
                { name: "affected_person_category", label: "Affected person category (no PII)" },
                { name: "description", label: "Description", type: "textarea" },
                { name: "immediate_containment", label: "Immediate containment", type: "textarea" },
                { name: "duty_of_candour_considered", label: "Duty of candour considered", type: "bool" },
                { name: "complaint_linked", label: "Complaint linked", type: "bool" },
                { name: "insurance_linked", label: "Insurance linked", type: "bool" },
                { name: "regulator_notification_considered", label: "Regulator notification considered", type: "bool" },
                { name: "external_clinical_adviser_review_required", label: "External clinical adviser review required", type: "bool" },
                { name: "status", label: "Status", type: "select", options: ["logged","triage_required","under_review","escalated","resolved","closed"] },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              columns={[
                { key: "incident_title", label: "Incident" },
                { key: "incident_type", label: "Type" },
                { key: "severity", label: "Severity", render: (v) => <StatusBadge value={v} /> },
                { key: "status", label: "Status", render: (v) => <StatusBadge value={v} /> },
                { key: "occurred_at", label: "Occurred", render: (v) => v ? new Date(v).toLocaleString() : "—" },
              ]}
            />
          </TabsContent>

          <TabsContent value="evidence" className="mt-4">
            <RecordTab
              title="Regulatory Evidence Map"
              subtitle="Manual evidence inventory across CQC, safeguarding, complaints, incidents, credentialing, onboarding, training, data protection, insurance and policy categories."
              table="healthcare_regulatory_evidence"
              queryKey="hc_evidence"
              entityType="regulatory_evidence"
              statusField="status"
              fields={[
                { name: "evidence_category", label: "Evidence category", type: "select", required: true,
                  options: ["cqc","safeguarding","complaints","incidents","credentialing","provider_onboarding","training","data_protection","insurance","policy"] },
                { name: "title", label: "Title", required: true },
                { name: "description", label: "Description", type: "textarea" },
                { name: "linked_document", label: "Linked document / reference" },
                { name: "owner", label: "Owner" },
                { name: "review_date", label: "Review date", type: "date" },
                { name: "status", label: "Status", type: "select",
                  options: ["missing","draft","present","adviser_review_required","approved","expired"] },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              columns={[
                { key: "evidence_category", label: "Category" },
                { key: "title", label: "Title" },
                { key: "owner", label: "Owner" },
                { key: "review_date", label: "Review" },
                { key: "status", label: "Status", render: (v) => <StatusBadge value={v} /> },
              ]}
            />
          </TabsContent>

          <TabsContent value="data" className="mt-4">
            <RecordTab
              title="Special-category Health Data Governance"
              subtitle="Governance flags only. Do not store actual health data here."
              table="healthcare_data_governance"
              queryKey="hc_data_gov"
              entityType="data_governance"
              fields={[
                { name: "business_name", label: "Business name", required: true },
                { name: "special_category_data_present", label: "Special-category data present", type: "bool" },
                { name: "lawful_basis_recorded", label: "Lawful basis recorded" },
                { name: "explicit_consent_required", label: "Explicit consent required", type: "bool" },
                { name: "dpia_required", label: "DPIA required", type: "bool" },
                { name: "dpia_status", label: "DPIA status", type: "select", options: ["not_started","in_progress","approved","adviser_review_required"] },
                { name: "retention_policy_status", label: "Retention policy status", type: "select", options: ["not_started","in_progress","approved"] },
                { name: "access_control_review_status", label: "Access control review status", type: "select", options: ["not_started","in_progress","approved"] },
                { name: "external_dpo_legal_review_required", label: "External DPO/legal review required", type: "bool" },
                { name: "external_dpo_legal_review_status", label: "External DPO/legal review status", type: "select", options: ["not_recorded","pending","approved","rejected"] },
                { name: "notes", label: "Notes", type: "textarea" },
              ]}
              columns={[
                { key: "business_name", label: "Business" },
                { key: "special_category_data_present", label: "Special-cat", render: (v) => v ? "Yes" : "No" },
                { key: "dpia_status", label: "DPIA", render: (v) => <StatusBadge value={v} /> },
                { key: "retention_policy_status", label: "Retention", render: (v) => <StatusBadge value={v} /> },
                { key: "external_dpo_legal_review_status", label: "DPO review", render: (v) => <StatusBadge value={v} /> },
              ]}
            />
          </TabsContent>

          <TabsContent value="audit" className="mt-4"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}