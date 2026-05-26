import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { RALayout, RASection } from "./_shared";
import { fetchReviewEvents, type AccessReviewEvent } from "@/lib/roleAccessEngine";

const TONE: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
  approved_continue: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  revoke_recommended: "bg-orange-500/15 text-orange-300 border-orange-500/30",
  revoked: "bg-red-500/15 text-red-400 border-red-500/30",
  extended: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

export default function RolesAudit() {
  const [rows, setRows] = useState<AccessReviewEvent[]>([]);
  useEffect(() => { fetchReviewEvents().then(setRows); }, []);
  return (
    <RALayout title="Access Audit & Reviews" subtitle="Periodic, offboarding, risk and expiry reviews. Revocation still requires founder action.">
      <RASection title={`Review events (${rows.length})`}>
        {rows.length === 0 ? <p className="text-xs text-muted-foreground">No review events yet.</p> : (
          <div className="space-y-2 text-xs">
            {rows.map(r => (
              <div key={r.id} className="border border-border/50 rounded p-2 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] ${TONE[r.review_status] ?? ""}`}>{r.review_status}</Badge>
                  <Badge variant="outline" className="text-[10px]">{r.review_type}</Badge>
                  {r.is_test_data && <Badge variant="outline" className="text-[10px] bg-purple-500/15 text-purple-300 border-purple-500/30">LIVE_INTERNAL_TEST</Badge>}
                  <span className="ml-auto text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                {r.notes && <p>{r.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </RASection>
    </RALayout>
  );
}