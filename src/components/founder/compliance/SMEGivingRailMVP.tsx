import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ClipboardCopy, HandCoins, ShieldCheck, TriangleAlert } from "lucide-react";

type GivingBasis = "fixed_per_sale" | "percentage_of_sale" | "percentage_of_revenue" | "fixed_campaign";

type Draft = {
  businessName: string;
  companyNumber: string;
  charityName: string;
  charityNumber: string;
  eligibleOffer: string;
  basis: GivingBasis;
  amount: string;
  saleCount: string;
  eligibleSalesValue: string;
  startDate: string;
  endDate: string;
  notes: string;
};

const STORAGE_KEY = "liftor:ghat-sme-giving-rail:v1";

const DEFAULT_DRAFT: Draft = {
  businessName: "",
  companyNumber: "",
  charityName: "Global Health Access Trust",
  charityNumber: "",
  eligibleOffer: "eligible sale",
  basis: "fixed_per_sale",
  amount: "1.00",
  saleCount: "100",
  eligibleSalesValue: "5000",
  startDate: "",
  endDate: "",
  notes: "",
};

const pounds = (value: number) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(Number.isFinite(value) ? value : 0);

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const wordingFor = (draft: Draft) => {
  const amount = numberValue(draft.amount);
  const charity = draft.charityName.trim() || "the named charity";
  const offer = draft.eligibleOffer.trim() || "eligible sale";
  const dates = draft.startDate && draft.endDate ? ` between ${draft.startDate} and ${draft.endDate}` : " during the campaign period";

  if (draft.basis === "fixed_per_sale") {
    return `${pounds(amount)} from every ${offer}${dates} will be donated to ${charity}.`;
  }
  if (draft.basis === "percentage_of_sale") {
    return `${amount}% of the sale price from every ${offer}${dates} will be donated to ${charity}.`;
  }
  if (draft.basis === "percentage_of_revenue") {
    return `${amount}% of eligible sales revenue generated${dates} will be donated to ${charity}.`;
  }
  return `${pounds(amount)} will be donated to ${charity} from this campaign${dates}.`;
};

