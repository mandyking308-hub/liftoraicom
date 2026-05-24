import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Lock, ShieldCheck, Layers, AlertTriangle, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const CONFIRM = "MATERIALISE BUSINESS STARTER PACK";

const SECTIONS: Array<{ key: string; label: string }> = [
  { key: "materialise_outreach", label: "Outreach / email templates" },
  { key: "materialise_social", label: "Social content drafts" },
  { key: "materialise_support", label: "Support FAQs" },
  { key: "materialise_customer_success", label: "Customer success / onboarding" },
  { key: "materialise_proposals", label: "Proposal outline" },
  { key: "materialise_demo", label: "Demo / productisation notes" },
  { key: "materialise_revenue", label: "Revenue activity" },
  { key: "materialise_supplier", label: "Supplier / delivery needs" },
];

export default function StarterPackMaterialiserPanel() {
  const [businessId, setBusinessId] = useState("");
  const [packId, setPackId] = useState<string>("");
  const [phrase, setPhrase] = useState("");
  const [flags, setFlags] = useState<Record<string, boolean>>(
    Object.fromEntries(SECTIONS.map((s) => [s.key, true])),
  );
  const [result, setResult] = useState<any>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["materialiser-businesses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("businesses").select("id,name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = useMemo(() => businessId || businesses[0]?.id || "", [businessId, businesses]);

  const { data: packs = [] } = useQuery({
    queryKey: ["materialiser-packs", selected],
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_execution_starter_packs")
        .select("id,pack_status,created_at")
        .eq("business_id", selected)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const preview = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("starter-pack-materialise", {
        body: { business_id: selected, starter_pack_id: packId || undefined, dry_run: true, ...flags },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      setResult(d);
      toast.success(`Preview: ${d.total_items ?? 0} items planned`);
    },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  const materialise = useMutation({
    mutationFn: async () => {
      if (phrase !== CONFIRM) throw new Error(`Type exact phrase: ${CONFIRM}`);
      const { data, error } = await supabase.functions.invoke("starter-pack-materialise", {
        body: {
          business_id: selected, starter_pack_id: packId || undefined,
          dry_run: false, confirmation_phrase: phrase, ...flags,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (d) => {
      setResult(d);
      toast.success(`Materialised: ${d.created_items ?? 0} drafts, ${d.skipped_duplicates ?? 0} duplicates skipped`);
    },
    onError: (e) => toast.error(String((e as Error).message ?? e)),
  });

  return (
    <Card className="tech-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Starter Pack Materialiser
          <Badge variant="outline" className="ml-2">
            <Lock className="mr-1 h-3 w-3" />
            External actions locked
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label>Business</Label>
            <Select value={selected} onValueChange={(v) => { setBusinessId(v); setPackId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select business" /></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Starter pack (latest if blank)</Label>
            <Select value={packId} onValueChange={setPackId}>
              <SelectTrigger><SelectValue placeholder="Latest starter pack" /></SelectTrigger>
              <SelectContent>
                {packs.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {new Date(p.created_at).toLocaleString()} — {p.pack_status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.key} className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2">
              <Label htmlFor={s.key} className="text-sm">{s.label}</Label>
              <Switch
                id={s.key}
                checked={flags[s.key]}
                onCheckedChange={(v) => setFlags((f) => ({ ...f, [s.key]: v }))}
              />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => preview.mutate()} disabled={!selected || preview.isPending} variant="secondary">
            <RefreshCw className="mr-2 h-4 w-4" />
            Preview materialisation
          </Button>
        </div>

        <div className="space-y-2 rounded-md border border-border/60 p-3">
          <Label>Confirmation phrase</Label>
          <Input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM}
          />
          <Button
            onClick={() => materialise.mutate()}
            disabled={!selected || materialise.isPending || phrase !== CONFIRM}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Materialise starter pack
          </Button>
        </div>

        {result && (
          <div className="space-y-2 rounded-md border border-border/60 p-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Status: {result.status}</Badge>
              <Badge variant="outline">Planned: {result.total_items ?? 0}</Badge>
              <Badge variant="outline">Created: {result.created_items ?? 0}</Badge>
              <Badge variant="outline">Fallback: {result.fallback_items ?? 0}</Badge>
              <Badge variant="outline">Skipped dupes: {result.skipped_duplicates ?? 0}</Badge>
              <Badge variant="outline">Blocked: {result.blocked_items ?? 0}</Badge>
              <Badge variant="outline">Approval items: {result.founder_approval_items ?? 0}</Badge>
            </div>
            {(result.missing_context ?? []).length > 0 && (
              <div className="flex items-start gap-2 text-amber-500">
                <AlertTriangle className="mt-0.5 h-4 w-4" />
                <div>
                  <div className="font-medium">Missing context</div>
                  <ul className="list-disc pl-5">
                    {result.missing_context.map((m: string) => <li key={m}>{m}</li>)}
                  </ul>
                </div>
              </div>
            )}
            {(result.preview_items ?? []).length > 0 && (
              <div>
                <div className="font-medium">Preview items</div>
                <div className="mt-1 max-h-64 overflow-auto rounded border border-border/40">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left">Module</th>
                        <th className="p-2 text-left">Type</th>
                        <th className="p-2 text-left">Title</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.preview_items.map((p: any, i: number) => (
                        <tr key={i} className="border-t border-border/40">
                          <td className="p-2">{p.destination_module}</td>
                          <td className="p-2">{p.item_type}</td>
                          <td className="p-2">{p.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          No emails, DMs, posts, payments, Apollo, Smartlead, Metricool, ManyChat, portal invites, surveys or reports
          are sent. All items are internal drafts requiring founder review.
        </div>
      </CardContent>
    </Card>
  );
}