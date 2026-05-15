import { useMemo } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import LiftorCapabilities from "@/components/founder/LiftorCapabilities";
import AgentOrchestration from "@/components/founder/AgentOrchestration";
import SystemModeBanner from "@/components/founder/SystemModeBanner";
import ControlledProofSend from "@/components/founder/ControlledProofSend";
import ExecutionStatusPanel from "@/components/founder/ExecutionStatusPanel";
import LeadQualityPanel from "@/components/founder/LeadQualityPanel";
import SourceQualityBrief from "@/components/founder/SourceQualityBrief";
import ApolloPullPanel from "@/components/founder/ApolloPullPanel";
import AutonomousPipelineStatus from "@/components/founder/AutonomousPipelineStatus";
import AutopilotPolicyPanel from "@/components/founder/AutopilotPolicyPanel";
import OutreachSafetyPanel from "@/components/founder/safety/OutreachSafetyPanel";
import CommandCentreCoverageMap from "@/components/founder/safety/CommandCentreCoverageMap";
import CommandCentreMasterIndex from "@/components/founder/command/CommandCentreMasterIndex";
import { useOutreachSafetyAudit } from "@/hooks/useOutreachSafetyAudit";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import ControlledSendReadinessPreview from "@/components/founder/safety/ControlledSendReadinessPreview";
import FooterDisclosurePreview from "@/components/founder/safety/FooterDisclosurePreview";
import ManualSendApplyGate from "@/components/founder/safety/ManualSendApplyGate";
import OutboundProviderEnginePanel from "@/components/founder/integrations/OutboundProviderEnginePanel";
import BulkSendEngineBlueprint from "@/components/founder/integrations/BulkSendEngineBlueprint";
import SmartleadScaleSetupChecklist from "@/components/founder/integrations/SmartleadScaleSetupChecklist";
import SmartleadCampaignMappingPreview from "@/components/founder/integrations/SmartleadCampaignMappingPreview";
import SmartleadLeadPushPreview from "@/components/founder/integrations/SmartleadLeadPushPreview";
import SmartleadCampaignDiscoveryPanel from "@/components/founder/integrations/SmartleadCampaignDiscoveryPanel";
import BulkSendPreviewPanel from "@/components/founder/integrations/BulkSendPreviewPanel";
import SmartleadScaleNextActionBanner from "@/components/founder/integrations/SmartleadScaleNextActionBanner";
import OutboundChannelLanesPanel from "@/components/founder/integrations/OutboundChannelLanesPanel";
import OutboundChannelPolicyPanel from "@/components/founder/integrations/OutboundChannelPolicyPanel";
import ScaleOperationsDryRunDashboard from "@/components/founder/command/ScaleOperationsDryRunDashboard";
import CRMInteractionLedgerPanel from "@/components/founder/crm/CRMInteractionLedgerPanel";
import CRMInteractionMatchPreviewPanel from "@/components/founder/crm/CRMInteractionMatchPreviewPanel";
import CRMInteractionSourceAdaptersPanel from "@/components/founder/crm/CRMInteractionSourceAdaptersPanel";
import CRMConversationBridgePanel from "@/components/founder/crm/CRMConversationBridgePanel";
import CRMCustomerLifecyclePanel from "@/components/founder/crm/CRMCustomerLifecyclePanel";
import CRMHealthIntegrityPanel from "@/components/founder/crm/CRMHealthIntegrityPanel";
import CRMCustomerMemoryDashboard from "@/components/founder/crm/CRMCustomerMemoryDashboard";
import AIAgentOperatingModelPanel from "@/components/founder/agents/AIAgentOperatingModelPanel";
import AIAgentOrchestratorPanel from "@/components/founder/agents/AIAgentOrchestratorPanel";
import AIConversationDraftingPanel from "@/components/founder/agents/AIConversationDraftingPanel";
import FounderApprovalConsole from "@/components/founder/approvals/FounderApprovalConsole";
import ApprovedActionExecutionPanel from "@/components/founder/approvals/ApprovedActionExecutionPanel";
import ControlledExternalActionGatesPanel from "@/components/founder/operations/ControlledExternalActionGatesPanel";
import SmartleadControlledActivationPanel from "@/components/founder/integrations/SmartleadControlledActivationPanel";
import AgentBusinessLivePanel from "@/components/founder/agents/AgentBusinessLivePanel";
import AIEngagementAgentLivePanel from "@/components/founder/agents/AIEngagementAgentLivePanel";
import CommercialHandoffPanel from "@/components/founder/commercial/CommercialHandoffPanel";
import LiveCommercialAgentsPanel from "@/components/founder/commercial/LiveCommercialAgentsPanel";
import LiftorBusinessLiveRunPanel from "@/components/founder/command/LiftorBusinessLiveRunPanel";
import MultiBusinessOperatingLayerPanel from "@/components/founder/operations/MultiBusinessOperatingLayerPanel";
import BusinessKnowledgeBrainPanel from "@/components/founder/knowledge/BusinessKnowledgeBrainPanel";
import PortfolioCommandCentrePanel from "@/components/founder/command/PortfolioCommandCentrePanel";
import InternalOperatingSchedulesPanel from "@/components/founder/operations/InternalOperatingSchedulesPanel";
import BusinessOperatingRunbookPanel from "@/components/founder/operations/BusinessOperatingRunbookPanel";
import StartHereOperatingPanel from "@/components/founder/command/StartHereOperatingPanel";
import GlobalAIBrainCommandCentre from "@/components/founder/command/GlobalAIBrainCommandCentre";
import GlobalAutonomyControlPanel from "@/components/founder/autonomy/GlobalAutonomyControlPanel";
import MultilingualIntelligencePanel from "@/components/founder/global/MultilingualIntelligencePanel";
import GlobalJurisdictionPolicyPanel from "@/components/founder/compliance/GlobalJurisdictionPolicyPanel";
import MultiChannelInboxPanel from "@/components/founder/channels/MultiChannelInboxPanel";
import AgentHandoverProtocolPanel from "@/components/founder/agents/AgentHandoverProtocolPanel";
import AutopilotActivationGatesPanel from "@/components/founder/autonomy/AutopilotActivationGatesPanel";
import GlobalOperatingClockPanel from "@/components/founder/global/GlobalOperatingClockPanel";
import LearningOptimisationEnginePanel from "@/components/founder/optimisation/LearningOptimisationEnginePanel";
import SelfHealingMonitoringPanel from "@/components/founder/monitoring/SelfHealingMonitoringPanel";
import PortfolioIntelligenceBrainPanel from "@/components/founder/strategy/PortfolioIntelligenceBrainPanel";
import SocialMediaBrainPanel from "@/components/founder/social/SocialMediaBrainPanel";
import { SecurityGovernancePanel } from "@/components/founder/security/SecurityGovernancePanel";
import { ProductisationReadinessPanel } from "@/components/founder/revenue/ProductisationReadinessPanel";
import BusinessLaunchFactoryPanel from "@/components/founder/expansion/BusinessLaunchFactoryPanel";
import RevenueOperationsPanel from "@/components/founder/finance/RevenueOperationsPanel";
import LiftorMasterDryRunPanel from "@/components/founder/testing/LiftorMasterDryRunPanel";
import CRMContact360Panel from "@/components/founder/crm/CRMContact360Panel";
import CommandCentreMasterControlPlane from "@/components/founder/command/CommandCentreMasterControlPlane";
import CustomerJourneyControlBoard from "@/components/founder/command/CustomerJourneyControlBoard";
import AgentCollaborationBoard from "@/components/founder/agents/AgentCollaborationBoard";
import {
  Building2, Bot, Send, Mail, Inbox as InboxIcon, MessageSquare, FileSignature,
  Search, Banknote, ShieldCheck, Workflow as WorkflowIcon, Phone, AlertTriangle,
  CheckCircle2, Clock, ArrowRight, Sparkles, Activity, TrendingUp, Users, FlaskConical,
  Database, ListChecks, Filter, ChevronDown, Map as MapIcon, Plug, Gavel, BookOpen,
  Briefcase, ClipboardCheck, Monitor, ShieldAlert, MonitorPlay, Archive,
} from "lucide-react";

