import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PCLayout, PCSection, OfferStatusBadge } from "./_shared";
import {
  fetchOffers, fetchProducts, fetchRequirements, fetchClaims,
  updateOfferStatus, formatPrice,
  type Offer, type Product, type Requirement, type Claim, type OfferStatus,
} from "@/lib/productCatalogueEngine";
import { toast } from "sonner";

const STATUS_OPTS: OfferStatus[] = ["draft", "active_internal", "approved", "paused", "retired"];

export default function PCOffers() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const load = () => {
    fetchOffers().then(setOffers).catch(() => {});
    fetchProducts().then(setProducts).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
    fetchClaims().then(setClaims).catch(() => {});
  };
  useEffect(() => { load(); }, []);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const reqCount = useMemo(() => {
    const m = new Map<string, number>(); for (const r of reqs) if (r.offer_id) m.set(r.offer_id, (m.get(r.offer_id) ?? 0) + 1); return m;
  }, [reqs]);
  const claimCount = useMemo(() => {
    const m = new Map<string, number>(); for (const c of claims) if (c.offer_id) m.set(c.offer_id, (m.get(c.offer_id) ?? 0) + 1); return m;
  }, [claims]);

  const setStatus = async (id: string, s: OfferStatus) => {
    try { await updateOfferStatus(id, s); toast.success(`Offer set to ${s}.`); load(); }
    catch (e: any) { toast.error(e?.message ?? "Update failed"); }
  };

  return (
    <PCLayout title="Offers" subtitle="Priced offers per product. Approved offers are usable by Sales / Quote-to-Cash; draft and internal-only offers stay invisible to customers.">
      <PCSection title={`Offers (${offers.length})`}>
        {offers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No offers defined.</p>
        ) : (
          <ul className="space-y-2">
            {offers.map(o => {
              const p = productById.get(o.product_id);
              const noPrice = o.price_amount == null || Number(o.price_amount) <= 0;
              const noReqs = !reqCount.get(o.id);
              return (
                <li key={o.id} className="border border-border/50 rounded p-3 text-xs space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{o.offer_name}</span>
                    <Badge variant="outline" className="text-[10px]">{o.offer_type}</Badge>
                    <OfferStatusBadge status={o.offer_status} />
                    {o.approval_required && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Approval-gated</Badge>}
                    <span className="ml-auto font-bold text-primary">{formatPrice(o.price_amount, o.currency, o.billing_frequency)}</span>
                  </div>
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                    {p && <span>Product: <span className="text-foreground">{p.product_name}</span></span>}
                    <span>Margin est: <span className="text-foreground">{o.margin_estimate ?? "—"}</span></span>
                    <span>Discountable: <span className="text-foreground">{o.discount_allowed ? "yes" : "no"}</span></span>
                    <span>Reqs: <span className="text-foreground">{reqCount.get(o.id) ?? 0}</span></span>
                    <span>Claims: <span className="text-foreground">{claimCount.get(o.id) ?? 0}</span></span>
                  </div>
                  {(noPrice || noReqs) && (
                    <p className="text-[11px] text-yellow-300">
                      {noPrice && "Missing price. "}{noReqs && "No delivery requirements. "}
                    </p>
                  )}
                  <div className="flex gap-1 flex-wrap pt-1">
                    {STATUS_OPTS.map(s => (
                      <Button key={s} size="sm" variant="outline" className="h-6 text-[10px]"
                        disabled={o.offer_status === s} onClick={() => setStatus(o.id, s)}>
                        {s}
                      </Button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PCSection>
    </PCLayout>
  );
}