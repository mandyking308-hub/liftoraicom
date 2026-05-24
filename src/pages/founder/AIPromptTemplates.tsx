import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
import AICostBreadcrumb from "@/components/founder/ai/AICostBreadcrumb";
import { supabase } from "@/integrations/supabase/client";
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
import { Sparkles, Plus, Pencil } from "lucide-react";
import { formatGBP } from "@/services/aiUsageLogger";
import type { PromptTemplate } from "@/services/aiPromptReuse";

const EMPTY: Partial<PromptTemplate> = {
  business_id: null, template_name: "", task_category: "", approved_prompt: "",
  model_tier: "standard", active: true,
};

export default function AIPromptTemplates() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<PromptTemplate> | null>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["tpl-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const businessName = (id: string | null) => id ? businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8) : "Global";

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["ai-prompt-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_prompt_templates")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PromptTemplate[];
    },
  });

  const save = useMutation({
    mutationFn: async (payload: Partial<PromptTemplate>) => {
      if (!payload.template_name || !payload.task_category || !payload.approved_prompt) {
        throw new Error("Name, category and prompt are required.");
      }
      if (payload.id) {
        const { error } = await supabase.from("ai_prompt_templates").update({
          business_id: payload.business_id ?? null,
          template_name: payload.template_name,
          task_category: payload.task_category,
          approved_prompt: payload.approved_prompt,
          model_tier: payload.model_tier ?? "standard",
          active: payload.active ?? true,
        }).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_prompt_templates").insert({
          business_id: payload.business_id ?? null,
          template_name: payload.template_name!,
          task_category: payload.task_category!,
          approved_prompt: payload.approved_prompt!,
          model_tier: payload.model_tier ?? "standard",
          active: payload.active ?? true,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: "Template saved" }); setEditing(null); qc.invalidateQueries({ queryKey: ["ai-prompt-templates"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: async (t: PromptTemplate) => {
      const { error } = await supabase.from("ai_prompt_templates").update({ active: !t.active }).eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-prompt-templates"] }),
  });

  return (
    <FounderLayout>
      <AICostBreadcrumb page="Prompt Templates" description="Reusable prompt templates with version control and quality scores." /><div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> AI Prompt Templates</h1>
            <p className="text-muted-foreground text-sm">Approved, reusable prompts. Liftor prefers these over freshly generated prompts to reduce cost and drift.</p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4 mr-1" /> New template</Button>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Avg cost</TableHead>
                  <TableHead>Avg ROI</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.template_name}</TableCell>
                    <TableCell className="font-mono text-xs">{t.task_category}</TableCell>
                    <TableCell>{businessName(t.business_id)}</TableCell>
                    <TableCell><Badge variant="outline">{t.model_tier ?? "—"}</Badge></TableCell>
                    <TableCell>{t.usage_count ?? 0}</TableCell>
                    <TableCell>{t.average_cost != null ? formatGBP(Number(t.average_cost)) : "—"}</TableCell>
                    <TableCell>{t.average_roi_score ?? "—"}</TableCell>
                    <TableCell><Switch checked={!!t.active} onCheckedChange={() => toggle.mutate(t)} /></TableCell>
                    <TableCell><Button size="sm" variant="outline" onClick={() => setEditing(t)}><Pencil className="h-3 w-3" /></Button></TableCell>
                  </TableRow>
                ))}
                {templates.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-6">No templates yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <>
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} template</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Template name</Label><Input value={editing.template_name ?? ""} onChange={(e) => setEditing({ ...editing, template_name: e.target.value })} /></div>
                  <div><Label>Task category</Label><Input value={editing.task_category ?? ""} onChange={(e) => setEditing({ ...editing, task_category: e.target.value })} placeholder="e.g. outbound_email" /></div>
                  <div>
                    <Label>Business</Label>
                    <Select value={editing.business_id ?? "global"} onValueChange={(v) => setEditing({ ...editing, business_id: v === "global" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">Global</SelectItem>
                        {businesses.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Model tier</Label>
                    <Select value={editing.model_tier ?? "standard"} onValueChange={(v) => setEditing({ ...editing, model_tier: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">none</SelectItem>
                        <SelectItem value="cheap">cheap</SelectItem>
                        <SelectItem value="standard">standard</SelectItem>
                        <SelectItem value="premium">premium</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Approved prompt</Label><Textarea rows={10} value={editing.approved_prompt ?? ""} onChange={(e) => setEditing({ ...editing, approved_prompt: e.target.value })} /></div>
                <div className="flex items-center gap-2"><Switch checked={!!editing.active} onCheckedChange={(v) => setEditing({ ...editing, active: v })} /><Label>Active</Label></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>Save</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </FounderLayout>
  );
}