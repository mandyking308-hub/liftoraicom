import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import CRMInteractionMatchPreviewPanel from "@/components/founder/crm/CRMInteractionMatchPreviewPanel";
import CRMConversationBridgePanel from "@/components/founder/crm/CRMConversationBridgePanel";
import CRMCustomerLifecyclePanel from "@/components/founder/crm/CRMCustomerLifecyclePanel";
import CRMCustomerMemoryDashboard from "@/components/founder/crm/CRMCustomerMemoryDashboard";
import CRMContactTimelinePanel from "@/components/founder/crm/CRMContactTimelinePanel";
import AIConversationDraftingPanel from "@/components/founder/agents/AIConversationDraftingPanel";
import AIEngagementAgentLivePanel from "@/components/founder/agents/AIEngagementAgentLivePanel";
import FounderApprovalConsole from "@/components/founder/approvals/FounderApprovalConsole";
import CommercialHandoffPanel from "@/components/founder/commercial/CommercialHandoffPanel";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertTriangle, CheckCircle2, Bot, Inbox } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Row = {
  id: string;
  contact_id: string;
  business_name: string;
  status: string;
  last_message_at: string;
  ai_last_used_at: string | null;
  escalation_pending: boolean;
  escalation_reason: string;
  contact?: { name: string; email: string; company: string; status: string };
};

type InboundRow = {
  id: string;
  inbox_id: string;
  from_email: string;
  subject: string | null;
  body_text: string | null;
  received_at: string;
  processing_status: string;
  contact_id: string | null;
  conversation_id: string | null;
  is_bounce: boolean;
};

