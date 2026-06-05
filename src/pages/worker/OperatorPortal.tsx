import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import CampaignSetupTasks from "@/components/worker/CampaignSetupTasks";
import AskLiftorHelp from "@/components/worker/AskLiftorHelp";
import {
  fetchActiveWindow,
  fetchAssignedTasks,
  fetchMyWorkerProfile,
  logAuditEvent,
  sessionExpiresAt,
  type AccessWindow,
} from "@/lib/humanWorkforce";

export default function OperatorPortal() {
  const [worker, setWorker] = useState<any>(null);
  const [win, setWin] = useState<AccessWindow | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [log, setLog] = useState("");
  const [minutes, setMinutes] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceType, setEvidenceType] = useState("link");
  const [countdown, setCountdown] = useState("");

  const reload = async () => {
    const p = await fetchMyWorkerProfile();
    setWorker(p);
    if (p) {
      const w = await fetchActiveWindow(p.id, "operator");
      setWin(w);
      setTasks(await fetchAssignedTasks(p.id));
    }
  };

  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!win) return;
    const expiry = sessionExpiresAt(new Date(), win);
    const tick = setInterval(() => {
      const left = expiry.getTime() - Date.now();
      if (left <= 0) { setCountdown("expired"); return; }
      const m = Math.floor(left / 60_000);
      const s = Math.floor((left % 60_000) / 1000);
      setCountdown(`${m}m ${s.toString().padStart(2, "0")}s`);
    }, 1000);
    return () => clearInterval(tick);
  }, [win]);

  const startTask = async (t: any) => {
    setActive(t);
    await (supabase as any).from("worker_tasks").update({ status: "in_progress" }).eq("id", t.id);
    await logAuditEvent({ workerId: worker.id, eventType: "task_start", portalType: "operator", relatedTaskId: t.id });
    reload();
  };

  const submitLog = async () => {
    if (!active || !log.trim()) return;
    await (supabase as any).from("worker_task_logs").insert({
      task_id: active.id,
      worker_id: worker.id,
      log_text: log,
      time_spent_minutes: minutes ? parseInt(minutes, 10) : null,
    });
    await logAuditEvent({ workerId: worker.id, eventType: "task_log", portalType: "operator", relatedTaskId: active.id });
    setLog(""); setMinutes("");
    toast.success("Log submitted");
  };

  const uploadEvidence = async () => {
    if (!active || !evidenceUrl.trim()) return;
    await (supabase as any).from("worker_evidence_uploads").insert({
      task_id: active.id,
      worker_id: worker.id,
      file_url: evidenceUrl,
      evidence_type: evidenceType,
    });
    await logAuditEvent({ workerId: worker.id, eventType: "evidence_upload", portalType: "operator", relatedTaskId: active.id });
    setEvidenceUrl("");
    toast.success("Evidence recorded");
  };

  const requestClarification = async () => {
    if (!active) return;
    const text = prompt("Describe the clarification you need:");
    if (!text) return;
    await (supabase as any).from("worker_task_logs").insert({
      task_id: active.id,
      worker_id: worker.id,
      log_text: `CLARIFICATION REQUEST: ${text}`,
      status_update: "clarification_requested",
    });
    await logAuditEvent({ workerId: worker.id, eventType: "clarification_request", portalType: "operator", relatedTaskId: active.id });
    toast.success("Sent to Mandy");
  };

  const markSubmitted = async () => {
    if (!active) return;
    await (supabase as any).from("worker_tasks").update({ status: "submitted" }).eq("id", active.id);
    await logAuditEvent({ workerId: worker.id, eventType: "task_submitted", portalType: "operator", relatedTaskId: active.id });
    toast.success("Marked submitted");
    setActive(null);
    reload();
  };

  const signOut = async () => {
    await logAuditEvent({ workerId: worker?.id, eventType: "logout", portalType: "operator" });
    await supabase.auth.signOut();
    window.location.href = "/operator-login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Operator Portal</h1>
          <p className="text-xs text-muted-foreground">{worker?.full_name} · {worker?.country ?? "—"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">Window ends in {countdown}</Badge>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-5xl mx-auto grid gap-6 md:grid-cols-[1fr,1.5fr]">
        <Card className="p-4">
          <h2 className="font-semibold mb-3">Assigned tasks</h2>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks assigned right now.</p>
          ) : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActive(t)}
                    className={`w-full text-left p-3 rounded-lg border ${active?.id === t.id ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-sm">{t.title}</span>
                      <Badge variant="outline" className="text-xs">{t.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.task_type}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          {!active ? (
            <p className="text-sm text-muted-foreground">Select a task to view its SOP and submit work.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold">{active.title}</h2>
                <p className="text-xs text-muted-foreground">{active.task_type} · status: {active.status}</p>
              </div>
              <div className="text-sm whitespace-pre-wrap p-3 bg-secondary/40 rounded-lg">
                {active.description || "No SOP / instructions attached. Request clarification."}
              </div>
              {active.status === "assigned" && (
                <Button onClick={() => startTask(active)} variant="glow" size="sm">Start task</Button>
              )}
              <div className="space-y-2">
                <label className="text-xs font-medium">Submit work log</label>
                <Textarea value={log} onChange={(e) => setLog(e.target.value)} placeholder="What did you do?" rows={3} />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Minutes spent" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-40" />
                  <Button size="sm" variant="secondary" onClick={submitLog}>Save log</Button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Upload evidence (link / file URL)</label>
                <div className="flex gap-2">
                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="screenshot">Screenshot</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" />
                  <Button size="sm" variant="secondary" onClick={uploadEvidence}>Add</Button>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" onClick={requestClarification}>Request clarification</Button>
                <Button size="sm" variant="glow" onClick={markSubmitted}>Mark submitted</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                You cannot publish, send, delete, export, or access secrets or founder systems from this portal.
              </p>
              {worker && <AskLiftorHelp workerId={worker.id} taskId={active.id} />}
            </div>
          )}
        </Card>
      </main>
      {worker && (
        <div className="px-6 pb-10 max-w-5xl mx-auto">
          <CampaignSetupTasks workerId={worker.id} />
        </div>
      )}
    </div>
  );
}