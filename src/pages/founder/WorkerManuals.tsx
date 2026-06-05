import { useEffect, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ROLES = [
  { value: "technical_operator", label: "Technical Operator Manual" },
  { value: "dubai_oversight", label: "Dubai Oversight Reviewer Manual" },
  { value: "professional_reviewer", label: "Professional Reviewer Manual" },
  { value: "legal_research", label: "Legal Research Manual" },
  { value: "admin_support", label: "Admin Support Manual" },
];

const DEFAULT_SECTIONS = [
  "daily_start", "daily_end", "what_you_see", "never_do", "task_process",
  "help_chat", "evidence_upload", "escalate_to_mandy", "handle_mistakes",
  "monthly_campaign_process", "new_business_onboarding", "forbidden_actions",
  "confidentiality", "session_timeout",
];

export default function WorkerManuals() {
  const { user } = useAuth();
  const [manuals, setManuals] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [form, setForm] = useState({ role: "technical_operator", manual_title: "", manual_version: "v1", manual_body: "" });
  const [secForm, setSecForm] = useState({ section_key: "daily_start", section_title: "", section_body: "" });

  const reload = async () => {
    const { data: m } = await (supabase as any).from("worker_manuals").select("*").order("role").order("created_at", { ascending: false });
    setManuals(m ?? []);
    if (active) {
      const { data: s } = await (supabase as any).from("worker_manual_sections").select("*").eq("manual_id", active.id).order("display_order");
      setSections(s ?? []);
    }
  };
  useEffect(() => { reload(); }, [active?.id]);

  const createManual = async () => {
    if (!form.manual_title) { toast.error("Title required"); return; }
    const { data, error } = await (supabase as any).from("worker_manuals").insert({
      role: form.role, manual_title: form.manual_title, manual_version: form.manual_version, manual_body: form.manual_body, status: "draft",
    }).select("*").single();
    if (error) { toast.error(error.message); return; }
    toast.success("Manual created (draft)");
    setActive(data); reload();
  };

  const addSection = async () => {
    if (!active) return;
    if (!secForm.section_title) { toast.error("Section title required"); return; }
    await (supabase as any).from("worker_manual_sections").insert({
      manual_id: active.id,
      section_key: secForm.section_key,
      section_title: secForm.section_title,
      section_body: secForm.section_body,
      display_order: sections.length,
    });
    setSecForm({ section_key: "daily_start", section_title: "", section_body: "" });
    reload();
  };

  const approveManual = async (m: any) => {
    await (supabase as any).from("worker_manuals").update({
      status: "active",
      founder_approved_by: user?.id ?? null,
      founder_approved_at: new Date().toISOString(),
    }).eq("id", m.id);
    // archive any prior active for same role
    await (supabase as any).from("worker_manuals").update({ status: "archived" }).eq("role", m.role).eq("status", "active").neq("id", m.id);
    toast.success("Manual approved & active");
    reload();
  };

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Worker Manuals</h1>
          <p className="text-sm text-muted-foreground">Versioned, founder-approved manuals per role. Workers must acknowledge the active manual before their first session.</p>
        </header>

        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-semibold uppercase text-muted-foreground">Create manual</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Title" value={form.manual_title} onChange={(e) => setForm({ ...form, manual_title: e.target.value })} />
            <Input placeholder="Version (e.g. v1, v2)" value={form.manual_version} onChange={(e) => setForm({ ...form, manual_version: e.target.value })} />
          </div>
          <Textarea rows={3} placeholder="Manual body / overview" value={form.manual_body} onChange={(e) => setForm({ ...form, manual_body: e.target.value })} />
          <Button onClick={createManual}>Create draft manual</Button>
        </Card>

        <div className="grid md:grid-cols-[1fr,2fr] gap-4">
          <Card className="p-4">
            <h2 className="font-semibold mb-3">All manuals</h2>
            {manuals.length === 0 ? <p className="text-sm text-muted-foreground">No manuals yet.</p> : (
              <ul className="space-y-2">
                {manuals.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => setActive(m)} className={`w-full text-left p-3 rounded-lg border ${active?.id === m.id ? "border-primary bg-primary/5" : "border-border/50"}`}>
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium">{m.manual_title}</span>
                        <Badge variant="outline" className="text-xs">{m.status}</Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{m.role} · {m.manual_version}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            {!active ? <p className="text-sm text-muted-foreground">Select a manual to add sections.</p> : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-semibold">{active.manual_title} <Badge variant="outline" className="ml-2">{active.status}</Badge></h2>
                    <p className="text-xs text-muted-foreground">{active.role} · {active.manual_version}</p>
                  </div>
                  {active.status !== "active" && <Button size="sm" onClick={() => approveManual(active)}>Approve &amp; activate</Button>}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Sections ({sections.length})</h3>
                  {sections.length === 0 ? <p className="text-sm text-muted-foreground">No sections yet.</p> : sections.map((s) => (
                    <div key={s.id} className="p-3 border border-border/40 rounded-lg">
                      <div className="flex justify-between"><span className="text-sm font-medium">{s.section_title}</span><Badge variant="outline" className="text-xs">{s.section_key}</Badge></div>
                      {s.section_body && <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{s.section_body}</p>}
                    </div>
                  ))}
                </div>

                <div className="space-y-2 border-t border-border/40 pt-3">
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">Add section</h3>
                  <div className="grid md:grid-cols-2 gap-2">
                    <Select value={secForm.section_key} onValueChange={(v) => setSecForm({ ...secForm, section_key: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{DEFAULT_SECTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input placeholder="Title" value={secForm.section_title} onChange={(e) => setSecForm({ ...secForm, section_title: e.target.value })} />
                  </div>
                  <Textarea rows={4} placeholder="Section body" value={secForm.section_body} onChange={(e) => setSecForm({ ...secForm, section_body: e.target.value })} />
                  <Button size="sm" variant="secondary" onClick={addSection}>Add section</Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </FounderLayout>
  );
}