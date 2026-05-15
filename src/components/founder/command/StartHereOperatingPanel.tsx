import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Rocket, ArrowRight, Bot, ClipboardCheck, PlayCircle, Send,
  FileSignature, Briefcase, Globe, ShieldCheck, CheckCircle2, Circle,
} from "lucide-react";

type Step = {
  n: number;
  label: string;
  description: string;
  to: string;
  icon: any;
  badge?: { text: string; tone: "ok" | "warn" | "info" };
};

export default function StartHereOperatingPanel() {
  const [businessId, setBusinessId] = useState<string | "all">("all");

  const businessesQ = useQuery({
    queryKey: ["start-here-businesses"],
    queryFn: async () => {
      const { data } = await supabase.from("businesses").select("id,name").order("name");
      return data ?? [];
    },
  });

  const profilesQ = useQuery({
    queryKey: ["start-here-profiles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("business_operating_profiles")
        .select("business_id,business_name,operating_status,smartlead_enabled,apollo_enabled,auto_send_allowed,external_provider_mutation_allowed");
      return data ?? [];
    },
  });

  const approvalsQ = useQuery({
    queryKey: ["start-here-approvals"],
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_approval_items")
        .select("status,approval_type,business_id");
      return data ?? [];
    },
  });

  const gatesQ = useQuery({
    queryKey: ["start-here-gates"],
    queryFn: async () => {
      const { data } = await supabase
        .from("external_action_gates")
        .select("gate_key,enabled,risk_level");
      return data ?? [];
    },
  });

  const counts = useMemo(() => {
    const approvals = approvalsQ.data ?? [];
    const filtered = businessId === "all"
      ? approvals
      : approvals.filter((a: any) => a.business_id === businessId);
    const pending = filtered.filter((a: any) => a.status === "pending").length;
    const approved = filtered.filter((a: any) => a.status === "approved").length;
    const handoffPending = filtered.filter((a: any) =>
      ["proposal_send", "proposal_review", "commercial_handoff", "deal_close"].some((t) => (a.approval_type ?? "").includes(t))
    ).length;
    const financePending = filtered.filter((a: any) =>
      ["finance", "invoice", "supplier"].some((t) => (a.approval_type ?? "").includes(t))
    ).length;
    const gatesEnabled = (gatesQ.data ?? []).filter((g: any) => g.enabled).length;
    const totalBusinesses = (businessesQ.data ?? []).length;
    return { pending, approved, handoffPending, financePending, gatesEnabled, totalBusinesses };
  }, [approvalsQ.data, gatesQ.data, businessesQ.data, businessId]);

  const profileSummary = useMemo(() => {
    const profiles = profilesQ.data ?? [];
    const sel = businessId === "all" ? null : profiles.find((p: any) => p.business_id === businessId);
    return sel ?? null;
  }, [profilesQ.data, businessId]);

  const steps: Step[] = [
    {
      n: 1,
      label: "Choose business",
      description: profileSummary
        ? `${profileSummary.business_name} · ${profileSummary.operating_status}`
        : `${counts.totalBusinesses} businesses available`,
      to: "/founder/operations",
      icon: Globe,
      badge: { text: profileSummary ? profileSummary.operating_status : "all", tone: "info" },
    },
    {
      n: 2,
      label: "Run internal AI agents",
      description: "Trigger preview-only agent runs (drafts, suggestions, no external send)",
      to: "/founder/agents",
      icon: Bot,
    },
    {
      n: 3,
      label: "Review approvals",
      description: `${counts.pending} pending · ${counts.approved} approved waiting`,
      to: "/founder/command-centre#sec-actions",
      icon: ClipboardCheck,
      badge: counts.pending > 0
        ? { text: `${counts.pending} pending`, tone: "warn" }
        : { text: "clear", tone: "ok" },
    },
    {
      n: 4,
      label: "Execute approved internal actions",
      description: "Materialise drafts, CRM next actions, proposal drafts (no external send)",
      to: "/founder/command-centre#sec-actions",
      icon: PlayCircle,
      badge: counts.approved > 0
        ? { text: `${counts.approved} ready`, tone: "info" }
        : undefined,
    },
    {
      n: 5,
      label: "Review Smartlead activation",
      description: "Inspect campaign mapping, webhook, gate status — no Smartlead POST until gated",
      to: "/founder/integrations",
      icon: Send,
      badge: { text: `${counts.gatesEnabled}/10 gates on`, tone: counts.gatesEnabled === 0 ? "ok" : "warn" },
    },
    {
      n: 6,
      label: "Review proposals & commercial handoffs",
      description: `${counts.handoffPending} handoff/proposal items in queue`,
      to: "/founder/internal-proposals",
      icon: FileSignature,
    },
    {
      n: 7,
      label: "Review finance & supplier tasks",
      description: `${counts.financePending} finance/supplier items in queue`,
      to: "/founder/projects",
      icon: Briefcase,
    },
    {
      n: 8,
      label: "Check portfolio command centre",
      description: `${counts.totalBusinesses} businesses across the operating layer`,
      to: "/founder/operations",
      icon: Globe,
    },
    {
      n: 9,
      label: "Run final readiness / dry-run test",
      description: "Master dry-run validates the full operating spine end-to-end",
      to: "/founder/system",
      icon: ShieldCheck,
    },
  ];

  return (
    <Card className="tech-card border-primary/40">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket size={16} className="text-primary" />
              Start here — daily operating flow
            </CardTitle>
            <p className="text-[11px] text-muted-foreground mt-1">
              Internal-use ready. No autonomous sends · no provider mutation · no Apollo spend.
            </p>
          </div>
          <Select value={businessId} onValueChange={(v) => setBusinessId(v as any)}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All businesses</SelectItem>
              {(businessesQ.data ?? []).map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/40">No external sends</Badge>
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/40">No Apollo calls</Badge>
          <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/40">No Smartlead POST</Badge>
          {profileSummary && !profileSummary.auto_send_allowed && (
            <Badge variant="outline" className="text-[10px] text-green-400 border-green-500/40">Auto-send off</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((s) => (
          <Link
            key={s.n}
            to={s.to}
            className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors"
          >
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-medium flex-shrink-0">
              {s.n}
            </div>
            <s.icon size={14} className="text-primary flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-[11px] text-muted-foreground truncate">{s.description}</p>
            </div>
            {s.badge && (
              <Badge
                variant="secondary"
                className={`text-[10px] flex-shrink-0 ${
                  s.badge.tone === "warn"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : s.badge.tone === "ok"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {s.badge.text}
              </Badge>
            )}
            <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
          </Link>
        ))}
        <div className="flex items-center justify-between pt-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-green-400" /> Internal use ready
          </span>
          <span className="flex items-center gap-1.5">
            <Circle size={11} className="text-yellow-400" /> External sends require explicit gate + phrase
          </span>
        </div>
      </CardContent>
    </Card>
  );
}