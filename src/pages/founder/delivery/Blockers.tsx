import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { DLLayout, DLSection, DLEmpty, STATUS_TONE } from "./_shared";

export default function DeliveryBlockers() {
  const [orders, setOrders] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      supabase.from("delivery_orders").select("*").eq("order_status", "blocked").limit(200),
      supabase.from("delivery_tasks").select("*").eq("task_status", "blocked").limit(200),
    ]).then(([o, t]) => { setOrders(o.data || []); setTasks(t.data || []); setLoading(false); });
  }, []);

  return (
    <DLLayout title="Blockers" subtitle="Everything currently preventing delivery. Resolve internally, escalate, or queue customer-facing actions for founder approval.">
      <DLSection title={`Blocked orders (${orders.length})`}>
        {loading ? <p className="text-xs text-muted-foreground">Loading…</p> :
          orders.length === 0 ? <DLEmpty title="No blocked orders" hint="Fulfilment pipeline is unobstructed." /> :
          <ul className="space-y-2 text-xs">
            {orders.map(o => (
              <li key={o.id} className="border border-border/40 rounded p-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`text-[10px] ${STATUS_TONE[o.order_status]}`}>{o.order_status}</Badge>
                <span className="font-mono">{o.id.slice(0, 8)}</span>
                <span className="text-muted-foreground">· {o.delivery_type}</span>
                {o.due_date && <span className="text-muted-foreground">· due {new Date(o.due_date).toLocaleDateString()}</span>}
                {Array.isArray(o.risk_flags) && o.risk_flags.length > 0 && <span className="text-red-400">flags: {(o.risk_flags as any[]).join(", ")}</span>}
              </li>
            ))}
          </ul>
        }
      </DLSection>

      <DLSection title={`Blocked tasks (${tasks.length})`}>
        {loading ? null :
          tasks.length === 0 ? <DLEmpty title="No blocked tasks" /> :
          <ul className="space-y-2 text-xs">
            {tasks.map(t => (
              <li key={t.id} className="border border-border/40 rounded p-2">
                <p className="font-medium">{t.task_name}</p>
                <p className="text-muted-foreground">{t.task_type} · {t.assigned_to_type} {t.due_at ? `· due ${new Date(t.due_at).toLocaleDateString()}` : ""}</p>
                {t.blocker_reason && <p className="text-red-400 mt-1">⚠ {t.blocker_reason}</p>}
              </li>
            ))}
          </ul>
        }
      </DLSection>
    </DLLayout>
  );
}