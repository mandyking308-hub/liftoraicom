import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection, RAEmpty } from "./_shared";

type Approval = { id: string; action_type: string; action_status: string; expected_value: number | null; currency: string | null; created_at: string };

export default function RevenueAutopilotApprovals() {
  const [rows, setRows] = useState<Approval[]>([]);
  useEffect(() => {
    supabase.from("customer_sales_close_actions").select("id,action_type,action_status,expected_value,currency,created_at").eq("action_status", "approval_required").order("created_at", { ascending: false }).limit(200)
      .then(r => setRows((r.data as Approval[]) || []));
  }, []);

  return (
    <RALayout title="Approvals" subtitle="External actions Liftor has prepared but cannot send without founder sign-off. Confirmed revenue updates only after verified payment, contract, subscription or booking completion.">
      <RASection title={`Close actions awaiting approval (${rows.length})`} actions={<Link to="/founder/customer-sales/close-engine" className="text-xs text-primary hover:underline">Open close engine →</Link>}>
        {rows.length === 0 ? <RAEmpty title="Nothing waiting" hint="No external send is currently blocked." /> : (
          <ul className="text-xs space-y-2">
            {rows.map(r => (
              <li key={r.id} className="flex justify-between border-b border-border/40 pb-2">
                <span>{r.action_type}{(r.expected_value || 0) > 0 ? ` — ${r.currency || "USD"} ${Math.round(r.expected_value || 0).toLocaleString()}` : ""}</span>
                <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">approval required</Badge>
              </li>
            ))}
          </ul>
        )}
      </RASection>
    </RALayout>
  );
}