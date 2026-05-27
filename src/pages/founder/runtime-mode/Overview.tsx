import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SystemModeSwitcherCard from "@/components/founder/command/SystemModeSwitcherCard";
import { fetchModeLedger, MODE_BEHAVIOR, type LedgerEntry } from "@/lib/systemModeEngine";

export default function RuntimeModeOverview() {
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  useEffect(() => {
    fetchModeLedger(200).then(setLedger).catch(() => setLedger([]));
  }, []);
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold">System Runtime Mode</h1>
        <p className="text-xs text-muted-foreground">
          Global runtime state for Liftor. Every transition is audited in the mode ledger below.
        </p>
      </div>
      <SystemModeSwitcherCard />
      <Card className="tech-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Mode history ledger</CardTitle>
        </CardHeader>
        <CardContent>
          {ledger.length === 0 ? (
            <p className="text-xs text-muted-foreground">No transitions recorded yet.</p>
          ) : (
            <ul className="text-xs divide-y divide-border">
              {ledger.map((e) => (
                <li key={e.id} className="py-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
                    <div>
                      <span className="text-muted-foreground">
                        {e.previous_mode ? MODE_BEHAVIOR[e.previous_mode].label : "—"} →
                      </span>{" "}
                      <span className="font-semibold">{MODE_BEHAVIOR[e.new_mode].label}</span>
                    </div>
                    {e.reason && <div className="text-muted-foreground italic mt-0.5">{e.reason}</div>}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">{e.changed_by?.slice(0, 8) ?? "system"}</div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}