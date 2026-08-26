import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { FileCheck2, Loader2 } from "lucide-react";

const SOURCE_TYPES = [
  "lovable_project_manifest",
  "uploaded_manual",
  "pasted_manifest",
  "github_manifest",
  "website_manifest",
];

const verdictTone = (v?: string) =>
  v === "FIDELITY_FAIL" ? "destructive" : v === "FIDELITY_PASS" ? "default" : "secondary";

/** Compact Source Manifest + Fidelity block. No external action. */
export const BusinessSourceManifestBlock = ({ businessId }: { businessId: string }) => {
  const [manifest, setManifest] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    source_type: "lovable_project_manifest",
    title: "Business source manifest",
    source_ref: "",
    source_project_id: "",
    source_url: "",
    source_version: "",
    manifest_text: "",
  });
  const [result, setResult] = useState<any>(null);

  const refresh = async () => {
    if (!businessId) return;
    const { data } = await supabase
      .from("business_knowledge_uploads")
      .select("id,upload_title,source_kind,metadata,created_at")
      .eq("business_id", businessId)
      .eq("upload_type", "source_manifest")
      .order("created_at", { ascending: false })
      .limit(5);
    const rows = (data ?? []) as any[];
    setManifest(rows.find((r) => r.metadata?.superseded !== true) ?? rows[0] ?? null);
  };

  useEffect(() => {
    refresh();
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const register = async () => {
    if (!businessId || form.manifest_text.trim().length < 40) {
      toast.error("Paste a manifest (JSON or Markdown, min 40 chars)");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-source-manifest-register", {
        body: { business_id: businessId, ...form },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(JSON.stringify(data?.error ?? data));
      toast.success(data.unchanged ? "Manifest unchanged" : "Manifest snapshot registered");
      setOpen(false);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const runFidelity = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-source-fidelity-check", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      setResult(data);
      await refresh();
      if (data?.verdict === "FIDELITY_FAIL") toast.error("FIDELITY_FAIL — activation blocked");
      else if (data?.ok) toast.success(`Fidelity ${data.verdict} · score ${data.fidelity_score}`);
      else toast.error(data?.reason ?? "No manifest registered");
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const fid = result ?? manifest?.metadata?.fidelity ?? null;
  const verdict = result?.verdict ?? manifest?.metadata?.fidelity?.verdict;

  return (
    <div className="rounded-md border border-border/50 bg-muted/10 p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Source manifest &amp; fidelity</span>
          {manifest ? (
            <Badge variant="outline">{manifest.metadata?.source_type ?? manifest.source_kind}</Badge>
          ) : (
            <Badge variant="secondary">no manifest</Badge>
          )}
          {verdict && <Badge variant={verdictTone(verdict) as any}>{verdict}</Badge>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
            {open ? "Close" : "Register snapshot"}
          </Button>
          <Button size="sm" onClick={runFidelity} disabled={busy || !businessId}>
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : "Run fidelity check"}
          </Button>
        </div>
      </div>

      {manifest && (
        <div className="text-muted-foreground">
          hash {String(manifest.metadata?.source_hash ?? "—")} · synced{" "}
          {String(manifest.metadata?.last_synced_at ?? "—").slice(0, 19)} · missing in source:{" "}
          {(manifest.metadata?.missing_fields ?? []).length}
        </div>
      )}

      {open && (
        <div className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input className="h-8" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input className="h-8" placeholder="Source ref" value={form.source_ref} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} />
            <Input className="h-8" placeholder="Source project id" value={form.source_project_id} onChange={(e) => setForm({ ...form, source_project_id: e.target.value })} />
            <Input className="h-8" placeholder="Source URL" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} />
            <Input className="h-8" placeholder="Source version" value={form.source_version} onChange={(e) => setForm({ ...form, source_version: e.target.value })} />
          </div>
          <Textarea
            rows={6}
            placeholder="Paste manifest JSON or Markdown (## Purpose, ## ICP, ## Offers, ## Pricing, ## Brand tone, ## Approval rules …)"
            value={form.manifest_text}
            onChange={(e) => setForm({ ...form, manifest_text: e.target.value })}
          />
          <Button size="sm" onClick={register} disabled={busy}>Register snapshot</Button>
        </div>
      )}

      {fid && (fid.mismatches?.length || fid.missing_in_source?.length) ? (
        <div className="space-y-1">
          {(fid.mismatches ?? []).map((m: any) => (
            <div key={m.field} className="rounded border border-destructive/40 p-2">
              <span className="font-semibold">{m.field}</span> — source: {m.source_value ?? "—"} · derived:{" "}
              {m.derived_value ?? "—"}
            </div>
          ))}
          {(fid.missing_in_source ?? []).length > 0 && (
            <div className="text-muted-foreground">
              MISSING / NEEDS SOURCE: {(fid.missing_in_source ?? []).join(", ")}
            </div>
          )}
        </div>
      ) : null}
      <p className="text-[10px] text-muted-foreground">
        Snapshot-based. Missing source data is never invented. A critical-field contradiction blocks
        internal activation until founder review. No external action.
      </p>
    </div>
  );
};

export default BusinessSourceManifestBlock;
