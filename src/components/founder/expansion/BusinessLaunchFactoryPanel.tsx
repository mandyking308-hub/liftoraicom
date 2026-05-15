import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Factory, Wand2, ShieldCheck, Lock, Play, Rocket } from "lucide-react";

const GEN_PHRASE = "CREATE BUSINESS LAUNCH PLAN";
const APPLY_PHRASE = "APPLY BUSINESS LAUNCH PLAN";

type Template = { id: string; template_key: string; template_name: string; business_category: string | null; description: string | null };

export function BusinessLaunchFactoryPanel() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateKey, setTemplateKey] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [brief, setBrief] = useState("");
  const [genPhrase, setGenPhrase] = useState("");
  const [applyPhrase, setApplyPhrase] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [plan, setPlan] = useState<any>(null);
  const [applyResult, setApplyResult] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("business_launch_templates")
        .select("id,template_key,template_name,business_category,description")
        .eq("active", true).order("template_name");
      setTemplates((data as Template[]) ?? []);
      if (data && data.length > 0 && !templateKey) setTemplateKey(data[0].template_key);
    })();
  }, []);

  const generate = async (commit: boolean) => {
    if (!templateKey || !businessName.trim()) {
      toast({ title: "Missing info", description: "Pick a template and enter a business name", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-launch-plan-generate", {
        body: { template_key: templateKey, business_name: businessName.trim(), founder_brief: brief, dry_run: !commit, confirmation_phrase: commit ? genPhrase : undefined },
      });
      if (error) throw error;
      setPlan((data as any)?.plan ?? null);
      setPlanId((data as any)?.plan_id ?? null);
      const blocked = (data as any)?.blocked;
      toast({
        title: blocked ? "Generation blocked" : commit ? "Plan created" : "Preview generated",
        description: blocked ? `Reason: ${(data as any)?.reason}` : `Modules ${(data as any)?.plan?.selected_modules?.length ?? 0} • Agents ${(data as any)?.plan?.selected_agents?.length ?? 0} • Readiness ${(data as any)?.plan?.readiness_score ?? 0}`,
        variant: blocked ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const apply = async (commit: boolean) => {
    if (!planId) {
      toast({ title: "No plan", description: "Generate and save a plan first", variant: "destructive" });
      return;
    }
    setApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("business-launch-plan-apply", {
        body: { plan_id: planId, dry_run: !commit, confirmation_phrase: commit ? applyPhrase : undefined },
      });
      if (error) throw error;
      setApplyResult(data);
      const blocked = (data as any)?.blocked;
      toast({
        title: blocked ? "Apply blocked" : commit ? "Internal setup applied" : "Apply preview",
        description: blocked
          ? `Reason: ${(data as any)?.reason}`
          : `Business ${(data as any)?.business_id ? "ok" : "—"} • Modules ${(data as any)?.modules_seeded ?? 0} • Agents ${(data as any)?.agents_seeded ?? 0}`,
        variant: blocked ? "destructive" : "default",
      });
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5 text-primary" /> Business Launch Factory</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
          <Badge variant="outline" className="text-[10px]"><Lock className="h-3 w-3 mr-1" />no autonomous send</Badge>
          <Badge variant="outline" className="text-[10px]">no Apollo spend</Badge>
          <Badge variant="outline" className="text-[10px]">no Smartlead POST</Badge>
          <Badge variant="outline" className="text-[10px]">internal config only</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label className="text-xs text-muted-foreground">Template</Label>
            <Select value={templateKey} onValueChange={setTemplateKey}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select a template" /></SelectTrigger>
              <SelectContent>
                {templates.map((t) => <SelectItem key={t.template_key} value={t.template_key}>{t.template_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Business name</Label>
            <Input className="h-9" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Stone Crown Capital" />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Founder brief</Label>
          <Textarea rows={4} value={brief} onChange={(e) => setBrief(e.target.value)} placeholder="What does the business do? Who are the customers? What outcome do you want from Liftor in 30 / 60 / 90 days?" />
        </div>

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
          <Input placeholder={`Confirmation phrase: ${GEN_PHRASE}`} value={genPhrase} onChange={(e) => setGenPhrase(e.target.value)} className="h-8 text-xs font-mono" />
          <Button variant="outline" onClick={() => generate(false)} disabled={generating}>
            <Wand2 className="h-4 w-4 mr-2" /> {generating ? "..." : "Preview plan"}
          </Button>
          <Button onClick={() => generate(true)} disabled={generating || genPhrase !== GEN_PHRASE}>
            <Wand2 className="h-4 w-4 mr-2" /> Save plan
          </Button>
        </div>

        {plan && (
          <div className="rounded-md border border-border/50 p-3 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-medium">{plan.launch_name} — {plan.template_name}</div>
              <Badge variant="default" className="text-[10px]">readiness {plan.readiness_score ?? 0}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Modules" value={plan.selected_modules?.length ?? 0} />
              <Stat label="Agents" value={plan.selected_agents?.length ?? 0} />
              <Stat label="Integrations" value={plan.required_integrations?.length ?? 0} />
              <Stat label="Setup steps" value={plan.setup_steps?.length ?? 0} />
            </div>
            {Array.isArray(plan.setup_steps) && plan.setup_steps.length > 0 && (
              <div className="text-xs space-y-1 pt-2 border-t border-border/40">
                <div className="font-medium text-muted-foreground">Setup checklist</div>
                {plan.setup_steps.map((s: any, i: number) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="font-mono truncate">{s.label}</span>
                    <Badge variant={s.external ? "secondary" : "outline"} className="text-[10px]">
                      {s.external ? "external (locked)" : s.required ? "required" : "optional"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            {planId && (
              <div className="text-[10px] text-muted-foreground pt-1">plan_id: <span className="font-mono">{planId}</span></div>
            )}
          </div>
        )}

        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto] pt-2 border-t border-border/40">
          <Input placeholder={`Confirmation phrase: ${APPLY_PHRASE}`} value={applyPhrase} onChange={(e) => setApplyPhrase(e.target.value)} className="h-8 text-xs font-mono" disabled={!planId} />
          <Button variant="outline" onClick={() => apply(false)} disabled={applying || !planId}>
            <Play className="h-4 w-4 mr-2" /> {applying ? "..." : "Preview apply"}
          </Button>
          <Button onClick={() => apply(true)} disabled={applying || !planId || applyPhrase !== APPLY_PHRASE}>
            <Rocket className="h-4 w-4 mr-2" /> Apply internal setup
          </Button>
        </div>

        {applyResult && (
          <div className="rounded-md border border-border/50 p-3 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              <span className="font-medium">{applyResult.dry_run ? "Apply preview" : "Internal setup applied"}</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <Stat label="Business created" value={applyResult.business_created ? "yes" : "no"} />
              <Stat label="Modules seeded" value={applyResult.modules_seeded ?? 0} />
              <Stat label="Agents seeded" value={applyResult.agents_seeded ?? 0} />
              <Stat label="Approvals" value={applyResult.approvals_created ?? 0} />
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] pt-2 border-t border-border/40">
              <Badge variant="outline">emails sent: {applyResult.emails_sent ?? 0}</Badge>
              <Badge variant="outline">apollo: {String(applyResult.apollo_called ?? false)}</Badge>
              <Badge variant="outline">smartlead POST: {String(applyResult.smartlead_post_called ?? false)}</Badge>
              <Badge variant="outline">external sends locked</Badge>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded border border-border/40 px-2 py-1">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="font-semibold text-xs">{value}</div>
    </div>
  );
}

export default BusinessLaunchFactoryPanel;