export default function SMEGivingRailMVP() {
  const [draft, setDraft] = useState<Draft>(() => {
    if (typeof window === "undefined") return DEFAULT_DRAFT;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved ? { ...DEFAULT_DRAFT, ...JSON.parse(saved) } : DEFAULT_DRAFT;
    } catch {
      return DEFAULT_DRAFT;
    }
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [draft]);

  const update = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const calculatedDonation = useMemo(() => {
    const amount = numberValue(draft.amount);
    const sales = numberValue(draft.saleCount);
    const value = numberValue(draft.eligibleSalesValue);
    if (draft.basis === "fixed_per_sale") return amount * sales;
    if (draft.basis === "percentage_of_sale" || draft.basis === "percentage_of_revenue") return value * (amount / 100);
    return amount;
  }, [draft.amount, draft.basis, draft.eligibleSalesValue, draft.saleCount]);

  const publicStatement = useMemo(() => wordingFor(draft), [draft]);

  const checks = [
    { label: "Business identified", ok: !!draft.businessName.trim() },
    { label: "Charity identified", ok: !!draft.charityName.trim() && !!draft.charityNumber.trim() },
    { label: "Donation basis is objectively calculable", ok: numberValue(draft.amount) > 0 },
    { label: "Eligible sale / revenue scope defined", ok: !!draft.eligibleOffer.trim() },
    { label: "Campaign dates defined", ok: !!draft.startDate && !!draft.endDate },
  ];
  const readyForAgreementReview = checks.every((check) => check.ok);

  const copyStatement = async () => {
    await navigator.clipboard.writeText(publicStatement);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <HandCoins className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">SME sales-linked giving rail — MVP</h2>
          </div>
          <p className="mt-1 max-w-3xl text-xs text-muted-foreground">
            Founder-only prototype for turning an SME sales-linked giving promise into a clear calculation, public statement and CPA readiness pack. No money moves through Liftor and no campaign is activated here.
          </p>
        </div>
        <Badge variant={readyForAgreementReview ? "default" : "outline"}>
          {readyForAgreementReview ? "Ready for agreement review" : "Draft / incomplete"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">1. Business + charity</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Business name</Label>
              <Input value={draft.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Example SME Ltd" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Company number</Label>
              <Input value={draft.companyNumber} onChange={(e) => update("companyNumber", e.target.value)} placeholder="12345678" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Charity name</Label>
              <Input value={draft.charityName} onChange={(e) => update("charityName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Charity number</Label>
              <Input value={draft.charityNumber} onChange={(e) => update("charityNumber", e.target.value)} placeholder="Registered charity number" />
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">2. Campaign rule</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs">Eligible product / service / sale</Label>
              <Input value={draft.eligibleOffer} onChange={(e) => update("eligibleOffer", e.target.value)} placeholder="e.g. subscription sold" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Giving basis</Label>
              <Select value={draft.basis} onValueChange={(value) => update("basis", value as GivingBasis)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_per_sale">Fixed £ per sale</SelectItem>
                  <SelectItem value="percentage_of_sale">% of sale price</SelectItem>
                  <SelectItem value="percentage_of_revenue">% of eligible revenue</SelectItem>
                  <SelectItem value="fixed_campaign">Fixed campaign amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{draft.basis.includes("percentage") ? "Percentage" : "Amount (£)"}</Label>
              <Input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => update("amount", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Campaign start</Label>
              <Input type="date" value={draft.startDate} onChange={(e) => update("startDate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Campaign end</Label>
              <Input type="date" value={draft.endDate} onChange={(e) => update("endDate", e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="tech-card xl:col-span-2">
          <CardHeader><CardTitle className="text-sm">3. Donation calculator</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Eligible sales count</Label>
                <Input type="number" min="0" value={draft.saleCount} onChange={(e) => update("saleCount", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eligible sales / revenue value (£)</Label>
                <Input type="number" min="0" step="0.01" value={draft.eligibleSalesValue} onChange={(e) => update("eligibleSalesValue", e.target.value)} />
              </div>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Calculated charity amount</div>
              <div className="mt-1 text-3xl font-semibold">{pounds(calculatedDonation)}</div>
              <div className="mt-1 text-xs text-muted-foreground">Calculation only. Payment remains outside Liftor in this MVP.</div>
            </div>
          </CardContent>
        </Card>

        <Card className="tech-card">
          <CardHeader><CardTitle className="text-sm">CPA readiness checks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checks.map((check) => (
              <div key={check.label} className="flex items-center gap-2 text-xs">
                {check.ok ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <TriangleAlert className="h-4 w-4 text-yellow-300" />}
                <span>{check.label}</span>
              </div>
            ))}
            <div className="pt-2 text-[11px] text-muted-foreground">
              A written commercial participation agreement and adviser-approved template remain required before a live campaign is enabled.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="tech-card">
        <CardHeader><CardTitle className="text-sm">4. Public campaign statement generator</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-lg border border-border/60 bg-secondary/20 p-4 text-sm leading-relaxed">
            {publicStatement}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={copyStatement}>
              <ClipboardCopy className="mr-2 h-4 w-4" /> {copied ? "Copied" : "Copy statement"}
            </Button>
            <Badge variant="outline">Generated from the campaign rule</Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="tech-card">
        <CardHeader><CardTitle className="text-sm">5. Agreement handoff pack</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">Business:</span> {draft.businessName || "—"} {draft.companyNumber ? `(${draft.companyNumber})` : ""}</div>
            <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">Charity:</span> {draft.charityName || "—"} {draft.charityNumber ? `(${draft.charityNumber})` : ""}</div>
            <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">Campaign:</span> {draft.eligibleOffer || "—"}</div>
            <div className="rounded border border-border/50 p-3"><span className="text-muted-foreground">Expected donation:</span> {pounds(calculatedDonation)}</div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Internal notes</Label>
            <Textarea value={draft.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Questions for charity / adviser, exclusions, evidence source, approval notes…" />
          </div>
          <div className="flex items-start gap-2 rounded border border-border/50 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>This MVP deliberately stops before signature, payment, public activation or external outreach. It prepares the facts needed for a standard CPA workflow without putting Liftor in the flow of charitable funds.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
