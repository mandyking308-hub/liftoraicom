import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Save, Trash2, BookOpen } from "lucide-react";
import { CSLayout, CSEmptyState, CSSection } from "./_shared";

const USE_CASES = [
  { value: "inbound_call", label: "Inbound call" },
  { value: "outbound_call", label: "Outbound call" },
  { value: "discovery", label: "Discovery" },
  { value: "demo", label: "Demo" },
  { value: "objection_handling", label: "Objection handling" },
  { value: "close", label: "Close" },
  { value: "follow_up", label: "Follow-up" },
  { value: "renewal", label: "Renewal" },
];

const CLOSE_ACTIONS = [
  { value: "prepare_only", label: "Prepare only (no external send)" },
  { value: "request_approval", label: "Request founder approval" },
  { value: "send_quote_after_approval", label: "Send quote after approval" },
  { value: "send_payment_link_after_approval", label: "Send payment link after approval" },
  { value: "send_booking_after_approval", label: "Send booking after approval" },
];

type Playbook = any;

function toLines(v: string): string[] {
  return v.split("\n").map(s => s.trim()).filter(Boolean);
}

function emptyPlaybook(): Playbook {
  return {
    id: null,
    playbook_name: "",
    use_case: "discovery",
    business_id: null,
    product_id: null,
    offer_id: null,
    opening_script: "",
    consent_notice: "This call may be recorded for quality and compliance purposes. By continuing you consent to this.",
    discovery_questions: [] as string[],
    qualification_rules: "",
    product_matching_logic: "",
    objection_responses: [] as any[],
    approved_claims: [] as string[],
    prohibited_claims: [] as string[],
    closing_questions: [] as string[],
    closing_script: "",
    close_action_allowed: "prepare_only",
    buying_signal_triggers: [] as string[],
    escalation_triggers: [] as string[],
    do_not_say_rules: [] as string[],
    compliance_notes: "",
    tone_of_voice: "calm, technical, honest, no hype",
    active: true,
  };
}

