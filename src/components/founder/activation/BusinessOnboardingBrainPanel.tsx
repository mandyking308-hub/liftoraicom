import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Brain, ShieldCheck, Lock, AlertTriangle, CheckCircle2, RefreshCw, Sparkles, FileText,
} from "lucide-react";
import { toast } from "sonner";

type RunResult = {
  ok: boolean;
  status: string;
  business_name?: string;
  provider_status: "configured" | "not_configured";
  source_count: number;
  profile_preview: any;
  starter_pack_preview: any;
  missing_context: string[];
  risk_warnings: string[];
  readiness_score: number;
  internal_ready: boolean;
  external_ready: boolean;
  saved_starter_pack_id?: string | null;
  founder_approval_ids?: string[];
};

const CONFIRM = "CREATE BUSINESS STARTER PACK";

export default function BusinessOnboardingBrainPanel() {
  const qc = useQueryClient();
  const [businessId, setBusinessId] = useState<string>("");
  const [phrase, setPhrase] = useState("");
  const [result, setResult] = useState<RunResult | null>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["onboarding-brain-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(() => businessId || businesses[0]?.id || "", [businessId, businesses]);

  const preview = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a business");
      const { data, error } = await supabase.functions.invoke("business-onboarding-brain-run", {
        body: { business_id: selected, dry_run: true, save_profile: false, save_starter_pack: false },
      });
      if (error) throw error;
      return data as RunResult;
    },
    onSuccess: (data) => {
      setResult(data);
      toast.success(`Onboarding preview ready (score ${data.readiness_score}/100)`);
    },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error("Select a business");
      if (phrase !== CONFIRM) throw new Error(`Type the exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-onboarding-brain-run", {
        body: {
          business_id: selected,
          dry_run: false,
          save_starter_pack: true,
          create_founder_approval_items: true,
          confirmation_phrase: phrase,
        },
      });
      if (error) throw error;
      return data as RunResult;
    },
    onSuccess: (data) => {
      setResult(data);
      setPhrase("");
      qc.invalidateQueries({ queryKey: ["onboarding-brain-businesses"] });
      toast.success(
        data.saved_starter_pack_id
          ? "Starter pack saved (internal draft — external actions locked)"
          : "Run complete — nothing was sent",
      );
    },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const score = result?.readiness_score ?? 0;
  const scoreClass = score >= 75 ? "text-green-400" : score >= 40 ? "text-yellow-400" : "text-red-400";

  return (
    <Card className="tech-card">
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="flex items-center gap-2 text-base">
          <Brain size={18} className="text-primary" /> Business Onboarding Brain
        </CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] uppercase bg-green-500/10 text-green-400 border-green-500/30">
            <ShieldCheck size={10} className="mr-1" /> Internal-only · No send · No publish
          </Badge>
          {result?.provider_status === "configured" ? (
            <Badge variant="outline" className="text-[10px] uppercase bg-blue-500/10 text-blue-400 border-blue-500/30">
              <Sparkles size={10} className="mr-1" /> AI provider configured
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px] uppercase bg-yellow-500/10 text-yellow-400 border-yellow-500/30">
              <AlertTriangle size={10} className="mr-1" /> AI provider not configured
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] uppercase bg-red-500/10 text-red-400 border-red-500/30">
            <Lock size={10} className="mr-1" /> External go-live locked
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <p className="text-[10px] uppercase text-muted-foreground mb-1">Business</p>
            <Select value={selected} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => preview.mutate()} disabled={preview.isPending || !selected} size="sm" variant="outline">
            <RefreshCw size={14} className={preview.isPending ? "animate-spin mr-1" : "mr-1"} />
            Preview starter pack
          </Button>
        </div>

        {result && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border border-border/50 p-2 bg-card/40 col-span-2">
                <p className="text-[10px] text-muted-foreground uppercase">Readiness score</p>
                <p className={`text-3xl font-semibold ${scoreClass}`}>
                  {score}<span className="text-base text-muted-foreground">/100</span>
                </p>
                <Progress value={score} className="mt-1 h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Internal ready: {result.internal_ready ? "yes" : "no"} · External ready: locked
                </p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Sources</p>
                <p className="text-xl">{result.source_count}</p>
                <p className="text-[10px] text-muted-foreground">uploads + assets + profile</p>
              </div>
              <div className="rounded-md border border-border/50 p-2 bg-card/40">
                <p className="text-[10px] text-muted-foreground uppercase">Gaps & risks</p>
                <p className="text-sm">
                  <span className="text-yellow-400">{result.missing_context.length}</span> missing ·
                  <span className="text-red-400 ml-1">{result.risk_warnings.length}</span> warnings
                </p>
              </div>
            </div>

            {result.missing_context.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Missing context</p>
                <div className="flex flex-wrap gap-1">
                  {result.missing_context.map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] bg-yellow-500/10 text-yellow-400 border-yellow-500/30">{m}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.risk_warnings.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Risk warnings</p>
                <ul className="space-y-1">
                  {result.risk_warnings.map((r, i) => (
                    <li key={i} className="text-xs flex items-start gap-2"><AlertTriangle size={12} className="text-red-400 mt-0.5" />{r}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-md border border-border/50 p-3 bg-card/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                  <FileText size={12} /> Knowledge profile
                </p>
                {result.profile_preview ? (
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Summary:</span> {result.profile_preview.business_summary ?? "—"}</p>
                    <p><span className="text-muted-foreground">Offer:</span> {result.profile_preview.offer_summary ?? "—"}</p>
                    <p><span className="text-muted-foreground">ICP:</span> {result.profile_preview.ideal_customer_profile ?? "—"}</p>
                    <p><span className="text-muted-foreground">Tone:</span> {result.profile_preview.approved_tone ?? "—"}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No knowledge profile yet — run the knowledge profile generator first.</p>
                )}
              </div>
              <div className="rounded-md border border-border/50 p-3 bg-card/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                  <Sparkles size={12} /> Starter pack
                </p>
                {result.starter_pack_preview ? (
                  <div className="space-y-1 text-xs">
                    <p><span className="text-muted-foreground">Status:</span> {result.starter_pack_preview.pack_status}</p>
                    <p><span className="text-muted-foreground">Email templates:</span> {result.starter_pack_preview.email_templates?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">Social posts planned:</span> {result.starter_pack_preview.social_content_plan?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">Support FAQs:</span> {result.starter_pack_preview.support_faqs?.length ?? 0}</p>
                    <p><span className="text-muted-foreground">Founder review:</span> {result.starter_pack_preview.founder_review_required ? "required" : "not required"}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No starter pack yet — confirm and create below.</p>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border/50 p-3 bg-card/30 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Create starter pack (internal draft)</p>
              <p className="text-[11px] text-muted-foreground">
                Type the exact phrase to save a starter pack. Drafts are internal only — no emails, no publish, no Apollo, no Smartlead.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder={CONFIRM}
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  className="text-xs flex-1 min-w-[260px]"
                />
                <Button
                  size="sm"
                  onClick={() => save.mutate()}
                  disabled={save.isPending || phrase !== CONFIRM || !selected}
                >
                  {save.isPending ? <RefreshCw size={14} className="animate-spin mr-1" /> : <CheckCircle2 size={14} className="mr-1" />}
                  Create starter pack
                </Button>
              </div>
              {result.saved_starter_pack_id && (
                <p className="text-[11px] text-green-400">Saved internal starter pack {result.saved_starter_pack_id.slice(0, 8)}… · founder approval items: {result.founder_approval_ids?.length ?? 0}</p>
              )}
            </div>
          </>
        )}

        <div className="rounded-md border border-border/50 p-2 bg-card/30 text-[11px] text-muted-foreground flex items-center gap-2 flex-wrap">
          <Lock size={12} />
          Internal drafts only. No sends, no publish, no Apollo, no Smartlead, no payments, no portal invites. External go-live remains locked by design.
        </div>
      </CardContent>
    </Card>
  );
}