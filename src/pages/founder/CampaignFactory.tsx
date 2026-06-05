import { useEffect, useMemo, useState } from "react";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  approvePack, assignPlanRoles, blockAllExternalActions, generateMonthlyBatch, parkPlan,
} from "@/lib/campaignFactoryEngine";

function StatusBadge({ status }: { status: string }) {
  const tone: Record<string, string> = {
    draft: "bg-muted text-muted-foreground",
    generated: "bg-secondary text-secondary-foreground",
    operator_prepared: "bg-blue-500/15 text-blue-300",
    oversight_reviewed: "bg-amber-500/15 text-amber-300",
    founder_approved: "bg-emerald-500/15 text-emerald-300",
    waiting_founder: "bg-amber-500/15 text-amber-300",
    approved: "bg-emerald-500/15 text-emerald-300",
    parked: "bg-zinc-500/15 text-zinc-300",
    rejected: "bg-destructive/15 text-destructive",
    changes_requested: "bg-orange-500/15 text-orange-300",
  };
  return <Badge variant="outline" className={tone[status] ?? ""}>{status.replace(/_/g, " ")}</Badge>;
}

export default function CampaignFactory() {
  const { user } = useAuth();
  const [batches, setBatches] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [social, setSocial] = useState<any[]>([]);
  const [outreach, setOutreach] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [opChecks, setOpChecks] = useState<any[]>([]);
  const [ovChecks, setOvChecks] = useState<any[]>([]);
  const [workers, setWorkers] = useState<any[]>([]);
  const [monthStart, setMonthStart] = useState(() => {
    const d = new Date(); d.setUTCDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [seedText, setSeedText] = useState("");

  const reload = async () => {
    const [b, p, s, o, pk, oc, ov, w] = await Promise.all([
      (supabase as any).from("campaign_factory_batches").select("*").order("batch_month", { ascending: false }),
      (supabase as any).from("business_campaign_plans").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("social_campaign_drafts").select("*"),
      (supabase as any).from("outreach_campaign_drafts").select("*"),
      (supabase as any).from("campaign_approval_packs").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("campaign_operator_checks").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("campaign_oversight_checks").select("*").order("created_at", { ascending: false }),
      (supabase as any).from("worker_profiles").select("*").eq("status", "active"),
    ]);
    setBatches(b.data ?? []); setPlans(p.data ?? []); setSocial(s.data ?? []);
    setOutreach(o.data ?? []); setPacks(pk.data ?? []); setOpChecks(oc.data ?? []);
    setOvChecks(ov.data ?? []); setWorkers(w.data ?? []);
  };

  useEffect(() => { reload(); }, []);

  const currentBatch = batches[0] ?? null;
  const currentPlans = useMemo(
    () => currentBatch ? plans.filter((p) => p.batch_id === currentBatch.id) : [],
    [plans, currentBatch],
  );

  const operators = workers.filter((w) => w.role === "technical_operator");
  const reviewers = workers.filter((w) => w.role === "dubai_oversight" || w.role === "professional_reviewer");

  const handleGenerate = async () => {
    let businesses;
    try {
      businesses = seedText.trim()
        ? seedText.split("\n").filter(Boolean).map((line) => {
            const [name, target, offer] = line.split("|").map((s) => s?.trim());
            return { business_name: name, target_customer: target ?? null, offer: offer ?? null };
          })
        : [];
    } catch (e) { toast.error("Invalid seed list"); return; }
    if (!businesses.length) { toast.error("Add at least one business: 'Name | Target | Offer'"); return; }
    try {
      await generateMonthlyBatch({ monthStart, businesses, createdByUserId: user?.id ?? null });
      toast.success(`Generated batch for ${businesses.length} business(es)`);
      setSeedText("");
      reload();
    } catch (e: any) { toast.error(e.message ?? "Generation failed"); }
  };

  return (
    <FounderLayout>
      <div className="p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">Portfolio Campaign Factory</h1>
          <p className="text-sm text-muted-foreground">Liftor prepares campaign work. Operator configures. Oversight reviews. Founder approves. External sending and publishing remain blocked.</p>
        </header>

        <Card className="p-5 space-y-4">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Generate monthly batch</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <Input type="date" value={monthStart} onChange={(e) => setMonthStart(e.target.value)} />
            <div className="md:col-span-2"><Textarea rows={3} value={seedText} onChange={(e) => setSeedText(e.target.value)} placeholder={"One business per line:\nLiftor AI | UK SaaS founders | AI ops platform\nVenture B | Ecommerce ops | Automation pack"} /></div>
          </div>
          <div><Button onClick={handleGenerate}>Generate monthly batch</Button></div>
        </Card>

        {!currentBatch && <Card className="p-10 text-center text-sm text-muted-foreground">No batches yet. Generate the first monthly batch above.</Card>}

        {currentBatch && (
          <Card className="p-5 space-y-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Current batch</div>
                <div className="text-lg font-semibold">{currentBatch.batch_name}</div>
              </div>
              <div className="flex gap-2 text-xs text-muted-foreground">
                <span>{currentBatch.total_businesses} businesses</span>
                <span>•</span>
                <span>{currentBatch.total_content_items} content items</span>
                <span>•</span>
                <StatusBadge status={currentBatch.status} />
              </div>
            </div>
          </Card>
        )}

        <Tabs defaultValue="plans">
          <TabsList>
            <TabsTrigger value="plans">Business plans ({currentPlans.length})</TabsTrigger>
            <TabsTrigger value="packs">Approval packs ({packs.filter((p) => p.status === "waiting_founder").length})</TabsTrigger>
            <TabsTrigger value="oversight">Operator/Oversight</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="space-y-3">
            {currentPlans.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">No plans in this batch yet.</Card>}
            {currentPlans.map((p) => {
              const ps = social.filter((s) => s.business_campaign_plan_id === p.id);
              const po = outreach.filter((o) => o.business_campaign_plan_id === p.id);
              const pk = packs.find((k) => k.business_campaign_plan_id === p.id);
              return (
                <Card key={p.id} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{p.business_name}</div>
                      <div className="text-xs text-muted-foreground">Theme: {p.campaign_theme ?? "—"} · Target: {p.target_customer ?? "—"}</div>
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground mb-1">Social drafts</div>
                      {ps.length === 0 ? <div className="text-muted-foreground">None</div> : ps.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-0.5">
                          <span>{s.platform}</span>
                          <span className="flex items-center gap-1">
                            <Badge variant="outline">{s.status}</Badge>
                            {s.external_publish_blocked && <Badge variant="outline" className="bg-destructive/10 text-destructive">publish blocked</Badge>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Outreach drafts</div>
                      {po.length === 0 ? <div className="text-muted-foreground">None</div> : po.map((o) => (
                        <div key={o.id} className="flex items-center justify-between py-0.5">
                          <span>{o.campaign_name}</span>
                          <span className="flex items-center gap-1">
                            <Badge variant="outline">{o.status}</Badge>
                            {o.external_send_blocked && <Badge variant="outline" className="bg-destructive/10 text-destructive">send blocked</Badge>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="text-muted-foreground mb-1">Approval pack</div>
                      {pk ? <StatusBadge status={pk.status} /> : <span className="text-muted-foreground">Not created</span>}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Select value={p.assigned_operator_id ?? ""} onValueChange={async (v) => { await assignPlanRoles(p.id, v || null, p.assigned_oversight_id ?? null); toast.success("Operator assigned"); reload(); }}>
                        <SelectTrigger><SelectValue placeholder="Assign operator" /></SelectTrigger>
                        <SelectContent>{operators.map((o) => (<SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>))}</SelectContent>
                      </Select>
                      <Select value={p.assigned_oversight_id ?? ""} onValueChange={async (v) => { await assignPlanRoles(p.id, p.assigned_operator_id ?? null, v || null); toast.success("Oversight assigned"); reload(); }}>
                        <SelectTrigger><SelectValue placeholder="Assign oversight" /></SelectTrigger>
                        <SelectContent>{reviewers.map((o) => (<SelectItem key={o.id} value={o.id}>{o.full_name}</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button size="sm" variant="outline" onClick={async () => { await blockAllExternalActions(p.id); toast.success("External actions blocked"); reload(); }}>Block external action</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await (supabase as any).from("business_campaign_plans").update({ status: "scheduled" }).eq("id", p.id); toast.success("Marked ready for scheduling"); reload(); }}>Mark ready for scheduling</Button>
                      <Button size="sm" variant="outline" onClick={async () => { await (supabase as any).from("business_campaign_plans").update({ status: "active" }).eq("id", p.id); toast.success("Marked ready for sending"); reload(); }}>Mark ready for sending</Button>
                      <Button size="sm" variant="ghost" onClick={async () => { await parkPlan(p.id); toast.success("Parked"); reload(); }}>Park</Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </TabsContent>

          <TabsContent value="packs" className="space-y-3">
            {packs.length === 0 && <Card className="p-10 text-center text-sm text-muted-foreground">No approval packs yet.</Card>}
            {packs.map((pk) => (
              <Card key={pk.id} className="p-5 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{pk.approval_pack_title}</div>
                    <div className="text-xs text-muted-foreground">{pk.approval_pack_summary}</div>
                  </div>
                  <StatusBadge status={pk.status} />
                </div>
                {pk.status === "waiting_founder" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => { await approvePack(pk.id, "approved"); toast.success("Approved"); reload(); }}>Approve</Button>
                    <Button size="sm" variant="outline" onClick={async () => { await approvePack(pk.id, "changes_requested"); toast.success("Changes requested"); reload(); }}>Request changes</Button>
                    <Button size="sm" variant="ghost" onClick={async () => { await approvePack(pk.id, "rejected"); toast("Rejected"); reload(); }}>Reject</Button>
                  </div>
                )}
                {pk.founder_decided_at && <div className="text-xs text-muted-foreground">Decided {new Date(pk.founder_decided_at).toLocaleString()}</div>}
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="oversight" className="space-y-3">
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-2">Operator checks ({opChecks.length})</h3>
              {opChecks.length === 0 ? <p className="text-sm text-muted-foreground">No operator checks logged.</p> : (
                <div className="space-y-1 text-xs">
                  {opChecks.slice(0, 20).map((c) => (
                    <div key={c.id} className="flex justify-between border-b border-border/30 py-1">
                      <span>{c.check_type}</span>
                      <span><Badge variant="outline">{c.check_status}</Badge></span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card className="p-5">
              <h3 className="text-sm font-semibold mb-2">Oversight reviews ({ovChecks.length})</h3>
              {ovChecks.length === 0 ? <p className="text-sm text-muted-foreground">No oversight reviews logged.</p> : (
                <div className="space-y-1 text-xs">
                  {ovChecks.slice(0, 20).map((c) => (
                    <div key={c.id} className="flex justify-between border-b border-border/30 py-1">
                      <span>{c.review_notes ?? "—"}</span>
                      <span><Badge variant="outline">{c.review_status}</Badge> · {c.minutes_spent ?? 0}m</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </FounderLayout>
  );
}