export default function Playbooks() {
  const qc = useQueryClient();
  const sb: any = supabase;
  const [editing, setEditing] = useState<Playbook | null>(null);

  const { data: playbooks = [], isLoading } = useQuery({
    queryKey: ["cs-playbooks"],
    queryFn: async () => {
      const { data } = await sb.from("customer_sales_playbooks").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });
  const { data: products = [] } = useQuery({
    queryKey: ["cs-products-min"],
    queryFn: async () => {
      const { data } = await sb.from("customer_sales_products").select("id, product_name, business_id");
      return data ?? [];
    },
  });

  const byUseCase = useMemo(() => {
    const map: Record<string, Playbook[]> = {};
    for (const u of USE_CASES) map[u.value] = [];
    for (const p of playbooks) (map[p.use_case] ||= []).push(p);
    return map;
  }, [playbooks]);

  async function save(p: Playbook) {
    const payload: any = { ...p };
    delete payload.id;
    payload.objection_responses = Array.isArray(p.objection_responses) ? p.objection_responses : [];
    const { error } = p.id
      ? await sb.from("customer_sales_playbooks").update(payload).eq("id", p.id)
      : await sb.from("customer_sales_playbooks").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Playbook saved");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["cs-playbooks"] });
  }

  async function remove(id: string) {
    if (!confirm("Delete this playbook?")) return;
    const { error } = await sb.from("customer_sales_playbooks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["cs-playbooks"] });
  }

  return (
    <CSLayout
      title="Playbook Engine"
      subtitle="Structured sales playbooks per use-case. Internal preparation runs live; external customer messages stay approval-gated."
      actions={<Button size="sm" onClick={() => setEditing(emptyPlaybook())}><Plus size={14} className="mr-1" />New playbook</Button>}
    >
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : playbooks.length === 0 ? (
        <CSEmptyState
          title="No playbooks yet"
          hint="Create at least one playbook per use case (inbound, outbound, discovery, demo, objection, close, follow-up, renewal)."
          action={<Button size="sm" onClick={() => setEditing(emptyPlaybook())}><Plus size={14} className="mr-1" />Create first playbook</Button>}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {USE_CASES.map(uc => (
            <Card key={uc.value} className="tech-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><BookOpen size={14} />{uc.label}</span>
                  <Badge variant="outline" className="text-[10px]">{byUseCase[uc.value]?.length || 0}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(byUseCase[uc.value] || []).length === 0 ? (
                  <Button variant="ghost" size="sm" className="w-full justify-start text-xs text-muted-foreground"
                    onClick={() => setEditing({ ...emptyPlaybook(), use_case: uc.value })}>
                    <Plus size={12} className="mr-1" /> Add {uc.label.toLowerCase()} playbook
                  </Button>
                ) : (
                  (byUseCase[uc.value] || []).map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border border-border/40 hover:border-primary/50">
                      <button className="text-xs text-left flex-1" onClick={() => setEditing(p)}>
                        <div className="font-medium">{p.playbook_name || "(untitled)"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {p.active ? "active" : "inactive"} · close: {p.close_action_allowed}
                        </div>
                      </button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => remove(p.id)}>
                        <Trash2 size={12} />
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <PlaybookEditor
          value={editing}
          products={products}
          onCancel={() => setEditing(null)}
          onSave={save}
        />
      )}
    </CSLayout>
  );
}

function PlaybookEditor({ value, products, onCancel, onSave }: { value: Playbook; products: any[]; onCancel: () => void; onSave: (p: Playbook) => void }) {
  const [p, setP] = useState<Playbook>(value);
  const set = (patch: Partial<Playbook>) => setP((cur: Playbook) => ({ ...cur, ...patch }));
  return (
    <Card className="tech-card mt-4 border-primary/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>{p.id ? "Edit playbook" : "New playbook"}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={() => onSave(p)}><Save size={14} className="mr-1" />Save</Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 text-xs">
        <Field label="Playbook name">
          <Input value={p.playbook_name || ""} onChange={e => set({ playbook_name: e.target.value })} />
        </Field>
        <Field label="Use case">
          <Select value={p.use_case} onValueChange={v => set({ use_case: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{USE_CASES.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Linked product (optional)">
          <Select value={p.product_id || "_none"} onValueChange={v => set({ product_id: v === "_none" ? null : v })}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_none">None</SelectItem>
              {products.map(pr => <SelectItem key={pr.id} value={pr.id}>{pr.product_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Close action allowed">
          <Select value={p.close_action_allowed} onValueChange={v => set({ close_action_allowed: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CLOSE_ACTIONS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Tone of voice" full>
          <Input value={p.tone_of_voice || ""} onChange={e => set({ tone_of_voice: e.target.value })} />
        </Field>
        <Field label="Opening line / script" full>
          <Textarea rows={3} value={p.opening_script || ""} onChange={e => set({ opening_script: e.target.value })} />
        </Field>
        <Field label="Consent / recording notice" full>
          <Textarea rows={2} value={p.consent_notice || ""} onChange={e => set({ consent_notice: e.target.value })} />
        </Field>
        <Field label="Discovery questions (one per line)" full>
          <Textarea rows={4} value={(p.discovery_questions || []).join("\n")} onChange={e => set({ discovery_questions: toLines(e.target.value) })} />
        </Field>
        <Field label="Qualification criteria / rules" full>
          <Textarea rows={3} value={p.qualification_rules || ""} onChange={e => set({ qualification_rules: e.target.value })} />
        </Field>
        <Field label="Product / offer matching logic" full>
          <Textarea rows={3} value={p.product_matching_logic || ""} onChange={e => set({ product_matching_logic: e.target.value })}
            placeholder="e.g. if budget>5k and team>10 → recommend Pro; else Starter" />
        </Field>
        <Field label="Approved claims (one per line)" full>
          <Textarea rows={3} value={(p.approved_claims || []).join("\n")} onChange={e => set({ approved_claims: toLines(e.target.value) })} />
        </Field>
        <Field label="Prohibited claims (one per line)" full>
          <Textarea rows={3} value={(p.prohibited_claims || []).join("\n")} onChange={e => set({ prohibited_claims: toLines(e.target.value) })} />
        </Field>
        <Field label="Objection response library (JSON array)" full>
          <Textarea rows={4} value={JSON.stringify(p.objection_responses || [], null, 2)}
            onChange={e => { try { set({ objection_responses: JSON.parse(e.target.value) }); } catch {/*ignore*/} }}
            placeholder='[{"objection":"too expensive","response":"…"}]' />
        </Field>
        <Field label="Closing questions (one per line)" full>
          <Textarea rows={3} value={(p.closing_questions || []).join("\n")} onChange={e => set({ closing_questions: toLines(e.target.value) })} />
        </Field>
        <Field label="Closing script" full>
          <Textarea rows={2} value={p.closing_script || ""} onChange={e => set({ closing_script: e.target.value })} />
        </Field>
        <Field label="Buying signal triggers (one per line)" full>
          <Textarea rows={3} value={(p.buying_signal_triggers || []).join("\n")} onChange={e => set({ buying_signal_triggers: toLines(e.target.value) })}
            placeholder="e.g. asks_price, asks_payment, says_yes_ready" />
        </Field>
        <Field label="Escalation triggers (one per line)" full>
          <Textarea rows={3} value={(p.escalation_triggers || []).join("\n")} onChange={e => set({ escalation_triggers: toLines(e.target.value) })}
            placeholder="e.g. asks_legal, asks_to_speak_to_someone, repeats_objection" />
        </Field>
        <Field label="Do-not-say rules (one per line)" full>
          <Textarea rows={3} value={(p.do_not_say_rules || []).join("\n")} onChange={e => set({ do_not_say_rules: toLines(e.target.value) })} />
        </Field>
        <Field label="Compliance notes" full>
          <Textarea rows={2} value={p.compliance_notes || ""} onChange={e => set({ compliance_notes: e.target.value })} />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({ label, children, full }: { label: string; children: any; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2 space-y-1" : "space-y-1"}>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}