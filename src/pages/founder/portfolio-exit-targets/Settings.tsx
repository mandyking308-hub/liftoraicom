import { useEffect, useState } from "react";
import { PETLayout } from "./_shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { fetchSettings, saveSettings, type Settings } from "@/lib/portfolioExitTargetEngine";

export default function PETSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetchSettings().then(setS); }, []);
  if (!s) return <PETLayout title="Settings"><p className="text-sm text-muted-foreground">Loading…</p></PETLayout>;

  async function save() {
    setSaving(true);
    try {
      const updated = await saveSettings(s!);
      setS(updated); toast.success("Saved");
    } catch (e: any) { toast.error(e?.message ?? "Save failed"); }
    finally { setSaving(false); }
  }

  return (
    <PETLayout title="Exit target settings" subtitle="Editable FX rate and default ARR benchmarks used across the portfolio. Stored, never hard-coded.">
      <Card className="tech-card">
        <CardHeader className="pb-2"><CardTitle className="text-sm">Global settings</CardTitle></CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3 text-xs">
          <div><Label>GBP → USD exchange rate</Label><Input type="number" step="0.01" value={s.gbp_usd_rate} onChange={e => setS({ ...s, gbp_usd_rate: Number(e.target.value) })} /></div>
          <div><Label>Default target ARR (USD)</Label><Input type="number" value={s.default_target_arr_usd} onChange={e => setS({ ...s, default_target_arr_usd: Number(e.target.value) })} /></div>
          <div><Label>Default target ARR (GBP)</Label><Input type="number" value={s.default_target_arr_gbp} onChange={e => setS({ ...s, default_target_arr_gbp: Number(e.target.value) })} /></div>
          <div className="md:col-span-3"><Label>Notes</Label><Textarea value={s.notes ?? ""} onChange={e => setS({ ...s, notes: e.target.value })} /></div>
          <div className="md:col-span-3 flex justify-end"><Button size="sm" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button></div>
        </CardContent>
      </Card>
    </PETLayout>
  );
}