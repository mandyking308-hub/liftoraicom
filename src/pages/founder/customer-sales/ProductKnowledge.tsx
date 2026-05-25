import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, ChevronRight, Copy, ShieldAlert, ShieldCheck, AlertTriangle, FileText, BookOpen, MessageSquare, Tag, Shield, Lock, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { CSLayout, CSEmptyState, CSSection } from "./_shared";
import { scoreProduct, buildVoiceAgentBrief, type ProductRow, type OfferRow, type ObjectionRow, type KnowledgeRow, type CompletenessResult } from "./productKnowledgeScore";

const BAND_STYLES: Record<CompletenessResult["band"], string> = {
  ready: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  watch: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  missing: "border-orange-500/40 bg-orange-500/10 text-orange-300",
  do_not_sell: "border-destructive/50 bg-destructive/10 text-destructive",
};

function BandBadge({ r }: { r: CompletenessResult }) {
  return <Badge variant="outline" className={`text-[10px] ${BAND_STYLES[r.band]}`}>{r.band === "ready" ? "Knowledge Complete" : r.band === "watch" ? "Watch" : r.band === "missing" ? "Missing Critical Info" : "Do Not Sell"} · {r.score}/100</Badge>;
}

function YesNo({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-yellow-500/40 bg-yellow-500/10 text-yellow-300"}`}>
      {ok ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}{label}: {ok ? "yes" : "no"}
    </span>
  );
}