const ConversationsDashboard = () => {
  const [convs, setConvs] = useState<Row[]>([]);
  const [inbound, setInbound] = useState<InboundRow[]>([]);
  const [stats, setStats] = useState({ active: 0, replies24: 0, qualified: 0, escalations: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: c } = await supabase
      .from("conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(50);
    const ids = (c ?? []).map((r) => r.contact_id);
    const { data: contacts } = ids.length
      ? await supabase.from("contacts").select("id, name, email, company, status").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((contacts ?? []).map((x: any) => [x.id, x]));
    const enriched = (c ?? []).map((r) => ({ ...r, contact: map.get(r.contact_id) })) as Row[];
    setConvs(enriched);

    // stats
    const { count: active } = await supabase
      .from("conversations").select("*", { count: "exact", head: true }).eq("status", "OPEN");
    const { count: qualified } = await supabase
      .from("conversations").select("*", { count: "exact", head: true }).eq("status", "QUALIFIED");
    const { count: escalations } = await supabase
      .from("conversations").select("*", { count: "exact", head: true }).eq("escalation_pending", true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: replies24 } = await supabase
      .from("ai_actions").select("*", { count: "exact", head: true })
      .eq("action_type", "reply").eq("status", "success").gte("created_at", since);
    setStats({
      active: active ?? 0,
      qualified: qualified ?? 0,
      escalations: escalations ?? 0,
      replies24: replies24 ?? 0,
    });

    const { data: inb } = await supabase
      .from("inbound_messages")
      .select("id, inbox_id, from_email, subject, body_text, received_at, processing_status, contact_id, conversation_id, is_bounce")
      .order("received_at", { ascending: false })
      .limit(100);
    setInbound((inb ?? []) as InboundRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <FounderLayout>
      <div className="max-w-6xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">AI Conversations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Inbound replies are auto-classified and answered. Escalations require human review.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
        </div>

        <CRMInteractionMatchPreviewPanel />
        <CRMCustomerMemoryDashboard />
        <CRMConversationBridgePanel />
        <CRMCustomerLifecyclePanel />
        <CRMContactTimelinePanel />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<MessageSquare className="h-4 w-4" />} label="Active conversations" value={stats.active} />
          <StatCard icon={<Bot className="h-4 w-4" />} label="AI replies (24h)" value={stats.replies24} />
          <StatCard icon={<CheckCircle2 className="h-4 w-4" />} label="Qualified" value={stats.qualified} accent="text-green-500" />
          <StatCard icon={<AlertTriangle className="h-4 w-4" />} label="Escalations" value={stats.escalations} accent="text-destructive" />
        </div>

        <Tabs defaultValue="conversations">
          <TabsList>
            <TabsTrigger value="conversations">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> Conversations
            </TabsTrigger>
            <TabsTrigger value="inbound">
              <Inbox className="h-3.5 w-3.5 mr-1.5" /> Inbound Inbox ({inbound.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="conversations">
            <Card className="tech-card p-0 overflow-hidden">
          <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
            <div className="col-span-3">Contact</div>
            <div className="col-span-3">Business</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-3">Last message</div>
            <div className="col-span-1 text-right">Flag</div>
          </div>
          {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {!loading && convs.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">No conversations yet. Inbound replies will appear here.</div>
          )}
          {convs.map((c) => (
            <Link
              key={c.id}
              to={`/founder/conversations/${c.id}`}
              className="grid grid-cols-12 px-4 py-3 text-sm border-b border-border/30 hover:bg-secondary/40 transition-colors"
            >
              <div className="col-span-3">
                <div className="font-medium">{c.contact?.name || c.contact?.email || c.contact_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{c.contact?.email}</div>
              </div>
              <div className="col-span-3 text-muted-foreground">{c.business_name || "—"}</div>
              <div className="col-span-2"><Badge variant="outline">{c.status}</Badge></div>
              <div className="col-span-3 text-xs text-muted-foreground">
                {new Date(c.last_message_at).toLocaleString()}
              </div>
              <div className="col-span-1 text-right">
                {c.escalation_pending && <Badge variant="destructive">{"!"}</Badge>}
              </div>
            </Link>
          ))}
            </Card>
          </TabsContent>

          <TabsContent value="inbound">
            <Card className="tech-card p-0 overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground border-b border-border/50">
                <div className="col-span-3">From</div>
                <div className="col-span-4">Subject</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-2">Received</div>
                <div className="col-span-1 text-right">Open</div>
              </div>
              {loading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
              {!loading && inbound.length === 0 && (
                <div className="p-6 text-sm text-muted-foreground">
                  No inbound emails captured yet. Click <strong>Poll Now</strong> on the inbox to fetch new replies.
                </div>
              )}
              {inbound.map((m) => (
                <div key={m.id} className="grid grid-cols-12 px-4 py-3 text-sm border-b border-border/30">
                  <div className="col-span-3">
                    <div className="font-medium truncate">{m.from_email}</div>
                    {m.is_bounce && <Badge variant="destructive" className="mt-1">bounce</Badge>}
                  </div>
                  <div className="col-span-4 text-muted-foreground">
                    <div className="truncate">{m.subject || "(no subject)"}</div>
                    <div className="text-xs truncate">{(m.body_text ?? "").slice(0, 120)}</div>
                  </div>
                  <div className="col-span-2">
                    <Badge variant={m.processing_status === "unmatched" ? "destructive" : "outline"}>
                      {m.processing_status}
                    </Badge>
                  </div>
                  <div className="col-span-2 text-xs text-muted-foreground">
                    {new Date(m.received_at).toLocaleString()}
                  </div>
                  <div className="col-span-1 text-right">
                    {m.conversation_id ? (
                      <Link to={`/founder/conversations/${m.conversation_id}`} className="text-primary text-xs underline">open</Link>
                    ) : m.contact_id ? (
                      <Link to={`/founder/crm/contacts/${m.contact_id}`} className="text-primary text-xs underline">contact</Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </div>
              ))}
            </Card>
          </TabsContent>
        </Tabs>
        <AIEngagementAgentLivePanel />
        <AIConversationDraftingPanel />
        <FounderApprovalConsole />
        <CommercialHandoffPanel />
      </div>
    </FounderLayout>
  );
};

const StatCard = ({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) => (
  <Card className="tech-card p-4">
    <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
    <div className={`text-2xl font-semibold mt-2 ${accent ?? ""}`}>{value}</div>
  </Card>
);

export default ConversationsDashboard;