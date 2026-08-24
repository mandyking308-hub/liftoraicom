import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Activity, Ban, Send, Mail, Inbox as InboxIcon, MessageCircle, Coins } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import BillionaireAccessResearchPanel from "@/components/founder/crm/BillionaireAccessResearchPanel";
import StrategicProspectingAgentPanel from "@/components/founder/prospecting/StrategicProspectingAgentPanel";
import CRMInteractionLedgerPanel from "@/components/founder/crm/CRMInteractionLedgerPanel";
import HumanAccountManagerPanel from "@/components/founder/customer/HumanAccountManagerPanel";
import CustomerOnboardingPanel from "@/components/founder/customer/CustomerOnboardingPanel";
import RetentionRecurringRevenuePanel from "@/components/founder/customer/RetentionRecurringRevenuePanel";
import CRMTotalMemoryRecoveryPanel from "@/components/founder/customer/CRMTotalMemoryRecoveryPanel";
import CRMInteractionMatchPreviewPanel from "@/components/founder/crm/CRMInteractionMatchPreviewPanel";
import CRMInteractionSourceAdaptersPanel from "@/components/founder/crm/CRMInteractionSourceAdaptersPanel";
import CRMConversationBridgePanel from "@/components/founder/crm/CRMConversationBridgePanel";
import CRMCustomerLifecyclePanel from "@/components/founder/crm/CRMCustomerLifecyclePanel";
import CRMHealthIntegrityPanel from "@/components/founder/crm/CRMHealthIntegrityPanel";
import CRMCustomerMemoryDashboard from "@/components/founder/crm/CRMCustomerMemoryDashboard";
import CRMContact360Panel from "@/components/founder/crm/CRMContact360Panel";
import PortfolioCrmSummaryPanel from "@/components/founder/crm/PortfolioCrmSummaryPanel";
import PortfolioCrmArchitecturePanel from "@/components/founder/crm/PortfolioCrmArchitecturePanel";
import PortfolioCrmEducationWavePanel from "@/components/founder/crm/PortfolioCrmEducationWavePanel";
import PortfolioDataLeveragePanel from "@/components/founder/crm/PortfolioDataLeveragePanel";
import RelationshipIntelligencePromotionPanel from "@/components/founder/crm/RelationshipIntelligencePromotionPanel";
import PortfolioContactRelationshipsTable from "@/components/founder/crm/PortfolioContactRelationshipsTable";
import CustomerFeedbackSurveyPanel from "@/components/founder/customer/CustomerFeedbackSurveyPanel";
import MultiChannelInboxPanel from "@/components/founder/channels/MultiChannelInboxPanel";
import CustomerJourneyControlBoard from "@/components/founder/command/CustomerJourneyControlBoard";
import SocialEngagementInboxPanel from "@/components/founder/social/SocialEngagementInboxPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type StatusCount = { status: string; count: number };

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  ENGAGED: "Engaged",
  QUALIFIED: "Qualified",
  CLIENT: "Client",
  SUPPLIER: "Supplier",
  DO_NOT_CONTACT: "Do Not Contact",
};

const CRMDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [totalContacts, setTotalContacts] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [activeConversations, setActiveConversations] = useState(0);
  const [blocked, setBlocked] = useState(0);
  const [sentLast7, setSentLast7] = useState(0);
  const [repliesLast7, setRepliesLast7] = useState(0);
  const [inboxes, setInboxes] = useState<
    { id: string; email_address: string; business_name: string; current_send_count: number; daily_send_limit: number; warmup_status: string; active: boolean }[]
  >([]);

  useEffect(() => {
    void loadStats();
  }, []);

  async function loadStats() {
    setLoading(true);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [contactsRes, activeRes, blockedRes, sentRes, repliesRes, inboxRes] = await Promise.all([
      supabase.from("contacts").select("status", { count: "exact" }),
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("conversation_active", true),
      supabase.from("contacts").select("id", { count: "exact", head: true }).in("status", ["DO_NOT_CONTACT", "ENGAGED", "QUALIFIED", "CLIENT"]),
      supabase.from("communications").select("id", { count: "exact", head: true }).eq("direction", "outbound").gte("timestamp", sevenDaysAgo),
      supabase.from("communications").select("id", { count: "exact", head: true }).eq("direction", "inbound").gte("timestamp", sevenDaysAgo),
      supabase.from("inboxes").select("*").order("business_name"),
    ]);

    setTotalContacts(contactsRes.count ?? 0);
    setActiveConversations(activeRes.count ?? 0);
    setBlocked(blockedRes.count ?? 0);
    setSentLast7(sentRes.count ?? 0);
    setRepliesLast7(repliesRes.count ?? 0);
    setInboxes(inboxRes.data ?? []);

    const counts = new Map<string, number>();
    (contactsRes.data ?? []).forEach((row) => {
      const s = row.status as string;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    });
    setStatusCounts(
      Object.keys(STATUS_LABELS).map((s) => ({ status: s, count: counts.get(s) ?? 0 })),
    );
    setLoading(false);
  }

  const stats = [
    { label: "Total Contacts", value: totalContacts, icon: Users },
    { label: "Active Conversations", value: activeConversations, icon: MessageCircle },
    { label: "Blocked from Outreach", value: blocked, icon: Ban },
    { label: "Emails Sent (7d)", value: sentLast7, icon: Send },
    { label: "Replies (7d)", value: repliesLast7, icon: Mail },
    { label: "Active Inboxes", value: inboxes.filter((i) => i.active).length, icon: InboxIcon },
  ];

  return (
    <FounderLayout>
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Portfolio CRM & Sanity Control</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              One master relationship system across the portfolio: shared data assets, reusable accounts and people, separate business qualification and outreach safeguards.
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link to="/founder/crm/billionaire-access">
                <Coins className="mr-2 h-4 w-4" />
                Billionaire access data
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/founder/crm/inboxes">
                <InboxIcon className="mr-2 h-4 w-4" />
                Inboxes
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/founder/crm/contacts">
                <Users className="mr-2 h-4 w-4" />
                All Contacts
              </Link>
            </Button>
          </div>
        </div>

        <BillionaireAccessResearchPanel />

        <PortfolioCrmSummaryPanel />
        <PortfolioCrmArchitecturePanel />
        <PortfolioCrmEducationWavePanel />
        <PortfolioDataLeveragePanel />
        <RelationshipIntelligencePromotionPanel />
        <PortfolioContactRelationshipsTable />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="tech-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2 text-muted-foreground">
                  <span className="text-xs uppercase tracking-wider">{s.label}</span>
                  <s.icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-semibold tabular-nums">{loading ? "—" : s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Contacts by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {statusCounts.map((s) => (
                <Link
                  key={s.status}
                  to={`/founder/crm/contacts?status=${s.status}`}
                  className="rounded-lg border border-border/50 p-3 hover:border-primary/50 hover:bg-secondary/40 transition-colors"
                >
                  <p className="text-xs text-muted-foreground">{STATUS_LABELS[s.status]}</p>
                  <p className="text-xl font-semibold mt-1">{s.count}</p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base">Inbox Usage</CardTitle>
          </CardHeader>
          <CardContent>
            {inboxes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No inboxes configured yet.</p>
            ) : (
              <div className="space-y-3">
                {inboxes.map((i) => {
                  const pct = i.daily_send_limit > 0 ? Math.min(100, (i.current_send_count / i.daily_send_limit) * 100) : 0;
                  return (
                    <div key={i.id} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-medium">{i.email_address}</p>
                          <p className="text-xs text-muted-foreground">{i.business_name || "Unassigned business"}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">{i.warmup_status}</Badge>
                          <Badge variant={i.active ? "default" : "secondary"}>{i.active ? "Active" : "Paused"}</Badge>
                        </div>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded bg-secondary overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                        {i.current_send_count} / {i.daily_send_limit} sent today
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" /> Sanity Engine
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Every outbound message is gated by <code className="text-foreground">crm-send-check</code>. Messages are blocked when the contact is:</p>
            <ul className="list-disc list-inside space-y-1 ml-1">
              <li>marked DO_NOT_CONTACT, ENGAGED, QUALIFIED, or CLIENT</li>
              <li>currently in an active conversation</li>
              <li>contacted within the last 48 hours</li>
              <li>has a recorded bounce</li>
              <li>has no inbox assigned</li>
            </ul>
          </CardContent>
        </Card>

        <CRMCustomerMemoryDashboard />
        <CRMInteractionLedgerPanel />
        <HumanAccountManagerPanel />
        <CustomerOnboardingPanel />
        <RetentionRecurringRevenuePanel />
        <CRMTotalMemoryRecoveryPanel />
        <CRMInteractionMatchPreviewPanel />
        <CRMInteractionSourceAdaptersPanel />
        <CRMConversationBridgePanel />
        <CRMCustomerLifecyclePanel />
        <CRMHealthIntegrityPanel />
        <CRMContact360Panel />
        <MultiChannelInboxPanel />
        <CustomerJourneyControlBoard />
        <SocialEngagementInboxPanel />
        <CustomerFeedbackSurveyPanel />
      </div>
      <div className="max-w-7xl mx-auto px-4 pb-6"><StrategicProspectingAgentPanel /></div>
    </FounderLayout>
  );
};

export default CRMDashboard;
