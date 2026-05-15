import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Languages, Sparkles, Save, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const SAVE_PHRASE = "SAVE MULTILINGUAL DRAFT";

export default function MultilingualIntelligencePanel() {
  const { data: languages } = useQuery({
    queryKey: ["supported_languages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supported_languages").select("*").order("language_name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: reviews, refetch } = useQuery({
    queryKey: ["multilingual_reviews_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("multilingual_interaction_reviews")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [confirm, setConfirm] = useState("");
  const [saveResult, setSaveResult] = useState<any>(null);

  async function runPreview() {
    setBusy(true);
    setPreview(null);
    setSaveResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("multilingual-intake-preview", {
        body: { raw_text: text, founder_language: "en" },
      });
      if (error) throw error;
      setPreview(data);
    } catch (e: any) {
      setPreview({ error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function dryRunSave() {
    if (!preview || preview.error) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("multilingual-draft-save", {
        body: { ...preview, original_text: text, dry_run: true, create_approval_item: true },
      });
      if (error) throw error;
      setSaveResult(data);
    } catch (e: any) {
      setSaveResult({ error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  async function commitSave() {
    if (!preview || preview.error) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("multilingual-draft-save", {
        body: {
          ...preview, original_text: text, dry_run: false,
          confirmation_phrase: confirm, create_approval_item: true,
        },
      });
      if (error) throw error;
      setSaveResult(data);
      refetch();
    } catch (e: any) {
      setSaveResult({ error: e?.message ?? String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Languages size={14} className="text-primary" />
          Multilingual Intelligence
          <Badge variant="secondary" className="text-[9px] ml-2">
            {languages?.length ?? 0} langs
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <section>
          <h3 className="text-xs font-semibold mb-2">Supported languages</h3>
          <div className="flex flex-wrap gap-1">
            {(languages ?? []).map((l: any) => (
              <Badge
                key={l.id}
                variant="outline"
                className={`text-[10px] ${l.rtl ? "border-amber-500/40" : ""}`}
              >
                {l.language_code} · {l.language_name}
                {l.founder_review_required && " *"}
                {l.rtl && " ↤"}
              </Badge>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            * = founder review required · ↤ = right-to-left script
          </p>
        </section>

        <section className="rounded-md border border-border/40 bg-secondary/20 p-2 space-y-2">
          <h3 className="text-xs font-semibold">Intake preview (no save, no send)</h3>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste customer message in any language…"
            className="text-[11px] min-h-[80px]"
          />
          <Button size="sm" onClick={runPreview} disabled={busy || !text.trim()}>
            <Sparkles size={12} className="mr-1" />
            {busy ? "Analysing…" : "Run multilingual intake"}
          </Button>

          {preview && !preview.error && (
            <div className="grid sm:grid-cols-2 gap-2 text-[11px]">
              <Field label="Source language" value={`${preview.source_language} (${Math.round((preview.detection_confidence ?? 0) * 100)}%)`} />
              <Field label="Intent" value={preview.intent_detected} />
              <Field label="Recommended response language" value={preview.recommended_response_language} />
              <Field label="Cultural tone notes" value={preview.cultural_tone_notes} />
              <Field label="English summary" value={preview.english_summary} wide />
              <Field label="Translated text (EN)" value={preview.translated_text_english} wide />
              <Field label="Draft (customer language)" value={preview.draft_response_original_language} wide />
              <Field label="Back-translation (EN)" value={preview.draft_response_english_back_translation} wide />
              {preview.risk_flags?.length > 0 && (
                <div className="sm:col-span-2 flex flex-wrap gap-1">
                  {preview.risk_flags.map((f: string) => (
                    <Badge key={f} className="text-[9px] bg-destructive/20 text-destructive">
                      <AlertTriangle size={9} className="mr-1" />{f}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="sm:col-span-2 flex gap-2 items-end pt-1">
                <Button size="sm" variant="secondary" onClick={dryRunSave} disabled={busy}>
                  Dry-run save
                </Button>
                <div className="flex-1">
                  <Label className="text-[10px]">Confirm phrase</Label>
                  <Input
                    className="h-7 text-[11px]"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={SAVE_PHRASE}
                  />
                </div>
                <Button size="sm" onClick={commitSave} disabled={busy || confirm !== SAVE_PHRASE}>
                  <Save size={12} className="mr-1" /> Save draft (no send)
                </Button>
              </div>
            </div>
          )}
          {preview?.error && (
            <p className="text-[11px] text-destructive">Preview failed: {preview.error}</p>
          )}
          {saveResult && (
            <pre className="text-[10px] bg-background/60 border border-border/40 rounded p-2 overflow-x-auto">
              {JSON.stringify(saveResult, null, 2)}
            </pre>
          )}
        </section>

        <section>
          <h3 className="text-xs font-semibold mb-2">Recent multilingual reviews</h3>
          <div className="space-y-1">
            {(reviews ?? []).map((r: any) => (
              <div key={r.id} className="flex items-center justify-between text-[10px] border-b border-border/20 py-1">
                <span className="font-mono">{r.source_language ?? "?"} → {r.recommended_response_language ?? "?"}</span>
                <span className="text-muted-foreground line-clamp-1 flex-1 px-2">
                  {r.founder_summary_english ?? r.intent_detected ?? ""}
                </span>
                <Badge variant="outline" className="text-[9px]">{r.approval_status}</Badge>
                <span className="text-muted-foreground ml-2">
                  {formatDistanceToNow(new Date(r.created_at))} ago
                </span>
              </div>
            ))}
            {(reviews ?? []).length === 0 && (
              <p className="text-[10px] text-muted-foreground">No multilingual reviews yet.</p>
            )}
          </div>
        </section>

        <p className="text-[10px] text-muted-foreground">
          Drafts only. No autonomous sends. Founder approval required for external delivery.
        </p>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, wide }: { label: string; value: any; wide?: boolean }) {
  return (
    <div className={`p-2 rounded-md border border-border/30 bg-background/40 ${wide ? "sm:col-span-2" : ""}`}>
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">{label}</div>
      <div className="text-[11px] whitespace-pre-wrap">{value || "—"}</div>
    </div>
  );
}