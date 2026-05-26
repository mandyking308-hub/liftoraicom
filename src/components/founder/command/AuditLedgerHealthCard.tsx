import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchAuditEvents, summarizeAudit, type AuditSummary } from "@/lib/globalAuditLedger";

export default function AuditLedgerHealthCard() {
  const [sum, setSum] = useState<AuditSummary | null>(null);
  useEffect(() => { fetchAuditEvents({ limit: 500, include_test: true }).then(e => setSum(summarizeAudit(e))).catch(() => setSum(null)); }, []);
  const warn = (n: number) => n > 0 ? "bg-yellow-500/10 text-yellow-300 border-yellow-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  const bad  = (n: number) => n > 0 ? "bg-red-500/10 text-red-300 border-red-500/30" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShieldCheck size={14} className="text-primary" />
          Global Audit Ledger
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Append-only live</Badge>
          <Badge variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-300 border-yellow-500/30">
            <Lock size={9} className="mr-1" /> Export = approval
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-3">
        <p className="text-muted-foreground">One audit trail across 25 businesses: AI, approvals, external sends, config, access, finance, privacy, contracts and provider events. Secrets redacted at write.</p>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <Tile to="/founder/audit-ledger/events"     label="Events 24h"     value={sum?.events_today} />
          <Tile to="/founder/audit-ledger/sensitive"  label="High sens. 24h" value={sum?.high_sensitivity_today} cls={warn(sum?.high_sensitivity_today ?? 0)} />
          <Tile to="/founder/audit-ledger/sensitive"  label="External 24h"   value={sum?.external_side_effect_today} cls={warn(sum?.external_side_effect_today ?? 0)} />
          <Tile to="/founder/audit-ledger/sensitive"  label="Blocked ext."   value={sum?.blocked_external_today} cls={bad(sum?.blocked_external_today ?? 0)} />
          <Tile to="/founder/audit-ledger/events"     label="Access 24h"     value={sum?.access_changes_today} cls={warn(sum?.access_changes_today ?? 0)} />
          <Tile to="/founder/audit-ledger/events"     label="Config 24h"     value={sum?.configuration_changes_today} />
        </div>
        {sum && (
          <div className="border border-primary/30 rounded p-2 bg-primary/5">
            <p className="text-[10px] uppercase text-muted-foreground">Recommended review</p>
            <p className="text-sm font-medium">{sum.recommended_review}</p>
          </div>
        )}
        <div className="flex gap-2 flex-wrap text-[11px]">
          <Link to="/founder/audit-ledger" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/audit-ledger/events" className="text-primary hover:underline">Events</Link>
          <Link to="/founder/audit-ledger/by-business" className="text-primary hover:underline">By business</Link>
          <Link to="/founder/audit-ledger/by-user" className="text-primary hover:underline">By user</Link>
          <Link to="/founder/audit-ledger/by-module" className="text-primary hover:underline">By module</Link>
          <Link to="/founder/audit-ledger/sensitive" className="text-primary hover:underline">Sensitive</Link>
        </div>
      </CardContent>
    </Card>
  );
}
function Tile({ to, label, value, cls }: { to: string; label: string; value: any; cls?: string }) {
  return (
    <Link to={to} className={`border ${cls ?? "border-border/50"} rounded p-2 hover:border-primary/40 transition`}>
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value ?? "—"}</p>
    </Link>
  );
}