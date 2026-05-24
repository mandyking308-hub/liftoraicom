import { useState, ReactNode } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "number" | "select" | "date";
  options?: { value: string; label: string }[];
  required?: boolean;
  placeholder?: string;
  help?: string;
};

type Props = {
  trigger: ReactNode;
  title: string;
  table: string;
  fields: FieldDef[];
  invalidateKey: string;
  defaults?: Record<string, any>;
  requireSourceNote?: boolean;
};

export default function MARecordDialog({ trigger, title, table, fields, invalidateKey, defaults = {}, requireSourceNote = true }: Props) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, any>>({ ...defaults });
  const [sourceNote, setSourceNote] = useState("");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const reset = () => { setVals({ ...defaults }); setSourceNote(""); };

  const save = async () => {
    for (const f of fields) {
      if (f.required && (vals[f.name] === undefined || vals[f.name] === null || vals[f.name] === "")) {
        toast.error(`${f.label} is required`); return;
      }
    }
    if (requireSourceNote && !sourceNote.trim() && !vals.source_id) {
      toast.error("Provide a source reference or a manual-note explanation");
      return;
    }
    setSaving(true);
    const payload: Record<string, any> = {};
    for (const f of fields) {
      let v = vals[f.name];
      if (v === "" || v === undefined) continue;
      if (f.type === "number") v = Number(v);
      payload[f.name] = v;
    }
    if (requireSourceNote && sourceNote.trim()) {
      payload.notes = `[manual note] ${sourceNote.trim()}${payload.notes ? `\n${payload.notes}` : ""}`;
    }
    const { error } = await (supabase as any).from(table).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${title} added`);
    qc.invalidateQueries({ queryKey: [invalidateKey] });
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.name} className={f.type === "textarea" ? "md:col-span-2" : ""}>
              <Label className="text-xs">{f.label}{f.required && <span className="text-destructive"> *</span>}</Label>
              {f.type === "textarea" ? (
                <Textarea value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder} rows={3} />
              ) : f.type === "select" ? (
                <Select value={vals[f.name] ?? ""} onValueChange={(v) => setVals({ ...vals, [f.name]: v })}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder ?? "Select…"} /></SelectTrigger>
                  <SelectContent>{f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              ) : (
                <Input type={f.type ?? "text"} value={vals[f.name] ?? ""} onChange={(e) => setVals({ ...vals, [f.name]: e.target.value })} placeholder={f.placeholder} />
              )}
              {f.help && <p className="text-[10px] text-muted-foreground mt-0.5">{f.help}</p>}
            </div>
          ))}
          {requireSourceNote && (
            <div className="md:col-span-2 border-t border-border pt-3">
              <Label className="text-xs flex items-center gap-1"><AlertCircle className="h-3 w-3 text-amber-400" /> Source or manual-note explanation <span className="text-destructive">*</span></Label>
              <Textarea value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="Where did this come from? e.g. 'manual founder note', 'public press release dd/mm', adviser intro…" rows={2} />
              <p className="text-[10px] text-muted-foreground mt-1">Required for governance. Either link a registered source above, or describe the origin here.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save record"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}