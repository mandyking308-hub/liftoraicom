import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchActiveWindow,
  fetchMyWorkerProfile,
  fetchOversightQueue,
  logAuditEvent,
  sessionExpiresAt,
  type AccessWindow,
} from "@/lib/humanWorkforce";

export default function OversightPortal() {
  const [worker, setWorker] = useState<any>(null);
  const [win, setWin] = useState<AccessWindow | null>(null);
  const [queue, setQueue] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState("");
  const [location, setLocation] = useState("Dubai");
  const [status, setStatus] = useState<"reviewed_ok" | "reviewed_issue" | "escalated">("reviewed_ok");
  const [countdown, setCountdown] = useState("");

  const reload = async () => {
    const p = await fetchMyWorkerProfile();
    setWorker(p);
    if (p) {
      const w = await fetchActiveWindow(p.id, "oversight");
      setWin(w);
      setQueue(await fetchOversightQueue());
    }
  };
  useEffect(() => { reload(); }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const [{ data: l }, { data: e }] = await Promise.all([
        (supabase as any).from("worker_task_logs").select("*").eq("task_id", active.id).order("created_at"),
        (supabase as any).from("worker_evidence_uploads").select("*").eq("task_id", active.id).order("created_at"),
      ]);
      setLogs(l ?? []); setEvidence(e ?? []);
      await logAuditEvent({ workerId: worker.id, eventType: "task_view", portalType: "oversight", relatedTaskId: active.id });
    })();
  }, [active, worker]);

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

  const submitReview = async () => {
    if (!active) return;
    await (supabase as any).from("worker_oversight_reviews").insert({
      reviewer_id: worker.id,
      worker_id: active.assigned_to,
      task_id: active.id,
      review_status: status,
      review_notes: notes,
      minutes_spent: minutes ? parseInt(minutes, 10) : null,
      location_basis: location,
    });
    if (status === "reviewed_issue" || status === "escalated") {
      await (supabase as any).from("worker_tasks").update({ status: "needs_changes" }).eq("id", active.id);
    } else {
      await (supabase as any).from("worker_tasks").update({ status: "reviewed" }).eq("id", active.id);
    }
    await logAuditEvent({ workerId: worker.id, eventType: `review_${status}`, portalType: "oversight", relatedTaskId: active.id });
    toast.success("Review recorded");
    setNotes(""); setMinutes(""); setActive(null);
    reload();
  };

  const confirmDailyComplete = async () => {
    await logAuditEvent({ workerId: worker.id, eventType: "oversight_day_complete", portalType: "oversight" });
    toast.success("Daily oversight marked complete");
  };

  const signOut = async () => {
    await logAuditEvent({ workerId: worker?.id, eventType: "logout", portalType: "oversight" });
    await supabase.auth.signOut();
    window.location.href = "/oversight-login";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Oversight Portal</h1>
          <p className="text-xs text-muted-foreground">{worker?.full_name} · {worker?.role}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">Window ends in {countdown}</Badge>
          <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
        </div>
      </header>

      <main className="px-6 py-8 max-w-6xl mx-auto grid gap-6 md:grid-cols-[1fr,1.5fr]">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Today's review queue</h2>
            <Button size="sm" variant="secondary" onClick={confirmDailyComplete}>Confirm day complete</Button>
          </div>
          {queue.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
          ) : (
            <ul className="space-y-2">
              {queue.map((t) => (
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
            <p className="text-sm text-muted-foreground">Select a submitted task to review the work, logs and evidence.</p>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="font-semibold">{active.title}</h2>
                <p className="text-xs text-muted-foreground">{active.task_type}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Operator logs</h3>
                {logs.length === 0 ? <p className="text-xs text-muted-foreground">No logs.</p> : (
                  <ul className="space-y-1 text-xs max-h-48 overflow-auto">
                    {logs.map((l) => (
                      <li key={l.id} className="p-2 bg-secondary/40 rounded">
                        <p>{l.log_text}</p>
                        <p className="text-muted-foreground mt-0.5">{l.time_spent_minutes ?? 0}m · {new Date(l.created_at).toLocaleString()}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-1">Evidence</h3>
                {evidence.length === 0 ? <p className="text-xs text-muted-foreground">No evidence.</p> : (
                  <ul className="text-xs space-y-1">
                    {evidence.map((e) => (
                      <li key={e.id}>
                        <a href={e.file_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                          [{e.evidence_type}] {e.file_url}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2 border-t border-border/50 pt-3">
                <h3 className="text-sm font-medium">Record review</h3>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed_ok">Reviewed OK</SelectItem>
                    <SelectItem value="reviewed_issue">Reviewed — issue</SelectItem>
                    <SelectItem value="escalated">Escalate to founder</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes for Mandy" rows={3} />
                <div className="flex gap-2">
                  <Input type="number" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-32" />
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dubai">Dubai</SelectItem>
                      <SelectItem value="UAE">UAE</SelectItem>
                      <SelectItem value="professional firm">Professional firm</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="glow" onClick={submitReview}>Submit review</Button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                You can review and add notes only. You cannot edit operator work, publish, send, delete or export.
              </p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}