import { useState } from "react";
import { Link } from "react-router-dom";
import FounderLayout from "@/components/founder/FounderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Basics = {
  name: string;
  sells: string;
  customer: string;
  offer: string;
  problem: string;
  location: string;
  regulated: string;
  archetype: string;
};

type Evidence = {
  website: string;
  manuals: string;
  brand: string;
  pricing: string;
  customers: string;
  compliance: string;
};

const STEPS = ["Business shell", "Basics", "Evidence", "Dry-run readiness", "Confirm & save", "Next steps"];

function scoreReadiness(b: Basics, e: Evidence): { score: number; missing: string[]; risks: string[] } {
  const fields: [string, string][] = [
    ["Business name", b.name], ["What it sells", b.sells], ["Customer", b.customer],
    ["Offer", b.offer], ["Problem", b.problem], ["Location", b.location],
    ["Regulated?", b.regulated], ["Archetype", b.archetype],
    ["Website", e.website], ["Manuals / SOPs", e.manuals], ["Brand notes", e.brand],
    ["Pricing", e.pricing], ["Customer notes", e.customers], ["Compliance notes", e.compliance],
  ];
  const filled = fields.filter(([, v]) => v && v.trim().length > 1).length;
  const missing = fields.filter(([, v]) => !v || v.trim().length <= 1).map(([k]) => k);
  const risks: string[] = [];
  if (/health|clinic|medic|patient|nhs/i.test(`${b.sells} ${b.offer} ${b.regulated} ${b.archetype}`)) {
    risks.push("Healthcare signals detected — Healthcare Overlay remains BLOCKED until founder sign-off.");
  }
  if (/regulat|fca|gdpr|hipaa/i.test(`${b.regulated} ${e.compliance}`)) {
    risks.push("Regulated activity — review compliance loop before any external action.");
  }
  if (!e.website && !e.manuals) risks.push("No evidence sources supplied — knowledge gaps likely.");
  const score = Math.round((filled / fields.length) * 100);
  return { score, missing, risks };
}

