import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import FounderLayout from "@/components/founder/FounderLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SEQUENCE_STEPS, checkWindow, onboardingSteps, splitRecipients, stepsBooked, type Booking } from "@/lib/portfolio/sendCalendar";

// Mounted inside FounderRoute; founder/admin RLS and the DB trigger are authoritative. Planning only — no sending.
const db: SupabaseClient = supabase;
type Biz = { id: string; name: string };
type Mailbox = { id: string; email: string; warmup_status: string | null; readiness_state: string | null };
const stateTone: Record<string, "default" | "secondary" | "destructive" | "outline"> = { done: "default", todo: "outline", optional: "secondary", blocked: "destructive" };

export default function PortfolioCalendar() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["portfolio-calendar"],
    queryFn: async () => {
      const [biz, mb, bk, kp, cd, sp] = await Promise.all([
        db.from("businesses").select("id,name").is("archived_at", null).neq("portfolio_status", "legacy_prelaunch").order("name"),
        db.from("gsm_mailboxes").select("id,email,warmup_status,readiness_state").eq("estate_classification", "gsm").eq("active", true).eq("retired", false).order("email"),
        db.from("portfolio_send_bookings").select("*").order("starts_at"),
        db.from("business_knowledge_profiles").select("business_id,profile_status"),
        db.from("outreach_campaign_drafts").select("business_id,campaign_name,status"),
        db.from("social_post_drafts").select("business_id"),
      ]);
      const err = [biz, mb, bk, kp, cd, sp].find((r) => r.error)?.error;
      if (err) throw new Error("Could not load the calendar.");
      return { biz: biz.data as Biz[], mailboxes: mb.data as Mailbox[], bookings: bk.data as Booking[],
        kp: kp.data as any[], drafts: cd.data as any[], social: sp.data as any[] };
    },
  });
  const [form, setForm] = useState({ business_id: "", campaign_label: "", sequence_step: 1, starts_at: "", ends_at: "", recipients: 0, scope: "all" as "all" | "one", mailbox_id: "" });
  const [saving, setSaving] = useState(false);
  const bizName = useMemo(() => Object.fromEntries((data?.biz ?? []).map((b) => [b.id, b.name])), [data]);
  const planned = (data?.bookings ?? []).filter((b) => b.status === "planned");
  const windows = useMemo(() => {
    const g = new Map<string, { key: string; business_id: string; campaign_label: string; step: number; starts_at: string; ends_at: string; mailboxes: number; recipients: number; ids: string[] }>();
    for (const b of planned) {
      const key = b.booking_group ?? b.id;
      const cur = g.get(key) ?? { key, business_id: b.business_id, campaign_label: b.campaign_label, step: b.sequence_step, starts_at: b.starts_at, ends_at: b.ends_at, mailboxes: 0, recipients: 0, ids: [] };
      cur.mailboxes++; cur.recipients += b.recipients_planned; cur.ids.push(b.id); g.set(key, cur);
    }
    return [...g.values()].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [planned]);

  async function book() {
    if (!data) return;
    const w = { business_id: form.business_id, campaign_label: form.campaign_label.trim(), sequence_step: Number(form.sequence_step),
      starts_at: form.starts_at && new Date(form.starts_at).toISOString(), ends_at: form.ends_at && new Date(form.ends_at).toISOString() };
    if (!w.business_id || !w.campaign_label || !w.starts_at || !w.ends_at) return toast.error("Fill in every field.");
    const ids = form.scope === "all" ? data.mailboxes.map((m) => m.id) : form.mailbox_id ? [form.mailbox_id] : [];
    const problem = checkWindow(data.bookings, w, ids);
    if (problem) return toast.error(problem);
    const split = splitRecipients(Math.max(0, Number(form.recipients) || 0), ids.length);
    const group = crypto.randomUUID();
    setSaving(true);
    const { error } = await db.from("portfolio_send_bookings").insert(ids.map((mailbox_id, i) => ({ ...w, mailbox_id, recipients_planned: split[i], booking_group: group })));
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Email ${w.sequence_step} booked across ${ids.length} mailboxes. Nothing has been sent.`);
    qc.invalidateQueries({ queryKey: ["portfolio-calendar"] });
  }
  async function cancelWindow(ids: string[]) {
    const { error } = await db.from("portfolio_send_bookings").update({ status: "cancelled" }).in("id", ids);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["portfolio-calendar"] });
  }
  return (
    <FounderLayout>
      <div className="space-y-8 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Portfolio send calendar & onboarding</h1>
          <p className="text-sm text-muted-foreground">One shared GSM mailbox pool for every business. Each business campaign is five emails, sent to all its recipients across the whole pool, then it stops and the next business takes its dates. Bookings are plans only — sending stays off.</p>
        </header>

        <section className="tech-card p-4 space-y-3">
          <h2 className="font-medium text-foreground">Onboarding journey</h2>
          {(data?.biz ?? []).map((b) => {
            const steps = onboardingSteps({ businessExists: true,
              manualStatus: data!.kp.find((k) => k.business_id === b.id)?.profile_status ?? null,
              campaignDrafts: data!.drafts.filter((d) => d.business_id === b.id).length,
              socialDrafts: data!.social.filter((s) => s.business_id === b.id).length, socialRequired: false,
              bookings: planned.filter((x) => x.business_id === b.id).length, inboxLive: false });
            return (
              <div key={b.id} className="space-y-2">
                <div className="text-sm font-medium text-foreground">{b.name}</div>
                <div className="flex flex-wrap gap-2">
                  {steps.map((s, i) => <Badge key={s.key} variant={stateTone[s.state]} title={s.note}>{i + 1}. {s.label} — {s.state}</Badge>)}
                </div>
              </div>
            );
          })}
          {data && data.biz.length === 0 && <p className="text-sm text-muted-foreground">No active businesses.</p>}
        </section>

        <section className="tech-card p-4 space-y-3">
          <h2 className="font-medium text-foreground">Book a send window</h2>
          <p className="text-xs text-muted-foreground">Liftor still lists all GSM mailboxes as warming (last provider check is out of date). Booking is allowed for planning; nothing sends.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label>Business</Label>
              <Select value={form.business_id} onValueChange={(v) => setForm({ ...form, business_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{(data?.biz ?? []).map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Campaign name</Label><Input value={form.campaign_label} onChange={(e) => setForm({ ...form, campaign_label: e.target.value })} placeholder="e.g. December launch" /></div>
            <div><Label>Which email</Label>
              <Select value={String(form.sequence_step)} onValueChange={(v) => setForm({ ...form, sequence_step: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Array.from({ length: SEQUENCE_STEPS }, (_, i) => <SelectItem key={i} value={String(i + 1)}>Email {i + 1} of {SEQUENCE_STEPS}</SelectItem>)}</SelectContent>
              </Select>
              {form.business_id && form.campaign_label && data && <p className="mt-1 text-xs text-muted-foreground">Already booked: {stepsBooked(data.bookings, form.business_id, form.campaign_label.trim()).join(", ") || "none"}</p>}</div>
            <div><Label>Start</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div><Label>Recipients in this window</Label><Input type="number" min={0} value={form.recipients} onChange={(e) => setForm({ ...form, recipients: Number(e.target.value) })} />
              <p className="mt-1 text-xs text-muted-foreground">Spread evenly across the mailboxes</p></div>
            <div><Label>Mailboxes</Label>
              <Select value={form.scope} onValueChange={(v) => setForm({ ...form, scope: v as "all" | "one" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="all">All {data?.mailboxes.length ?? 180} GSM mailboxes</SelectItem><SelectItem value="one">One mailbox (test)</SelectItem></SelectContent>
              </Select></div>
            {form.scope === "one" && <div><Label>Mailbox</Label>
              <Select value={form.mailbox_id} onValueChange={(v) => setForm({ ...form, mailbox_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{(data?.mailboxes ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.email}</SelectItem>)}</SelectContent>
              </Select></div>}
          </div>
          <Button onClick={book} disabled={saving}>Book window</Button>
        </section>

        <section className="tech-card p-4 space-y-2">
          <h2 className="font-medium text-foreground">What is already booked</h2>
          {windows.length === 0 ? <p className="text-sm text-muted-foreground">Nothing booked yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th>When</th><th>Business</th><th>Campaign</th><th>Email</th><th>Mailboxes</th><th>Recipients</th><th /></tr></thead>
              <tbody>{windows.map((w) => (
                <tr key={w.key} className="border-t border-border">
                  <td>{new Date(w.starts_at).toLocaleString("en-GB")} – {new Date(w.ends_at).toLocaleString("en-GB")}</td>
                  <td>{bizName[w.business_id] ?? "Unknown"}</td><td>{w.campaign_label}</td><td>{w.step} of {SEQUENCE_STEPS}</td><td>{w.mailboxes}</td><td>{w.recipients.toLocaleString("en-GB")}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => cancelWindow(w.ids)}>Cancel</Button></td>
                </tr>))}</tbody>
            </table>)}
        </section>
      </div>
    </FounderLayout>
  );
}
