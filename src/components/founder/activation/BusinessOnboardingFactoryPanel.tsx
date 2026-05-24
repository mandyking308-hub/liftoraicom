import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, FactoryIcon, AlertTriangle, RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

const CONFIRM = "RUN BUSINESS ONBOARDING FACTORY";

export default function BusinessOnboardingFactoryPanel() {
  const [businessId, setBusinessId] = useState<string>("");
  const [businessName, setBusinessName] = useState("");
  const [businessBrief, setBusinessBrief] = useState("");
  const [knowledgeText, setKnowledgeText] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandNotes, setBrandNotes] = useState("");
  const [offerNotes, setOfferNotes] = useState("");
  const [policyNotes, setPolicyNotes] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [phrase, setPhrase] = useState("");
  const [createTest, setCreateTest] = useState(false);
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["factory-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["factory-recent"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_onboarding_factory_runs")
        .select("id,business_id,run_status,readiness_score,internal_ready,created_at,is_test_data")
        .order("created_at", { ascending: false }).limit(8);
      return data ?? [];
    },
  });

  const body = useMemo(() => ({
    business_id: businessId || undefined,
    business_name: businessName || undefined,
    business_brief: businessBrief || undefined,
    knowledge_text: knowledgeText || undefined,
    website_url: websiteUrl || undefined,
    brand_notes: brandNotes || undefined,
    offer_notes: offerNotes || undefined,
    policy_notes: policyNotes || undefined,
    customer_notes: customerNotes || undefined,
    create_test_business: createTest,
    is_test_data: createTest,
  }), [businessId, businessName, businessBrief, knowledgeText, websiteUrl, brandNotes, offerNotes, policyNotes, customerNotes, createTest]);

  const preview = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("business-onboarding-factory-run", {
        body: { ...body, dry_run: true, save_outputs: false },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Factory preview: ${d.readiness_score ?? 0}/100`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const run = useMutation({
    mutationFn: async () => {
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("business-onboarding-factory-run", {
        body: { ...body, dry_run: false, save_outputs: true, confirmation_phrase: phrase },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => { setResult(d); toast.success(`Factory run: ${d.status} (${d.readiness_score}/100)`); },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FactoryIcon className="h-5 w-5" />
          Business Onboarding Factory
          <Badge variant="outline" className="ml-2">
            <Lock className="mr-1 h-3 w-3" />
            External actions locked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Existing business</Label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger><SelectValue placeholder="Select (or leave blank for virtual preview)" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Or new business name (virtual / test)</Label>
            <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Test Business Factory Drill" />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Textarea placeholder="Business brief" value={businessBrief} onChange={(e) => setBusinessBrief(e.target.value)} />
          <Textarea placeholder="Knowledge text (manuals, FAQs)" value={knowledgeText} onChange={(e) => setKnowledgeText(e.target.value)} />
          <Input placeholder="Website URL" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} />
          <Textarea placeholder="Brand notes" value={brandNotes} onChange={(e) => setBrandNotes(e.target.value)} />
          <Textarea placeholder="Offer / pricing notes" value={offerNotes} onChange={(e) => setOfferNotes(e.target.value)} />
          <Textarea placeholder="Policy notes" value={policyNotes} onChange={(e) => setPolicyNotes(e.target.value)} />
          <Textarea placeholder="Customer notes" value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input
            id="factory-test"
            type="checkbox"
            checked={createTest}
            onChange={(e) => setCreateTest(e.target.checked)}
          />
          <Label htmlFor="factory-test" className="text-xs">
            Create a real test business when saving (forces is_test_data=true and "[Test]" suffix)
          </Label>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => preview.mutate()} disabled={preview.isPending}>
            <RefreshCw className="mr-2 h-4 w-4" /> Dry-run factory
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder={CONFIRM} />
          <Button onClick={() => run.mutate()} disabled={run.isPending || phrase !== CONFIRM}>
            <Sparkles className="mr-2 h-4 w-4" /> Run & save factory
          </Button>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Provider: {result.provider_status}</Badge>
              <Badge variant="outline">Readiness: {result.readiness_score}/100</Badge>
              <Badge variant={result.internal_ready ? "default" : "outline"}>Internal ready: {String(result.internal_ready)}</Badge>
              <Badge variant="outline"><Lock className="mr-1 h-3 w-3" /> External: false</Badge>
              <Badge variant="outline">Items: {result.materialised_items_count ?? 0}</Badge>
              <Badge variant="outline">Skipped: {result.skipped_duplicate_count ?? 0}</Badge>
            </div>
            {(result.missing_context ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">Missing context</div>
                  <ul className="list-disc pl-5">
                    {result.missing_context.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {(result.risk_warnings ?? []).length > 0 && (
              <div className="text-xs text-muted-foreground">
                Risks: {result.risk_warnings.join("; ")}
              </div>
            )}
          </div>
        )}

        {recent.length > 0 && (
          <div className="text-xs">
            <div className="mb-1 font-medium">Recent factory runs</div>
            <ul className="space-y-1">
              {recent.map((r: any) => (
                <li key={r.id} className="flex items-center justify-between rounded border border-border/40 px-2 py-1">
                  <span>{new Date(r.created_at).toLocaleString()}</span>
                  <span className="flex items-center gap-2">
                    <Badge variant="outline">{r.run_status}</Badge>
                    <Badge variant="outline">{r.readiness_score}/100</Badge>
                    {r.is_test_data && <Badge variant="outline">test</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Internal readiness only. No sends, no publish, no Apollo, no Smartlead, no payments.
        </div>
      </CardContent>
    </Card>
  );
}