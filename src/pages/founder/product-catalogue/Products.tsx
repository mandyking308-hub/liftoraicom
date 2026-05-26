import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { PCLayout, PCSection } from "./_shared";
import {
  fetchProducts, fetchOffers, PRODUCT_TYPE_LABEL,
  type Product, type Offer, type ProductType,
} from "@/lib/productCatalogueEngine";

export default function PCProducts({ filterType }: { filterType?: ProductType[] }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
    fetchOffers().then(setOffers).catch(() => {});
  }, []);
  const offersByProduct = useMemo(() => {
    const m = new Map<string, Offer[]>();
    for (const o of offers) { const a = m.get(o.product_id) ?? []; a.push(o); m.set(o.product_id, a); }
    return m;
  }, [offers]);
  const filtered = filterType ? products.filter(p => filterType.includes(p.product_type)) : products;
  const title = filterType ? (filterType.includes("package") ? "Packages" : filterType.includes("add_on") ? "Add-ons" : "Products") : "Products";
  return (
    <PCLayout title={title} subtitle="Master catalogue of products, services, subscriptions, packages, add-ons, listings, licences and upgrades.">
      <PCSection title={`${title} (${filtered.length})`}>
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground">No items.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map(p => {
              const pOffers = offersByProduct.get(p.id) ?? [];
              return (
                <li key={p.id} className="border border-border/50 rounded p-3 text-xs space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{p.product_name}</span>
                    <Badge variant="outline" className="text-[10px]">{PRODUCT_TYPE_LABEL[p.product_type] ?? p.product_type}</Badge>
                    {!p.active && <Badge variant="outline" className="text-[10px] bg-yellow-500/15 text-yellow-300 border-yellow-500/30">Inactive</Badge>}
                    <span className="ml-auto text-muted-foreground">Business {p.business_id.slice(0, 8)}</span>
                  </div>
                  {p.description && <p className="text-muted-foreground">{p.description}</p>}
                  <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
                    {p.target_customer && <span>Customer: <span className="text-foreground">{p.target_customer}</span></span>}
                    {p.delivery_type && <span>Delivery: <span className="text-foreground">{p.delivery_type}</span></span>}
                    {p.cost_to_deliver_estimate != null && <span>Cost est: <span className="text-foreground">{p.cost_to_deliver_estimate}</span></span>}
                    <span>Offers: <span className="text-foreground">{pOffers.length}</span></span>
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