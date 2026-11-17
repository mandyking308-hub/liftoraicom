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
import { CAMPAIGN_EMAIL_CAP, checkBooking, emailsBooked, onboardingSteps, type Booking } from "@/lib/portfolio/sendCalendar";

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
  const [form, setForm] = useState({ business_id: "", campaign_label: "", mailbox_id: "", starts_at: "", ends_at: "", emails_planned: 1 });
  const [saving, setSaving] = useState(false);
  const bizName = useMemo(() => Object.fromEntries((data?.biz ?? []).map((b) => [b.id, b.name])), [data]);
  const mbEmail = useMemo(() => Object.fromEntries((data?.mailboxes ?? []).map((m) => [m.id, m.email])), [data]);
  const planned = (data?.bookings ?? []).filter((b) => b.status === "planned");

  async function book() {
    if (!data) return;
    const next = { ...form, starts_at: form.starts_at && new Date(form.starts_at).toISOString(), ends_at: form.ends_at && new Date(form.ends_at).toISOString(), emails_planned: Number(form.emails_planned) };
    if (!next.business_id || !next.campaign_label.trim() || !next.mailbox_id || !next.starts_at || !next.ends_at) return toast.error("Fill in every field.");
    const problem = checkBooking(data.bookings, next);
    if (problem) return toast.error(problem);
    setSaving(true);
    const { error } = await db.from("portfolio_send_bookings").insert({ ...next, campaign_label: next.campaign_label.trim() });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booked on the calendar. Nothing has been sent.");
    qc.invalidateQueries({ queryKey: ["portfolio-calendar"] });
  }
  async function cancel(id: string) {
    const { error } = await db.from("portfolio_send_bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["portfolio-calendar"] });
  }

  return (
    <FounderLayout>
      <div className="space-y-8 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">Portfolio send calendar & onboarding</h1>
          <p className="text-sm text-muted-foreground">One shared GSM mailbox pool for every business. Each campaign is capped at {CAMPAIGN_EMAIL_CAP} emails in total. Bookings are plans only — sending stays off.</p>
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
            <div><Label>Campaign name</Label><Input value={form.campaign_label} onChange={(e) => setForm({ ...form, campaign_label: e.target.value })} placeholder="e.g. December pilot" /></div>
            <div><Label>Mailbox</Label>
              <Select value={form.mailbox_id} onValueChange={(v) => setForm({ ...form, mailbox_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{(data?.mailboxes ?? []).map((m) => <SelectItem key={m.id} value={m.id}>{m.email} · {m.warmup_status ?? "unknown"}</SelectItem>)}</SelectContent>
              </Select></div>
            <div><Label>Start</Label><Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} /></div>
            <div><Label>End</Label><Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} /></div>
            <div><Label>Emails in this window</Label><Input type="number" min={1} max={CAMPAIGN_EMAIL_CAP} value={form.emails_planned} onChange={(e) => setForm({ ...form, emails_planned: Number(e.target.value) })} />
              {form.business_id && form.campaign_label && data && <p className="mt-1 text-xs text-muted-foreground">{emailsBooked(data.bookings, form.business_id, form.campaign_label.trim())}/{CAMPAIGN_EMAIL_CAP} already booked</p>}</div>
          </div>
          <Button onClick={book} disabled={saving}>Book window</Button>
        </section>

        <section className="tech-card p-4 space-y-2">
          <h2 className="font-medium text-foreground">What is already booked</h2>
          {planned.length === 0 ? <p className="text-sm text-muted-foreground">Nothing booked yet.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground"><tr><th>When</th><th>Business</th><th>Campaign</th><th>Mailbox</th><th>Emails</th><th /></tr></thead>
              <tbody>{planned.map((b) => (
                <tr key={b.id} className="border-t border-border">
                  <td>{new Date(b.starts_at).toLocaleString("en-GB")} – {new Date(b.ends_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</td>
                  <td>{bizName[b.business_id] ?? "Unknown"}</td><td>{b.campaign_label}</td><td>{mbEmail[b.mailbox_id] ?? "—"}</td><td>{b.emails_planned}</td>
                  <td><Button size="sm" variant="ghost" onClick={() => cancel(b.id)}>Cancel</Button></td>
                </tr>))}</tbody>
            </table>)}
        </section>
      </div>
    </FounderLayout>
  );
}
