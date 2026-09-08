import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { listRecords } from "@/lib/communicationsLedger";

export default function CommsReceived() {
  const { data: rows = [] } = useQuery({ queryKey: ["comm-received"], queryFn: () => listRecords({ direction: "inbound", limit: 300 }) });
  const { data: businesses = [] } = useQuery({queryKey:["communication-business-names"],queryFn:async()=>{
    const {data,error}=await supabase.from("businesses").select("id,name");if(error)throw error;return data??[];
  }});
  return (
    <CommsLayout title="Received messages" subtitle="Read incoming messages and see which business each conversation belongs to.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">Received</th><th className="text-left p-2">Business</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Subject</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No inbound messages.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.received_at ?? r.created_at).toLocaleString()}</td>
                <td className="p-2">{businesses.find(b=>b.id===r.business_id)?.name ?? "Unassigned"}</td>
                <td className="p-2"><ChannelBadge channel={r.channel} /></td>
                <td className="p-2 max-w-[260px] truncate">{r.subject ?? "—"}</td>
                <td className="p-2 max-w-[480px]"><details><summary className="cursor-pointer">Read message</summary><p className="mt-2 whitespace-pre-wrap break-words">{r.summary ?? "No message text available."}</p></details></td>
                <td className="p-2"><StatusBadge status={r.communication_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </CommsLayout>
  );
}
