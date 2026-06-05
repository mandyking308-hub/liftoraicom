import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function AskLiftorHelp({ taskId, workerId }: { taskId?: string | null; workerId: string }) {
  const [question, setQuestion] = useState("");
  const [thread, setThread] = useState<Array<{ q: string; a: string; uncertain?: boolean; id?: string }>>([]);
  const [busy, setBusy] = useState(false);

  const loadHistory = async () => {
    let q = (supabase as any).from("worker_help_requests").select("*").eq("worker_id", workerId).order("created_at", { ascending: false }).limit(10);
    if (taskId) q = q.eq("task_id", taskId);
    const { data } = await q;
    setThread((data ?? []).reverse().map((r: any) => ({ q: r.question, a: r.answer ?? "", uncertain: r.status === "unresolved", id: r.id })));
  };
  useEffect(() => { loadHistory(); }, [taskId, workerId]);

  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("worker-help-chat", { body: { question, taskId: taskId ?? null } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setThread((t) => [...t, { q: question, a: (data as any).answer, uncertain: (data as any).uncertain }]);
      setQuestion("");
    } catch (e: any) {
      toast.error(e.message ?? "Help chat failed");
    } finally { setBusy(false); }
  };

  const escalate = async (id?: string) => {
    if (!id) { toast("Refresh after asking to escalate"); return; }
    await (supabase as any).from("worker_help_requests").update({ escalated_to_founder: true, status: "escalated" }).eq("id", id);
    toast.success("Escalated to Mandy");
    loadHistory();
  };

  return (
    <Card className="p-4 mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Ask Liftor Help</h3>
        <Badge variant="outline" className="text-[10px]">Answers only from your role manual &amp; current task</Badge>
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {thread.length === 0 ? <p className="text-xs text-muted-foreground">No questions yet. Ask anything about the current task.</p> : thread.map((t, i) => (
          <div key={i} className="space-y-1">
            <div className="text-xs"><span className="text-muted-foreground">Q:</span> {t.q}</div>
            <div className="text-xs whitespace-pre-wrap p-2 bg-secondary/40 rounded">{t.a || "..."}</div>
            {t.uncertain && (
              <Button size="sm" variant="outline" className="text-[10px] h-6" onClick={() => escalate(t.id)}>Escalate to Mandy</Button>
            )}
          </div>
        ))}
      </div>
      <Textarea rows={2} placeholder="Ask a question about this task…" value={question} onChange={(e) => setQuestion(e.target.value)} />
      <div className="flex gap-2">
        <Button size="sm" onClick={ask} disabled={busy}>{busy ? "Asking…" : "Ask"}</Button>
        <span className="text-[10px] text-muted-foreground self-center">Every question is logged. Help cannot send, publish or reveal founder data.</span>
      </div>
    </Card>
  );
}