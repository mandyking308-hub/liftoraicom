import { useEffect, useState } from "react";
import { EMLayout, EMSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchAdviserQuestions, fetchEntities, pushAdviserQuestion, type AdviserQuestion, type LegalEntity } from "@/lib/entityMapEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CATEGORIES = ["vat","sales_tax","corporation_tax","us_tax","uae_tax","transfer_pricing","withholding","payroll","other"] as const;

export default function EMAdviserQuestions() {
  const [questions, setQuestions] = useState<AdviserQuestion[]>([]);
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [entityId, setEntityId] = useState("");
  const [question, setQuestion] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("vat");
  const [priority, setPriority] = useState("normal");

  async function load() {
    setQuestions(await fetchAdviserQuestions());
    setEntities(await fetchEntities());
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function add() {
    if (!question) return toast.error("Question required");
    try {
      await pushAdviserQuestion({ question, category, business_id: businessId || undefined, legal_entity_id: entityId || undefined, priority });
      toast.success("Routed to adviser queue (no email sent)");
      setQuestion("");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); }
  }
  async function setStatus(id: string, status: AdviserQuestion["status"]) {
    const { error } = await supabase.from("tax_sensitive_questions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status → ${status}`); load();
  }

  return (
    <EMLayout title="Adviser questions" subtitle="Tax/legal-sensitive items are queued here for adviser review. Liftor never sends advice as final truth.">
      <EMSection title="Add adviser question">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1"><Label>Business ID (optional)</Label><Input value={businessId} onChange={e => setBusinessId(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Legal entity (optional)</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={entityId} onChange={e => setEntityId(e.target.value)}>
              <option value="">—</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.entity_name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Category</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={category} onChange={e => setCategory(e.target.value as any)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Priority</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={priority} onChange={e => setPriority(e.target.value)}>
              {["low","normal","high","urgent"].map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-3"><Label>Question</Label><Textarea rows={3} value={question} onChange={e => setQuestion(e.target.value)} /></div>
        </div>
        <div className="pt-3"><Button size="sm" onClick={add}>Send to adviser queue</Button></div>
      </EMSection>

      <EMSection title={`Queue (${questions.length})`}>
        {questions.length === 0 ? <p className="text-sm text-muted-foreground">No questions yet.</p> : (
          <div className="space-y-2">
            {questions.map(q => (
              <div key={q.id} className="border border-border/50 rounded p-3 text-xs space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{q.priority}</Badge>
                  <span className="ml-auto text-muted-foreground">{new Date(q.created_at).toLocaleString()}</span>
                </div>
                <p>{q.question}</p>
                <div className="flex gap-1 pt-1">
                  {q.status !== "answered" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(q.id, "answered")}>Mark answered</Button>}
                  {q.status !== "closed" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(q.id, "closed")}>Close</Button>}
                  {q.status === "draft" && <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setStatus(q.id, "adviser_review")}>Send for review</Button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </EMSection>
    </EMLayout>
  );
}