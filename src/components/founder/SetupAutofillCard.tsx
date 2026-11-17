import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import kindnesssManual from "@/data/spoke-manuals/kindnesss.md?raw";
import { STEP_FIELDS, type StepKey } from "@/lib/businessSetupTunnel";

// Manuals copied from linked business projects, keyed by Liftor business id.
const SPOKE_MANUALS: Record<string, { project: string; text: string }> = {
  "640de582-a112-4d16-a221-03c27f00c6ec": { project: "Kindness Habits", text: kindnesssManual },
};

type Props = {
  businessId: string;
  defaultWebsite?: string;
  onApply: (suggestions: Record<string, Record<string, string>>, overwrite: boolean) => number;
};

function toBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

export default function SetupAutofillCard({ businessId, defaultWebsite, onApply }: Props) {
  const [url, setUrl] = useState(defaultWebsite ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [overwrite, setOverwrite] = useState(false);
  const spoke = SPOKE_MANUALS[businessId];
  const [useSpoke, setUseSpoke] = useState(Boolean(spoke));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    if (!url.trim() && !file && !(spoke && useSpoke)) { toast.error("Add the website, the manual, or both."); return; }
    if (file && file.size > 10 * 1024 * 1024) { toast.error("Manual is over 10 MB."); return; }
    setBusy(true); setResult(null);
    try {
      const body: Record<string, unknown> = { website_url: url.trim(), business_id: businessId, fields: STEP_FIELDS };
      if (file) {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          body.manual_pdf_base64 = toBase64(await file.arrayBuffer());
          body.manual_filename = file.name;
        } else {
          body.manual_text = await file.text();
        }
      }
      if (spoke && useSpoke) body.manual_text = [body.manual_text, spoke.text].filter(Boolean).join("\n\n");
      const { data, error } = await supabase.functions.invoke("business-setup-autofill", { body });
      if (error) {
        let msg = error.message;
        if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* */ } }
        throw new Error(msg);
      }
      const filled = onApply(data.suggestions ?? {}, overwrite);
      const pages = (data.pages_read ?? []).length;
      setResult(`Filled ${filled} boxes from ${pages ? `${pages} website page${pages > 1 ? "s" : ""}` : "no website pages"}${data.used_manual ? " and your manual" : ""}. Check each step, correct anything, then press Save.`);
      toast.success(`Filled ${filled} boxes. Check them, then save each step.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't read the sources.");
    } finally { setBusy(false); }
  }

  return (
    <Card className="border-primary/40">
      <CardHeader className="pb-2"><CardTitle className="text-base">Fill everything from the website and manual</CardTitle></CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs text-muted-foreground">Liftor reads the website and the manual, then fills the boxes in all 12 steps. It only uses what they actually say; anything they don't cover stays blank for you. Nothing is sent or published.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label htmlFor="af-url">Website</Label><Input id="af-url" placeholder="https://kindnesss.com" value={url} onChange={(e) => setUrl(e.target.value)} /></div>
          <div><Label htmlFor="af-file">Manual (PDF, TXT or MD)</Label><Input id="af-file" type="file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        {spoke && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={useSpoke} onChange={(e) => setUseSpoke(e.target.checked)} /> Use the manuals already copied from your {spoke.project} project (no upload needed)</label>}
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={overwrite} onChange={(e) => setOverwrite(e.target.checked)} /> Replace boxes I've already filled in (otherwise only empty boxes are filled)</label>
        <Button onClick={run} disabled={busy}>{busy ? "Reading… (up to a minute)" : "Read and fill all steps"}</Button>
        {result && <p className="text-xs text-primary">{result}</p>}
      </CardContent>
    </Card>
  );
}
export type { StepKey };
