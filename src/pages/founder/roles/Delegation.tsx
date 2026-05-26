import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection } from "./_shared";
import { supabase } from "@/integrations/supabase/client";
import { classifyDelegation, SENSITIVE_MODULES } from "@/lib/roleAccessEngine";

type WI = { id: string; title: string; source_module: string; approval_required?: boolean };

export default function RolesDelegation() {
  const [items, setItems] = useState<WI[]>([]);
  useEffect(() => {
    (async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("master_work_items").select("id,title,source_module,approval_required")
        .in("status", ["new", "active", "blocked"]).limit(100);
      setItems((data ?? []) as WI[]);
    })();
  }, []);
  const classified = items.map(i => ({ ...i, d: classifyDelegation({ title: i.title, module: i.source_module, external_action: i.approval_required }) }));
  const tone = (s: string) => s === "founder_only" ? "bg-red-500/15 text-red-400 border-red-500/30"
    : s === "adviser_read_only" ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
    : s === "business_operator" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
    : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  return (
    <RALayout title="Delegation Planner" subtitle="The Delegation Agent classifies open work items as founder-only or safe to delegate. Recommendations only — access changes require founder action.">
      <RASection title={`Open work items classified (${classified.length})`}>
        {classified.length === 0 ? <p className="text-xs text-muted-foreground">No open work items found in the Master Work Queue.</p> : (
          <div className="space-y-2 text-xs">
            {classified.map(i => (
              <div key={i.id} className="border border-border/50 rounded p-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${tone(i.d.safe_for)}`}>{i.d.safe_for.replace(/_/g, " ")}</Badge>
                  <Badge variant="outline" className="text-[10px]">{i.source_module}</Badge>
                  {i.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval-gated</Badge>}
                </div>
                <p className="font-medium mt-1">{i.title}</p>
                <p className="text-[11px] text-muted-foreground">{i.d.reason}</p>
              </div>
            ))}
          </div>
        )}
      </RASection>
      <RASection title="Sensitive modules (founder-only by default)">
        <ul className="text-xs grid grid-cols-2 md:grid-cols-3 gap-1">
          {SENSITIVE_MODULES.map(s => <li key={s.module}>· {s.module} — <span className="text-muted-foreground">{s.reason}</span></li>)}
        </ul>
      </RASection>
    </RALayout>
  );
}