import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  recordFounderReview, isDecisionAllowed,
  type AIComplianceSystem, type FounderReviewDecision,
} from "@/lib/aiComplianceEngine";

const DECISIONS: { value: FounderReviewDecision; label: string }[] = [
  { value: "needs_adviser", label: "needs adviser" },
  { value: "parked", label: "parked" },
  { value: "blocked", label: "blocked" },
  { value: "approved_as_draft", label: "approved as draft" },
];

export default function ReviewDialog({
  system, open, onOpenChange, onDone,
}: { system: AIComplianceSystem | null; open: boolean; onOpenChange: (v: boolean) => void; onDone?: () => void }) {
  const safeDefault: FounderReviewDecision =
    !system || system.risk_level === "critical" || system.risk_level === "high" || system.external_action_capable
      ? "needs_adviser" : "approved_as_draft";
  const [decision, setDecision] = useState<FounderReviewDecision>(safeDefault);
  const [flowReviewed, setFlowReviewed] = useState(false);
  const [gatesLocked, setGatesLocked] = useState(false);
  const [adviser, setAdviser] = useState(true);
  const [notes, setNotes] = useState("");

  const submit = async () => {
    if (!system) return;
    if (!isDecisionAllowed(system, decision)) {
      toast.error("Approved-as-draft is not allowed for high/critical or external-action systems.");
      return;
    }
    try {
      await recordFounderReview({
        system,
        data_flow_reviewed: flowReviewed,
        external_gates_locked_confirmed: gatesLocked,
        adviser_review_required: adviser,
        notes, decision,
      });
      toast.success("Founder review recorded.");
      onDone?.(); onOpenChange(false);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
  };

  if (!system) return null;
  const lockedToHighSafe = system.risk_level === "critical" || system.risk_level === "high" || system.external_action_capable;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-sm">Record founder review — {system.system_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-xs">
          <p className="text-muted-foreground">
            Risk: <span className="text-foreground">{system.risk_level}</span> ·
            External action: <span className="text-foreground">{system.external_action_capable ? "yes" : "no"}</span> ·
            Founder-confirmed: <span className="text-foreground">{system.founder_confirmed ? "yes" : "no"}</span>
          </p>
          <label className="flex items-center gap-2"><Checkbox checked={flowReviewed} onCheckedChange={v => setFlowReviewed(!!v)} /><span>Data-flow record reviewed</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={gatesLocked} onCheckedChange={v => setGatesLocked(!!v)} /><span>External-action gates confirmed locked</span></label>
          <label className="flex items-center gap-2"><Checkbox checked={adviser} onCheckedChange={v => setAdviser(!!v)} /><span>Adviser review required</span></label>
          <div>
            <Label>Decision</Label>
            <Select value={decision} onValueChange={(v) => setDecision(v as FounderReviewDecision)}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DECISIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}
                    disabled={d.value === "approved_as_draft" && lockedToHighSafe}>
                    {d.label}{d.value === "approved_as_draft" && lockedToHighSafe ? " (blocked for high/critical or external-action)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lockedToHighSafe && (
              <p className="text-[10px] text-yellow-300 mt-1">
                Default for high/critical or external-action systems is needs adviser or parked.
              </p>
            )}
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Record review</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}