export default function StartHereSetupBusiness() {
  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState<Basics>({
    name: "", sells: "", customer: "", offer: "", problem: "", location: "", regulated: "", archetype: "",
  });
  const [evidence, setEvidence] = useState<Evidence>({
    website: "", manuals: "", brand: "", pricing: "", customers: "", compliance: "",
  });
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [saved, setSaved] = useState(false);

  const readiness = scoreReadiness(basics, evidence);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const save = () => {
    if (confirmPhrase.trim().toUpperCase() !== "FOUNDER APPROVED") {
      toast.error("Type FOUNDER APPROVED to save (draft only, no external action).");
      return;
    }
    try {
      const key = `liftor:start-here:draft-business:${basics.name || "unnamed"}`;
      localStorage.setItem(key, JSON.stringify({
        basics, evidence, status: "draft", liveStatus: "not_live", savedAt: new Date().toISOString(),
      }));
      setSaved(true);
      toast.success("Draft saved locally. No external action triggered.");
      next();
    } catch (e) {
      toast.error("Could not save draft.");
    }
  };

  return (
    <FounderLayout>
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">First-Run Business Setup Wizard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Founder-only. Draft status by default. No external action, no emails, no provider activation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {STEPS.map((label, i) => (
            <div key={label} className={`px-2 py-1 rounded ${i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {i + 1}. {label}
            </div>
          ))}
        </div>

        {step === 0 && (
          <Card><CardHeader><CardTitle>Step 1 · Business shell</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Draft business name</Label>
                <Input value={basics.name} onChange={(e) => setBasics({ ...basics, name: e.target.value })} placeholder="e.g. Acme Pilates Studio" />
              </div>
              <p className="text-xs text-muted-foreground">Status defaults to <strong>draft / not live</strong>. You can rename or replace later.</p>
            </CardContent>
          </Card>
        )}

        {step === 1 && (
          <Card><CardHeader><CardTitle>Step 2 · Basics</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[
                ["What does it sell?", "sells"],
                ["Who is the customer?", "customer"],
                ["What is the offer?", "offer"],
                ["What problem does it solve?", "problem"],
                ["Where will it operate?", "location"],
                ["Is it regulated? (yes/no + which regs)", "regulated"],
                ["Archetype (marketplace/SaaS/service/ecom/content/consultancy/healthcare)", "archetype"],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Textarea rows={2} value={(basics as any)[key]} onChange={(e) => setBasics({ ...basics, [key]: e.target.value })} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card><CardHeader><CardTitle>Step 3 · Evidence / source material</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Website URL</Label><Input value={evidence.website} onChange={(e) => setEvidence({ ...evidence, website: e.target.value })} /></div>
              {[
                ["Manuals / notes / policies / SOPs", "manuals"],
                ["Brand notes", "brand"],
                ["Pricing / offer notes", "pricing"],
                ["Customer notes", "customers"],
                ["Compliance notes", "compliance"],
              ].map(([label, key]) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Textarea rows={3} value={(evidence as any)[key]} onChange={(e) => setEvidence({ ...evidence, [key]: e.target.value })} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card><CardHeader><CardTitle>Step 4 · Dry-run readiness</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="text-lg">Readiness score: <strong>{readiness.score}%</strong></div>
              <div>
                <div className="text-sm font-medium mb-1">Missing context</div>
                {readiness.missing.length === 0 ? <div className="text-sm text-muted-foreground">None.</div> : (
                  <ul className="list-disc pl-6 text-sm text-muted-foreground">{readiness.missing.map((m) => <li key={m}>{m}</li>)}</ul>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Risk warnings</div>
                {readiness.risks.length === 0 ? <div className="text-sm text-muted-foreground">No risk flags.</div> : (
                  <ul className="list-disc pl-6 text-sm text-amber-500">{readiness.risks.map((r) => <li key={r}>{r}</li>)}</ul>
                )}
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Suggested next action</div>
                <p className="text-sm text-muted-foreground">
                  {readiness.score < 60 ? "Fill in missing context before saving." : "Proceed to confirm & save as a draft business."}
                </p>
              </div>
              <div>
                <div className="text-sm font-medium mb-1">What will be created if saved</div>
                <ul className="list-disc pl-6 text-sm text-muted-foreground">
                  <li>Local draft business shell (status: draft, live: not_live)</li>
                  <li>Knowledge notes attached to this draft</li>
                  <li>No external accounts, no emails, no provider activation</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card><CardHeader><CardTitle>Step 5 · Confirm & save</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Type <code>FOUNDER APPROVED</code> to save this draft. Nothing external will happen.</p>
              <Input value={confirmPhrase} onChange={(e) => setConfirmPhrase(e.target.value)} placeholder="FOUNDER APPROVED" />
              <Button onClick={save}>Save founder-approved draft</Button>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card><CardHeader><CardTitle>Step 6 · Next steps</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {saved && <p className="text-sm text-emerald-500">Draft saved. Status: draft / not_live.</p>}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ["Command Centre", "/founder/command-centre"],
                  ["Business Onboarding Factory", "/founder/business-onboarding-factory"],
                  ["Starter Pack Materialiser", "/founder/starter-pack-materialiser"],
                  ["External Activation Readiness", "/founder/business-activation"],
                  ["Monday Readiness", "/founder/monday-readiness"],
                  ["Finance Hub", "/founder/command-centre"],
                  ["Marketing Hub", "/founder/campaign-factory"],
                  ["Operating Loops", "/founder/release-workflow"],
                  ["Healthcare Overlay (if regulated)", "/founder/healthcare-overlay"],
                  ["Data Room", "/founder/data-room"],
                  ["Buyer Warm-Up / Portfolio Exit", "/founder/founder-led-buyer-market"],
                ].map(([label, to]) => (
                  <Button key={to} asChild variant="outline" size="sm" className="justify-start">
                    <Link to={to}>{label}</Link>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={back} disabled={step === 0}>Back</Button>
          {step < STEPS.length - 1 && step !== 4 && <Button onClick={next}>Next</Button>}
        </div>
      </div>
    </FounderLayout>
  );
}