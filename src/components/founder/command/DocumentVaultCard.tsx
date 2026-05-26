import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderLock, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchDocuments, fetchAccessRules, fetchDataRooms, fetchDataRoomItems, fetchEvidence, summarize, type VaultSummary } from "@/lib/documentVaultEngine";

export default function DocumentVaultCard() {
  const [sum, setSum] = useState<VaultSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchDocuments(), fetchAccessRules(), fetchDataRooms(), fetchDataRoomItems(), fetchEvidence()])
      .then(([d,r,p,i,e]) => setSum(summarize(d,r,p,i,e)))
      .catch(() => setSum(null));
  }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <FolderLock size={14} className="text-primary" />
          Document Vault / Evidence / Data Room
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30"><Lock size={9} className="mr-1" /> Sharing gated</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">Indexes contracts, policies, invoices, insurance, evidence, seller checks and data rooms. External sharing, public links and data room invitations require founder approval.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/documents/vault"     label="Active docs"      value={sum?.active_documents} />
          <Tile to="/founder/documents/vault"     label="Confidential+"    value={sum?.confidential_or_higher} />
          <Tile to="/founder/documents/access"    label="Over-shared"      value={sum?.over_shared_sensitive} cls={bad(sum?.over_shared_sensitive ?? 0)} />
          <Tile to="/founder/documents/data-room" label="Data rooms"       value={sum?.data_rooms} />
          <Tile to="/founder/documents/data-room" label="Room approval"    value={sum?.data_rooms_awaiting_approval} cls={warn(sum?.data_rooms_awaiting_approval ?? 0)} />
          <Tile to="/founder/documents/evidence"  label="Evidence missing" value={sum?.evidence_missing} cls={warn(sum?.evidence_missing ?? 0)} />
        </div>
        {sum?.top_alert && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Top alert · {sum.top_alert.severity}</p>
            <p className="text-sm font-medium">{sum.top_alert.summary}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/documents" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/documents/vault" className="text-primary hover:underline">Vault</Link>
          <Link to="/founder/documents/evidence" className="text-primary hover:underline">Evidence</Link>
          <Link to="/founder/documents/data-room" className="text-primary hover:underline">Data rooms</Link>
          <Link to="/founder/documents/access" className="text-primary hover:underline">Access</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: number | undefined; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}