import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Coins, Plus, Pencil, AlertTriangle, Calculator } from "lucide-react";
import {
  listPricing,
  upsertPricing,
  deactivatePricing,
  findLedgerModelsWithoutPricing,
  estimateAICost,
  type ProviderPricing,
  type CostBreakdown,
} from "@/services/aiPricingRegistry";

const EMPTY: Partial<ProviderPricing> = {
  provider_name: "",
  model_name: "",
  model_tier: "standard",
  input_cost_per_1m_tokens: 0,
  output_cost_per_1m_tokens: 0,
  currency: "USD",
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: null,
  active: true,
  notes: "",
};

export default function AIProviderPricing() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<ProviderPricing> | null>(null);
  const [estimate, setEstimate] = useState<CostBreakdown | null>(null);
  const [testForm, setTestForm] = useState({ provider: "", model: "", input: 1000, output: 500 });

  const { data: pricing = [], isLoading } = useQuery({
    queryKey: ["ai-provider-pricing"],
    queryFn: listPricing,
  });

  const { data: missing = [] } = useQuery({
    queryKey: ["ai-pricing-missing"],
    queryFn: findLedgerModelsWithoutPricing,
  });

  const save = useMutation({
    mutationFn: async (row: Partial<ProviderPricing>) => {
      if (!row.provider_name || !row.model_name) throw new Error("Provider and model are required.");
      await upsertPricing(row);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-provider-pricing"] });
      qc.invalidateQueries({ queryKey: ["ai-pricing-missing"] });
      setEditing(null);
      toast({ title: "Pricing saved" });
    },
    onError: (e: any) => toast({ title: "Save failed", description: e?.message, variant: "destructive" }),
  });

  const deact = useMutation({
    mutationFn: deactivatePricing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai-provider-pricing"] });
      toast({ title: "Pricing deactivated" });
    },
  });

  const byTier = useMemo(() => {
    const groups: Record<string, ProviderPricing[]> = { cheap: [], standard: [], premium: [], untiered: [] };
    for (const p of pricing) {
      if (!p.active) continue;
      const k = p.model_tier ?? "untiered";
      (groups[k] ?? groups.untiered).push(p);
    }
    return groups;
  }, [pricing]);

  const runEstimate = async () => {
    const result = await estimateAICost({
      provider_name: testForm.provider,
      model_name: testForm.model,
      estimated_input_tokens: Number(testForm.input) || 0,
      estimated_output_tokens: Number(testForm.output) || 0,
      currency_preference: "GBP",
    });
    setEstimate(result);
  };

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Provider Pricing" description="Pricing registry per model so costs are calculated accurately." /><div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <Coins className="size-5 text-primary" /> Provider Pricing Registry
            </h1>
            <p className="text-sm text-muted-foreground">
              Editable cost-per-million-tokens for every AI provider/model. Pricing is never hard-coded — keep this current.
            </p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="size-4 mr-1" /> Add pricing
          </Button>
        </div>

        {missing.length > 0 && (
          <Card className="border-amber-500/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-500">
                <AlertTriangle className="size-4" /> Models in ledger without active pricing
              </CardTitle>
              <CardDescription>
                These models have appeared in the AI Usage Ledger but have no active pricing rule. Add pricing to keep cost estimates accurate.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Usage rows</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {missing.map((m) => (
                    <TableRow key={`${m.provider_name}::${m.model_name}`}>
                      <TableCell>{m.provider_name}</TableCell>
                      <TableCell className="font-mono text-xs">{m.model_name}</TableCell>
                      <TableCell>{m.usage_count}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setEditing({
                              ...EMPTY,
                              provider_name: m.provider_name,
                              model_name: m.model_name,
                            })
                          }
                        >
                          Add pricing
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="size-4 text-primary" /> Cost estimator</CardTitle>
            <CardDescription>Estimate the cost of a single AI call against the current registry.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <Label>Provider</Label>
                <Input value={testForm.provider} onChange={(e) => setTestForm({ ...testForm, provider: e.target.value })} />
              </div>
              <div>
                <Label>Model</Label>
                <Input value={testForm.model} onChange={(e) => setTestForm({ ...testForm, model: e.target.value })} />
              </div>
              <div>
                <Label>Input tokens</Label>
                <Input type="number" value={testForm.input} onChange={(e) => setTestForm({ ...testForm, input: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Output tokens</Label>
                <Input type="number" value={testForm.output} onChange={(e) => setTestForm({ ...testForm, output: Number(e.target.value) })} />
              </div>
            </div>
            <Button onClick={runEstimate} variant="outline">Estimate</Button>
            {estimate && (
              <div className="text-sm space-y-1 border rounded-md p-3">
                {estimate.pricing_missing ? (
                  <div className="text-amber-500">{estimate.warning}</div>
                ) : (
                  <>
                    <div>Provider native: {estimate.estimated_total_cost.toFixed(6)} {estimate.currency}</div>
                    <div>Display: {estimate.display_total_cost.toFixed(6)} {estimate.display_currency} {estimate.fx_converted ? "" : "(unconverted)"}</div>
                    <div className="text-muted-foreground text-xs">Rule: {estimate.pricing_rule_used?.id}</div>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All pricing</CardTitle>
            <CardDescription>{isLoading ? "Loading…" : `${pricing.length} rules`}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Input / 1M</TableHead>
                  <TableHead>Output / 1M</TableHead>
                  <TableHead>Currency</TableHead>
                  <TableHead>Effective</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pricing.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.provider_name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.model_name}</TableCell>
                    <TableCell>{p.model_tier ? <Badge variant="outline">{p.model_tier}</Badge> : "—"}</TableCell>
                    <TableCell>{Number(p.input_cost_per_1m_tokens).toFixed(4)}</TableCell>
                    <TableCell>{Number(p.output_cost_per_1m_tokens).toFixed(4)}</TableCell>
                    <TableCell>{p.currency}</TableCell>
                    <TableCell className="text-xs">
                      {p.effective_from}{p.effective_to ? ` → ${p.effective_to}` : ""}
                    </TableCell>
                    <TableCell>
                      {p.active ? <Badge>Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(p)}>
                        <Pencil className="size-3" />
                      </Button>
                      {p.active && (
                        <Button size="sm" variant="ghost" onClick={() => deact.mutate(p.id)}>
                          Deactivate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active pricing by tier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {(["cheap", "standard", "premium"] as const).map((tier) => (
              <div key={tier} className="border rounded-md p-3">
                <div className="font-medium capitalize mb-2">{tier}</div>
                {byTier[tier].length === 0 ? (
                  <div className="text-muted-foreground text-xs">No active pricing.</div>
                ) : (
                  byTier[tier].map((p) => (
                    <div key={p.id} className="text-xs">
                      {p.provider_name}/{p.model_name} — in {p.input_cost_per_1m_tokens}, out {p.output_cost_per_1m_tokens} {p.currency}
                    </div>
                  ))
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Edit pricing" : "Add pricing"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <Label>Provider</Label>
                  <Input value={editing.provider_name ?? ""} onChange={(e) => setEditing({ ...editing, provider_name: e.target.value })} />
                </div>
                <div className="col-span-1">
                  <Label>Model</Label>
                  <Input value={editing.model_name ?? ""} onChange={(e) => setEditing({ ...editing, model_name: e.target.value })} />
                </div>
                <div>
                  <Label>Tier</Label>
                  <Select value={editing.model_tier ?? "standard"} onValueChange={(v) => setEditing({ ...editing, model_tier: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheap">cheap</SelectItem>
                      <SelectItem value="standard">standard</SelectItem>
                      <SelectItem value="premium">premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Currency</Label>
                  <Select value={editing.currency ?? "USD"} onValueChange={(v) => setEditing({ ...editing, currency: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Input cost / 1M tokens</Label>
                  <Input type="number" step="0.0001" value={editing.input_cost_per_1m_tokens ?? 0} onChange={(e) => setEditing({ ...editing, input_cost_per_1m_tokens: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Output cost / 1M tokens</Label>
                  <Input type="number" step="0.0001" value={editing.output_cost_per_1m_tokens ?? 0} onChange={(e) => setEditing({ ...editing, output_cost_per_1m_tokens: Number(e.target.value) })} />
                </div>
                <div>
                  <Label>Effective from</Label>
                  <Input type="date" value={editing.effective_from ?? ""} onChange={(e) => setEditing({ ...editing, effective_from: e.target.value })} />
                </div>
                <div>
                  <Label>Effective to (optional)</Label>
                  <Input type="date" value={editing.effective_to ?? ""} onChange={(e) => setEditing({ ...editing, effective_to: e.target.value || null })} />
                </div>
                <div className="col-span-2 flex items-center gap-3">
                  <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
                  <Label>Active</Label>
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </FounderLayout>
  );
}