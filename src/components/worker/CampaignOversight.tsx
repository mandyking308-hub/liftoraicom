import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function CampaignOversight({ workerId }: { workerId: string }) {
  const [plans, setPlans] = useState<any[]>([]);
  const [opChecks, setOpChecks] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [status, setStatus] = useState("reviewed_ok");
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState("");
  const [location, setLocation] = useState("Dubai");

  const reload = async () => {
    const { data: p } = await (supabase as any)
      .from("business_campaign_plans").select("*")
      .eq("assigned_oversight_id", workerId)
      .order("created_at", { ascending: false });
    setPlans(p ?? []);
    if (p && p.length) {
      const ids = p.map((x: any) => x.id);
      const { data: oc } = await (supabase as any).from("campaign_operator_checks").select("*").in("business_campaign_plan_id", ids);
      setOpChecks(oc ?? []);
    }
  };
  useEffect(() => { reload(); }, [workerId]);

  const submitReview = async () => {
    if (!active) return;
    await (supabase as any).from("campaign_oversight_checks").insert({
      business_campaign_plan_id: active.id,
      reviewer_id: workerId,
      review_status: status,
      review_notes: notes || null,
      minutes_spent: minutes ? parseInt(minutes, 10) : null,
      location_basis: location || null,
    });
    if (status === "reviewed_ok") {
      await (supabase as any).from("business_campaign_plans").update({ status: "oversight_reviewed" }).eq("id", active.id);
    }
    setNotes(""); setMinutes("");
    toast.success("Review recorded");
    reload();
  };

  return (
    <Card className="p-4 mt-6">
      <h2 className="font-semibold mb-3">Campaign Oversight</h2>
      {plans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No campaign plans assigned for oversight.</p>
      ) : (
        <div className="grid md:grid-cols-[1fr,1.5fr] gap-4">
          <ul className="space-y-2">
            {plans.map((p) => (
              <li key={p.id}>
                <button onClick={() => setActive(p)} className={`w-full text-left p-3 rounded-lg border ${active?.id === p.id ? "border-primary bg-primary/5" : "border-border/50"}`}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium text-sm">{p.business_name}</span>
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <div>
            {!active ? <p className="text-sm text-muted-foreground">Select a plan to review.</p> : (
              <div className="space-y-3">
                <div className="text-xs">
                  <div className="font-semibold mb-1">Operator check log</div>
                  {opChecks.filter((c) => c.business_campaign_plan_id === active.id).length === 0
                    ? <p className="text-muted-foreground">No operator checks yet.</p>
                    : opChecks.filter((c) => c.business_campaign_plan_id === active.id).map((c) => (
                        <div key={c.id} className="flex justify-between border-b border-border/30 py-1">
                          <span>{c.check_type}</span>
                          <Badge variant="outline">{c.check_status}</Badge>
                        </div>
                      ))}
                </div>
                <div className="space-y-2 pt-2 border-t border-border/40">
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["reviewed_ok", "reviewed_issue", "escalated", "not_reviewed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Textarea rows={3} placeholder="Review notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  <div className="flex gap-2">
                    <Input type="number" placeholder="Minutes" value={minutes} onChange={(e) => setMinutes(e.target.value)} className="w-32" />
                    <Input placeholder="Location basis" value={location} onChange={(e) => setLocation(e.target.value)} />
                  </div>
                  <Button size="sm" variant="glow" onClick={submitReview}>Submit review</Button>
                </div>
                <p className="text-[10px] text-muted-foreground">You cannot edit campaign copy, send, publish, export, or access founder routes or secrets.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}