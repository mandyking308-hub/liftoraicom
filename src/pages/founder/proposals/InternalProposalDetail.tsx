import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Send, CheckCircle2, XCircle, Monitor, Copy } from "lucide-react";

export default function InternalProposalDetail() {
  const { id } = useParams();
  const [p, setP] = useState<any>(null);
  const [contact, setContact] = useState<any>(null);
  const [demo, setDemo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: prop } = await supabase.from("internal_proposals").select("*").eq("id", id!).maybeSingle();
    setP(prop);
    if (prop) {
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from("contacts").select("*").eq("id", prop.contact_id).maybeSingle(),
        supabase.from("demo_access").select("*").eq("proposal_id", prop.id).maybeSingle(),
      ]);
      setContact(c); setDemo(d);
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const send = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("internal-proposal-send", { body: { proposal_id: id } });
    setBusy(false);
    if (error || (data as any)?.error) { toast({ title: "Send failed", description: error?.message || (data as any)?.error, variant: "destructive" }); return; }
    toast({ title: "Proposal sent", description: "Logged in communications." });
    load();
  };

  const setStatus = async (status: "accepted" | "rejected") => {
    setBusy(true);
    if (status === "accepted") {
      const { data } = await supabase.rpc("accept_proposal_by_token", { _token: p.accept_token });
      toast({ title: "Marked accepted", description: `Deal: ${(data as any)?.deal_id || "created"}` });
    } else {
      await supabase.from("internal_proposals").update({
        status: "rejected", rejected_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", id!);
      toast({ title: `Marked ${status}` });
    }
    setBusy(false);
    load();
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast({ title: "Copied" }); };

  if (loading) return <FounderLayout><div className="p-6">Loading…</div></FounderLayout>;
  if (!p) return <FounderLayout><div className="p-6">Not found</div></FounderLayout>;

  const base = window.location.origin;
  const viewUrl = `${base}/proposals/view/${p.view_token}`;
  const acceptUrl = `${base}/proposals/accept/${p.accept_token}`;
  const demoUrl = demo ? `${base}/demo/${demo.demo_token}` : null;

  return (
    <FounderLayout>
      <div className="space-y-6 max-w-5xl">
        <Link to="/founder/internal-proposals" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Back to proposals
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{p.title}</h1>
              <Badge>{p.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {contact?.name} · {contact?.company} · {contact?.email}
            </p>
          </div>
          <div className="flex gap-2">
            {p.status === "draft" && <Button onClick={send} disabled={busy}><Send size={14} className="mr-2" /> Send</Button>}
            {["sent","viewed"].includes(p.status) && (
              <>
                <Button onClick={() => setStatus("accepted")} disabled={busy}><CheckCircle2 size={14} className="mr-2" /> Mark accepted</Button>
                <Button variant="outline" onClick={() => setStatus("rejected")} disabled={busy}><XCircle size={14} className="mr-2" /> Reject</Button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <LinkCard label="Public proposal" url={viewUrl} onCopy={() => copy(viewUrl)} />
          <LinkCard label="Accept link" url={acceptUrl} onCopy={() => copy(acceptUrl)} />
          {demoUrl && <LinkCard label="Demo access" url={demoUrl} onCopy={() => copy(demoUrl)} icon={<Monitor size={14} />} />}
        </div>

        <Card className="tech-card p-6 space-y-4">
          <Section title="Solution">{p.suggested_solution}</Section>
          <Section title="Scope">{p.estimated_scope}</Section>
          <Section title="Timeline">{p.estimated_timeline}</Section>
          <Section title="Investment">{p.estimated_cost_range}</Section>
          <div>
            <h3 className="text-sm font-semibold mb-2">Cost Breakdown</h3>
            <div className="space-y-1 text-sm">
              {(p.estimated_cost_breakdown || []).map((b: any, i: number) => (
                <div key={i} className="flex justify-between border-b border-border/30 py-1.5">
                  <span className="text-muted-foreground">{b.category}</span><span>{b.estimate}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Architecture</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {(p.architecture_components || []).map((c: any, i: number) => (
                <div key={i} className="p-2 border border-border/50 rounded text-sm">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.type}</div>
                </div>
              ))}
            </div>
          </div>
          <Section title="ROI">{p.estimated_roi_summary}</Section>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <Mini label="Annual savings" value={p.estimated_annual_savings} />
            <Mini label="ROI period" value={p.estimated_roi_period} />
            <Mini label="Productivity gain" value={p.estimated_productivity_gain} />
          </div>
        </Card>

        {demo && (
          <Card className="tech-card p-4">
            <h3 className="font-semibold flex items-center gap-2"><Monitor size={16} /> Demo Access</h3>
            <div className="text-xs text-muted-foreground mt-1">
              Status: <Badge variant="outline">{demo.status}</Badge> · Accesses: {demo.access_count} · Expires {new Date(demo.expires_at).toLocaleDateString()} {demo.high_intent && <Badge className="ml-2 bg-orange-500/15 text-orange-400">HIGH INTENT</Badge>}
            </div>
          </Card>
        )}
      </div>
    </FounderLayout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div><h3 className="text-sm font-semibold mb-1">{title}</h3><p className="text-sm text-muted-foreground">{children}</p></div>);
}
function Mini({ label, value }: { label: string; value: string }) {
  return (<div className="p-3 border border-border/50 rounded"><div className="text-xs text-muted-foreground">{label}</div><div className="font-medium">{value}</div></div>);
}
function LinkCard({ label, url, onCopy, icon }: { label: string; url: string; onCopy: () => void; icon?: React.ReactNode }) {
  return (
    <Card className="tech-card p-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">{icon} {label}</div>
      <div className="flex items-center gap-2 mt-1">
        <code className="text-xs truncate flex-1">{url}</code>
        <Button size="sm" variant="ghost" onClick={onCopy}><Copy size={12} /></Button>
      </div>
    </Card>
  );
}