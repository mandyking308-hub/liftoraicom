import { useMemo, useState } from "react";
import { DatabaseZap, Loader2, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DEFAULT_EDUCATION_SOURCE = "apollo_global_education_2026-08-22";

export default function RelationshipIntelligencePromotionPanel() {
  const [tag, setTag] = useState("education");
  const [sourcePack, setSourcePack] = useState(DEFAULT_EDUCATION_SOURCE);
  const [businessText, setBusinessText] = useState("");
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [result, setResult] = useState<any>(null);

  const businessNames = useMemo(
    () => Array.from(new Set(businessText.split(/[\n,]/).map((v) => v.trim()).filter(Boolean))),
    [businessText],
  );

  const run = async (dryRun: boolean) => {
    if (!businessNames.length) {
      toast.error("Add the Education Wave 1 Liftor business names first.");
      return;
    }
    setBusy(dryRun ? "preview" : "commit");
    try {
      const { data, error } = await supabase.functions.invoke("ri-promote-to-crm", {
        body: {
          dry_run: dryRun,
          tag: tag.trim() || undefined,
          source_pack_contains: sourcePack.trim() || undefined,
          business_names: businessNames,
          relevance_category: "education-leadership",
          limit: 1000,
        },
      });
      if (error) throw error;
      setResult(data);
      if (dryRun) toast.success("Education CRM promotion preview generated — nothing was changed or sent.");
      else toast.success("Approved education records promoted/matched to CRM. Nothing was queued or sent.");
    } catch (error) {
      toast.error((error as Error).message || "Promotion bridge failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="tech-card border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><DatabaseZap className="h-4 w-4 text-primary" /> Relationship Intelligence → CRM</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Controlled promotion for the Education dataset. Dedupe first; create many business relationships; never auto-send.</p>
          </div>
          <Badge variant="outline" className="gap-1"><ShieldCheck className="h-3 w-3" /> No auto-send</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Dataset tag</Label>
            <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="education" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Source pack contains</Label>
            <Input value={sourcePack} onChange={(e) => setSourcePack(e.target.value)} placeholder={DEFAULT_EDUCATION_SOURCE} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Education Wave 1 Liftor businesses</Label>
          <Textarea
            value={businessText}
            onChange={(e) => setBusinessText(e.target.value)}
            placeholder="Enter the four business names, one per line or comma-separated. The same master people can be linked to all four without duplication."
            rows={4}
          />
          <p className="text-[11px] text-muted-foreground">{businessNames.length} business{businessNames.length === 1 ? "" : "es"} selected. Preview before committing.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => run(true)}>
            {busy === "preview" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Preview promotion
          </Button>
          <Button size="sm" disabled={busy !== null || !result?.dry_run} onClick={() => run(false)}>
            {busy === "commit" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Promote approved records
          </Button>
        </div>

        {result?.summary && (
          <div className="rounded-lg border border-border/60 p-3 text-xs">
            <div className="font-medium mb-2">{result.dry_run ? "Preview" : "Promotion"} result</div>
            <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground overflow-x-auto">{JSON.stringify(result.summary, null, 2)}</pre>
            <p className="mt-2 text-[11px] text-muted-foreground">{result.note}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