function ProductRowDetail({ product, offers, objections }: { product: ProductRow; offers: OfferRow[]; objections: ObjectionRow[] }) {
  const [open, setOpen] = useState(false);
  const result = useMemo(() => scoreProduct(product, offers, objections), [product, offers, objections]);
  const productOffers = offers.filter(o => o.product_id === product.id);
  const activeOffer = productOffers.find(o => o.active && o.offer_stage === "active") ?? productOffers.find(o => o.active);
  const productObjections = objections.filter(o => o.product_id === product.id && o.active !== false);

  const hasPrice = !!product.price_amount || (!!product.price_range_min && !!product.price_range_max) || product.pricing_type === "quote_required";
  const approvedClaimsCount = productOffers.reduce((n, o) => n + (Array.isArray(o.approved_claims) ? o.approved_claims.length : 0), 0);

  const brief = useMemo(() => buildVoiceAgentBrief(product, offers, objections, result), [product, offers, objections, result]);

  return (
    <div className="rounded-lg border border-border/60 bg-background/40">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-3 text-left hover:bg-background/60 transition">
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold truncate">{product.product_name}</span>
            <Badge variant="outline" className="text-[10px]">{product.product_type ?? "—"}</Badge>
            <BandBadge r={result} />
            {!product.active && <Badge variant="outline" className="text-[10px] border-muted-foreground/40 text-muted-foreground">inactive</Badge>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <YesNo ok={hasPrice} label="Pricing" />
            <YesNo ok={!!(product.refund_policy || product.guarantee_terms)} label="Refund/guarantee" />
            <YesNo ok={approvedClaimsCount > 0} label="Approved claims" />
            <YesNo ok={productObjections.length > 0} label="Objection responses" />
            <YesNo ok={!!product.compliance_notes} label="Compliance notes" />
            <YesNo ok={!!activeOffer} label="Offer active" />
          </div>
        </div>
        <div className="w-32 hidden sm:block">
          <Progress value={result.score} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground mt-1 text-right">{result.canClose ? "May close" : "No close"}</p>
        </div>
      </button>

      {open && (
        <div className="border-t border-border/40 p-3 space-y-3">
          <div className={`rounded-md border p-2 text-[11px] ${BAND_STYLES[result.band]}`}>
            <div className="flex items-start gap-1.5">
              <AlertTriangle size={12} className="mt-0.5" />
              <span>{result.bandLabel}{!result.canClose && " — agent may only answer basic questions and collect missing info."}</span>
            </div>
          </div>

          {result.missing.length > 0 && (
            <div className="rounded-md border border-yellow-500/30 bg-yellow-500/5 p-2.5">
              <p className="text-[11px] font-semibold text-yellow-200 mb-1.5 flex items-center gap-1"><AlertTriangle size={11} /> Missing knowledge ({result.missing.length})</p>
              <ul className="text-[11px] text-yellow-100 space-y-0.5 list-disc pl-4">
                {result.missing.map(m => <li key={m.key}>{m.label}{m.critical && " (critical)"}{m.hint && ` — ${m.hint}`}</li>)}
              </ul>
            </div>
          )}

          <div className="rounded-md border border-border/60 bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-semibold flex items-center gap-1"><FileText size={11} className="text-primary" /> Voice Agent Brief</p>
              <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => { navigator.clipboard.writeText(brief); toast.success("Brief copied"); }}>
                <Copy size={11} className="mr-1" /> Copy brief
              </Button>
            </div>
            <pre className="text-[10.5px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto font-mono bg-background/60 rounded p-2 border border-border/40">{brief}</pre>
            <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><Lock size={9} /> Used internally by voice/chat agents. No external send happens from this brief.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function summary(results: CompletenessResult[]) {
  const total = results.length;
  const ready = results.filter(r => r.band === "ready").length;
  const watch = results.filter(r => r.band === "watch").length;
  const missing = results.filter(r => r.band === "missing").length;
  const noSell = results.filter(r => r.band === "do_not_sell").length;
  const avg = total ? Math.round(results.reduce((s, r) => s + r.score, 0) / total) : 0;
  return { total, ready, watch, missing, noSell, avg };
}

export default function ProductKnowledge() {
  const { data, isLoading } = useQuery({
    queryKey: ["cs-product-knowledge-spine"],
    queryFn: async () => {
      const sb: any = supabase;
      const [products, offers, objections, knowledge] = await Promise.all([
        sb.from("customer_sales_products").select("*").order("created_at", { ascending: false }),
        sb.from("customer_sales_offers").select("*"),
        sb.from("customer_sales_objection_library").select("*"),
        sb.from("customer_sales_knowledge_sources").select("*").eq("active", true).order("created_at", { ascending: false }).limit(200),
      ].map(p => p.catch(() => ({ data: [] }))));
      return {
        products: ((products as any).data ?? []) as ProductRow[],
        offers: ((offers as any).data ?? []) as OfferRow[],
        objections: ((objections as any).data ?? []) as ObjectionRow[],
        knowledge: ((knowledge as any).data ?? []) as KnowledgeRow[],
      };
    },
  });

  const products = data?.products ?? [];
  const offers = data?.offers ?? [];
  const objections = data?.objections ?? [];
  const knowledge = data?.knowledge ?? [];
  const results = useMemo(() => products.map(p => scoreProduct(p, offers, objections)), [products, offers, objections]);
  const sum = useMemo(() => summary(results), [results]);

  return (
    <CSLayout
      title="Product / Service Sales Knowledge Spine"
      subtitle="Liftor must know exactly what each business sells before it speaks to a customer. Agents may never invent pricing, features, guarantees, claims, discounts or availability. If a product's knowledge band is below 70, the agent may only answer basic questions and collect info — it must not attempt to close."
    >
      <CSSection title="Sales Knowledge Completeness — portfolio view">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <Stat label="Products" value={sum.total} />
          <Stat label="Ready to sell" value={sum.ready} tone="good" />
          <Stat label="Watch" value={sum.watch} tone="warn" />
          <Stat label="Missing critical info" value={sum.missing} tone="warn" />
          <Stat label="Do not sell" value={sum.noSell} tone={sum.noSell ? "danger" : "default"} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Average completeness: <span className="text-foreground font-semibold">{sum.avg}/100</span>. Bands: ≥90 ready · 70–89 watch · 40–69 missing · &lt;40 do not sell.</p>
      </CSSection>

      <Tabs defaultValue="catalogue" className="space-y-3">
        <Card className="tech-card">
          <TabsList className="flex flex-wrap gap-1 p-2 h-auto bg-transparent">
            <TabsTrigger value="catalogue" className="text-xs"><BookOpen size={11} className="mr-1" /> 1. Catalogue</TabsTrigger>
            <TabsTrigger value="offers" className="text-xs"><Tag size={11} className="mr-1" /> 2. Offer Builder</TabsTrigger>
            <TabsTrigger value="claims" className="text-xs"><ShieldCheck size={11} className="mr-1" /> 3. Sales Claims</TabsTrigger>
            <TabsTrigger value="faqs" className="text-xs"><MessageSquare size={11} className="mr-1" /> 4. FAQs</TabsTrigger>
            <TabsTrigger value="objections" className="text-xs"><Shield size={11} className="mr-1" /> 5. Objections</TabsTrigger>
            <TabsTrigger value="proof" className="text-xs"><FileText size={11} className="mr-1" /> 6. Proof / Case Studies</TabsTrigger>
            <TabsTrigger value="dns" className="text-xs"><ShieldAlert size={11} className="mr-1" /> 7. Do-Not-Say</TabsTrigger>
            <TabsTrigger value="escalation" className="text-xs"><AlertTriangle size={11} className="mr-1" /> 8. Escalation</TabsTrigger>
            <TabsTrigger value="missing" className="text-xs"><ListChecks size={11} className="mr-1" /> 9. Missing Checklist</TabsTrigger>
          </TabsList>
        </Card>

        <TabsContent value="catalogue" className="space-y-2 mt-0">
          {isLoading ? <p className="text-xs text-muted-foreground">Loading…</p>
            : products.length === 0 ? (
              <CSEmptyState title="No products added yet" hint="Add products, services or packages. Liftor cannot sell what it doesn't know — every voice/chat conversation will be answer-only until at least one product has a knowledge band ≥70." />
            ) : (
              <div className="space-y-2">
                {products.map(p => <ProductRowDetail key={p.id} product={p} offers={offers} objections={objections} />)}
              </div>
            )}
        </TabsContent>

        <TabsContent value="offers" className="mt-0">
          <CrossList title="Offers per product" items={products.map(p => {
            const po = offers.filter(o => o.product_id === p.id);
            const active = po.filter(o => o.active && o.offer_stage === "active").length;
            return { id: p.id, label: p.product_name, badges: [`${po.length} offer${po.length === 1 ? "" : "s"}`, `${active} active`], warn: active === 0 };
          })} emptyTitle="No products yet" emptyHint="Add products first; offers tie a product to a price and close path." linkTo="/founder/customer-sales/offers" linkLabel="Open Offers" />
        </TabsContent>

        <TabsContent value="claims" className="mt-0">
          <CSSection title="Approved claims & prohibited claims" description="Approved claims live on each offer. The agent may only verbalise approved claims, and must avoid prohibited claims and product-level do-not-say.">
            {offers.length === 0 ? (
              <CSEmptyState title="No claims recorded" hint="Add at least one offer per product and fill approved_claims + prohibited_claims." />
            ) : (
              <div className="space-y-2">
                {offers.map(o => {
                  const p = products.find(pp => pp.id === o.product_id);
                  return (
                    <div key={o.id} className="rounded border border-border/40 bg-background/40 p-2 text-xs">
                      <div className="font-semibold">{o.offer_name} <span className="text-muted-foreground">— {p?.product_name ?? "unassigned"}</span></div>
                      <p className="mt-1"><span className="text-emerald-300">Approved:</span> {(o.approved_claims ?? []).join(" · ") || <span className="text-yellow-300">none recorded</span>}</p>
                      <p><span className="text-destructive">Prohibited:</span> {(o.prohibited_claims ?? []).join(" · ") || <span className="text-yellow-300">none recorded</span>}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CSSection>
        </TabsContent>

        <TabsContent value="faqs" className="mt-0">
          <CSSection title="FAQs per product">
            {products.length === 0 ? <CSEmptyState title="No products" /> : (
              <div className="space-y-2">
                {products.map(p => {
                  const faqs = Array.isArray(p.faqs) ? p.faqs : [];
                  return (
                    <div key={p.id} className="rounded border border-border/40 bg-background/40 p-2 text-xs">
                      <div className="flex items-center justify-between"><span className="font-semibold">{p.product_name}</span><Badge variant="outline" className="text-[10px]">{faqs.length} FAQ{faqs.length === 1 ? "" : "s"}</Badge></div>
                      {faqs.length === 0 ? <p className="text-yellow-300 mt-1">No FAQs — add at least 3 so the agent can answer common questions.</p>
                        : <ul className="mt-1 space-y-1">{faqs.slice(0, 5).map((f: any, i: number) => <li key={i}><span className="text-foreground">{f.q ?? "?"}</span> <span className="text-muted-foreground">— {f.a ?? "(no answer)"}</span></li>)}</ul>}
                    </div>
                  );
                })}
              </div>
            )}
          </CSSection>
        </TabsContent>

        <TabsContent value="objections" className="mt-0">
          <CrossList title="Objection coverage per product" items={products.map(p => {
            const po = objections.filter(o => o.product_id === p.id && o.active !== false);
            return { id: p.id, label: p.product_name, badges: [`${po.length} objection${po.length === 1 ? "" : "s"}`], warn: po.length < 3, warnLabel: "need ≥3" };
          })} emptyTitle="No products" linkTo="/founder/customer-sales/objections" linkLabel="Open Objection Library" />
        </TabsContent>

        <TabsContent value="proof" className="mt-0">
          <CSSection title="Proof points & case studies" description="Proof points live on each product; case studies live in the knowledge sources library.">
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              <div>
                <p className="font-semibold mb-1">Per-product proof points</p>
                {products.length === 0 ? <p className="text-muted-foreground">No products.</p>
                  : <ul className="space-y-1">{products.map(p => <li key={p.id} className="rounded border border-border/40 bg-background/40 p-2"><span className="font-medium">{p.product_name}:</span> {(p.proof_points && p.proof_points.length) ? p.proof_points.join(" · ") : <span className="text-yellow-300">none</span>}</li>)}</ul>}
              </div>
              <div>
                <p className="font-semibold mb-1">Case studies (knowledge sources)</p>
                {knowledge.filter(k => k.source_type === "case_study").length === 0 ? <p className="text-muted-foreground">No case studies added.</p>
                  : <ul className="space-y-1">{knowledge.filter(k => k.source_type === "case_study").map(k => <li key={k.id} className="rounded border border-border/40 bg-background/40 p-2">{k.title} — <Badge variant="outline" className="text-[10px]">{k.verified_by_founder ? "verified" : "unverified"}</Badge></li>)}</ul>}
              </div>
            </div>
          </CSSection>
        </TabsContent>

        <TabsContent value="dns" className="mt-0">
          <CSSection title="Do-Not-Say rules per product" description="Phrases the agent must never use. Combines product-level do_not_say and offer-level prohibited_claims.">
            {products.length === 0 ? <CSEmptyState title="No products" /> : (
              <ul className="space-y-2 text-xs">
                {products.map(p => {
                  const offerDns = offers.filter(o => o.product_id === p.id).flatMap(o => o.prohibited_claims ?? []);
                  const all = [...(p.do_not_say ?? []), ...offerDns];
                  return (
                    <li key={p.id} className="rounded border border-border/40 bg-background/40 p-2">
                      <div className="flex items-center justify-between"><span className="font-semibold">{p.product_name}</span><Badge variant="outline" className="text-[10px]">{all.length} rule{all.length === 1 ? "" : "s"}</Badge></div>
                      {all.length === 0 ? <p className="text-yellow-300 mt-1">No do-not-say rules recorded.</p>
                        : <ul className="mt-1 list-disc pl-4 text-muted-foreground">{all.slice(0, 8).map((d, i) => <li key={i}>{String(d)}</li>)}</ul>}
                    </li>
                  );
                })}
              </ul>
            )}
          </CSSection>
        </TabsContent>

        <TabsContent value="escalation" className="mt-0">
          <CSSection title="Escalation rules per product" description="When the agent must hand off to Mandy / human.">
            {products.length === 0 ? <CSEmptyState title="No products" /> : (
              <ul className="space-y-2 text-xs">
                {products.map(p => (
                  <li key={p.id} className="rounded border border-border/40 bg-background/40 p-2">
                    <div className="font-semibold">{p.product_name}</div>
                    {p.escalation_rules ? <p className="mt-1 text-muted-foreground">{p.escalation_rules}</p>
                      : <p className="mt-1 text-yellow-300">No rules recorded. Default: escalate any pricing, legal, refund, complaint, or unrecognised objection.</p>}
                  </li>
                ))}
              </ul>
            )}
          </CSSection>
        </TabsContent>

        <TabsContent value="missing" className="mt-0">
          <CSSection title="Missing Knowledge Checklist — ordered by impact">
            {products.length === 0 ? <CSEmptyState title="No products" /> : (
              <ul className="space-y-2 text-xs">
                {products.map((p, i) => {
                  const r = results[i];
                  if (r.missing.length === 0) return (
                    <li key={p.id} className="rounded border border-emerald-500/30 bg-emerald-500/5 p-2"><ShieldCheck size={11} className="inline mr-1 text-emerald-400" /><span className="font-semibold">{p.product_name}</span> — all checks passed.</li>
                  );
                  return (
                    <li key={p.id} className="rounded border border-border/40 bg-background/40 p-2">
                      <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold">{p.product_name}</span><BandBadge r={r} /></div>
                      <ul className="mt-1 space-y-0.5 list-disc pl-4 text-muted-foreground">
                        {r.missing.map(m => <li key={m.key} className={m.critical ? "text-yellow-300" : ""}>{m.label}{m.critical && " (critical)"}{m.hint && ` — ${m.hint}`}</li>)}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </CSSection>
        </TabsContent>
      </Tabs>

      <Card className="tech-card border-yellow-500/30 bg-yellow-500/5">
        <CardContent className="py-3 text-[11px] text-yellow-100 flex items-start gap-2">
          <Lock size={12} className="mt-0.5" />
          <div>
            <p className="font-semibold mb-0.5">Safe-sell rule (enforced)</p>
            <p>If a product's Sales Knowledge Completeness is below 70, the voice/chat agent may only answer basic questions and collect missing information. It must not attempt to close. Outbound calls, payment links and contract sends remain approval-gated regardless of completeness.</p>
          </div>
        </CardContent>
      </Card>
    </CSLayout>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "good" | "warn" | "danger" }) {
  const cls = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-yellow-300" : tone === "danger" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-md border border-border/60 bg-background/40 p-2.5">
      <p className={`text-xl font-bold leading-none ${cls}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function CrossList({ title, items, emptyTitle, emptyHint, linkTo, linkLabel }: {
  title: string; items: { id: string; label: string; badges?: string[]; warn?: boolean; warnLabel?: string }[];
  emptyTitle: string; emptyHint?: string; linkTo?: string; linkLabel?: string;
}) {
  return (
    <CSSection title={title}>
      {items.length === 0 ? <CSEmptyState title={emptyTitle} hint={emptyHint} /> : (
        <ul className="space-y-1 text-xs">
          {items.map(i => (
            <li key={i.id} className="rounded border border-border/40 bg-background/40 p-2 flex items-center justify-between gap-2 flex-wrap">
              <span className="font-medium">{i.label}</span>
              <span className="flex items-center gap-1.5">
                {(i.badges ?? []).map((b, k) => <Badge key={k} variant="outline" className="text-[10px]">{b}</Badge>)}
                {i.warn && <Badge variant="outline" className="text-[10px] border-yellow-500/40 text-yellow-300">{i.warnLabel ?? "missing"}</Badge>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {linkTo && <a href={linkTo} className="mt-2 inline-block text-[11px] text-primary underline">{linkLabel}</a>}
    </CSSection>
  );
}