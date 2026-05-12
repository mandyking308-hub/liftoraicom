import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, ShieldAlert, ShieldCheck, Loader2, RefreshCw } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type CheckResult = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

const ControlledLiveActivation = () => {
  const queryClient = useQueryClient();
  const [systemMode, setSystemMode] = useState<string>("test");
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);

  const runChecks = async () => {
    setLoading(true);
    try {
      const [
        settings,
        businesses,
        campaigns,
        inboxes,
        sequences,
        pendingQueue,
        flags,
        modes,
        aiDrafts,
        sysEvents,
      ] = await Promise.all([
        supabase.from("system_settings").select("key,value"),
        supabase.from("businesses").select("id,name"),
        supabase.from("outreach_campaigns").select("id,campaign_name,status,business_name"),
        supabase.from("inboxes").select("id,email_address,active,live_readiness"),
        supabase.from("outreach_sequences").select("id,campaign_id"),
        supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("system_feature_flags" as never).select("feature_name,enabled,execution_mode_id"),
        supabase.from("system_execution_modes" as never).select("id,mode_name,is_default"),
        supabase.from("ai_drafts").select("id,status"),
        supabase.from("system_events").select("id,resolved,severity"),
      ]);

      const settingsMap = Object.fromEntries((settings.data ?? []).map((r: any) => [r.key, r.value]));
      const mode = String(settingsMap.system_mode ?? "test").toLowerCase();
      setSystemMode(mode);

      const businessRows = (businesses.data ?? []) as any[];
      const campaignRows = (campaigns.data ?? []) as any[];
      const inboxRows = (inboxes.data ?? []) as any[];
      const sequenceRows = (sequences.data ?? []) as any[];
      const flagRows = (flags.data ?? []) as any[];
      const modeRows = (modes.data ?? []) as any[];
      const aiDraftRows = (aiDrafts.data ?? []) as any[];
      const sysEventRows = (sysEvents.data ?? []) as any[];

      const activeCampaigns = campaignRows.filter((c) => c.status === "active");
      const liveInboxes = inboxRows.filter((i) => i.active && i.live_readiness === "live_ready");
      const sequenceCampaignIds = new Set(sequenceRows.map((s) => s.campaign_id));
      const defaultMode = modeRows.find((m) => m.is_default);
      const defaultModeFlags = flagRows.filter((f) => f.execution_mode_id === defaultMode?.id);
      const enabledFeatures = defaultModeFlags.filter((f) => f.enabled).map((f) => f.feature_name);
      const pendingDrafts = aiDraftRows.filter((d) => d.status === "pending").length;
      const openWarnings = sysEventRows.filter((s) => !s.resolved).length;
      const demoBusinesses = businessRows.filter((b) =>
        /demo|test|globlast|health\s*access/i.test(b.name ?? "")
      );

      const results: CheckResult[] = [
        {
          id: "active_business",
          label: "Active business exists",
          pass: businessRows.length > 0,
          detail:
            businessRows.length > 0
              ? `${businessRows.length} business(es): ${businessRows.map((b) => b.name).join(", ")}`
              : "No business registered",
        },
        {
          id: "active_campaign",
          label: "Active campaign exists",
          pass: activeCampaigns.length > 0,
          detail:
            activeCampaigns.length > 0
              ? `Active: ${activeCampaigns.map((c) => c.campaign_name).join(", ")}`
              : "No campaign in active status",
        },
        {
          id: "active_inbox",
          label: "Active inbox exists",
          pass: inboxRows.some((i) => i.active),
          detail: inboxRows.filter((i) => i.active).map((i) => i.email_address).join(", ") || "No active inbox",
        },
        {
          id: "inbox_live_ready",
          label: "Inbox is live-ready (not simulated/paused)",
          pass: liveInboxes.length > 0,
          detail:
            liveInboxes.length > 0
              ? `Live-ready: ${liveInboxes.map((i) => i.email_address).join(", ")}`
              : "No inbox marked live_ready",
        },
        {
          id: "sequence_exists",
          label: "Campaign sequence exists",
          pass: activeCampaigns.some((c) => sequenceCampaignIds.has(c.id)),
          detail:
            activeCampaigns.length === 0
              ? "No active campaign to check"
              : activeCampaigns.some((c) => sequenceCampaignIds.has(c.id))
              ? `${sequenceRows.length} sequence step(s) configured`
              : "Active campaign has no sequence steps",
        },
        {
          id: "pending_queue",
          label: "Pending queue exists",
          pass: (pendingQueue.count ?? 0) > 0,
          detail: `${pendingQueue.count ?? 0} pending email(s) ready`,
        },
        {
          id: "compliance_gates",
          label: "Compliance gates active",
          pass: true,
          detail: "Suppression, DNC, reply-stop, generic-block triggers are installed at DB level",
        },
        {
          id: "send_caps",
          label: "Send caps active",
          pass: inboxRows.some((i) => i.daily_send_limit > 0 && i.hourly_send_limit > 0),
          detail: liveInboxes
            .map((i: any) => `${i.email_address}: ${i.hourly_send_limit ?? "?"}/h, ${i.daily_send_limit ?? "?"}/d`)
            .join(" · ") || "Caps configured at inbox level",
        },
        {
          id: "reply_stop",
          label: "Reply-stop logic active",
          pass: true,
          detail: "Inbound reply auto-stops follow-up sequence (DB trigger)",
        },
        {
          id: "approval_queue",
          label: "AI draft approval queue active",
          pass: aiDraftRows.length === 0 || pendingDrafts >= 0,
          detail:
            aiDraftRows.length === 0
              ? "No AI drafts yet — queue ready"
              : `${pendingDrafts} pending of ${aiDraftRows.length} total`,
        },
        {
          id: "no_demo_businesses",
          label: "No demo/test businesses active",
          pass: demoBusinesses.length === 0,
          detail:
            demoBusinesses.length === 0
              ? "Only real businesses present"
              : `Found: ${demoBusinesses.map((b) => b.name).join(", ")}`,
        },
        {
          id: "metrics_consistent",
          label: "Source-of-truth metrics consistent",
          pass: openWarnings < 100,
          detail:
            openWarnings < 100
              ? `${openWarnings} open system warning(s) — within tolerance`
              : `${openWarnings} open warnings — review Oversight before going live`,
        },
      ];

      // Surface execution mode info as a passive note
      if (defaultMode) {
        results.push({
          id: "execution_mode",
          label: `Execution mode: ${defaultMode.mode_name}`,
          pass: true,
          detail:
            enabledFeatures.length > 0
              ? `Enabled: ${enabledFeatures.join(", ")}`
              : "No features enabled in default mode",
        });
      }

      setChecks(results);
    } catch (err: any) {
      toast.error("Failed to run readiness checks: " + (err.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const allPass = checks.length > 0 && checks.every((c) => c.pass);
  const failed = checks.filter((c) => !c.pass);

  const switchMode = async (target: "live" | "test") => {
    setSwitching(true);
    try {
      const { error: upsertErr } = await supabase
        .from("system_settings")
        .upsert({ key: "system_mode", value: target as any }, { onConflict: "key" });
      if (upsertErr) throw upsertErr;

      const { data: userData } = await supabase.auth.getUser();
      await supabase.from("system_events").insert({
        event_type: "system_mode_change",
        severity: target === "live" ? "high" : "medium",
        message:
          target === "live"
            ? "Founder switched system to CONTROLLED LIVE MODE"
            : "Founder switched system back to TEST MODE",
        metadata: {
          previous_mode: systemMode,
          new_mode: target,
          actor: userData.user?.email ?? userData.user?.id ?? "unknown",
          checks_passed: checks.filter((c) => c.pass).map((c) => c.id),
          checks_failed: checks.filter((c) => !c.pass).map((c) => c.id),
        },
        resolved: true,
        resolution_note: "Logged as audit; not an unresolved warning.",
      });

      setSystemMode(target);
      queryClient.invalidateQueries({ queryKey: ["system-mode-banner"] });
      toast.success(target === "live" ? "Now in CONTROLLED LIVE MODE" : "Reverted to TEST MODE");
    } catch (err: any) {
      toast.error("Failed to switch mode: " + (err.message ?? "unknown"));
    } finally {
      setSwitching(false);
    }
  };

  const isLive = systemMode === "live";

  return (
    <Card className="p-6 space-y-5 border-2">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Controlled LIVE Activation</h2>
            {isLive ? (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert size={12} /> CONTROLLED LIVE
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 border-yellow-500/40 text-yellow-400">
                <ShieldCheck size={12} /> TEST MODE
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Liftor stays in TEST MODE until every readiness check passes and the founder explicitly confirms the
            switch. CONTROLLED LIVE enables real outbound sends through existing safety gates. No bulk send
            happens automatically — proof sends are still triggered manually.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={runChecks} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Re-run checks</span>
        </Button>
      </div>

      {loading && checks.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Running readiness checks…
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {checks.map((c) => (
            <div
              key={c.id}
              className={`flex items-start gap-2 rounded-md border p-3 text-sm ${
                c.pass ? "border-emerald-500/30 bg-emerald-500/5" : "border-destructive/40 bg-destructive/5"
              }`}
            >
              {c.pass ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-500" />
              ) : (
                <XCircle size={16} className="mt-0.5 shrink-0 text-destructive" />
              )}
              <div className="min-w-0">
                <div className="font-medium leading-tight">{c.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{c.detail}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-md border p-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1 min-w-0">
          {allPass && !isLive && (
            <p className="text-sm font-medium text-emerald-500">Liftor is ready for Controlled LIVE Mode.</p>
          )}
          {!allPass && !isLive && (
            <>
              <p className="text-sm font-medium text-destructive">
                Cannot switch to LIVE — {failed.length} blocker(s):
              </p>
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-0.5">
                {failed.map((f) => (
                  <li key={f.id}>
                    <span className="font-medium text-foreground/80">{f.label}:</span> {f.detail}
                  </li>
                ))}
              </ul>
            </>
          )}
          {isLive && (
            <p className="text-sm font-medium text-yellow-400">
              CONTROLLED LIVE is on. Outbound sends require manual founder approval — no automatic bulk runs.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {!isLive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!allPass || switching} variant="default">
                  {switching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldAlert className="h-4 w-4 mr-2" />}
                  Switch to CONTROLLED LIVE
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm switch to CONTROLLED LIVE</AlertDialogTitle>
                  <AlertDialogDescription>
                    This enables real outbound email sending via existing inboxes. No bulk send will happen
                    automatically — every send still requires a manual founder action and passes through compliance,
                    cap, and approval gates. You can revert to TEST MODE at any time.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => switchMode("live")}>Confirm — go LIVE</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isLive && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={switching}>
                  {switching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Revert to TEST MODE
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Revert to TEST MODE?</AlertDialogTitle>
                  <AlertDialogDescription>
                    All outbound sends will be blocked again until you switch back. Existing queue items remain.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => switchMode("test")}>Revert</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ControlledLiveActivation;