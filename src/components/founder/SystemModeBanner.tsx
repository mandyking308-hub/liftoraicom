import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight } from "lucide-react";

const SystemModeBanner = () => {
  const { data } = useQuery({
    queryKey: ["system-mode-banner"],
    refetchInterval: 60000,
    queryFn: async () => {
      const [settings, modes, flags, blocked, capQueue, liveInbox, openSysWarn, totalSysWarn] = await Promise.all([
        supabase.from("system_settings").select("key,value"),
        supabase.from("system_execution_modes").select("mode_name,is_default"),
        supabase.from("system_feature_flags").select("feature_name,enabled,execution_mode_id"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "blocked"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "blocked").eq("block_reason", "PROVIDER_DAILY_LIMIT_REACHED"),
        supabase.from("inboxes").select("id,email_address", { count: "exact" }).eq("active", true),
        supabase.from("system_events").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("system_events").select("id", { count: "exact", head: true }),
      ]);

      const settingsMap = Object.fromEntries((settings.data ?? []).map((r: any) => [r.key, r.value]));
      return {
        systemMode: String(settingsMap.system_mode ?? "unknown").toLowerCase(),
        executionMode: (modes.data ?? []).find((m: any) => m.is_default)?.mode_name ?? null,
        flagsEnabled: (flags.data ?? []).filter((f: any) => f.enabled).length,
        flagsTotal: (flags.data ?? []).length,
        blocked: blocked.count ?? 0,
        providerCapped: (capQueue.count ?? 0) > 0,
        liveInbox: (liveInbox.data?.[0] as any)?.email_address ?? null,
        liveInboxCount: liveInbox.count ?? 0,
        sysWarningsOpen: openSysWarn.count ?? 0,
        sysWarningsTotal: totalSysWarn.count ?? 0,
      };
    },
  });

  if (!data) return null;

  // TEST MODE removed as operational gate. Treat anything other than explicit
  // admin-only "sandbox" as LIVE OPERATING MODE.
  const isLive = data.systemMode !== "sandbox";
  const banners: { icon: any; cls: string; title: string; detail: string; to: string }[] = [];

  banners.push(
    isLive
      ? { icon: ShieldCheck, cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", title: "LIVE OPERATING MODE — real execution enabled. Guardrails active.", detail: `Execution mode: ${data.executionMode ?? "default"} · ${data.flagsEnabled}/${data.flagsTotal} feature flags on · provider, contact and compliance guardrails enforced`, to: "/founder/system/modes" }
      : { icon: ShieldAlert, cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", title: "SANDBOX MODE (admin-only)", detail: "Sandbox is a non-default development mode. Live execution is paused.", to: "/founder/system/modes" }
  );

  if (data.liveInboxCount === 0) {
    banners.push({ icon: AlertTriangle, cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", title: "No live inbox configured", detail: "Email Agent cannot send until an inbox is active", to: "/founder/crm/inboxes" });
  } else {
    const capDetail = data.providerCapped
      ? (isLive ? "Provider daily cap reached — sends paused until reset" : "Provider cap is informational — TEST MODE blocks sends regardless")
      : (isLive ? "Provider OK" : "Provider OK · informational only in TEST MODE");
    banners.push({ icon: ShieldCheck, cls: "bg-secondary/40 border-border/40 text-foreground/80", title: `Active inbox: ${data.liveInbox}`, detail: capDetail, to: "/founder/sending" });
  }

  if (data.blocked > 0) {
    banners.push({ icon: AlertTriangle, cls: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400", title: `${data.blocked} queue items blocked by safety gates`, detail: "Compliance/Outreach gates are holding sends", to: "/founder/outreach/queue" });
  }

  if (data.sysWarningsTotal > 0) {
    const open = data.sysWarningsOpen;
    banners.push({
      icon: AlertTriangle,
      cls: open > 0 ? "bg-destructive/10 border-destructive/40 text-destructive" : "bg-secondary/40 border-border/40 text-foreground/80",
      title: `System warnings: ${open} open / ${data.sysWarningsTotal} logged total`,
      detail: open > 0 ? "Oversight Agent has open warnings" : "All logged warnings resolved",
      to: "/founder/system/events",
    });
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
      {banners.map((b, i) => (
        <Link key={i} to={b.to} className={`flex items-start gap-2 p-3 rounded-lg border ${b.cls} hover:opacity-90 transition-opacity`}>
          <b.icon size={16} className="shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold leading-tight">{b.title}</p>
            <p className="text-[11px] opacity-80 line-clamp-2 mt-0.5">{b.detail}</p>
          </div>
          <ArrowRight size={12} className="shrink-0 mt-1 opacity-60" />
        </Link>
      ))}
    </div>
  );
};

export default SystemModeBanner;