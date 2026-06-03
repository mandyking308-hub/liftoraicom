import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createDraftBaselineFlows } from "@/lib/aiComplianceEngine";

export default function GuidedSetupCard({ onChanged }: { onChanged?: () => void }) {
  const nav = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);

  const draftFlows = async () => {
    setBusy("draft");
    try {
      const r = await createDraftBaselineFlows();
      toast.success(`Draft data-flow records — ${r.inserted} created, ${r.skipped} already existed, ${r.protected} founder-confirmed (untouched).`);
      onChanged?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to create draft data-flow records");
    } finally { setBusy(null); }
  };

  return (
    <Card className="tech-card border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Guided Compliance Setup</CardTitle>
        <p className="text-xs text-muted-foreground">
          Create draft evidence records and review high-risk systems without processing every item one by one.
          No external actions are taken. Drafts are conservative and never founder-confirmed.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          <Button size="sm" variant="default" onClick={draftFlows} disabled={busy !== null}>
            {busy === "draft" ? "Creating drafts…" : "Create draft baseline data-flow records"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => nav("/founder/ai-compliance/oversight?packet=1")}>
            Create founder review packet
          </Button>
          <Button size="sm" variant="outline" onClick={() => nav("/founder/ai-compliance/systems?filter=external")}>
            Open external-action systems
          </Button>
          <Button size="sm" variant="outline" onClick={() => nav("/founder/ai-compliance/systems?filter=sensitive")}>
            Open sensitive-data systems
          </Button>
          <Button size="sm" variant="outline" onClick={() => { onChanged?.(); toast.success("Command Centre summary will refresh on next load."); }}>
            Refresh Command Centre summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}