const StatTile = ({ label, value, icon: Icon, tone = "default", to }: any) => {
  const toneCls =
    tone === "danger" ? "text-destructive" :
    tone === "warn" ? "text-yellow-400" :
    tone === "good" ? "text-green-400" : "text-primary";
  const inner = (
    <Card className="bg-card border-border/50 h-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <Icon size={16} className={toneCls} />
          {to && <ArrowRight size={12} className="text-muted-foreground" />}
        </div>
        <p className="text-2xl font-bold">{value ?? 0}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const Section = ({ title, icon: Icon, action, children }: any) => (
  <Card className="bg-card border-border/50">
    <CardHeader className="flex flex-row items-center justify-between pb-3">
      <CardTitle className="text-base flex items-center gap-2">
        <Icon size={16} className="text-primary" /> {title}
      </CardTitle>
      {action}
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const CommandCentre = () => {
  // Single source of truth for outreach send brake (shared with /founder/outreach/queue-audit).
  const { data: safetyAudit } = useOutreachSafetyAudit();
  const safetyStatus = safetyAudit?.summary?.safety_status;
  const cronCheck = safetyAudit?.summary?.cron_check ?? safetyAudit?.baseline?.cron_check;
  const autoSendStrictFalse = safetyAudit?.baseline?.auto_send_is_strict_false ?? false;
  const isSafeBlocked = safetyStatus === "SAFE_BLOCKED" && autoSendStrictFalse && cronCheck === "verified_disabled";
  const sendUnsafe = !isSafeBlocked;
  // SAFE_BLOCKED means safe to inspect and clean — NOT safe to send.
  // Manual Send Apply is not built and tracking disclosure is not injected,
  // so live send controls must remain guarded even when safety_status=SAFE_BLOCKED.
  const MANUAL_SEND_APPLY_BUILT = false;
  const auditCounts = safetyAudit?.summary?.classification_counts;
  const totalPendingFromAudit = safetyAudit?.summary?.total_pending ?? 0;
  const reviewRequired = auditCounts?.review_required ?? 0;
  const validFutureBlocked = auditCounts?.valid_future_step_blocked ?? 0;
  const cancelCandidate = auditCounts?.cancel_candidate ?? 0;
  const legacyPending = auditCounts?.legacy_pending ?? 0;
  const orphanFollowup = auditCounts?.orphan_followup ?? 0;
  const liveSendBlocked = sendUnsafe || !MANUAL_SEND_APPLY_BUILT || totalPendingFromAudit > 0 || reviewRequired > 0;
  const queueCreationBlocked =
    sendUnsafe || totalPendingFromAudit > 0 || reviewRequired > 0 || !MANUAL_SEND_APPLY_BUILT;
  // Businesses
  const { data: businesses = [] } = useQuery({
    queryKey: ["cc2-businesses"],
    queryFn: async () => (await supabase.from("businesses").select("*").order("name")).data ?? [],
  });
  const { data: contacts = [] } = useQuery({
    queryKey: ["cc2-contacts"],
    queryFn: async () => (await supabase.from("contacts").select("id,assigned_business,status,intent_score,last_replied_at,conversation_active").neq("status", "INTERNAL")).data ?? [],
  });
  const { data: campaigns = [] } = useQuery({
    queryKey: ["cc2-campaigns"],
    queryFn: async () => (await supabase.from("outreach_campaigns").select("*").order("updated_at", { ascending: false })).data ?? [],
  });
  const { data: queue = [] } = useQuery({
    queryKey: ["cc2-queue"],
    queryFn: async () => (await supabase.from("email_queue").select("id,status,business_name,campaign_id,scheduled_at,block_reason,send_error,delivery_kind,sent_at,sequence_step").order("scheduled_at", { ascending: true }).limit(1000)).data ?? [],
    refetchInterval: 30000,
  });
  const { data: inboxes = [] } = useQuery({
    queryKey: ["cc2-inboxes"],
    queryFn: async () => (await supabase.from("inboxes").select("*")).data ?? [],
  });
  const { data: socialProfiles = [] } = useQuery({
    queryKey: ["cc2-social-profiles"],
    queryFn: async () => (await (supabase as any).from("social_business_profiles").select("business_id,social_status,primary_platforms,brand_voice,primary_cta")).data ?? [],
  });
  const { data: activeInboxes = [] } = useQuery({
    queryKey: ["cc2-active-inboxes-view"],
    queryFn: async () => (await (supabase as any).from("command_centre_active_inboxes").select("*")).data ?? [],
  });
  const { data: internalEmails = [] } = useQuery({
    queryKey: ["cc2-internal-emails"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("internal_email_identities").select("email");
      return ((data as any[]) ?? []).map((r) => String(r.email).toLowerCase());
    },
  });
  const { data: leadQualityCounts } = useQuery({
    queryKey: ["cc2-lead-quality-counts"],
    queryFn: async () => {
      const [needsVer, raw, promoted, shortlist] = await Promise.all([
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "needs_verification"),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "raw"),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).not("promoted_contact_id", "is", null),
        supabase.from("lead_quality_profiles").select("id", { count: "exact", head: true }).eq("quality_status", "needs_verification").contains("risk_flags", ["needs_apollo_unlock"]),
      ]);
      return {
        needsVerification: needsVer.count ?? 0,
        raw: raw.count ?? 0,
        promoted: promoted.count ?? 0,
        unlockShortlist: shortlist.count ?? 0,
      };
    },
    refetchInterval: 60000,
  });
  const { data: leadLifecycle } = useQuery({
    queryKey: ["cc2-lead-lifecycle"],
    queryFn: async () => {
      const { data } = await (supabase as any).from("lead_lifecycle_summary").select("*").maybeSingle();
      return data as {
        active_working_leads: number;
        safe_to_unlock: number;
        safe_to_promote: number;
        safe_to_queue: number;
        legacy_optional_unlock_candidates: number;
        email_reveal_required?: number;
        verified_email_available_locked?: number;
        safe_to_promote_after_reveal?: number;
        already_in_crm_after_reveal?: number;
        total_leads?: number;
        reveal_shortlisted?: number;
        founder_review_required?: number;
      } | null;
    },
    refetchInterval: 60000,
  });
  const { data: drafts = [] } = useQuery({
    queryKey: ["cc2-drafts"],
    queryFn: async () => (await supabase.from("ai_drafts").select("id,status,classification,created_at,contact_id,inbox_id").eq("status", "pending").order("created_at", { ascending: false }).limit(20)).data ?? [],
  });
  const { data: proposals = [] } = useQuery({
    queryKey: ["cc2-internal-proposals"],
    queryFn: async () => (await supabase.from("internal_proposals").select("id,title,status,business_name,created_at").eq("status", "draft").order("created_at", { ascending: false }).limit(15)).data ?? [],
  });
  const { data: hotConvos = [] } = useQuery({
    queryKey: ["cc2-hot"],
    queryFn: async () => (await supabase.from("conversations").select("id,contact_id,business_name,status,last_message_at,escalation_pending,escalation_reason,intent_score").or("escalation_pending.eq.true,status.eq.escalated").order("last_message_at", { ascending: false }).limit(15)).data ?? [],
  });
  const { data: highIntent = [] } = useQuery({
    queryKey: ["cc2-high-intent"],
    queryFn: async () => (await supabase.from("high_intent_review_queue").select("*").limit(15)).data ?? [],
  });
  const { data: sysEvents = [] } = useQuery({
    queryKey: ["cc2-events"],
    queryFn: async () => (await supabase.from("system_events").select("*").eq("resolved", false).in("severity", ["critical", "high", "medium"]).order("created_at", { ascending: false }).limit(20)).data ?? [],
    refetchInterval: 60000,
  });
  const { data: sysCounts } = useQuery({
    queryKey: ["cc2-events-counts"],
    queryFn: async () => {
      const [open, total] = await Promise.all([
        supabase.from("system_events").select("id", { count: "exact", head: true }).eq("resolved", false),
        supabase.from("system_events").select("id", { count: "exact", head: true }),
      ]);
      return { open: open.count ?? 0, total: total.count ?? 0 };
    },
    refetchInterval: 60000,
  });
  const { data: systemMode } = useQuery({
    queryKey: ["cc2-system-mode"],
    queryFn: async () => {
      const { data } = await supabase.from("system_settings").select("value").eq("key", "system_mode").maybeSingle();
      return String((data as any)?.value ?? "live").toLowerCase();
    },
  });
  // TEST MODE removed as operational gate — anything other than explicit
  // admin-only "sandbox" is treated as LIVE OPERATING MODE.
  const isLiveMode = systemMode !== "sandbox";
  const { data: events = [] } = useQuery({
    queryKey: ["cc2-email-events"],
    queryFn: async () => (await supabase.from("email_events").select("event_type").gte("timestamp", new Date(Date.now() - 7 * 86400000).toISOString())).data ?? [],
  });
  const { data: deals = [] } = useQuery({
    queryKey: ["cc2-deals"],
    queryFn: async () => (await supabase.from("deals").select("id,business_name,status,estimated_value_max")).data ?? [],
  });
  const { data: invoices = [] } = useQuery({
    queryKey: ["cc2-invoices"],
    queryFn: async () => (await supabase.from("invoices").select("id,business_name,status,due_date")).data ?? [],
  });

  // ===== Aggregations =====
  // SOURCE OF TRUTH (Command Centre):
  //   sent total       = email_queue.status='sent' AND delivery_kind='smtp_real'
  //   sent today       = email_queue.sent_at >= today (smtp_real only)
  //   queued/pending   = email_queue.status='pending'
  //   blocked queue    = email_queue.status='blocked'    (NOT failed, NOT cancelled, NOT system warnings)
  //   failed sends     = email_queue.status='failed'     (real send attempts that errored)
  //   cancelled        = email_queue.status='cancelled'  (orphans/admin-archived; not active blockers)
  //   system warnings  = system_events where resolved=false (separate from queue)
  //   replies          = email_events.event_type='replied' (last 7 days)
  const businessStats = useMemo(() => {
    return businesses.map((b: any) => {
      const bn = b.name;
      const bContacts = contacts.filter((c: any) => c.assigned_business === bn);
      const warm = bContacts.filter((c: any) => (c.intent_score ?? 0) >= 60 || c.status === "ENGAGED" || c.status === "QUALIFIED").length;
      const activeCampaigns = campaigns.filter((c: any) => c.business_name === bn && c.status === "active").length;
      const pendingApprovals =
        drafts.filter((d: any) => bContacts.some((c: any) => c.id === d.contact_id)).length +
        proposals.filter((p: any) => p.business_name === bn).length +
        hotConvos.filter((h: any) => h.business_name === bn).length;
      const bQueue = queue.filter((q: any) => q.business_name === bn);
      const blockedQueue = bQueue.filter((q: any) => q.status === "blocked").length;
      const failedSends = bQueue.filter((q: any) => q.status === "failed").length;
      const systemWarnings = sysEvents.filter((e: any) => e.business_name === bn).length;
      const lastContactReply = bContacts.map((c: any) => c.last_replied_at).filter(Boolean).sort().reverse()[0];
      const lastSend = bQueue.filter((q: any) => q.sent_at).map((q: any) => q.sent_at).sort().reverse()[0];
      let status: "active" | "needs_setup" | "blocked" | "paused" = "needs_setup";
      if (failedSends > 0 || systemWarnings > 0) status = "blocked";
      else if (activeCampaigns > 0 || warm > 0) status = "active";
      else if (bContacts.length > 0) status = "paused";
      return { id: b.id, name: bn, status, contacts: bContacts.length, warm, activeCampaigns, pendingApprovals, blockedQueue, failedSends, systemWarnings, lastContactReply, lastSend };
    });
  }, [businesses, contacts, campaigns, drafts, proposals, hotConvos, sysEvents, queue]);

  const totals = useMemo(() => {
    const isSmtpReal = (q: any) => q.delivery_kind === "smtp_real" || q.delivery_kind == null;
    const sentTotal = queue.filter((q: any) => q.status === "sent" && isSmtpReal(q)).length;
    const sentToday = queue.filter((q: any) => q.status === "sent" && isSmtpReal(q) && q.sent_at && new Date(q.sent_at).toDateString() === new Date().toDateString()).length;
    const pendingQueue = queue.filter((q: any) => q.status === "pending").length;
    const blockedQueue = queue.filter((q: any) => q.status === "blocked").length;
    const failedSends = queue.filter((q: any) => q.status === "failed").length;
    const cancelledQueue = queue.filter((q: any) => q.status === "cancelled").length;
    const orphanArchived = queue.filter((q: any) => q.status === "cancelled" && q.block_reason === "CANCELLED_ORPHAN_SIMULATED_PARENT").length;
    const repliesAll = events.filter((e: any) => e.event_type === "replied").length;
    const opensAll = events.filter((e: any) => e.event_type === "opened").length;
    const clicksAll = events.filter((e: any) => e.event_type === "clicked").length;
    const bouncesAll = events.filter((e: any) => e.event_type === "bounced").length;
    const warmLeads = contacts.filter((c: any) => (c.intent_score ?? 0) >= 60 || c.status === "ENGAGED" || c.status === "QUALIFIED").length;
    const urgentReplies = hotConvos.length;
    const approvalsTotal = drafts.length + proposals.length + hotConvos.length + highIntent.length;
    const activeCampaigns = campaigns.filter((c: any) => c.status === "active").length;
    const systemWarnings = sysEvents.length;
    // Provider truth: an inbox is ONLY "Capped" while a provider block window
    // is currently in the future. Stale `provider_blocked_reason` values and
    // expired `provider_blocked_until` timestamps must not flip the badge.
    // Internal hourly/daily caps are informational only (handled by the worker).
    const inboxCapped = inboxes.filter((i: any) => {
      if (!i.active) return false;
      const until = i.provider_blocked_until ? new Date(i.provider_blocked_until) : null;
      return !!(until && until > new Date());
    }).length;
    const businessesNeedingAttention = businessStats.filter((b) => b.failedSends > 0 || b.systemWarnings > 0 || b.pendingApprovals > 0).length;
    const systemWarningsOpen = sysCounts?.open ?? sysEvents.length;
    const systemWarningsTotal = sysCounts?.total ?? sysEvents.length;
    return {
      sentTotal, sentToday, pendingQueue, blockedQueue, failedSends, cancelledQueue, orphanArchived,
      repliesAll, opensAll, clicksAll, bouncesAll,
      warmLeads, urgentReplies, approvalsTotal, activeCampaigns,
      systemWarnings, systemWarningsOpen, systemWarningsTotal, inboxCapped, businessesNeedingAttention,
    };
  }, [queue, events, contacts, hotConvos, drafts, proposals, highIntent, campaigns, sysEvents, inboxes, businessStats, sysCounts]);

  // AI workers — mapped to existing data sources, with status derived from real signals
  const workers = useMemo(() => {
    const activeInbox = inboxes.some((i: any) => i.active);
    const inboundOk = inboxes.some((i: any) => i.inbound_polling_enabled || i.inbound_status === "active");
    const orphan = totals.orphanArchived;
    const outreachNext =
      totals.failedSends > 0 ? `Investigate ${totals.failedSends} failed send${totals.failedSends === 1 ? "" : "s"}` :
      (totals.inboxCapped > 0) ? "Wait for inbox provider cap to reset" :
      totals.blockedQueue > 0 ? `Wait for ${totals.blockedQueue} safety-gated contact${totals.blockedQueue === 1 ? "" : "s"} to cool down` :
      totals.pendingQueue > 0 ? "Continue scheduled sends" : "Launch a new campaign";
    return [
      { key: "outreach", name: "Outreach Agent", icon: Send, status: totals.activeCampaigns > 0 ? "active" : activeInbox ? "idle" : "needs_setup",
        recent: `${totals.pendingQueue} queued · ${totals.blockedQueue} blocked · ${totals.failedSends} failed`, pending: totals.pendingQueue, blocked: totals.blockedQueue,
        next: outreachNext, to: "/founder/outreach" },
      { key: "inbox", name: "Inbox Agent", icon: InboxIcon, status: inboundOk ? "active" : "needs_setup",
        recent: `${drafts.length} AI draft${drafts.length === 1 ? "" : "s"} pending · ${totals.repliesAll} replies (7d)`, pending: drafts.length, blocked: 0,
        next: drafts.length ? `Approve ${drafts.length} AI reply draft${drafts.length === 1 ? "" : "s"}` : "Monitor inbound mailboxes", to: "/founder/conversations" },
      { key: "social", name: "Social Agent", icon: MessageSquare,
        status: socialProfiles.length > 0 ? "active" : "needs_setup",
        recent: socialProfiles.length > 0
          ? `${socialProfiles.length} social profile${socialProfiles.length === 1 ? "" : "s"} configured (internal-only)`
          : "Not yet configured",
        pending: 0, blocked: 0,
        next: socialProfiles.length > 0
          ? "Generate 30-day social content pack for Neon Candy"
          : "Create a social profile for a business",
        to: "/founder/social" },
      { key: "research", name: "Research Agent", icon: Search, status: highIntent.length ? "active" : "idle",
        recent: `${highIntent.length} high-intent leads flagged`, pending: highIntent.length, blocked: 0,
        next: highIntent.length ? "Review high-intent leads" : "Run lead enrichment", to: "/founder/priority" },
      { key: "proposal", name: "Proposal Agent", icon: FileSignature, status: proposals.length ? "active" : "idle",
        recent: `${proposals.length} proposal drafts`, pending: proposals.length, blocked: 0,
        next: proposals.length ? "Review and send proposals" : "Generate proposal from a deal", to: "/founder/internal-proposals" },
      { key: "crm", name: "CRM Agent", icon: Users, status: contacts.length ? "active" : "needs_setup",
        recent: `${totals.warmLeads} warm leads`, pending: hotConvos.length, blocked: 0,
        next: hotConvos.length ? "Reply to warm conversations" : "Import more leads", to: "/founder/crm" },
      { key: "finance", name: "Finance Agent", icon: Banknote, status: deals.length ? "active" : "idle",
        recent: `${deals.length} deals · ${invoices.length} invoices`, pending: invoices.filter((i: any) => i.status === "overdue").length, blocked: 0,
        next: "Review pipeline & invoices", to: "/founder/finance" },
      { key: "compliance", name: "Compliance Agent", icon: ShieldCheck, status: "idle", recent: "Passive monitoring only", pending: 0, blocked: 0,
        next: "Review compliance events", to: "/founder/compliance" },
      { key: "ops", name: "Ops Agent", icon: WorkflowIcon, status: totals.systemWarningsOpen ? "needs_attention" : "active",
        recent: `System warnings: ${totals.systemWarningsOpen} open / ${totals.systemWarningsTotal} logged total`, pending: 0, blocked: sysEvents.filter((e: any) => e.severity === "critical").length,
        next: totals.systemWarningsOpen ? `Triage ${totals.systemWarningsOpen} open warning${totals.systemWarningsOpen === 1 ? "" : "s"}` : "Run platform diagnostics", to: "/founder/system" },
      { key: "voice", name: "Voice Agent", icon: Phone, status: "needs_setup", recent: "Not yet configured", pending: 0, blocked: 0,
        next: "Connect voice provider", to: "/founder/integrations" },
    ];
  }, [inboxes, totals, drafts, proposals, hotConvos, highIntent, contacts, deals, invoices, sysEvents, isLiveMode]);

  // Blockers in plain English — grouped into 4 buckets
  type BlockerItem = { msg: string; severity: string; to?: string };
  const blockerSections = useMemo(() => {
    const current: BlockerItem[] = [];
    const safetyGates: BlockerItem[] = [];
    const completed: BlockerItem[] = [];
    const observations: BlockerItem[] = [];

    const blockedRows = (queue ?? []).filter((q: any) => q.status === "blocked");
    const cancelledRows = (queue ?? []).filter((q: any) => q.status === "cancelled");
    const orphanArchived = cancelledRows.filter((q: any) => q.block_reason === "CANCELLED_ORPHAN_SIMULATED_PARENT").length;
    if (orphanArchived > 0) {
      completed.push({ msg: `${orphanArchived} orphan follow-up rows archived — no action needed.`, severity: "good", to: "/founder/outreach/queue" });
    }
    // TEST MODE removed as operational gate — no informational TEST blocker emitted.
    const reasonMap: Record<string, { label: string; severity: string; bucket: "current" | "safety" }> = {
      SIMULATED_PARENT_NOT_SENT: { label: "waiting on an earlier sequence step that never sent (legacy/test sim)", severity: "warn", recoverable: true },
      RECENTLY_CONTACTED: { label: "cooling down under the recent-contact rule", severity: "warn", recoverable: true },
      RECENT_COMMUNICATION_24H: { label: "blocked by the 24h re-contact rule", severity: "warn", recoverable: true },
      BLOCKED: { label: "generic block — needs human review", severity: "warn", recoverable: false },
      INBOX_DAILY_LIMIT: { label: "inbox daily limit reached — resumes tomorrow", severity: "warn", recoverable: true },
      NO_ACTIVE_INBOX: { label: "no active inbox available for this business", severity: "danger", recoverable: false },
      CONTACT_SUPPRESSED: { label: "contact is suppressed (bounce / unsubscribe)", severity: "warn", recoverable: false },
      CONTACT_REPLIED: { label: "contact already replied", severity: "warn", recoverable: false },
      CONTACT_BOUNCED: { label: "contact previously bounced", severity: "warn", recoverable: false },
      DO_NOT_CONTACT: { label: "contact marked do-not-contact", severity: "warn", recoverable: false },
    } as any;
    const safetyReasons = new Set(["RECENTLY_CONTACTED", "RECENT_COMMUNICATION_24H", "INBOX_DAILY_LIMIT", "SIMULATED_PARENT_NOT_SENT"]);
    const grouped = blockedRows.reduce((acc: Record<string, number>, r: any) => {
      const k = r.block_reason || "UNKNOWN";
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
    Object.entries(grouped)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .forEach(([reason, count]) => {
        const meta = (reasonMap as any)[reason] ?? { label: `unmapped reason: ${reason}`, severity: "warn" };
        const bucket = safetyReasons.has(reason) ? safetyGates : current;
        bucket.push({ msg: `${count} contact${count === 1 ? "" : "s"} blocked — ${meta.label}`, severity: meta.severity, to: "/founder/outreach/queue" });
      });
    inboxes.forEach((i: any) => {
      if (!i.active) return;
      if (i.provider_blocked_until && new Date(i.provider_blocked_until) > new Date()) {
        current.push({ msg: `${i.email_address}: provider daily limit reached (${i.paused_reason ?? i.provider_blocked_reason ?? "throttled"}) — resumes ${format(new Date(i.provider_blocked_until), "dd MMM HH:mm")}`, severity: "warn", to: "/founder/sending" });
      }
      // Internal hourly/daily caps are informational only (cap blocking removed for activation).
      if (i.provider_blocked_reason && !i.provider_blocked_until) {
        current.push({ msg: `${i.email_address}: capped by email provider (${i.provider_blocked_reason}). Pending sends will resume on the next provider window.`, severity: "warn", to: "/founder/sending" });
      }
      if ((i.reputation_score ?? 100) < 40) current.push({ msg: `${i.email_address}: low inbox reputation (${i.reputation_score})`, severity: "warn", to: "/founder/sending" });
      if (i.last_test_send_status === "failed") current.push({ msg: `${i.email_address}: last test send failed — ${i.last_error_message ?? "see logs"}`, severity: "danger", to: `/founder/crm/inboxes/${i.id}/configure` });
      if (i.warmup_status === "not_started") current.push({ msg: `${i.email_address}: warmup not started`, severity: "warn", to: "/founder/crm/inboxes" });
      if (!i.inbound_polling_enabled && i.inbound_status !== "active") current.push({ msg: `${i.email_address}: inbound polling not configured — replies may be missed`, severity: "warn", to: `/founder/crm/inboxes/${i.id}/configure` });
    });
    campaigns.filter((c: any) => c.status === "active").forEach((c: any) => {
      const hasInbox = inboxes.some((i: any) => i.business_name === c.business_name && i.active);
      if (!hasInbox) current.push({ msg: `Campaign "${c.campaign_name}" (${c.business_name}) has no active sender inbox`, severity: "danger", to: "/founder/outreach/campaigns" });
    });
    // Group system events: campaign-performance observations vs other warnings
    const campaignPerfRe = /Campaign\s+"([^"]+)"\s+has\s+(\d+)\s+sends?\s+and\s+(\d+)\s+repl/i;
    const campaignPerf: Record<string, { campaign: string; sends: number; replies: number; events: number; business_name?: string }> = {};
    const otherGrouped: Record<string, { count: number; severity: string; business_name?: string }> = {};
    const isInternalMsg = (msg: string) => {
      const lower = (msg ?? "").toLowerCase();
      return internalEmails.some((em) => em && lower.includes(em));
    };
    sysEvents.forEach((e: any) => {
      // Founder/internal email activity must never appear as a campaign blocker.
      if (isInternalMsg(e.message)) return;
      const m = (e.message ?? "").match(campaignPerfRe);
      if (m) {
        const [, name, sends, replies] = m;
        const key = `${e.business_name ?? ""}|${name}`;
        const existing = campaignPerf[key];
        const sendsN = Number(sends);
        const repliesN = Number(replies);
        if (!existing) campaignPerf[key] = { campaign: name, sends: sendsN, replies: repliesN, events: 1, business_name: e.business_name };
        else { existing.events += 1; if (sendsN > existing.sends) { existing.sends = sendsN; existing.replies = repliesN; } }
      } else {
        const key = `${e.business_name ?? ""}|${e.message ?? ""}`;
        if (!otherGrouped[key]) otherGrouped[key] = { count: 0, severity: e.severity, business_name: e.business_name };
        otherGrouped[key].count += 1;
        if (e.severity === "critical") otherGrouped[key].severity = "critical";
      }
    });
    Object.values(campaignPerf).forEach((p) => {
      observations.push({
        msg: `Campaign performance observation: ${p.campaign}${p.business_name ? ` (${p.business_name})` : ""} has ${p.sends} real send${p.sends === 1 ? "" : "s"} and ${p.replies} repl${p.replies === 1 ? "y" : "ies"} in current reporting window. Repeated ${p.events} system event${p.events === 1 ? "" : "s"}.`,
        severity: "warn",
        to: "/founder/outreach/campaigns",
      });
    });
    Object.entries(otherGrouped).slice(0, 8).forEach(([key, meta]) => {
      const [, message] = key.split("|");
      const repeated = meta.count > 1 ? ` — repeated ${meta.count} times` : "";
      current.push({
        msg: `${meta.business_name ? `[${meta.business_name}] ` : ""}${message}${repeated}`,
        severity: meta.severity === "critical" ? "danger" : "warn",
        to: "/founder/system",
      });
    });
    return { current, safetyGates, completed, observations };
  }, [inboxes, campaigns, sysEvents, queue, isLiveMode, internalEmails]);

  const allDangerBlockers = useMemo(
    () => [...blockerSections.current, ...blockerSections.observations].filter((b) => b.severity === "danger"),
    [blockerSections]
  );

  // Recommended actions — only LIVE actions; completed repairs live in blockers panel
  const recommendations = useMemo(() => {
    const recs: { msg: string; to: string; tone: string }[] = [];
    if (totals.urgentReplies) recs.push({ msg: `Review ${totals.urgentReplies} warm reply${totals.urgentReplies === 1 ? "" : "s"}`, to: "/founder/conversations", tone: "primary" });
    if (drafts.length) recs.push({ msg: `Approve ${drafts.length} AI reply draft${drafts.length === 1 ? "" : "s"}`, to: "/founder/conversations", tone: "primary" });
    if (proposals.length) recs.push({ msg: `Send ${proposals.length} ready proposal${proposals.length === 1 ? "" : "s"}`, to: "/founder/internal-proposals", tone: "primary" });
    if (highIntent.length) recs.push({ msg: `Action ${highIntent.length} high-intent lead${highIntent.length === 1 ? "" : "s"}`, to: "/founder/priority", tone: "primary" });
    const genericBlocked = (queue ?? []).filter((q: any) => q.status === "blocked" && q.block_reason === "BLOCKED").length;
    if (genericBlocked > 0) recs.push({ msg: `Review ${genericBlocked} generic blocked contact${genericBlocked === 1 ? "" : "s"}`, to: "/founder/outreach/queue", tone: "warn" });
    const safetyGated = (queue ?? []).filter((q: any) => q.status === "blocked" && (q.block_reason === "RECENTLY_CONTACTED" || q.block_reason === "RECENT_COMMUNICATION_24H")).length;
    if (safetyGated > 0) recs.push({ msg: `Wait for ${safetyGated} safety-gated contact${safetyGated === 1 ? "" : "s"} to cool down`, to: "/founder/outreach/queue", tone: "default" });
    if (totals.failedSends > 0) recs.push({ msg: `Investigate ${totals.failedSends} failed send${totals.failedSends === 1 ? "" : "s"}`, to: "/founder/outreach/queue", tone: "danger" });
    if (totals.inboxCapped > 0) recs.push({ msg: `Wait for inbox provider cap to reset before sending queued emails`, to: "/founder/sending", tone: "warn" });
    if (totals.activeCampaigns > 0 && totals.repliesAll === 0 && totals.sentTotal > 0) recs.push({ msg: "Review campaign performance — reply rate is zero across the reporting window", to: "/founder/outreach/campaigns", tone: "warn" });
    allDangerBlockers.slice(0, 2).forEach((b) => recs.push({ msg: `Fix: ${b.msg}`, to: b.to ?? "/founder/system", tone: "danger" }));
    businessStats.filter((b) => b.contacts === 0).slice(0, 2).forEach((b) => recs.push({ msg: `Import leads for ${b.name}`, to: "/founder/outreach/imports", tone: "default" }));
    if (recs.length === 0) recs.push({ msg: "Nothing urgent — review weekly results pack", to: "/founder/analytics", tone: "good" });
    return recs.slice(0, 8);
  }, [totals, drafts, proposals, highIntent, allDangerBlockers, businessStats, queue, isLiveMode]);

  const businessStatusColor = (s: string) =>
    s === "active" ? "bg-green-500/20 text-green-400" :
    s === "blocked" ? "bg-destructive/20 text-destructive" :
    s === "paused" ? "bg-yellow-500/20 text-yellow-400" :
    "bg-muted text-muted-foreground";

  const workerStatusColor = (s: string) =>
    s === "active" ? "bg-green-500/20 text-green-400" :
    s === "needs_setup" ? "bg-muted text-muted-foreground" :
    s === "needs_attention" ? "bg-destructive/20 text-destructive" :
    "bg-yellow-500/20 text-yellow-400";

  return (
    <FounderLayout>
      {(() => {
        const activeBusinessName = activeInboxes[0]?.business_name ?? businesses[0]?.name ?? "Neon Candy";
        const activeSender = activeInboxes[0]?.email_address ?? "hello@neoncandy.online";
        const providerOk = inboxes.some((i: any) => i.active) && totals.inboxCapped === 0;
        const nextRecommended = recommendations[0]?.msg ?? "All clear.";
        const nextRecommendedTo = recommendations[0]?.to ?? "/founder/analytics";
        const founderActions = recommendations.filter((r) => r.tone === "primary" || r.tone === "danger" || r.tone === "warn");
        // Safety-led ordering: when outreach send brake is not verified, the
        // Command Centre's top actions must prioritise verifying the brake and
        // reviewing the queue audit BEFORE any send / queue / Apollo action.
        // Smartlead scale lane is now the primary outreach build path.
        // Native Liftor / IONOS queue (SAFE_BLOCKED, review_required, Manual
        // Send Apply, controlled live batch, Pooja proof-send) is parked and
        // surfaced as a SECONDARY native-lane action, never as the global top.
        const smartleadTopActions = [
          { msg: 'Smartlead scale: create draft campaign "NeonCandy - Early Access Collaboration Test" then re-run readiness', to: "/founder/integrations#smartlead-scale-setup-checklist", tone: "primary" as const },
          { msg: "Smartlead scale: enable warmup for hello@neoncandy.online inside Smartlead", to: "/founder/integrations#smartlead-scale-setup-checklist", tone: "warn" as const },
        ];
        const nativeLaneSecondary: { msg: string; to: string; tone: "danger" | "warn" }[] = [];
        if (sendUnsafe) {
          nativeLaneSecondary.push({ msg: "Native IONOS lane (parked): verify outreach brake / cron status — not on Smartlead scale path", to: "/founder/outreach/queue-audit", tone: "warn" });
        }
        if (reviewRequired > 0) {
          nativeLaneSecondary.push({ msg: `Native IONOS lane (parked): ${reviewRequired} review_required Step 4 row${reviewRequired === 1 ? "" : "s"} remain blocked — not on Smartlead scale path`, to: "/founder/outreach/queue-audit#review-required-decision-gate", tone: "warn" });
        }
        const safetyLedActions = [...smartleadTopActions, ...nativeLaneSecondary];
        const orderedFounderActions = [
          ...safetyLedActions,
          ...founderActions.filter((r) => {
            const m = (r.msg ?? "").toLowerCase();
            // Suppress all native IONOS send / queue / Pooja prompts and
            // stale "connect Smartlead mailbox" copy from competing for the
            // top slot. Smartlead scale is the active build path.
            return !m.includes("controlled live batch")
              && !m.includes("apollo")
              && !m.includes("create queue")
              && !m.includes("manual send")
              && !m.includes("approve")
              && !m.includes("send proposals")
              && !m.includes("send batch")
              && !m.includes("run batch")
              && !m.includes("run live batch")
              && !m.includes("run controlled")
              && !m.includes("connect one sending mailbox")
              && !m.includes("park ")
              && !m.includes("review-required")
              && !m.includes("review required");
          }),
        ];
        // Top-strip Next action must follow the same safety-led ordering.
        const safetyLedNext = orderedFounderActions[0];
        const topNextMsg = safetyLedNext?.msg ?? nextRecommended;
        const topNextTo = safetyLedNext?.to ?? nextRecommendedTo;

        const stages = [
          {
            key: "source", label: "Source Candidates", icon: Search, count: leadQualityCounts?.raw ?? 0,
            status: (leadLifecycle?.active_working_leads ?? 0) === 0 ? "blocked" : "active",
            blocker: (leadLifecycle?.active_working_leads ?? 0) === 0 ? "Need fresh Apollo candidate pull" : null,
            next: "Pull Apollo candidates",
            anchor: "#sec-source",
          },
          {
            key: "quality", label: "Quality / CRM Check", icon: Filter, count: leadQualityCounts?.needsVerification ?? 0,
            status: (leadQualityCounts?.needsVerification ?? 0) > 0 ? "active" : "complete",
            blocker: null, next: "Run autopilot scan", anchor: "#sec-autopilot",
          },
          {
            key: "reveal_approval", label: "Email Reveal Approval", icon: ShieldCheck,
            count: (leadLifecycle?.email_reveal_required ?? 0) + (leadLifecycle?.verified_email_available_locked ?? 0),
            status: ((leadLifecycle?.email_reveal_required ?? 0) + (leadLifecycle?.verified_email_available_locked ?? 0)) > 0 ? "active" : "not_started",
            blocker: null,
            next: "Review Apollo email reveal shortlist",
            anchor: "#sec-autopilot",
          },
          {
            key: "post_reveal", label: "Post-Reveal Check", icon: Database,
            count: leadLifecycle?.already_in_crm_after_reveal ?? 0,
            status: (leadLifecycle?.safe_to_promote_after_reveal ?? 0) > 0 ? "active" : "not_started",
            blocker: (leadLifecycle?.safe_to_promote_after_reveal ?? 0) === 0 ? "Awaiting reveal results" : null,
            next: "Verify revealed emails against CRM",
            anchor: "#sec-autopilot",
          },
          {
            key: "promote", label: "Promote (validation-clean)", icon: CheckCircle2,
            count: leadLifecycle?.safe_to_promote_after_reveal ?? leadLifecycle?.safe_to_promote ?? 0,
            status: (leadLifecycle?.safe_to_promote_after_reveal ?? 0) > 0 ? "active" : "not_started",
            blocker: (leadLifecycle?.safe_to_promote_after_reveal ?? 0) === 0 ? "Blocked until email reveal completes" : null,
            next: "Approve promotion", anchor: "#sec-autopilot",
          },
          {
            key: "queue", label: "Queue Campaign", icon: ListChecks, count: leadLifecycle?.safe_to_queue ?? 0,
            status: (leadLifecycle?.safe_to_queue ?? 0) > 0 ? "active" : "not_started",
            blocker: (leadLifecycle?.safe_to_queue ?? 0) === 0 ? "Nothing safe to queue" : null,
            next: "Approve queue", anchor: "#sec-queue",
          },
          {
            key: "send", label: "Send", icon: Send, count: totals.sentToday,
            status: sendUnsafe ? "blocked" : totals.failedSends > 0 ? "blocked" : totals.pendingQueue > 0 ? "active" : "not_started",
            blocker: sendUnsafe
              ? "Send blocked — outreach brake review required"
              : totals.failedSends > 0 ? `${totals.failedSends} failed sends` : null,
            next: sendUnsafe ? "Verify outreach brake / cron status" : "Run controlled live batch (native/legacy IONOS only — not Smartlead scale)",
            anchor: sendUnsafe ? "#sec-safety" : "#sec-queue",
          },
          {
            key: "replies", label: "Replies", icon: InboxIcon, count: totals.repliesAll,
            status: totals.urgentReplies > 0 ? "active" : "not_started",
            blocker: null, next: drafts.length ? `Approve ${drafts.length} draft(s)` : "Monitor inbox", anchor: "#sec-inbox",
          },
          {
            key: "proposals", label: "Proposals", icon: FileSignature, count: proposals.length,
            status: proposals.length > 0 ? "active" : "not_started",
            blocker: null, next: proposals.length ? "Send proposals" : "—", anchor: "#sec-inbox",
          },
          {
            key: "deals", label: "Deals", icon: TrendingUp, count: deals.filter((d: any) => d.status !== "won" && d.status !== "lost").length,
            status: deals.length > 0 ? "active" : "not_started",
            blocker: null, next: "Review pipeline", anchor: "#sec-results",
          },
          {
            key: "finance", label: "Finance", icon: Banknote, count: invoices.filter((i: any) => i.status !== "paid" && i.status !== "void").length,
            status: invoices.length > 0 ? "active" : "not_started",
            blocker: null, next: "Review invoices", anchor: "#sec-results",
          },
        ];

        const stageStatusCls = (s: string) =>
          s === "active" ? "bg-green-500/15 text-green-300 border-green-500/30" :
          s === "blocked" ? "bg-destructive/15 text-destructive border-destructive/30" :
          s === "complete" ? "bg-primary/15 text-primary border-primary/30" :
          "bg-muted/40 text-muted-foreground border-border/40";

        return (
          <div className="space-y-6">
            {/* SECTION 1 — Sticky System Status Header */}
            <div className="sticky top-0 z-30 -mx-2 px-2 py-2 bg-background/95 backdrop-blur border-b border-border">
              <div className="rounded-lg border border-border bg-card/80 px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                <Badge variant="secondary" className={isLiveMode ? "bg-green-500/15 text-green-300" : "bg-yellow-500/15 text-yellow-300"}>
                  {isLiveMode ? "LIVE" : "SANDBOX"}
                </Badge>
                <span className="text-muted-foreground">Business: <span className="text-foreground">{activeBusinessName}</span></span>
                <span className="text-muted-foreground">Sender: <span className="text-foreground">{activeSender}</span></span>
                <span className="text-muted-foreground flex items-center gap-1">
                  Provider: <span className={providerOk ? "text-green-400" : "text-yellow-400"}>{providerOk ? "OK" : (totals.inboxCapped ? "Capped" : "Setup")}</span>
                </span>
                <span className="text-muted-foreground">Warnings: <span className={totals.systemWarningsOpen ? "text-destructive" : "text-green-400"}>{totals.systemWarningsOpen}</span></span>
                <span className="text-muted-foreground">Approvals: <span className={totals.approvalsTotal ? "text-yellow-400" : "text-green-400"}>{totals.approvalsTotal}</span></span>
                <span className="text-muted-foreground">Safe→promote: <span className="text-foreground">{leadLifecycle?.safe_to_promote ?? 0}</span></span>
                <span className="text-muted-foreground">Safe→queue: <span className="text-foreground">{leadLifecycle?.safe_to_queue ?? 0}</span></span>
                <Link to={topNextTo} className="ml-auto flex items-center gap-1 text-primary hover:underline">
                  Next: {topNextMsg} <ArrowRight size={12} />
                </Link>
              </div>
            </div>
            <PortfolioCommandCentrePanel />
            <GlobalOperatingClockPanel />
            <PortfolioIntelligenceBrainPanel />

            {/* OUTREACH SAFETY / QUEUE BRAKE — read-only, shared source of truth with /founder/outreach/queue-audit */}
            <RunwayHeader n={2} title="Safety / Brake — Native Liftor / IONOS queue (not Smartlead scale)" icon={ShieldCheck} anchor="sec-safety" />
            <div id="sec-safety" className="scroll-mt-24 space-y-2">
              <OutreachSafetyPanel />
              <p className="text-[11px] text-muted-foreground px-1">
                Native Liftor / IONOS queue safety — not Smartlead scale path.
                SAFE_BLOCKED = safe to inspect and clean on the IONOS lane only.
                It does NOT mean Smartlead scale is ready or blocked. Smartlead
                scale is independently gated by campaign / mapping / webhook /
                lead-push / scale-enable readiness (see Outbound Channel Lanes).
              </p>
            </div>

            <div className="flex items-end justify-between flex-wrap gap-3 pt-2">
              <div>
                <h1 className="text-2xl font-bold">Founder Command Centre</h1>
                <p className="text-muted-foreground text-sm mt-1">Operating runway — work top to bottom: safety → next actions → outreach pipeline → CRM → compliance → revenue → systems.</p>
              </div>
              <div className="flex gap-2">
                <Link to="/founder/copilot"><Button size="sm" variant="outline"><Sparkles size={14} /> Co-Pilot</Button></Link>
                <Link to="/founder/testing"><Button size="sm" variant="outline"><FlaskConical size={14} /> Diagnostics</Button></Link>
              </div>
            </div>

            <SystemModeBanner />

            <CommandCentreMasterControlPlane />

            <GlobalAIBrainCommandCentre />

            <StartHereOperatingPanel />

            {/* SECTION 3 — Current Next Actions */}
            <RunwayHeader n={3} title="Current Next Actions" icon={Sparkles} anchor="sec-next-actions" />
            <Section title="Today's founder actions" icon={Sparkles}>
              <SmartleadScaleNextActionBanner />
              <div className="mt-3">
                <OutboundChannelLanesPanel />
              </div>
              {orderedFounderActions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No founder decision required right now.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-2">
                  {orderedFounderActions.map((r, idx) => (
                    <Link key={idx} to={r.to} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      r.tone === "danger" ? "bg-destructive/10 border-destructive/30 hover:bg-destructive/15" :
                      r.tone === "warn" ? "bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15" :
                      "bg-secondary/50 border-border/50 hover:bg-secondary"
                    }`}>
                      <span className="text-sm">{r.msg}</span>
                      <ArrowRight size={14} className="text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-3">
                Current architecture: Smartlead is the cold-outreach scale lane;
                native Liftor/IONOS is reserved for small controlled business
                email only. Liftor is the control/brain layer above both.
                CRM customer memory, AI agents, founder approval, commercial
                handoff and finance/supplier orchestration all run preview-only
                and require founder approval — no auto-send, no cron, no live
                Apollo/Smartlead POSTs. Legacy IONOS live batch send, Apollo
                reveal-to-queue, Manual Send Apply / Pooja proof-send and the 7
                review_required Step 4 rows are archived and are not the build
                path or top action.
              </p>
            </Section>
            <FounderApprovalConsole />
            <ApprovedActionExecutionPanel />
            <ControlledExternalActionGatesPanel />
            <BusinessOperatingRunbookPanel />
            <LiftorMasterDryRunPanel />
            <SmartleadControlledActivationPanel />
            <LiftorBusinessLiveRunPanel />
            <InternalOperatingSchedulesPanel />
            <MultiBusinessOperatingLayerPanel />
            <BusinessLaunchFactoryPanel />
            <BusinessKnowledgeBrainPanel />

            {/* SECTION 4 — Customer Journey Control */}
            <CustomerJourneyControlBoard />

            {/* SECTION 4 — Liftor System Map / Master Index (collapsible) */}
            <RunwayHeader n={4} title="Liftor System Map / Master Index" icon={MapIcon} anchor="sec-map" />
            <CollapsibleCard id="sec-map" title="Master Index — every Liftor route & concept" icon={MapIcon} defaultOpen={false}>
              <CommandCentreMasterIndex />
            </CollapsibleCard>

            {/* SECTION 5 — AI Agent Control Room */}
            <RunwayHeader n={5} title="AI Agent Control Room" icon={Bot} anchor="sec-agents" />
            <Section title="AI workers" icon={Bot} action={<Link to="/founder/agents"><Button size="sm" variant="ghost">Open agents <ArrowRight size={12} /></Button></Link>}>
              <div id="sec-agents" className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 scroll-mt-24">
                {workers.map((w) => (
                  <Link key={w.key} to={w.to} className="p-2.5 rounded-lg bg-secondary/30 border border-border/40 hover:border-primary/40 transition-colors block">
                    <div className="flex items-center justify-between mb-1.5">
                      <w.icon size={14} className="text-primary" />
                      <Badge variant="secondary" className={`text-[9px] ${workerStatusColor(w.status)}`}>{w.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs font-medium">{w.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{w.recent}</p>
                    <p className="text-[10px] text-primary/80 mt-1 line-clamp-1">→ {w.next}</p>
                  </Link>
                ))}
              </div>
              <CollapsibleCard id="sec-agent-orchestration" title="Agent orchestration (detailed)" icon={Bot} defaultOpen={false} flat>
                <AgentOrchestration />
              </CollapsibleCard>
              <CollapsibleCard id="sec-agent-capabilities" title="Liftor capabilities (concept map)" icon={Sparkles} defaultOpen={false} flat>
                <LiftorCapabilities />
              </CollapsibleCard>
              <AIAgentOperatingModelPanel />
              <AIAgentOrchestratorPanel />
              <AgentBusinessLivePanel />
              <AIEngagementAgentLivePanel />
              <AIConversationDraftingPanel />
              <FounderApprovalConsole />
              <ApprovedActionExecutionPanel />
              <LiftorBusinessLiveRunPanel />
              <GlobalAutonomyControlPanel />
              <MultilingualIntelligencePanel />
              <AgentHandoverProtocolPanel />
              <AgentCollaborationBoard />
              <AutopilotActivationGatesPanel />
              <SocialMediaBrainPanel />
            </Section>

            {/* SECTION 6 — Outreach Runway */}
            <RunwayHeader n={6} title="Outreach Runway" icon={Send} anchor="sec-outreach-runway" />
            <Section title="Outreach pipeline (source → reply)" icon={WorkflowIcon}>
              {(() => {
                const safeToPromote = leadLifecycle?.safe_to_promote_after_reveal ?? leadLifecycle?.safe_to_promote ?? 0;
                const safeToQueue = leadLifecycle?.safe_to_queue ?? 0;
                const notes: string[] = [];
                if (safeToPromote === 0) notes.push("Promote (validation-clean) shows 0 — historical snapshot, not a current action.");
                if (safeToQueue === 0) notes.push("Queue Campaign shows 0 — historical snapshot, not a current action.");
                if ((leadLifecycle?.safe_to_promote_after_reveal ?? 0) === 0) notes.push("Post-Reveal Check 'awaiting reveal results' is a stale counter — review queue audit / latest run before action.");
                if (notes.length === 0) return null;
                return (
                  <div className="mb-2 rounded-md border border-border/50 bg-muted/20 p-2 text-[11px] text-muted-foreground space-y-0.5">
                    {notes.map((n, i) => <p key={i}>• {n}</p>)}
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {stages.map((s, idx) => (
                  <a key={s.key} href={s.anchor} className={`p-3 rounded-lg border transition-colors hover:border-primary/50 ${stageStatusCls(s.status)}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] opacity-60">{idx + 1}.</span>
                        <s.icon size={14} />
                      </div>
                      <span className="text-[10px] uppercase tracking-wide opacity-70">{s.status.replace("_", " ")}</span>
                    </div>
                    <p className="text-sm font-medium leading-tight">{s.label}</p>
                    <p className="text-lg font-bold mt-1">{s.count}</p>
                    {s.blocker && <p className="text-[10px] mt-1 opacity-80">⚠ {s.blocker}</p>}
                    <p className="text-[10px] mt-1 opacity-70 line-clamp-1">→ {s.next}</p>
                  </a>
                ))}
              </div>
            </Section>

            {/* 6a — Source Candidates */}
            <CollapsibleCard id="sec-source" title="6a · Source Candidates (Apollo pull, candidates, dedupe context)" icon={Search} defaultOpen={false}>
              <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 px-3 py-2 text-[11px] text-yellow-200/80 mb-3">
                Historical Apollo reveal execution panels below — collapsed by default. Apollo reveal that leads to queue/send remains guarded while pending queue rows are unresolved. Verify against latest run before approving credit spend.
              </div>
              <div className="space-y-4">
                <AutonomousPipelineStatus businessName="Neon Candy" />
                <CollapsibleCard id="sec-source-apollo-strip" title="Apollo reveal stage strip (historical)" icon={Search} defaultOpen={false} flat>
                  <ApolloRevealStageStrip lifecycle={leadLifecycle} />
                </CollapsibleCard>
                <CollapsibleCard id="sec-source-apollo-pull" title="Apollo pull panel (guarded)" icon={Search} defaultOpen={false} flat>
                  <ApolloPullPanel />
                </CollapsibleCard>
                <CollapsibleCard id="sec-source-quality-brief" title="Source quality brief" icon={Filter} defaultOpen={false} flat>
                  <SourceQualityBrief />
                </CollapsibleCard>
              </div>
            </CollapsibleCard>

            {/* 6b — Quality / Dedupe / CRM Check + Apollo Email Reveal + Post-Reveal Validation + Promote to CRM */}
            <CollapsibleCard id="sec-autopilot" title="6b · Quality / Dedupe / CRM Check · Apollo Email Reveal · Post-Reveal Validation · Promote to CRM" icon={Filter} defaultOpen>
              <LeadQualityPanel />
              <div className="mt-4">
                <AutopilotPolicyPanel businessName="Neon Candy" />
              </div>
            </CollapsibleCard>

            {/* 6c — Compliance Approval (link to compliance) handled in section 8 too; here is pipeline-relevant pointer */}
            <Section title="6c · Compliance Approval (outreach gate)" icon={ShieldCheck} action={<Link to="/founder/compliance"><Button size="sm" variant="ghost">Open compliance <ArrowRight size={12} /></Button></Link>}>
              <p className="text-sm text-muted-foreground">Contacts must be marked outreach_allowed by compliance before they can be promoted to a sendable queue. This Command Centre never marks contacts outreach_allowed.</p>
            </Section>

            {/* 6d — Stage to Queue + 6e — Queue Audit / Pending Rows + 6f — Queue Creation + 6g — Controlled Send (NATIVE IONOS LANE) */}
            <Section title="6d–6g · Native Liftor / IONOS queue (Stage · Audit · Creation · Controlled Send) — not Smartlead scale" icon={Send} action={<Link to="/founder/outreach/queue"><Button size="sm" variant="ghost">Open queue <ArrowRight size={12} /></Button></Link>}>
              <div id="sec-queue" className="space-y-4 scroll-mt-24">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.pendingQueue}</p><p className="text-muted-foreground">Queued</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.blockedQueue ? "text-yellow-400" : ""}`}>{totals.blockedQueue}</p><p className="text-muted-foreground">Blocked</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.failedSends ? "text-destructive" : ""}`}>{totals.failedSends}</p><p className="text-muted-foreground">Failed</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.inboxCapped ? "text-yellow-400" : "text-green-400"}`}>{totals.inboxCapped ? "Capped" : "OK"}</p><p className="text-muted-foreground">Provider</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.activeCampaigns}</p><p className="text-muted-foreground">Active campaigns</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.sentToday}</p><p className="text-muted-foreground">Sent today</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.sentTotal}</p><p className="text-muted-foreground">Sent total</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{queue.find((q: any) => q.status === "pending" && q.scheduled_at) ? format(new Date(queue.find((q: any) => q.status === "pending" && q.scheduled_at)!.scheduled_at), "dd MMM HH:mm") : "—"}</p><p className="text-muted-foreground">Next send</p></div>
                </div>
                <div className="text-[11px] text-muted-foreground border-t border-border/40 pt-2">
                  <span className="font-medium text-foreground">Cadence integrity:</span> downstream steps wait until prior step sent (real SMTP, accepted, provider message ID).
                </div>
                <div data-testid="live-send-guard" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-2">
                  <p className="font-medium text-yellow-200">
                    Controlled Send blocked — Manual Send Apply is not built. Existing pending queue rows must be reviewed first.
                  </p>
                  <ul className="list-disc list-inside text-yellow-100/80 space-y-0.5">
                    <li>safety_status: <span className="font-mono">{safetyStatus ?? "unknown"}</span></li>
                    <li>auto_send_enabled: <span className="font-mono">{String(safetyAudit?.baseline?.auto_send_enabled_value ?? "missing")}</span></li>
                    <li>cron_check: <span className="font-mono">{cronCheck ?? "unknown"}</span></li>
                    <li>pending queue rows: <span className="font-mono">{totalPendingFromAudit}</span></li>
                    <li>review_required: <span className="font-mono">{reviewRequired}</span></li>
                    <li>Manual Send Apply built: <span className="font-mono">no</span></li>
                    <li>Tracking disclosure injected: <span className="font-mono">no</span></li>
                  </ul>
                  <p className="text-yellow-100/70">
                    Run controlled live batch / Run next live batch / Run batch of N controls are intentionally hidden. SAFE_BLOCKED means safe to inspect and clean, not safe to send.
                  </p>
                  <Link to="/founder/outreach/queue-audit"><Button size="sm" variant="outline">Open Queue Audit</Button></Link>
                  {reviewRequired > 0 && (
                    <Link to="/founder/outreach/queue-audit#review-required-decision-gate" className="ml-2">
                      <Button size="sm" variant="outline">Open Review Required Queue Gate</Button>
                    </Link>
                  )}
                </div>
                <div data-testid="queue-creation-guard" className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-3 text-xs space-y-2">
                  <p className="font-medium text-yellow-200">Create queue rows disabled — pending queue review required.</p>
                  <p className="text-yellow-100/80">
                    Queue creation is paused until the {totalPendingFromAudit} existing pending row{totalPendingFromAudit === 1 ? "" : "s"} {totalPendingFromAudit === 1 ? "is" : "are"} reviewed or safely resolved. Auto-send is off and the background send worker is blocked, but queue creation remains controlled because pending rows can become dangerous if the brake is ever removed.
                  </p>
                  <p className="text-yellow-100/70">
                    review_required: {reviewRequired} · valid_future_step_blocked: {validFutureBlocked} · cancel_candidate: {cancelCandidate} · legacy_pending: {legacyPending} · orphan_followup: {orphanFollowup}
                  </p>
                </div>
                <ControlledSendReadinessPreview />
                <FooterDisclosurePreview />
                <ManualSendApplyGate />
              </div>
            </Section>

            {/* 6h — Replies (inbox / approvals) */}
            <Section title="6h · Replies & approvals" icon={InboxIcon} action={<Link to="/founder/conversations"><Button size="sm" variant="ghost">Open inbox <ArrowRight size={12} /></Button></Link>}>
              <div id="sec-inbox" className="space-y-3 scroll-mt-24">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{totals.repliesAll}</p><p className="text-muted-foreground">Replies (7d)</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${totals.urgentReplies ? "text-yellow-400" : ""}`}>{totals.urgentReplies}</p><p className="text-muted-foreground">Urgent</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className={`text-base font-semibold ${drafts.length ? "text-yellow-400" : ""}`}>{drafts.length}</p><p className="text-muted-foreground">AI drafts pending</p></div>
                  <div className="p-2 rounded bg-secondary/40"><p className="text-base font-semibold">{proposals.length}</p><p className="text-muted-foreground">Proposals draft</p></div>
                </div>
                {totals.approvalsTotal === 0 ? (
                  <p className="text-sm text-muted-foreground">No items waiting for approval.</p>
                ) : (
                  <div className="space-y-2">
                    {drafts.slice(0, 4).map((d: any) => (
                      <Link key={d.id} to="/founder/conversations" className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                        <div><span className="text-muted-foreground text-xs">AI draft · </span>{d.classification ?? "reply"}</div>
                        <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}</span>
                      </Link>
                    ))}
                    {hotConvos.slice(0, 3).map((h: any) => (
                      <Link key={h.id} to={`/founder/conversations/${h.id}`} className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                        <div><span className="text-muted-foreground text-xs">Escalation · </span>{h.escalation_reason ?? "needs review"}</div>
                        <span className="text-xs text-muted-foreground">{h.business_name}</span>
                      </Link>
                    ))}
                    {proposals.slice(0, 3).map((p: any) => (
                      <Link key={p.id} to={`/founder/internal-proposals`} className="flex items-center justify-between p-2.5 rounded bg-secondary/40 hover:bg-secondary text-sm">
                        <div><span className="text-muted-foreground text-xs">Proposal · </span>{p.title} <span className="text-xs text-muted-foreground">({p.business_name})</span></div>
                        <Badge variant="secondary" className="text-[10px]">{p.status}</Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </Section>
            <AIConversationDraftingPanel />
            <AIEngagementAgentLivePanel />
            <MultiChannelInboxPanel />

            {/* SECTION 7 — CRM / Contacts / Inboxes */}
            <RunwayHeader n={7} title="CRM / Contacts / Inboxes" icon={Users} anchor="sec-crm" />
            <Section title="CRM spine" icon={Database} action={<Link to="/founder/crm"><Button size="sm" variant="ghost">Open CRM <ArrowRight size={12} /></Button></Link>}>
              <div id="sec-crm" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm scroll-mt-24">
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Central contacts</p><p className="text-xl font-semibold">{contacts.length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">With business link</p><p className="text-xl font-semibold">{contacts.filter((c: any) => c.assigned_business).length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Missing business link</p><p className="text-xl font-semibold">{contacts.filter((c: any) => !c.assigned_business).length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Internal identities</p><p className="text-xl font-semibold">{internalEmails.length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Apollo → contacts</p><p className="text-xl font-semibold">{leadQualityCounts?.promoted ?? 0}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Proposals to reconcile</p><p className="text-xl font-semibold">{proposals.length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Active conversations</p><p className="text-xl font-semibold">{contacts.filter((c: any) => c.conversation_active).length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Warm leads</p><p className="text-xl font-semibold">{totals.warmLeads}</p></div>
              </div>
              <LinkGrid items={[
                { to: "/founder/crm", label: "CRM", icon: Users },
                { to: "/founder/conversations", label: "Conversations / Inbox", icon: InboxIcon },
                { to: "/founder/sending", label: "Sending Health / Inboxes", icon: Mail },
                { to: "/founder/organisations", label: "Organisations", icon: Building2 },
              ]} />
              <CRMCustomerMemoryDashboard />
              <CRMInteractionLedgerPanel />
              <CRMInteractionMatchPreviewPanel />
              <CRMInteractionSourceAdaptersPanel />
              <CRMConversationBridgePanel />
              <CRMCustomerLifecyclePanel />
              <CRMHealthIntegrityPanel />
              <CRMContact360Panel />
            </Section>

            {/* SECTION 8 — Compliance / Legal / Rules */}
            <RunwayHeader n={8} title="Compliance / Legal / Rules" icon={ShieldCheck} anchor="sec-compliance" />
            <Section title="Compliance, legal, rules" icon={Gavel} action={<Link to="/founder/compliance"><Button size="sm" variant="ghost">Open compliance <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/compliance", label: "Compliance", icon: ShieldCheck },
                { to: "/founder/legal", label: "Legal Console", icon: Gavel },
                { to: "/founder/access-control", label: "Access Control", icon: ShieldAlert },
                { to: "/founder/security", label: "Security", icon: ShieldAlert },
              ]} />
            </Section>
            <GlobalJurisdictionPolicyPanel />

            {/* SECTION 9 — Proposals / Demos / Client Journey */}
            <RunwayHeader n={9} title="Proposals / Demos / Client Journey" icon={FileSignature} anchor="sec-proposals" />
            <Section title="Proposals, demos, client journey" icon={FileSignature} action={<Link to="/founder/internal-proposals"><Button size="sm" variant="ghost">Open proposals <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/proposals", label: "Proposals (incoming)", icon: FileSignature },
                { to: "/founder/internal-proposals", label: "Internal Proposals", icon: FileSignature },
                { to: "/founder/demos", label: "Demos", icon: MonitorPlay },
                { to: "/founder/pipeline", label: "Lead Pipeline", icon: TrendingUp },
              ]} />
            </Section>
            <CommercialHandoffPanel />
            <LiveCommercialAgentsPanel />
            <ProductisationReadinessPanel />

            {/* SECTION 10 — Deals / Finance / Revenue */}
            <RunwayHeader n={10} title="Deals / Finance / Revenue" icon={Banknote} anchor="sec-finance" />
            <Section title="Results (7-day)" icon={Activity} action={<Link to="/founder/analytics"><Button size="sm" variant="ghost">Analytics <ArrowRight size={12} /></Button></Link>}>
              <div id="sec-results" className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm scroll-mt-24">
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Sent total</p><p className="text-xl font-semibold">{totals.sentTotal}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Sent today</p><p className="text-xl font-semibold">{totals.sentToday}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Replies</p><p className="text-xl font-semibold">{totals.repliesAll}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Bounces</p><p className="text-xl font-semibold">{totals.bouncesAll}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Reply rate</p><p className="text-xl font-semibold">{totals.sentTotal ? `${Math.round((totals.repliesAll / totals.sentTotal) * 100)}%` : "—"}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Warm leads</p><p className="text-xl font-semibold">{totals.warmLeads}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Open deals</p><p className="text-xl font-semibold">{deals.filter((d: any) => d.status !== "won" && d.status !== "lost").length}</p></div>
                <div className="p-3 rounded bg-secondary/40"><p className="text-xs text-muted-foreground">Invoices outstanding</p><p className="text-xl font-semibold">{invoices.filter((i: any) => i.status !== "paid" && i.status !== "void").length}</p></div>
              </div>
              <LinkGrid items={[
                { to: "/founder/revenue", label: "Revenue", icon: Banknote },
                { to: "/founder/finance", label: "Finance", icon: Banknote },
                { to: "/founder/analytics", label: "Analytics", icon: Activity },
                { to: "/founder/optimisation", label: "Optimisation", icon: TrendingUp },
              ]} />
            </Section>
            <CommercialHandoffPanel />
            <RevenueOperationsPanel />
            <LiveCommercialAgentsPanel />

            {/* SECTION 11 — Suppliers / Assignments / Delivery */}
            <RunwayHeader n={11} title="Suppliers / Assignments / Delivery" icon={Briefcase} anchor="sec-delivery" />
            <Section title="Suppliers, assignments, delivery" icon={Briefcase} action={<Link to="/founder/projects"><Button size="sm" variant="ghost">Open projects <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/suppliers", label: "Suppliers", icon: Briefcase },
                { to: "/founder/assignments", label: "Assignments", icon: ClipboardCheck },
                { to: "/founder/projects", label: "Projects", icon: ListChecks },
                { to: "/founder/deployments", label: "Deployments", icon: WorkflowIcon },
              ]} />
            </Section>
            <RevenueOperationsPanel />

            {/* SECTION 12 — Integrations / External Systems */}
            <RunwayHeader n={12} title="Integrations / External Systems" icon={Plug} anchor="sec-integrations" />
            <Section title="Integrations & external systems" icon={Plug} action={<Link to="/founder/integrations"><Button size="sm" variant="ghost">Open integrations <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/integrations", label: "Integrations", icon: Plug },
                { to: "/founder/workflows", label: "Workflows", icon: WorkflowIcon },
                { to: "/founder/processes", label: "Processes", icon: WorkflowIcon },
                { to: "/founder/architectures", label: "Architectures", icon: WorkflowIcon },
              ]} />
            </Section>
            <OutboundProviderEnginePanel />
            <BulkSendEngineBlueprint />
            <OutboundChannelPolicyPanel />
            <p className="text-[11px] text-muted-foreground px-1">
              Outbound routing is split: Smartlead handles cold scale outreach;
              Liftor native handles controlled customer / proposal / finance /
              supplier emails. Founder approval required on every lane; auto-send
              is off everywhere.
            </p>
            <SmartleadScaleSetupChecklist />
            <SmartleadCampaignMappingPreview />
            <SmartleadCampaignDiscoveryPanel />
            <SmartleadLeadPushPreview />
            <BulkSendPreviewPanel />
            <ScaleOperationsDryRunDashboard />
            <SocialMediaBrainPanel />

            {/* SECTION 13 — Monitoring / Security / System Health */}
            <RunwayHeader n={13} title="Monitoring / Security / System Health" icon={Monitor} anchor="sec-monitoring" />
            <Section title="Monitoring, security, system health" icon={Monitor} action={<Link to="/founder/system"><Button size="sm" variant="ghost">Open system <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/system", label: "System Oversight", icon: ShieldAlert },
                { to: "/founder/system/modes", label: "Execution Modes", icon: WorkflowIcon },
                { to: "/founder/monitoring", label: "Monitoring", icon: Monitor },
                { to: "/founder/sending", label: "Sending Health", icon: Mail },
                { to: "/founder/priority", label: "Priority", icon: TrendingUp },
                { to: "/founder/activity", label: "Activity", icon: Activity },
                { to: "/founder/testing", label: "Platform Testing", icon: FlaskConical },
                { to: "/founder/executions", label: "Executions", icon: Activity },
              ]} />
            </Section>
            <LiftorMasterDryRunPanel />
            <LiftorBusinessLiveRunPanel />
            <SecurityGovernancePanel />
            <LearningOptimisationEnginePanel />
            <SelfHealingMonitoringPanel />

            {/* SECTION 14 — Knowledge / Manual / Build Log */}
            <InternalOperatingSchedulesPanel />
            <BusinessOperatingRunbookPanel />
            <RunwayHeader n={14} title="Knowledge / Manual / Build Log" icon={BookOpen} anchor="sec-knowledge" />
            <Section title="Knowledge, manual, build log" icon={BookOpen} action={<Link to="/founder/manual"><Button size="sm" variant="ghost">Open manual <ArrowRight size={12} /></Button></Link>}>
              <LinkGrid items={[
                { to: "/founder/manual", label: "Founder Manual", icon: BookOpen },
                { to: "/founder/manual/full", label: "System Mirror", icon: MapIcon },
                { to: "/founder/build-log", label: "Build Log", icon: ListChecks },
                { to: "/founder/knowledge", label: "Knowledge", icon: BookOpen },
                { to: "/founder/documents", label: "Documents", icon: ListChecks },
              ]} />
            </Section>

            {/* SECTION 15 — Legacy / Historical / Archive (collapsed) */}
            <RunwayHeader n={15} title="Legacy / Historical / Archive" icon={Archive} anchor="sec-legacy" />
            <Section title="Advanced · Legacy · Diagnostics" icon={Archive}>
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="legacy-apollo">
                  <AccordionTrigger className="text-sm">Legacy Apollo Pool — optional / not recommended</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>Old 150-lead Apollo pool with {leadLifecycle?.legacy_optional_unlock_candidates ?? 0} legacy optional unlock candidates held on ice.</p>
                      <p>Do not unlock unless founder explicitly overrides. Source of truth is Lead Quality Autopilot above.</p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="businesses">
                  <AccordionTrigger className="text-sm">All businesses</AccordionTrigger>
                  <AccordionContent>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {businessStats.map((b) => (
                        <div key={b.id} className="p-3 rounded-lg bg-secondary/30 border border-border/40">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-sm">{b.name}</p>
                            <Badge variant="secondary" className={`text-[10px] ${businessStatusColor(b.status)}`}>{b.status.replace("_", " ")}</Badge>
                          </div>
                          <div className="grid grid-cols-5 gap-1 text-center text-[10px]">
                            <div><p className="font-semibold text-sm">{b.activeCampaigns}</p><p className="text-muted-foreground">Camp.</p></div>
                            <div><p className="font-semibold text-sm">{b.warm}</p><p className="text-muted-foreground">Warm</p></div>
                            <div><p className={`font-semibold text-sm ${b.pendingApprovals ? "text-yellow-400" : ""}`}>{b.pendingApprovals}</p><p className="text-muted-foreground">Approve</p></div>
                            <div><p className={`font-semibold text-sm ${b.blockedQueue ? "text-yellow-400" : ""}`}>{b.blockedQueue}</p><p className="text-muted-foreground">Block</p></div>
                            <div><p className={`font-semibold text-sm ${(b.failedSends + b.systemWarnings) ? "text-destructive" : ""}`}>{b.failedSends + b.systemWarnings}</p><p className="text-muted-foreground">Issues</p></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="blockers">
                  <AccordionTrigger className="text-sm">Blockers & truth panel</AccordionTrigger>
                  <AccordionContent>
                    {(blockerSections.current.length + blockerSections.safetyGates.length + blockerSections.completed.length + blockerSections.observations.length) === 0 ? (
                      <div className="flex items-center gap-2 text-sm text-green-400"><CheckCircle2 size={14} /> No active blockers.</div>
                    ) : (
                      <div className="space-y-3">
                        {[
                          { key: "current", title: "Current blockers", items: blockerSections.current },
                          { key: "safety", title: "Safety gates", items: blockerSections.safetyGates },
                          { key: "completed", title: "Completed repairs", items: blockerSections.completed },
                          { key: "observations", title: "Campaign observations", items: blockerSections.observations },
                        ].map((g) => g.items.length === 0 ? null : (
                          <div key={g.key}>
                            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">{g.title}</p>
                            <div className="space-y-1.5">
                              {g.items.map((b, idx) => (
                                <Link key={idx} to={b.to ?? "/founder/system"} className={`block p-2 rounded text-xs ${b.severity === "danger" ? "bg-destructive/10 border border-destructive/30" : b.severity === "good" ? "bg-green-500/10 border border-green-500/20 text-green-300" : "bg-yellow-500/5 border border-yellow-500/20"}`}>
                                  {b.msg}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="diagnostics">
                  <AccordionTrigger className="text-sm">Raw diagnostics & execution status</AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4">
                      <ExecutionStatusPanel />
                      <ControlledProofSend />
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="coverage">
                  <AccordionTrigger className="text-sm">Coverage baseline / before-refactor snapshot</AccordionTrigger>
                  <AccordionContent>
                    <CommandCentreCoverageMap />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </Section>
          </div>
        );
      })()}
    </FounderLayout>
  );
};

export default CommandCentre;

// ===== Local layout helpers (UI-only) =====
function RunwayHeader({ n, title, icon: Icon, anchor }: { n: number; title: string; icon: any; anchor: string }) {
  return (
    <div id={anchor} className="scroll-mt-24 flex items-center gap-2 pt-4">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">{n}</span>
      <Icon size={14} className="text-primary" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

function CollapsibleCard({
  id, title, icon: Icon, defaultOpen = false, flat = false, children,
}: { id?: string; title: string; icon: any; defaultOpen?: boolean; flat?: boolean; children: React.ReactNode }) {
  return (
    <Collapsible defaultOpen={defaultOpen}>
      <div id={id} className={`scroll-mt-24 ${flat ? "" : "rounded-lg border border-border/50 bg-card"}`}>
        <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-secondary/30 rounded-t-lg">
          <span className="flex items-center gap-2">
            <Icon size={14} className="text-primary" />
            <span className="font-medium">{title}</span>
          </span>
          <ChevronDown size={14} className="text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className={flat ? "pt-2" : "p-3 pt-2 border-t border-border/40"}>{children}</div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function LinkGrid({ items }: { items: Array<{ to: string; label: string; icon: any }> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
      {items.map((it) => (
        <Link key={it.to} to={it.to} className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/40 hover:border-primary/40 hover:bg-secondary text-sm transition-colors">
          <it.icon size={14} className="text-primary" />
          <span className="flex-1">{it.label}</span>
          <ArrowRight size={12} className="text-muted-foreground" />
        </Link>
      ))}
    </div>
  );
}

function ApolloRevealStageStrip({ lifecycle }: { lifecycle: any }) {
  const reveal_required =
    (lifecycle?.email_reveal_required ?? 0) +
    (lifecycle?.verified_email_available_locked ?? 0);
  const stages: Array<{ n: number; label: string; value: number | string; tone?: "good" | "warn" | "default" }> = [
    { n: 1, label: "Candidate profiles pulled", value: (lifecycle?.total_leads ?? lifecycle?.active_working_leads ?? 0) },
    { n: 2, label: "Email reveal required", value: reveal_required, tone: reveal_required > 0 ? "warn" : "default" },
    { n: 3, label: "Reveal shortlist built", value: lifecycle?.reveal_shortlisted ?? 0 },
    { n: 4, label: "Founder approves reveal credits", value: "manual", tone: "default" },
    { n: 5, label: "Emails returned", value: (lifecycle?.safe_to_promote_after_reveal ?? 0) + (lifecycle?.founder_review_required ?? 0) + (lifecycle?.already_in_crm_after_reveal ?? 0) },
    { n: 6, label: "Post-reveal CRM check", value: lifecycle?.already_in_crm_after_reveal ?? 0 },
    { n: 7, label: "Safe to promote (validation-clean)", value: lifecycle?.safe_to_promote_after_reveal ?? lifecycle?.safe_to_promote ?? 0, tone: "good" },
    { n: 8, label: "Safe to queue", value: lifecycle?.safe_to_queue ?? 0, tone: "good" },
    { n: 9, label: "Send", value: "controlled", tone: "default" },
  ];
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-foreground">Apollo reveal workflow — search → shortlist → reveal → promote</p>
        <span className="text-[10px] text-muted-foreground">
          No credits spent until founder approves reveal at stage 4.
        </span>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-9 gap-1.5 text-center">
        {stages.map((s) => {
          const tone =
            s.tone === "good" ? "border-green-500/30 text-green-200" :
            s.tone === "warn" ? "border-yellow-500/40 text-yellow-200" :
            "border-border/50 text-muted-foreground";
          return (
            <div key={s.n} className={`rounded border ${tone} bg-background/40 p-2`}>
              <div className="text-[10px] opacity-70">Stage {s.n}</div>
              <div className="text-sm font-semibold text-foreground">{s.value}</div>
              <div className="text-[10px] leading-tight mt-1">{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
