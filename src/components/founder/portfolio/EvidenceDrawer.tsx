import { useState } from "react";
import { ChevronDown, ChevronRight, FileSearch, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type EvidenceItem = {
  source_name?: string;
  source_date?: string | null;
  confidence_score?: number | null;
  freshness_score?: number | null;
  licence_status?: string | null;
  paid_source?: boolean;
  adviser_review_required?: boolean;
  missing_data_notes?: string | null;
  notes?: string | null;
  evidence_table?: string;
  evidence_id?: string;
};

export default function EvidenceDrawer({
  evidence,
  emptyMessage = "Evidence not yet attached. Recommendation should be treated as weak until sources are added.",
}: {
  evidence: EvidenceItem[];
  emptyMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const restricted = evidence.some((e) => e.licence_status === "do_not_store" || e.licence_status === "restricted");
  const adviser = evidence.some((e) => e.adviser_review_required);
  return (
    <div className="border border-border/50 rounded mt-2 text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/40"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <FileSearch className="h-3 w-3 text-primary" />
        <span className="font-medium">Evidence ({evidence.length})</span>
        {restricted && (
          <Badge variant="outline" className="ml-2 gap-1 border-amber-500/40 text-amber-400">
            <AlertTriangle className="h-3 w-3" /> licence-restricted source
          </Badge>
        )}
        {adviser && (
          <Badge variant="outline" className="gap-1 border-violet-500/40 text-violet-400">
            <Lock className="h-3 w-3" /> adviser review
          </Badge>
        )}
      </button>
      {open && (
        <div className="p-3 space-y-2 border-t border-border/50">
          {evidence.length === 0 ? (
            <p className="text-muted-foreground italic">{emptyMessage}</p>
          ) : (
            evidence.map((e, i) => (
              <div key={i} className="rounded border border-border/40 p-2 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{e.source_name ?? e.evidence_table ?? "Source"}</span>
                  {e.source_date && <span className="text-muted-foreground">{e.source_date}</span>}
                  {e.confidence_score != null && <Badge variant="outline">conf {e.confidence_score}</Badge>}
                  {e.freshness_score != null && <Badge variant="outline">fresh {e.freshness_score}</Badge>}
                  {e.licence_status && <Badge variant="outline">{e.licence_status}</Badge>}
                  {e.paid_source && <Badge variant="outline" className="border-amber-500/40 text-amber-400">paid</Badge>}
                </div>
                {e.missing_data_notes && (
                  <div className="text-muted-foreground">Missing: {e.missing_data_notes}</div>
                )}
                {e.notes && <div>{e.notes}</div>}
                {e.evidence_table && (
                  <div className="text-[10px] text-muted-foreground">{e.evidence_table}:{e.evidence_id}</div>
                )}
              </div>
            ))
          )}
          <p className="text-[10px] text-muted-foreground italic pt-1">
            Adopt the market signal — do not copy protected assets.
          </p>
        </div>
      )}
    </div>
  );
}