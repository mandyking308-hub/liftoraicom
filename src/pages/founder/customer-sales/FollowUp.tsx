import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CSLayout, CSSection, CSEmptyState } from "./_shared";
import { Badge } from "@/components/ui/badge";

export default function FollowUp() {
  const { data } = useQuery({
    queryKey: ["cs-follow-up"],
    queryFn: async () => {
      const sb: any = supabase;
      const { data } = await sb.from("customer_sales_conversations").select("*")
        .in("conversation_status", ["follow_up_needed", "live", "planned"]).order("updated_at", { ascending: false }).limit(50);
      return (data ?? []) as any[];
    },
  });
  return (
    <CSLayout title="Follow-up Queue" subtitle="Conversations that need a next step. Internal drafting is live; sending to the customer remains approval-gated.">
      <CSSection title={`${data?.length ?? 0} item${(data?.length ?? 0) === 1 ? "" : "s"}`}>
        {(data?.length ?? 0) === 0 ? (
          <CSEmptyState title="No follow-ups pending" hint="Liftor will surface conversations here that require a next step or human review." />
        ) : (
          <ul className="space-y-2 text-xs">
            {data!.map(c => (
              <li key={c.id} className="rounded border border-border/40 bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{c.customer_name ?? c.customer_email ?? c.customer_phone ?? "Unknown"}</span>
                  <Badge variant="outline" className="text-[10px]">{c.conversation_status}</Badge>
                </div>
                <p className="text-muted-foreground mt-1">{c.recommended_next_action ?? "Review and decide next step."}</p>
                {c.customer_need && <p className="text-muted-foreground mt-1">Need: {c.customer_need}</p>}
              </li>
            ))}
          </ul>
        )}
      </CSSection>
    </CSLayout>
  );
}