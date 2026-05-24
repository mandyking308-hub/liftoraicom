import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import FounderLayout from "@/components/founder/FounderLayout";
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
import { Database, Plus, Pencil, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  CONTEXT_TYPES, isContextStale, STALE_WARNING,
  type CachedContextBlock, type ContextType,
} from "@/services/aiPromptReuse";

const EMPTY: Partial<CachedContextBlock> = {
  business_id: null, context_type: "brand_voice", title: "", summary: "",
  source_reference: "", last_verified_at: new Date().toISOString(), expires_at: null, active: true,
};

export default function AICachedContext() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<CachedContextBlock> | null>(null);

  const { data: businesses = [] } = useQuery({
    queryKey: ["ctx-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
  });
  const businessName = (id: string | null) => id ? businesses.find((b) => b.id === id)?.name ?? id.slice(0, 8) : "Global";

  const { data: blocks = [] } = useQuery({
    queryKey: ["ai-cached-context"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ai_cached_context_blocks").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CachedContextBlock[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Partial<CachedContextBlock>) => {
      if (!p.title || !p.summary || !p.context_type) throw new Error("Title, summary and context type are required.");
      const payload = {
        business_id: p.business_id ?? null,
        context_type: p.context_type,
        title: p.title,
        summary: p.summary,
        source_reference: p.source_reference ?? null,
        last_verified_at: p.last_verified_at ?? new Date().toISOString(),
        expires_at: p.expires_at ?? null,
        active: p.active ?? true,
      };
      if (p.id) {
        const { error } = await supabase.from("ai_cached_context_blocks").update(payload).eq("id", p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ai_cached_context_blocks").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast({ title: "Context saved" }); setEditing(null); qc.invalidateQueries({ queryKey: ["ai-cached-context"] }); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const verify = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ai_cached_context_blocks").update({ last_verified_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-cached-context"] }),
  });

  const toggle = useMutation({
    mutationFn: async (b: CachedContextBlock) => {
      const { error } = await supabase.from("ai_cached_context_blocks").update({ active: !b.active }).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-cached-context"] }),
  });

  return (
    <FounderLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2"><Database className="h-6 w-6 text-primary" /> Cached Context Blocks</h1>
            <p className="text-muted-foreground text-sm">Reusable summaries and references (brand voice, research, manuals…). Liftor injects these instead of re-generating context. Only summaries are stored.</p>
          </div>
          <Button onClick={() => setEditing({ ...EMPTY })}><Plus className="h-4 w-4 mr-1" /> New context block</Button>
        </div>

        <Card className="tech-card">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Verified</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blocks.map((b) => {
                  const stale = isContextStale(b);
                  return (
                    <TableRow key={b.id} className={stale ? "bg-amber-500/5" : ""}>
                      <TableCell className="font-medium">{b.title}</TableCell>
                      <TableCell className="font-mono text-xs">{b.context_type}</TableCell>
                      <TableCell>{businessName(b.business_id)}</TableCell>
                      <TableCell className="text-xs">{b.last_verified_at ? new Date(b.last_verified_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell className="text-xs">{b.expires_at ? new Date(b.expires_at).toLocaleDateString() : "—"}</TableCell>
                      <TableCell>
                        {stale
                          ? <Badge variant="outline" className="bg-amber-500/15 text-amber-400 border-amber-500/30"><AlertTriangle className="h-3 w-3 mr-1" />stale</Badge>
                          : <Badge variant="outline" className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />fresh</Badge>
                        }
                      </TableCell>
                      <TableCell><Switch checked={!!b.active} onCheckedChange={() => toggle.mutate(b)} /></TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="outline" onClick={() => verify.mutate(b.id)}>Verify</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(b)}><Pencil className="h-3 w-3" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {blocks.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6">No cached context yet.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-base">Freshness rules</CardTitle><CardDescription>{STALE_WARNING}</CardDescription></CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Blocks are flagged stale when their <code>expires_at</code> has passed or when <code>last_verified_at</code> is older than 30 days. Stale blocks are still visible but must be re-verified before reuse.
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => { if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          {editing && (
            <>
              <DialogHeader><DialogTitle>{editing.id ? "Edit" : "New"} context block</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Title</Label><Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={editing.context_type ?? "brand_voice"} onValueChange={(v) => setEditing({ ...editing, context_type: v as ContextType })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CONTEXT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
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
                  <div><Label>Source reference</Label><Input value={editing.source_reference ?? ""} onChange={(e) => setEditing({ ...editing, source_reference: e.target.value })} placeholder="doc URL / Notion / drive id" /></div>
                  <div><Label>Last verified</Label><Input type="date" value={editing.last_verified_at ? editing.last_verified_at.slice(0, 10) : ""} onChange={(e) => setEditing({ ...editing, last_verified_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                  <div><Label>Expires</Label><Input type="date" value={editing.expires_at ? editing.expires_at.slice(0, 10) : ""} onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })} /></div>
                </div>
                <div><Label>Summary (no confidential raw data)</Label><Textarea rows={8} value={editing.summary ?? ""} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} /></div>
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