import { useEffect, useMemo, useState } from "react";
import { PCLayout, PCSection, OfferStatusBadge } from "./_shared";
import {
  fetchOffers, fetchProducts, formatPrice,
  type Offer, type Product,
} from "@/lib/productCatalogueEngine";

export default function PCPricing() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    fetchOffers().then(setOffers).catch(() => {});
    fetchProducts().then(setProducts).catch(() => {});
  }, []);
  const productById = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const missing = offers.filter(o => o.price_amount == null || Number(o.price_amount) <= 0);
  return (
    <PCLayout title="Pricing" subtitle="Single view of every offer price across the portfolio. Missing prices block Sales from quoting.">
      <PCSection title={`Missing prices (${missing.length})`} description="Sales/AI cannot invent a price — fix here.">
        {missing.length === 0 ? (
          <p className="text-xs text-muted-foreground">All offers have a price.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {missing.map(o => (
              <li key={o.id} className="flex items-center gap-2">
                <span className="text-yellow-300">•</span>
                <span>{o.offer_name}</span>
                <span className="text-muted-foreground">{productById.get(o.product_id)?.product_name ?? ""}</span>
              </li>
            ))}
          </ul>
        )}
      </PCSection>
      <PCSection title={`Price list (${offers.length})`}>
        {offers.length === 0 ? (
          <p className="text-xs text-muted-foreground">No offers.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="text-left py-1 pr-2">Offer</th>
                  <th className="text-left py-1 pr-2">Product</th>
                  <th className="text-left py-1 pr-2">Type</th>
                  <th className="text-left py-1 pr-2">Status</th>
                  <th className="text-right py-1 pr-2">Price</th>
                  <th className="text-right py-1 pr-2">Margin</th>
                  <th className="text-left py-1">Discount</th>
                </tr>
              </thead>
              <tbody>
                {offers.map(o => (
                  <tr key={o.id} className="border-t border-border/30">
                    <td className="py-1 pr-2">{o.offer_name}</td>
                    <td className="py-1 pr-2 text-muted-foreground">{productById.get(o.product_id)?.product_name ?? "—"}</td>
                    <td className="py-1 pr-2 text-muted-foreground">{o.offer_type}</td>
                    <td className="py-1 pr-2"><OfferStatusBadge status={o.offer_status} /></td>
                    <td className="py-1 pr-2 text-right font-bold text-primary">{formatPrice(o.price_amount, o.currency, o.billing_frequency)}</td>
                    <td className="py-1 pr-2 text-right">{o.margin_estimate ?? "—"}</td>
                    <td className="py-1 text-muted-foreground">{o.discount_allowed ? "yes" : "no"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PCSection>
    </PCLayout>
  );
}