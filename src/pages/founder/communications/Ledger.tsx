import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CommsLayout, ChannelBadge, StatusBadge } from "./_shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listRecords, CommChannel, CommStatus, CommDirection } from "@/lib/communicationsLedger";

export default function CommsLedger() {
  const [q, setQ] = useState("");
  const [channel, setChannel] = useState<CommChannel | "">("");
  const [status, setStatus] = useState<CommStatus | "">("");
  const [direction, setDirection] = useState<CommDirection | "">("");
  const { data: rows = [] } = useQuery({
    queryKey: ["comm-ledger", channel, status, direction],
    queryFn: () => listRecords({ channel: channel || undefined, status: status || undefined, direction: direction || undefined, limit: 500 }),
  });
  const filtered = rows.filter(r =>
    !q || (r.subject ?? "").toLowerCase().includes(q.toLowerCase()) || (r.summary ?? "").toLowerCase().includes(q.toLowerCase())
  );
  return (
    <CommsLayout title="Communications Ledger" subtitle="Append-only log of every message logged across Liftor. No raw secrets stored.">
      <Card className="tech-card p-3">
        <div className="grid md:grid-cols-4 gap-2 text-xs">
          <Input placeholder="Search subject/summary…" value={q} onChange={e => setQ(e.target.value)} className="h-8 text-xs" />
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={channel} onChange={e => setChannel(e.target.value as any)}>
            <option value="">All channels</option>
            {["email","voice","sms","whatsapp","social_dm","support_portal","seller_portal","partner_portal","adviser","manual","other"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={status} onChange={e => setStatus(e.target.value as any)}>
            <option value="">All statuses</option>
            {["draft","approval_required","approved","sent","received","failed","blocked","cancelled","logged"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="h-8 bg-background border border-border/50 rounded px-2" value={direction} onChange={e => setDirection(e.target.value as any)}>
            <option value="">All directions</option>
            {["inbound","outbound","internal_note"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </Card>
      <Card className="tech-card p-0 overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-secondary/30 text-muted-foreground">
            <tr><th className="text-left p-2">When</th><th className="text-left p-2">Channel</th><th className="text-left p-2">Dir</th><th className="text-left p-2">Subject</th><th className="text-left p-2">Summary</th><th className="text-left p-2">Status</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">No records.</td></tr>}
            {filtered.map(r => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2"><ChannelBadge channel={r.channel} /></td>
                <td className="p-2 capitalize">{r.direction.replace(/_/g," ")}</td>
                <td className="p-2 max-w-[240px] truncate">{r.subject ?? "—"}</td>
                <td className="p-2 max-w-[360px] truncate text-muted-foreground">{r.summary ?? "—"}</td>
                <td className="p-2"><StatusBadge status={r.communication_status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </CommsLayout>
  );
}
