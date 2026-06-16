import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  createAccessWindow,
  extendWindow,
  fetchActiveSessions,
  fetchAllWorkers,
  fetchAuditEvents,
  fetchKillSwitch,
  fetchTodayWindows,
  forceLogoutSession,
  revokeWindow,
  setKillSwitch,
  type PortalType,
  type WorkerRole,
} from "@/lib/humanWorkforce";
import { generateMonthlyPlan, approveMonthlyPlan } from "@/lib/monthlyContentPlanner";
import HumanOversightChainPanel from "@/components/founder/command/HumanOversightChainPanel";
import { fetchTrainingAssignmentsForPeople, type TrainingAssignmentSummary } from "@/lib/lifecycleHandoffs";

function TrainingEvidencePanel() {
  const [rows, setRows] = useState<TrainingAssignmentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTrainingAssignmentsForPeople(50)
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);
  const overdue = rows.filter(r => r.due_at && !r.completed_at && new Date(r.due_at) < new Date()).length;
  const inFlight = rows.filter(r => r.status !== "completed" && !r.completed_at).length;
  const completed = rows.filter(r => r.status === "completed" || r.completed_at).length;
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Video Library training evidence (read-only)</h3>
        <span className="text-[10px] text-muted-foreground">From Video Library → People oversight. View-only.</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Overdue</p><p className="text-sm font-bold text-amber-300">{overdue}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">In flight</p><p className="text-sm font-bold">{inFlight}</p></div>
        <div className="border border-border/50 rounded p-2"><p className="text-[10px] uppercase text-muted-foreground">Completed</p><p className="text-sm font-bold text-emerald-300">{completed}</p></div>
      </div>
      {loading ? <p className="text-xs text-muted-foreground">Loading…</p> : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No training assignments recorded yet.</p>
      ) : (
        <div className="space-y-1 max-h-[420px] overflow-auto">
          {rows.map(r => (
            <div key={r.id} className="border border-border/40 rounded p-2 text-xs flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium truncate">{r.video_title ?? "Untitled video"}</p>
                <p className="text-muted-foreground">
                  {r.assigned_to_role ?? "role —"} · due {r.due_at ? new Date(r.due_at).toLocaleDateString() : "—"} ·
                  {r.completed_at ? ` completed ${new Date(r.completed_at).toLocaleDateString()}` : ` status ${r.status}`}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

const WORKER_ROLES: WorkerRole[] = [
  "technical_operator",
  "dubai_oversight",
  "professional_reviewer",
  "legal_research",
  "admin_support",
];

export default function HumanWorkforceControl() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState<any[]>([]);
  const [windows, setWindows] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [kill, setKill] = useState({ active: false, reason: "" as string | null });

  // Worker form
  const [nw, setNw] = useState({ full_name: "", email: "", role: "technical_operator" as WorkerRole, country: "", hourly_rate: "", provider_company: "" });

  // Window form
  const [wf, setWf] = useState({ workerId: "", portal: "operator" as PortalType, start: "", end: "", maxMinutes: 240 });

  // Task form
  const [tf, setTf] = useState({ workerId: "", title: "", description: "", task_type: "general", requires_approval: false });

  // Monthly plan form
  const [pf, setPf] = useState({ businessId: "", monthStart: new Date().toISOString().slice(0, 10), operatorId: "", oversightId: "" });

  const reload = async () => {
    const [w, win, sess, ks, aud, tk, pl] = await Promise.all([
      fetchAllWorkers(),
      fetchTodayWindows(),
      fetchActiveSessions(),
      fetchKillSwitch(),
      fetchAuditEvents(50),
      (supabase as any).from("worker_tasks").select("*").order("created_at", { ascending: false }).limit(100).then((r: any) => r.data ?? []),
      (supabase as any).from("monthly_business_content_plans").select("*").order("created_at", { ascending: false }).limit(50).then((r: any) => r.data ?? []),
    ]);
    setWorkers(w); setWindows(win); setSessions(sess); setKill({ active: ks.active, reason: ks.reason });
    setAudit(aud); setTasks(tk); setPlans(pl);
  };
  useEffect(() => { reload(); }, []);

  const addWorker = async () => {
    if (!nw.full_name || !nw.email) return toast.error("Name + email required");
    const { error } = await (supabase as any).from("worker_profiles").insert({
      full_name: nw.full_name,
      email: nw.email,
      role: nw.role,
      country: nw.country || null,
      hourly_rate: nw.hourly_rate ? parseFloat(nw.hourly_rate) : null,
      provider_company: nw.provider_company || null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Worker added (pending). Assign their auth user separately.");
    setNw({ full_name: "", email: "", role: "technical_operator", country: "", hourly_rate: "", provider_company: "" });
    reload();
  };

  const addWindow = async () => {
    if (!wf.workerId || !wf.start || !wf.end) return toast.error("All fields required");
    const { error } = await createAccessWindow({
      workerId: wf.workerId,
      portalType: wf.portal,
      startTime: new Date(wf.start),
      endTime: new Date(wf.end),
      maxSessionMinutes: Number(wf.maxMinutes) || 240,
    });
    if (error) return toast.error(error.message);
    toast.success("Access window created");
    setWf({ workerId: "", portal: "operator", start: "", end: "", maxMinutes: 240 });
    reload();
  };

  const addTask = async () => {
    if (!tf.workerId || !tf.title) return toast.error("Worker + title required");
    const { error } = await (supabase as any).from("worker_tasks").insert({
      assigned_to: tf.workerId,
      task_type: tf.task_type,
      title: tf.title,
      description: tf.description,
      requires_founder_approval: tf.requires_approval,
      external_action_blocked: true,
      created_by: user?.id,
    });
    if (error) return toast.error(error.message);
    toast.success("Task assigned");
    setTf({ workerId: "", title: "", description: "", task_type: "general", requires_approval: false });
    reload();
  };

  const genPlan = async () => {
    if (!pf.monthStart) return toast.error("Pick a month start date");
    const res = await generateMonthlyPlan({
      businessId: pf.businessId || null,
      monthStart: new Date(pf.monthStart),
      operatorId: pf.operatorId || null,
      oversightReviewerId: pf.oversightId || null,
    });
    if (res.error) return toast.error("Failed: " + (res.error.message || "unknown"));
    toast.success(`Plan generated with ${res.items.length} items + operator/oversight tasks`);
    reload();
  };

  const approvePlan = async (planId: string) => {
    if (!user) return;
    await approveMonthlyPlan(planId, user.id);
    toast.success("Plan approved. Publishing still requires a separate approved integration.");
    reload();
  };

  const approvalQueue = tasks.filter((t) => t.requires_founder_approval && t.status === "submitted");
  const missedReviews = tasks.filter((t) => t.status === "submitted" && !t.updated_at);

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Human Workforce Control</h1>
        <p className="text-sm text-muted-foreground">Manage workers, time-windowed access, oversight reviews, monthly content and approvals.</p>
      </header>

      <Card className={`p-4 mb-6 border-2 ${kill.active ? "border-destructive" : "border-border/50"}`}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-semibold">Emergency worker access kill switch</h2>
            <p className="text-xs text-muted-foreground">When ON, all worker logins and active sessions are blocked.</p>
            {kill.reason && <p className="text-xs mt-1">Reason: {kill.reason}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={kill.active ? "destructive" : "outline"}>{kill.active ? "BLOCKED" : "open"}</Badge>
            <Switch
              checked={kill.active}
              onCheckedChange={async (v) => {
                const reason = v ? prompt("Reason for blocking all worker access?") ?? "" : "";
                await setKillSwitch(v, reason);
                reload();
              }}
            />
          </div>
        </div>
      </Card>

      <div className="mb-6">
        <HumanOversightChainPanel />
      </div>

      <Tabs defaultValue="workers">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="access">Access</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="oversight">Oversight</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="content">Monthly Content</TabsTrigger>
          <TabsTrigger value="onboarding">Business Onboarding</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="workers" className="mt-4 grid gap-4 md:grid-cols-[1fr,1.4fr]">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Add worker</h3>
            <Input placeholder="Full name" value={nw.full_name} onChange={(e) => setNw({ ...nw, full_name: e.target.value })} />
            <Input placeholder="Email" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} />
            <Select value={nw.role} onValueChange={(v) => setNw({ ...nw, role: v as WorkerRole })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{WORKER_ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Country" value={nw.country} onChange={(e) => setNw({ ...nw, country: e.target.value })} />
            <Input placeholder="Hourly rate" value={nw.hourly_rate} onChange={(e) => setNw({ ...nw, hourly_rate: e.target.value })} />
            <Input placeholder="Provider company (optional)" value={nw.provider_company} onChange={(e) => setNw({ ...nw, provider_company: e.target.value })} />
            <Button onClick={addWorker} variant="glow" className="w-full">Add worker</Button>
            <p className="text-[10px] text-muted-foreground">After adding, link the Supabase auth user_id and assign the matching role under user_roles.</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Workers</h3>
            {workers.length === 0 ? <p className="text-sm text-muted-foreground">No workers yet.</p> : (
              <div className="space-y-2">
                {workers.map((w) => (
                  <div key={w.id} className="p-3 rounded border border-border/50 text-sm flex justify-between gap-2">
                    <div>
                      <div className="font-medium">{w.full_name} <span className="text-xs text-muted-foreground">({w.role})</span></div>
                      <div className="text-xs text-muted-foreground">{w.email} · {w.country ?? "—"} · {w.provider_company ?? "—"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant={w.status === "active" ? "default" : "outline"}>{w.status}</Badge>
                      <Badge variant={w.nda_signed ? "default" : "outline"} className="text-[10px]">{w.nda_signed ? "NDA signed" : "NDA pending"}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="access" className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Create access window</h3>
            <Select value={wf.workerId} onValueChange={(v) => setWf({ ...wf, workerId: v })}>
              <SelectTrigger><SelectValue placeholder="Worker" /></SelectTrigger>
              <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name} ({w.role})</SelectItem>)}</SelectContent>
            </Select>
            <Select value={wf.portal} onValueChange={(v) => setWf({ ...wf, portal: v as PortalType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operator">Operator portal</SelectItem>
                <SelectItem value="oversight">Oversight portal</SelectItem>
              </SelectContent>
            </Select>
            <Input type="datetime-local" value={wf.start} onChange={(e) => setWf({ ...wf, start: e.target.value })} />
            <Input type="datetime-local" value={wf.end} onChange={(e) => setWf({ ...wf, end: e.target.value })} />
            <Input type="number" value={wf.maxMinutes} onChange={(e) => setWf({ ...wf, maxMinutes: Number(e.target.value) })} placeholder="Max session minutes" />
            <Button onClick={addWindow} variant="glow" className="w-full">Create window</Button>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Today's windows</h3>
            {windows.length === 0 ? <p className="text-sm text-muted-foreground">No access windows today.</p> : (
              <div className="space-y-2 text-sm">
                {windows.map((w) => (
                  <div key={w.id} className="p-2 rounded border border-border/50 flex justify-between gap-2 items-center">
                    <div>
                      <div className="font-medium">{workers.find((x) => x.id === w.worker_id)?.full_name ?? w.worker_id}</div>
                      <div className="text-xs text-muted-foreground">{w.portal_type} · {new Date(w.start_time).toLocaleTimeString()}–{new Date(w.end_time).toLocaleTimeString()} · {w.status}</div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={async () => { await extendWindow(w.id, 30); reload(); }}>+30m</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await extendWindow(w.id, 60); reload(); }}>+60m</Button>
                      <Button size="sm" variant="destructive" onClick={async () => { await revokeWindow(w.id); reload(); }}>Revoke</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <h3 className="font-semibold mt-4 mb-2">Active sessions</h3>
            {sessions.length === 0 ? <p className="text-sm text-muted-foreground">No active sessions.</p> : (
              <div className="space-y-1 text-sm">
                {sessions.map((s) => (
                  <div key={s.id} className="p-2 rounded border border-border/50 flex justify-between items-center">
                    <span>{workers.find((x) => x.id === s.worker_id)?.full_name ?? s.worker_id} · since {new Date(s.login_at).toLocaleTimeString()}</span>
                    <Button size="sm" variant="destructive" onClick={async () => { await forceLogoutSession(s.id); reload(); }}>Force logout</Button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="mt-4 grid gap-4 md:grid-cols-[1fr,1.4fr]">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Assign task</h3>
            <Select value={tf.workerId} onValueChange={(v) => setTf({ ...tf, workerId: v })}>
              <SelectTrigger><SelectValue placeholder="Worker" /></SelectTrigger>
              <SelectContent>{workers.map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Task type (e.g. campaign_prep)" value={tf.task_type} onChange={(e) => setTf({ ...tf, task_type: e.target.value })} />
            <Input placeholder="Title" value={tf.title} onChange={(e) => setTf({ ...tf, title: e.target.value })} />
            <Textarea placeholder="SOP / instructions" value={tf.description} onChange={(e) => setTf({ ...tf, description: e.target.value })} rows={4} />
            <label className="flex items-center gap-2 text-xs">
              <Switch checked={tf.requires_approval} onCheckedChange={(v) => setTf({ ...tf, requires_approval: v })} />
              Requires founder approval before completion
            </label>
            <p className="text-[10px] text-muted-foreground">External actions remain blocked by default.</p>
            <Button onClick={addTask} variant="glow" className="w-full">Assign</Button>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Approval queue ({approvalQueue.length})</h3>
            {approvalQueue.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting for approval.</p> : (
              <ul className="text-sm space-y-2">
                {approvalQueue.map((t) => (
                  <li key={t.id} className="p-2 rounded border border-border/50 flex justify-between items-center">
                    <span>{t.title}</span>
                    <Button size="sm" variant="glow" onClick={async () => {
                      await (supabase as any).from("worker_tasks").update({ status: "completed" }).eq("id", t.id);
                      toast.success("Approved & completed");
                      reload();
                    }}>Approve</Button>
                  </li>
                ))}
              </ul>
            )}
            <h3 className="font-semibold mt-4 mb-2">All tasks</h3>
            {tasks.length === 0 ? <p className="text-sm text-muted-foreground">No tasks yet.</p> : (
              <ul className="text-sm space-y-1 max-h-96 overflow-auto">
                {tasks.map((t) => (
                  <li key={t.id} className="p-2 rounded border border-border/50 flex justify-between gap-2">
                    <span>{t.title}</span>
                    <Badge variant="outline" className="text-xs">{t.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="oversight" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Oversight review status</h3>
            {tasks.filter((t) => ["submitted", "reviewed", "needs_changes", "completed"].includes(t.status)).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reviewable tasks yet.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {tasks
                  .filter((t) => ["submitted", "reviewed", "needs_changes", "completed"].includes(t.status))
                  .map((t) => (
                    <li key={t.id} className="p-2 rounded border border-border/50 flex justify-between">
                      <span>{t.title}</span>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </li>
                  ))}
              </ul>
            )}
            {missedReviews.length > 0 && (
              <p className="text-xs text-destructive mt-3">{missedReviews.length} submitted task(s) still awaiting oversight.</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="training" className="mt-4">
          <TrainingEvidencePanel />
        </TabsContent>

        <TabsContent value="content" className="mt-4 grid gap-4 md:grid-cols-[1fr,1.4fr]">
          <Card className="p-4 space-y-2">
            <h3 className="font-semibold">Generate monthly content plan</h3>
            <Input placeholder="Business ID (optional)" value={pf.businessId} onChange={(e) => setPf({ ...pf, businessId: e.target.value })} />
            <Input type="date" value={pf.monthStart} onChange={(e) => setPf({ ...pf, monthStart: e.target.value })} />
            <Select value={pf.operatorId} onValueChange={(v) => setPf({ ...pf, operatorId: v })}>
              <SelectTrigger><SelectValue placeholder="Operator" /></SelectTrigger>
              <SelectContent>
                {workers.filter((w) => w.role === "technical_operator").map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={pf.oversightId} onValueChange={(v) => setPf({ ...pf, oversightId: v })}>
              <SelectTrigger><SelectValue placeholder="Oversight reviewer" /></SelectTrigger>
              <SelectContent>
                {workers.filter((w) => ["dubai_oversight", "professional_reviewer"].includes(w.role)).map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={genPlan} variant="glow" className="w-full">Generate plan</Button>
            <p className="text-[10px] text-muted-foreground">Plan items are draft only. Publishing remains blocked until a founder-approved publishing integration is enabled.</p>
          </Card>
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Plans</h3>
            {plans.length === 0 ? <p className="text-sm text-muted-foreground">No plans yet.</p> : (
              <ul className="text-sm space-y-2">
                {plans.map((p) => (
                  <li key={p.id} className="p-3 rounded border border-border/50 flex justify-between items-center">
                    <div>
                      <div className="font-medium">Month {p.month_start}</div>
                      <div className="text-xs text-muted-foreground">status: {p.status}</div>
                    </div>
                    {!p.founder_approved_at && <Button size="sm" variant="glow" onClick={() => approvePlan(p.id)}>Approve</Button>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4">
          <BusinessOnboardingForm workers={workers} onCreated={reload} />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-2">Recent events</h3>
            {audit.length === 0 ? <p className="text-sm text-muted-foreground">No events yet.</p> : (
              <ul className="text-xs space-y-1 max-h-[600px] overflow-auto">
                {audit.map((e) => (
                  <li key={e.id} className="p-2 rounded border border-border/50 flex justify-between gap-2">
                    <span>
                      <span className="font-mono">{e.event_type}</span>
                      {e.portal_type && <span className="text-muted-foreground"> · {e.portal_type}</span>}
                    </span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BusinessOnboardingForm({ workers, onCreated }: { workers: any[]; onCreated: () => void }) {
  const { user } = useAuth();
  const [f, setF] = useState({
    name: "", website: "", manual_notes: "", brand_tone: "", target_customer: "", offer: "",
    social_channels: "", campaign_objective: "", approval_rules: "",
    operatorId: "", oversightId: "",
  });

  const submit = async () => {
    if (!f.name) return toast.error("Business name required");
    const description = `Starter pack for ${f.name}.
Website: ${f.website}
Brand tone: ${f.brand_tone}
Target customer: ${f.target_customer}
Offer: ${f.offer}
Social channels: ${f.social_channels}
Campaign objective: ${f.campaign_objective}
Approval rules: ${f.approval_rules}

Notes: ${f.manual_notes}`;
    if (f.operatorId) {
      await (supabase as any).from("worker_tasks").insert({
        assigned_to: f.operatorId,
        task_type: "business_onboarding_prep",
        title: `Onboard new business — ${f.name}`,
        description,
        requires_founder_approval: true,
        external_action_blocked: true,
        created_by: user?.id,
      });
    }
    if (f.oversightId) {
      await (supabase as any).from("worker_tasks").insert({
        assigned_to: f.oversightId,
        task_type: "business_onboarding_review",
        title: `Review onboarding pack — ${f.name}`,
        description,
        requires_founder_approval: true,
        external_action_blocked: true,
        created_by: user?.id,
      });
    }
    // Skeleton monthly plan
    await generateMonthlyPlan({
      businessId: null,
      monthStart: new Date(),
      operatorId: f.operatorId || null,
      oversightReviewerId: f.oversightId || null,
      summary: `Auto starter pack for ${f.name}.`,
    });
    toast.success("Onboarding bundle created (Brain pack + 30-day plan + operator & oversight tasks).");
    onCreated();
    setF({ name: "", website: "", manual_notes: "", brand_tone: "", target_customer: "", offer: "", social_channels: "", campaign_objective: "", approval_rules: "", operatorId: "", oversightId: "" });
  };

  return (
    <Card className="p-4 space-y-2 max-w-2xl">
      <h3 className="font-semibold">Business onboarding for worker tasks</h3>
      <Input placeholder="Business name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <Input placeholder="Website URL" value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} />
      <Input placeholder="Brand tone" value={f.brand_tone} onChange={(e) => setF({ ...f, brand_tone: e.target.value })} />
      <Input placeholder="Target customer" value={f.target_customer} onChange={(e) => setF({ ...f, target_customer: e.target.value })} />
      <Input placeholder="Offer" value={f.offer} onChange={(e) => setF({ ...f, offer: e.target.value })} />
      <Input placeholder="Social channels (comma-separated)" value={f.social_channels} onChange={(e) => setF({ ...f, social_channels: e.target.value })} />
      <Input placeholder="Campaign objective" value={f.campaign_objective} onChange={(e) => setF({ ...f, campaign_objective: e.target.value })} />
      <Textarea placeholder="Approval rules" value={f.approval_rules} onChange={(e) => setF({ ...f, approval_rules: e.target.value })} rows={2} />
      <Textarea placeholder="Uploaded manual / notes (paste content here)" value={f.manual_notes} onChange={(e) => setF({ ...f, manual_notes: e.target.value })} rows={4} />
      <Select value={f.operatorId} onValueChange={(v) => setF({ ...f, operatorId: v })}>
        <SelectTrigger><SelectValue placeholder="Assign operator" /></SelectTrigger>
        <SelectContent>
          {workers.filter((w) => w.role === "technical_operator").map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={f.oversightId} onValueChange={(v) => setF({ ...f, oversightId: v })}>
        <SelectTrigger><SelectValue placeholder="Assign oversight reviewer" /></SelectTrigger>
        <SelectContent>
          {workers.filter((w) => ["dubai_oversight", "professional_reviewer"].includes(w.role)).map((w) => <SelectItem key={w.id} value={w.id}>{w.full_name}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button onClick={submit} variant="glow" className="w-full">Create onboarding bundle</Button>
      <p className="text-[10px] text-muted-foreground">No external send, publish, or integration calls. Founder approval required for all downstream actions.</p>
    </Card>
  );
}