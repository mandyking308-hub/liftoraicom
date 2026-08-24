import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ShieldCheck, ShieldAlert, FileText, Loader2, Gavel, Send } from "lucide-react";
import FounderLayout from "@/components/founder/FounderLayout";
import CRMContact360Panel from "@/components/founder/crm/CRMContact360Panel";
import CustomerContinuityTimeline from "@/components/founder/customer/CustomerContinuityTimeline";
import CRMContactSalesPanel from "@/components/founder/customer-sales/CRMContactSalesPanel";
import CRMContactUpgradePanel from "@/components/founder/customer-upgrades/CRMContactUpgradePanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createDecisionFromCrmContact } from "@/lib/lifecycleHandoffs";

type Contact = {
  id: string;
  email: string | null;
  name: string | null;
  company: string | null;
  role: string | null;
  status: string;
  source: string | null;
  assigned_business: string | null;
  assigned_inbox_id: string | null;
  conversation_active: boolean;
  last_contacted_at: string | null;
  last_replied_at: string | null;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  apollo_person_id?: string | null;
  apollo_organization_id?: string | null;
  email_verified_status?: string | null;
  sendable_status?: string | null;
  apollo_enrichment_status?: string | null;
  tags?: string[] | null;
  notes?: string | null;
  data_source?: string | null;
  source_platform?: string | null;
  source_record_id?: string | null;
  compliance_status?: string | null;
  country?: string | null;
  seniority?: string | null;
};

const STATUSES = ["NEW", "CONTACTED", "ENGAGED", "QUALIFIED", "CLIENT", "SUPPLIER", "DO_NOT_CONTACT"];

function emailReadiness(c: Contact): { label: string; detail: string; tone: "ok" | "warn" | "muted" } {
  const v = (c.email_verified_status ?? "").toLowerCase();
  if (v === "reveal_required") return { label: "Reveal required", detail: "Apollo person known, work email not revealed. No sending possible.", tone: "warn" };
  if (!c.email) return { label: "No email on file", detail: "No usable email address stored for this contact.", tone: "muted" };
  if (v === "" || v === "verified" || v === "exact" || v === "valid") return { label: "Exact / verified email", detail: c.email, tone: "ok" };
  return { label: v.replace(/_/g, " "), detail: c.email, tone: "warn" };
}

const Info = ({ label, value }: { label: string; value?: string | null }) => (
  <p><span className="text-muted-foreground/70">{label}:</span> {value || "—"}</p>
);


const CRMContactDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [contact, setContact] = useState<Contact | null>(null);
  const [comms, setComms] = useState<{ id: string; channel: string; direction: string; message: string; timestamp: string; ai_generated: boolean }[]>([]);
  const [events, setEvents] = useState<{ id: string; event_type: string; timestamp: string; email_id: string }[]>([]);
  const [inboxes, setInboxes] = useState<{ id: string; email_address: string; business_name: string }[]>([]);
  const [check, setCheck] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creatingDecision, setCreatingDecision] = useState(false);

  async function generateProposal() {
    if (!contact) return;
    if (contact.status !== "QUALIFIED") {
      toast.error("Contact must be QUALIFIED to generate a proposal.");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("internal-proposal-generate", {
        body: { contact_id: contact.id, include_demo: true },
      });
      if (error) throw error;
      const proposalId = (data as { proposal?: { id?: string } })?.proposal?.id;
      if (!proposalId) throw new Error("No proposal returned");
      toast.success("Proposal generated");
      navigate(`/founder/internal-proposals/${proposalId}`);
    } catch (e) {
      toast.error((e as Error).message || "Failed to generate proposal");
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    void load();
  }, [id]);

  async function load() {
    setLoading(true);
    const [c, m, e, ib] = await Promise.all([
      supabase.from("contacts").select("*").eq("id", id!).maybeSingle(),
      supabase.from("communications").select("*").eq("contact_id", id!).order("timestamp", { ascending: false }).limit(50),
      supabase.from("email_events").select("*").eq("contact_id", id!).order("timestamp", { ascending: false }).limit(50),
      supabase.from("inboxes").select("id, email_address, business_name").eq("active", true),
    ]);
    setContact(c.data as Contact);
    setComms((m.data as typeof comms) ?? []);
    setEvents((e.data as typeof events) ?? []);
    setInboxes((ib.data as typeof inboxes) ?? []);
    setLoading(false);
    if (c.data) await runCheck(c.data.id);
  }

  async function runCheck(contactId: string) {
    const { data, error } = await supabase.rpc("check_outreach_allowed", { _contact_id: contactId });
    if (!error && data) setCheck(data as { allowed: boolean; reason?: string });
  }

  async function updateContact(patch: Partial<Contact>) {
    if (!contact) return;
    const { error } = await supabase.from("contacts").update(patch as never).eq("id", contact.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Updated");
    void load();
  }

  if (loading || !contact) {
    return (
      <FounderLayout>
        <p className="text-muted-foreground">Loading…</p>
      </FounderLayout>
    );
  }

  const readiness = emailReadiness(contact);

  return (
    <FounderLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <Link to="/founder/crm/contacts" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back to contacts
        </Link>

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {contact.name || [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.email || "Unnamed contact"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{contact.email || "No email on file"} · {contact.company || "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/founder/outreach")} title="Campaign execution lives in Outreach, not on the master contact record">
              <Send className="h-4 w-4 mr-1" /> Open Outreach
            </Button>

            <Button
              size="sm"
              onClick={generateProposal}
              disabled={generating || contact.status !== "QUALIFIED"}
              title={contact.status !== "QUALIFIED" ? "Contact must be QUALIFIED" : "Generate AI proposal + demo"}
            >
              {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
              Generate Proposal
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={creatingDecision}
              title="Creates a pending founder decision item rooted in this CRM contact. Internal only."
              onClick={async () => {
                setCreatingDecision(true);
                try {
                  await createDecisionFromCrmContact({
                    contact_id: contact.id,
                    contact_label: contact.name || contact.email,
                    decision_title: `CRM follow-up: ${contact.name || contact.email}`,
                    decision_summary: `Triggered from CRM contact ${contact.email} (${contact.company || "—"}, status ${contact.status}). Founder review required.`,
                  });
                  toast.success("Decision item drafted — open Founder Decisions to review.");
                } catch (e: any) {
                  toast.error(e?.message ?? "Could not draft decision");
                } finally {
                  setCreatingDecision(false);
                }
              }}
            >
              {creatingDecision ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Gavel className="h-4 w-4 mr-1" />}
              Create decision item
            </Button>
            <Card className={`tech-card ${check?.allowed ? "border-primary/40" : "border-destructive/40"}`}>
              <CardContent className="p-3 flex items-center gap-2 text-sm">
                {check?.allowed ? <ShieldCheck className="h-4 w-4 text-primary" /> : <ShieldAlert className="h-4 w-4 text-destructive" />}
                <span>
                  {check?.allowed ? "Outreach allowed" : `Blocked: ${check?.reason ?? "—"}`}
                </span>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Status</CardTitle></CardHeader>
            <CardContent>
              <Select value={contact.status} onValueChange={(v) => updateContact({ status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="mt-3 text-xs text-muted-foreground space-y-1">
                <p>Conversation: {contact.conversation_active ? <Badge>Active</Badge> : <span>Idle</span>}</p>
                <p>Last contacted: {contact.last_contacted_at ? new Date(contact.last_contacted_at).toLocaleString() : "—"}</p>
                <p>Last reply: {contact.last_replied_at ? new Date(contact.last_replied_at).toLocaleString() : "—"}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Assigned inbox</CardTitle></CardHeader>
            <CardContent>
              <Select
                value={contact.assigned_inbox_id ?? "none"}
                onValueChange={(v) => updateContact({ assigned_inbox_id: v === "none" ? null : v })}
              >
                <SelectTrigger><SelectValue placeholder="Select inbox" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {inboxes.map((i) => (
                    <SelectItem key={i.id} value={i.id}>{i.email_address} ({i.business_name || "—"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Inbox is locked once set. Founder override only.
              </p>
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Identity</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <Info label="Role / title" value={contact.role} />
              <Info label="Seniority" value={contact.seniority} />
              <Info label="Phone" value={contact.phone} />
              <Info label="Country" value={contact.country} />
              <Info label="LinkedIn" value={contact.linkedin_url} />
              <Info label="Source" value={contact.source} />
              <Info label="Business" value={contact.assigned_business} />
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className={`tech-card ${readiness.tone === "ok" ? "border-primary/40" : ""}`}>
            <CardHeader><CardTitle className="text-sm">Email readiness</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <Badge variant={readiness.tone === "ok" ? "default" : "outline"} className={readiness.tone === "warn" ? "text-yellow-300 border-yellow-300/40" : ""}>
                {readiness.label}
              </Badge>
              <p>{readiness.detail}</p>
              <Info label="Verified status" value={contact.email_verified_status} />
              <Info label="Sendable status" value={contact.sendable_status} />
              <Info label="Enrichment" value={contact.apollo_enrichment_status} />
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Provenance</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-1">
              <Info label="Data source" value={contact.data_source} />
              <Info label="Source platform" value={contact.source_platform} />
              <Info label="Source record" value={contact.source_record_id} />
              <Info label="Apollo person" value={contact.apollo_person_id} />
              <Info label="Apollo organisation" value={contact.apollo_organization_id} />
              <Info label="Compliance status" value={contact.compliance_status} />
            </CardContent>
          </Card>

          <Card className="tech-card">
            <CardHeader><CardTitle className="text-sm">Tags & notes</CardTitle></CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <div className="flex flex-wrap gap-1">
                {(contact.tags ?? []).length === 0 ? <span>No tags</span> : (contact.tags ?? []).map((t) => (
                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                ))}
              </div>
              <p className="whitespace-pre-wrap">{contact.notes || "No notes."}</p>
              <p className="text-[11px] text-muted-foreground/80">
                Campaign execution does not run from this master record. Sending is controlled through business_contact_relationships plus inbox and campaign controls in Outreach.
              </p>
            </CardContent>
          </Card>
        </div>


        <Tabs defaultValue="comms">
          <TabsList>
            <TabsTrigger value="comms">Communications ({comms.length})</TabsTrigger>
            <TabsTrigger value="events">Email events ({events.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="comms">
            <Card className="tech-card">
              <CardContent className="p-0">
                {comms.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No messages logged yet.</p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {comms.map((m) => (
                      <li key={m.id} className="p-4 text-sm">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span className="capitalize">{m.direction} · {m.channel}{m.ai_generated ? " · AI" : ""}</span>
                          <span>{new Date(m.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message || <em className="text-muted-foreground">(no content)</em>}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="events">
            <Card className="tech-card">
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">No email events yet.</p>
                ) : (
                  <ul className="divide-y divide-border/50">
                    {events.map((e) => (
                      <li key={e.id} className="p-3 text-sm flex justify-between items-center">
                        <div>
                          <Badge variant={e.event_type === "bounced" ? "destructive" : "outline"}>{e.event_type}</Badge>
                          {e.email_id && <span className="ml-2 text-xs text-muted-foreground">{e.email_id}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(e.timestamp).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => runCheck(contact.id)}>Re-run sanity check</Button>
        </div>

        <CRMContact360Panel contactId={contact.id} />
        <CRMContactSalesPanel contactId={contact.id} />
        <CRMContactUpgradePanel contactId={contact.id} />
        <CustomerContinuityTimeline contactId={contact.id} />
      </div>
    </FounderLayout>
  );
};

export default CRMContactDetail;