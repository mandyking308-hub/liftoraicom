import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { APLayout, APSection, APEmpty, NoAutoAdviserBanner } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { QUESTION_STATUS_TONE } from "@/lib/adviserPackEngine";

type Q = { id: string; pack_id: string | null; question: string; category: string; priority: string; status: string; answer_summary: string | null; created_at: string };

export default function AdviserPackQuestions() {
  const [qs, setQs] = useState<Q[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("adviser_questions").select("*").order("created_at", { ascending: false });
      setQs(data ?? []);
    })();
  }, []);

  const open = qs.filter(q => ["draft", "approved_to_send"].includes(q.status));
  const answered = qs.filter(q => ["answered", "closed"].includes(q.status));

  return (
    <APLayout title="Adviser questions" subtitle="Tax / legal / accounting / structuring / IHT questions surfaced from the period. Drafts are reviewed; only founder-approved questions are sent to advisers.">
      <NoAutoAdviserBanner />
      <APSection title={`Open (${open.length})`}>
        {open.length === 0 ? <APEmpty title="No open adviser questions" /> : <QList items={open} />}
      </APSection>
      <APSection title={`Answered / closed (${answered.length})`}>
        {answered.length === 0 ? <APEmpty title="No answered questions yet" /> : <QList items={answered} />}
      </APSection>
    </APLayout>
  );
}

function QList({ items }: { items: Q[] }) {
  return (
    <div className="space-y-2">
      {items.map(q => (
        <div key={q.id} className="rounded border border-border/50 p-3 space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="text-[10px]">{q.category}</Badge>
            <Badge variant="outline" className="text-[10px]">{q.priority}</Badge>
            <Badge variant="outline" className={`${QUESTION_STATUS_TONE[q.status]} text-[10px]`}>{q.status}</Badge>
            <span className="text-muted-foreground ml-auto">{new Date(q.created_at).toLocaleDateString()}</span>
          </div>
          <p className="text-sm">{q.question}</p>
          {q.answer_summary && <p className="text-xs text-muted-foreground border-l border-primary/40 pl-2">Adviser: {q.answer_summary}</p>}
        </div>
      ))}
    </div>
  );
}