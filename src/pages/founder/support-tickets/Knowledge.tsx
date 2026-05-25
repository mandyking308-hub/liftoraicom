import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { STLayout, STSection, STEmpty } from "./_shared";

export default function SupportKnowledge() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    supabase.from("support_knowledge_articles").select("*").order("updated_at", { ascending: false }).limit(200)
      .then(r => { setRows(r.data || []); setLoading(false); });
  }, []);

  return (
    <STLayout title="Support knowledge" subtitle="Verified knowledge the Support Agent uses to draft replies. Only founder-verified articles are used in customer-facing drafts.">
      <STSection title={`Articles (${rows.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          rows.length === 0 ? <STEmpty title="No knowledge articles" hint="Add articles to power Support Agent reply drafts." /> :
          <ul className="text-xs space-y-2">
            {rows.map((a: any) => {
              const verified = a.approved === true || a.approval_status === "approved";
              const active = a.publish_status !== "archived" && a.article_status !== "archived";
              return (
                <li key={a.id} className="border border-border/40 rounded p-2 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{a.title || a.article_title || "(untitled)"}</span>
                    {verified
                      ? <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">verified</Badge>
                      : <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">unverified</Badge>}
                    {!active && <Badge variant="outline" className="text-[10px]">inactive</Badge>}
                  </div>
                  {(a.short_answer || a.content) && <p className="text-muted-foreground line-clamp-3">{a.short_answer || a.content}</p>}
                </li>
              );
            })}
          </ul>
        }
      </STSection>
    </STLayout>
  );
}