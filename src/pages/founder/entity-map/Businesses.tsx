import { useEffect, useState } from "react";
import { EMLayout, EMSection } from "./_shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchAssignments, fetchEntities, fetchPolicies, missingPoliciesForBusiness, type EntityAssignment, type LegalEntity, type PolicyAssignment } from "@/lib/entityMapEngine";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ASSIGNMENT_TYPES = ["owner", "operator", "billing_entity", "brand_owner", "ip_owner", "marketplace_operator", "service_provider"] as const;
const POLICY_TYPES = ["terms","privacy","refund","marketplace_terms","seller_terms","subscription_terms","cookie_policy","disclaimer"] as const;

export default function EMBusinesses() {
  const [entities, setEntities] = useState<LegalEntity[]>([]);
  const [assigns, setAssigns] = useState<EntityAssignment[]>([]);
  const [policies, setPolicies] = useState<PolicyAssignment[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [archetypeCode, setArchetypeCode] = useState("");
  const [legalEntityId, setLegalEntityId] = useState("");
  const [assignType, setAssignType] = useState<typeof ASSIGNMENT_TYPES[number]>("operator");
  const [notes, setNotes] = useState("");
  const [policyType, setPolicyType] = useState<typeof POLICY_TYPES[number]>("terms");
  const [policyUrl, setPolicyUrl] = useState("");
  const [policyStatus, setPolicyStatus] = useState<PolicyAssignment["policy_status"]>("draft");

  async function load() {
    const [e, a, p] = await Promise.all([fetchEntities(), fetchAssignments(), fetchPolicies()]);
    setEntities(e); setAssigns(a); setPolicies(p);
  }
  useEffect(() => { load().catch(() => {}); }, []);

  async function loadArchetype() {
    if (!businessId) return;
    const { data } = await supabase
      .from("business_archetype_assignments")
      .select("primary_archetype_id, business_archetypes:primary_archetype_id(archetype_code)")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const code = (data as any)?.business_archetypes?.archetype_code as string | undefined;
    if (code) { setArchetypeCode(code); toast.success(`Archetype: ${code}`); }
    else toast.error("No archetype assigned");
  }

  async function addAssignment() {
    if (!businessId || !legalEntityId) return toast.error("Business ID and entity required");
    const { error } = await supabase.from("business_entity_assignments").insert({
      business_id: businessId, legal_entity_id: legalEntityId, assignment_type: assignType, notes,
    });
    if (error) return toast.error(error.message);
    toast.success("Mapping added (internal)"); setNotes(""); load();
  }
  async function addPolicy() {
    if (!businessId) return toast.error("Business ID required");
    const { error } = await supabase.from("entity_policy_assignments").insert({
      business_id: businessId, legal_entity_id: legalEntityId || null,
      policy_type: policyType, policy_url: policyUrl || null, policy_status: policyStatus,
    });
    if (error) return toast.error(error.message);
    toast.success("Policy assignment saved"); setPolicyUrl(""); load();
  }
  async function confirmAssignment(id: string) {
    const { error } = await supabase.from("business_entity_assignments").update({ founder_confirmed: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Confirmed"); load();
  }

  const myAssignments = businessId ? assigns.filter(a => a.business_id === businessId) : assigns;
  const myPolicies = businessId ? policies.filter(p => p.business_id === businessId) : policies;
  const missing = businessId ? missingPoliciesForBusiness(businessId, archetypeCode, policies) : [];

  return (
    <EMLayout title="Business → entity mapping" subtitle="Map each business to a legal entity. Track assignment type, effective period, and policy coverage.">
      <EMSection title="Target business">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1 md:col-span-2"><Label>Business ID</Label><Input value={businessId} onChange={e => setBusinessId(e.target.value)} placeholder="00000000-..." /></div>
          <div className="flex items-end"><Button onClick={loadArchetype} size="sm" variant="outline" className="w-full">Load archetype</Button></div>
        </div>
        {archetypeCode && <p className="text-xs text-muted-foreground mt-2">Archetype: <Badge variant="outline">{archetypeCode}</Badge></p>}
        {missing.length > 0 && (
          <p className="text-xs text-yellow-400 mt-2">⚠ Missing required policies for {archetypeCode}: {missing.join(", ")}</p>
        )}
      </EMSection>

      <EMSection title="Add entity assignment">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1">
            <Label>Legal entity</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={legalEntityId} onChange={e => setLegalEntityId(e.target.value)}>
              <option value="">—</option>
              {entities.map(e => <option key={e.id} value={e.id}>{e.entity_name} ({e.jurisdiction})</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Assignment type</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={assignType} onChange={e => setAssignType(e.target.value as any)}>
              {ASSIGNMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1 md:col-span-3"><Label>Notes</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <div className="pt-3"><Button size="sm" onClick={addAssignment}>Add mapping</Button></div>
      </EMSection>

      <EMSection title="Add policy assignment" description="Track policy status; do not publish from here. Sales/publishing must surface warnings when status is missing / draft / review_required.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="space-y-1">
            <Label>Policy type</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={policyType} onChange={e => setPolicyType(e.target.value as any)}>
              {POLICY_TYPES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1"><Label>URL (internal reference)</Label><Input value={policyUrl} onChange={e => setPolicyUrl(e.target.value)} /></div>
          <div className="space-y-1">
            <Label>Status</Label>
            <select className="w-full bg-background border border-border rounded px-2 py-2 text-sm" value={policyStatus} onChange={e => setPolicyStatus(e.target.value as any)}>
              {["missing","draft","review_required","approved","published"].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="pt-3"><Button size="sm" onClick={addPolicy}>Save policy</Button></div>
      </EMSection>

      <EMSection title={`Assignments (${myAssignments.length})`}>
        {myAssignments.length === 0 ? <p className="text-sm text-muted-foreground">No mappings.</p> : (
          <div className="space-y-2">
            {myAssignments.map(a => {
              const ent = entities.find(e => e.id === a.legal_entity_id);
              return (
                <div key={a.id} className="border border-border/50 rounded p-2 text-xs flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{a.assignment_type}</Badge>
                  <span className="font-medium">{ent?.entity_name ?? "?"}</span>
                  <span className="text-muted-foreground">· business {a.business_id.slice(0, 8)}…</span>
                  {a.founder_confirmed
                    ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">Confirmed</Badge>
                    : <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => confirmAssignment(a.id)}>Founder confirm</Button>}
                  {a.notes && <span className="text-muted-foreground basis-full">{a.notes}</span>}
                </div>
              );
            })}
          </div>
        )}
      </EMSection>

      <EMSection title={`Policy coverage (${myPolicies.length})`}>
        {myPolicies.length === 0 ? <p className="text-sm text-muted-foreground">No policy records.</p> : (
          <div className="space-y-1 text-xs">
            {myPolicies.map(p => (
              <div key={p.id} className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{p.policy_type}</Badge>
                <Badge variant="outline" className={
                  p.policy_status === "published" || p.policy_status === "approved"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]"
                    : "bg-yellow-500/10 text-yellow-300 border-yellow-500/30 text-[10px]"
                }>{p.policy_status}</Badge>
                {p.policy_url && <a href={p.policy_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">link</a>}
              </div>
            ))}
          </div>
        )}
      </EMSection>
    </EMLayout>
  );
}