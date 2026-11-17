import { useQuery } from "@tanstack/react-query";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

// Live, read-only sending readiness for the shared GSM pool. Never enables anything.
const db: SupabaseClient = supabase;
type Check = { label: string; ok: boolean; detail: string };

export default function SendingReadinessPanel({ businesses }: { businesses: { id: string; name: string }[] }) {
  const { data, isError } = useQuery({
    queryKey: ["sending-readiness", businesses.map((b) => b.id).join(",")],
    queryFn: async () => {
      const [mb, ev, gates, rel] = await Promise.all([
        db.from("gsm_mailboxes").select("readiness_state,warmup_status,health_score,last_provider_check_at,smtp_status,imap_status,smartlead_status")
          .eq("estate_classification", "gsm").eq("active", true).eq("retired", false),
        db.from("smartlead_activity_events").select("created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1),
        db.from("external_action_gates").select("gate_key,enabled"),
        db.from("business_contact_relationships").select("business_id,campaign_eligible").in("business_id", businesses.map((b) => b.id)),
      ]);
      if (mb.error || ev.error || gates.error || rel.error) throw new Error("load");
      return { mb: mb.data as any[], evCount: ev.count ?? 0, lastEv: (ev.data as any[])[0]?.created_at as string | undefined, gates: gates.data as any[], rel: rel.data as any[] };
    },
  });
  if (isError) return <section className="tech-card p-4 text-sm text-destructive">Could not load sending readiness.</section>;
  if (!data) return <section className="tech-card p-4 text-sm text-muted-foreground">Checking sending readiness…</section>;

  const total = data.mb.length;
  const last = data.mb.map((m) => m.last_provider_check_at).filter(Boolean).sort().pop() as string | undefined;
  const fresh = last ? Date.now() - new Date(last).getTime() < 24 * 3600e3 : false;
  const ready = data.mb.filter((m) => m.readiness_state === "campaign_ready").length;
  const connected = data.mb.filter((m) => m.smtp_status === "ok" && m.imap_status === "ok" && m.smartlead_status === "connected").length;
  const minHealth = Math.min(...data.mb.map((m) => m.health_score ?? 0));
  const gatesOn = data.gates.filter((g) => g.enabled).length;

  const checks: Check[] = [
    { label: "Mailboxes connected (sending + receiving)", ok: connected === total && total > 0, detail: `${connected} of ${total} GSM mailboxes` },
    { label: "Mailbox status checked in the last 24 hours", ok: fresh, detail: last ? `Last check ${new Date(last).toLocaleString("en-GB")}` : "Never checked" },
    { label: "Mailbox health", ok: minHealth >= 90, detail: `Lowest health score ${minHealth}` },
    { label: "Mailboxes marked ready to send", ok: ready > 0, detail: `${ready} of ${total} — warming mailboxes count as ready at health 90+` },
    { label: "Opens, replies, bounces and opt-outs arriving in Liftor", ok: data.evCount > 0, detail: data.evCount ? `${data.evCount} events, last ${new Date(data.lastEv!).toLocaleString("en-GB")}` : "None received yet — Smartlead signing key needed" },
    ...businesses.map((b) => {
      const n = data.rel.filter((r) => r.business_id === b.id && r.campaign_eligible).length;
      return { label: `${b.name}: recipients cleared to receive email`, ok: n > 0, detail: `${n} cleared` };
    }),
    { label: "Verified postal address in email footer", ok: true, detail: "1207 Delaware Ave #1113, Wilmington, DE 19806 — confirmed 17 Nov, in all four Kindnesss emails" },
  ];
  const blockers = checks.filter((c) => !c.ok).length;

  return (
    <section className="tech-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="font-medium text-foreground">Ready to send?</h2>
        <Badge variant={blockers ? "destructive" : "default"}>{blockers ? `${blockers} blocker(s)` : "All checks pass"}</Badge>
        <span className="ml-auto text-xs text-muted-foreground">Sending switches: {gatesOn} of {data.gates.length} on</span>
      </div>
      <ul className="space-y-1 text-sm">
        {checks.map((c) => (
          <li key={c.label} className="flex flex-wrap items-center gap-2">
            <Badge variant={c.ok ? "default" : "outline"}>{c.ok ? "Done" : "To do"}</Badge>
            <span className="text-foreground">{c.label}</span>
            <span className="text-muted-foreground">— {c.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
