import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SCLayout, SCSection, SCEmpty } from "./_shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Rec = { id: string; category: string; title: string; detail: string | null; priority: string; status: string; created_at: string };

const priorityTone: Record<string, string> = {
  critical: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  low: "bg-muted text-muted-foreground",
};

export default function SalesCoachingRecommendations() {
  const [rows, setRows] = useState<Rec[]>([]);
  const load = () => supabase.from("sales_coaching_recommendations").select("id,category,title,detail,priority,status,created_at").order("created_at", { ascending: false }).limit(200)
    .then(r => setRows((r.data as Rec[]) || []));
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("sales_coaching_recommendations").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Marked ${status}`); load(); }
  };

  return (
    <SCLayout title="Recommendations" subtitle="Coaching Agent suggestions. Apply, dismiss or send to review — no external action.">
      {rows.length === 0 ? <SCEmpty title="No recommendations yet" hint="Recommendations appear as the Coaching Agent reviews performance weekly." /> : (
        <div className="space-y-2">
          {rows.map(r => (
            <SCSection key={r.id} title={r.title} actions={
              <div className="flex gap-1">
                <Badge variant="outline" className={`text-[10px] ${priorityTone[r.priority] || ""}`}>{r.priority}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                <Badge variant="outline" className="text-[10px]">{r.status}</Badge>
              </div>
            }>
              {r.detail && <p className="text-xs text-muted-foreground">{r.detail}</p>}
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={r.status !== "open"} onClick={() => setStatus(r.id, "in_review")}>Review</Button>
                <Button size="sm" variant="outline" disabled={r.status === "applied"} onClick={() => setStatus(r.id, "applied")}>Apply</Button>
                <Button size="sm" variant="ghost" disabled={r.status === "dismissed"} onClick={() => setStatus(r.id, "dismissed")}>Dismiss</Button>
              </div>
            </SCSection>
          ))}
        </div>
      )}
    </SCLayout>
  );
}