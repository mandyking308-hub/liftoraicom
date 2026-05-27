import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert } from "lucide-react";
import {
  ALL_MODES, MODE_BEHAVIOR, fetchRuntimeState, setRuntimeMode,
  isDangerousTransition, type RuntimeState, type SystemMode,
} from "@/lib/systemModeEngine";

export default function SystemModeSwitcherCard() {
  const [state, setState] = useState<RuntimeState | null>(null);
  const [pending, setPending] = useState<SystemMode | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = () => fetchRuntimeState().then(setState).catch(() => setState(null));
  useEffect(() => { reload(); }, []);

  const apply = async () => {
    if (!pending) return;
    setBusy(true);
    await setRuntimeMode(pending, reason || "Founder switch");
    setBusy(false);
    setPending(null);
    setReason("");
    reload();
  };

  const current = state?.mode;
  const cur = current ? MODE_BEHAVIOR[current] : null;

  return (
    <Card className="tech-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-primary" /> System Runtime Mode
          </CardTitle>
          {cur && <Badge variant="outline" className="text-[10px]">{cur.label}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {cur && <p className="text-xs text-muted-foreground">{cur.summary}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_MODES.map((m) => {
            const b = MODE_BEHAVIOR[m];
            const isCurrent = m === current;
            return (
              <Button
                key={m}
                size="sm"
                variant={isCurrent ? "default" : "outline"}
                disabled={isCurrent}
                onClick={() => setPending(m)}
                className="h-auto py-2 text-left flex-col items-start"
              >
                <span className="text-xs font-semibold">{b.label}</span>
                <span className="text-[10px] opacity-70 line-clamp-2">{b.summary}</span>
              </Button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Link to="/founder/runtime-mode" className="text-xs underline text-muted-foreground">View ledger →</Link>
        </div>
      </CardContent>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Switch to {pending ? MODE_BEHAVIOR[pending].label : ""}
              {current && pending && isDangerousTransition(current, pending) && (
                <span className="ml-2 text-rose-400 text-xs">(dangerous transition)</span>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pending && MODE_BEHAVIOR[pending].summary}
              <br />
              <span className="block mt-2 text-xs text-muted-foreground">This change is audited in the mode ledger.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for change (required for audit)"
            className="w-full min-h-[64px] rounded border bg-background p-2 text-xs"
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={apply} disabled={busy || !reason.trim()}>
              Confirm switch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}