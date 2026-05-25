import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, ArrowRight, Lock } from "lucide-react";

export default function CRMContactUpgradePanel({ contactId }: { contactId: string }) {
  const { data } = useQuery({
    queryKey: ["crm-contact-upgrades", contactId],
    enabled: !!contactId,
    queryFn: async () => {
      const sb: any = supabase as any;
      const { data } = await sb.from("customer_upgrade_opportunities")
        .select("id,opportunity_type,status,estimated_value,currency,probability_score,urgency_score,trigger_reason,recommended_pitch,due_at,created_at")
        .eq("contact_id", contactId)
        .order("urgency_score", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const items = data ?? [];

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp size={14} className="text-primary" /> Upgrade + Upsell signals
          <Badge variant="outline" className="ml-1 bg-yellow-500/15 text-yellow-300 border-yellow-500/30 text-[10px]"><Lock size={9} className="mr-1" /> external send locked</Badge>
          <Link to="/founder/customer-upgrades/opportunities" className="ml-auto text-[11px] text-primary inline-flex items-center gap-1">Open <ArrowRight size={10} /></Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        {items.length === 0 ? (
          <p className="text-muted-foreground">No upgrade signals captured for this contact yet.</p>
        ) : items.map((o: any) => (
          <div key={o.id} className="rounded border border-border/50 p-2 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{o.opportunity_type}</Badge>
              <Badge variant="outline">{o.status}</Badge>
              <span className="font-semibold">{(o.currency || "GBP")} {Math.round(Number(o.estimated_value || 0)).toLocaleString()}</span>
              <span className="text-muted-foreground">Urg {(Number(o.urgency_score) * 100).toFixed(0)}%</span>
            </div>
            {o.trigger_reason && <div className="text-muted-foreground line-clamp-2">{o.trigger_reason}</div>}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}