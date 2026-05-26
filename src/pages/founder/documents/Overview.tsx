import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DocLayout, DocStat } from "./_shared";
import { fetchDocuments, fetchAccessRules, fetchDataRooms, fetchDataRoomItems, fetchEvidence, summarize, type VaultSummary } from "@/lib/documentVaultEngine";

export default function DocumentsOverview() {
  const [sum, setSum] = useState<VaultSummary | null>(null);
  useEffect(() => {
    Promise.all([fetchDocuments(), fetchAccessRules(), fetchDataRooms(), fetchDataRoomItems(), fetchEvidence()])
      .then(([d,r,p,i,e]) => setSum(summarize(d,r,p,i,e)))
      .catch(() => setSum(null));
  }, []);
  return (
    <DocLayout title="Document Vault Overview" subtitle="Vault metadata, evidence indexing and data room organisation run live. External sharing, public links, data room invitations and adviser/customer/seller access require founder approval.">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <DocStat label="Active documents" value={sum?.active_documents ?? "—"} hint={`${sum?.documents ?? 0} total`} />
        <DocStat label="Confidential+" value={sum?.confidential_or_higher ?? "—"} />
        <DocStat label="Unverified sensitive" value={sum?.unverified_sensitive ?? "—"} tone={(sum?.unverified_sensitive ?? 0) > 0 ? "warn" : "ok"} />
        <DocStat label="Over-shared sensitive" value={sum?.over_shared_sensitive ?? "—"} tone={(sum?.over_shared_sensitive ?? 0) > 0 ? "bad" : "ok"} />
        <DocStat label="External-share rules" value={sum?.external_share_rules ?? "—"} hint={`${sum?.approval_pending_rules ?? 0} require approval`} />
        <DocStat label="Data rooms" value={sum?.data_rooms ?? "—"} hint={`${sum?.data_rooms_shared ?? 0} shared`} />
        <DocStat label="Rooms awaiting approval" value={sum?.data_rooms_awaiting_approval ?? "—"} tone={(sum?.data_rooms_awaiting_approval ?? 0) > 0 ? "warn" : "ok"} />
        <DocStat label="Evidence missing" value={sum?.evidence_missing ?? "—"} tone={(sum?.evidence_missing ?? 0) > 0 ? "warn" : "ok"} />
      </div>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Top alert</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {sum?.top_alert ? (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-orange-500/15 text-orange-300 border-orange-500/30 text-[10px]">{sum.top_alert.severity}</Badge>
              <span className="text-foreground">{sum.top_alert.summary}</span>
            </div>
          ) : <p>No open alerts.</p>}
          <p className="mt-2 text-[11px]">Test records: {sum?.test_records ?? 0} (excluded from live operations).</p>
        </CardContent>
      </Card>
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Integrated with</CardTitle></CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          Contracts · Complaints · Seller Verification · Adviser Pack · Portfolio Exit · Privacy · Access/Roles · Manuals · Command Centre. Every document is tagged by business/entity/type/sensitivity and may link back to its source record.
        </CardContent>
      </Card>
    </DocLayout>
  );
}