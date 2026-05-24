import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Sparkles } from "lucide-react";
import { FEEDBACK_LABELS, recordFeedback, type FeedbackLabel } from "@/services/aiQualityScores";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ai_usage_ledger_id: string | null;
  context_title?: string;
  onRecorded?: () => void;
}

export default function AIQualityFeedbackDialog({ open, onOpenChange, ai_usage_ledger_id, context_title, onRecorded }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [label, setLabel] = useState<FeedbackLabel | null>(null);
  const [notes, setNotes] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      if (!ai_usage_ledger_id || !label) throw new Error("Pick a rating first.");
      await recordFeedback({
        ai_usage_ledger_id,
        label,
        notes: notes || null,
        reviewer_id: user?.id ?? null,
      });
    },
    onSuccess: () => {
      toast({ title: "Feedback recorded", description: "Quality score saved and ledger updated." });
      qc.invalidateQueries({ queryKey: ["ai-quality"] });
      qc.invalidateQueries({ queryKey: ["roi-overall"] });
      qc.invalidateQueries({ queryKey: ["ai-usage-ledger"] });
      setLabel(null);
      setNotes("");
      onRecorded?.();
      onOpenChange(false);
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Rate AI output</DialogTitle>
          <DialogDescription>{context_title ?? "Quality feedback feeds ROI and routing recommendations."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-auto pr-1">
          {FEEDBACK_LABELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setLabel(l.value)}
              className={`text-left rounded-md border p-2 text-xs transition ${
                label === l.value
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-secondary"
              }`}
            >
              <div className="font-medium text-sm">{l.label}</div>
              <div className="text-muted-foreground">{l.description}</div>
            </button>
          ))}
        </div>
        <div className="space-y-1">
          <Label className="text-xs uppercase text-muted-foreground">Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What worked or didn't…" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => submit.mutate()} disabled={submit.isPending || !label || !ai_usage_ledger_id}>
            Save feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}