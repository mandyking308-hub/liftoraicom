import { useQuery } from "@tanstack/react-query";
import { TsLayout, SeverityBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { listAbuseFlags } from "@/lib/trustSafety";

export default function TsMessages() {
  const { data: rows = [] } = useQuery({ queryKey: ["ts-abuse-flags"], queryFn: () => listAbuseFlags(500) });
  return (
    <TsLayout title="Message abuse" subtitle="Flagged communications: abuse, spam, harassment, scams, suspicious links. Linked back to the Communications Ledger record — no auto-block.">
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">When</th><th className="text-left p-2">Flag</th><th className="text-left p-2">Severity</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Communication ref</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">No abuse flags.</td></tr>}
            {rows.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 capitalize">{r.flag_type.replace(/_/g," ")}</td>
                <td className="p-2"><SeverityBadge severity={r.severity} /></td>
                <td className="p-2 max-w-[360px] truncate">{r.flag_summary ?? "—"}</td>
                <td className="p-2 font-mono text-[10px] text-muted-foreground">{r.communication_record_id.slice(0,8)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </TsLayout>
  );
}
