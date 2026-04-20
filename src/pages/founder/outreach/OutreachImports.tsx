import { useEffect, useRef, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

type Batch = {
  id: string; business_name: string; source_name: string; file_name: string;
  total_rows: number; valid_rows: number; invalid_rows: number; duplicate_rows: number; created_at: string;
};

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const cells: string[] = [];
    let cur = ""; let inQ = false;
    for (const ch of line) {
      if (ch === '"') inQ = !inQ;
      else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
      else cur += ch;
    }
    cells.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] ?? "").trim().replace(/^"|"$/g, ""); });
    return row;
  });
}

const OutreachImports = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void load(); }, []);

  async function load() {
    const { data } = await supabase.from("import_batches").select("*").order("created_at", { ascending: false }).limit(50);
    setBatches((data as Batch[]) ?? []);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!businessName.trim()) { toast.error("Set a business name first"); return; }
    setUploading(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (!rows.length) { toast.error("CSV has no data rows"); return; }
      const { data, error } = await supabase.functions.invoke("outreach-import-leads", {
        body: { business_name: businessName.trim(), source_name: sourceName.trim(), file_name: file.name, rows },
      });
      if (error) throw error;
      toast.success(`Imported ${data?.valid ?? 0} valid · ${data?.duplicate ?? 0} dup · ${data?.invalid ?? 0} invalid`);
      void load();
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold">Lead Imports</h1>
          <p className="text-sm text-muted-foreground">Upload a CSV with columns: <code className="text-xs bg-secondary px-1 rounded">email,name,company,role,country</code></p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="h-4 w-4" />New Import</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="biz">Business name</Label>
                <Input id="biz" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Liftor AI" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="src">Source label</Label>
                <Input id="src" value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="e.g. Apollo Q2 enterprise" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="file">CSV file</Label>
              <Input id="file" ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleUpload} disabled={uploading} />
            </div>
            {uploading && <p className="text-xs text-muted-foreground">Processing…</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" />Recent Batches</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {batches.length === 0 ? <p className="p-4 text-sm text-muted-foreground">No imports yet.</p> :
                batches.map((b) => (
                  <div key={b.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{b.file_name || b.source_name || "Untitled batch"}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.business_name || "—"} · {new Date(b.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary">{b.total_rows} total</Badge>
                      <Badge variant="default">{b.valid_rows} valid</Badge>
                      <Badge variant="outline">{b.duplicate_rows} dup</Badge>
                      <Badge variant="destructive">{b.invalid_rows} invalid</Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </FounderLayout>
  );
};

export default OutreachImports;
