import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PCLayout, PCSection, PCStat } from "./_shared";
import {
  fetchProducts, fetchOffers, fetchClaims, fetchRequirements, summarize, diagnose,
  type Product, type Offer, type Claim, type Requirement,
} from "@/lib/productCatalogueEngine";

export default function PCOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [reqs, setReqs] = useState<Requirement[]>([]);
  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => {});
    fetchOffers().then(setOffers).catch(() => {});
    fetchClaims().then(setClaims).catch(() => {});
    fetchRequirements().then(setReqs).catch(() => {});
  }, []);
  const sum = summarize(products, offers, claims, reqs);
  const warns = diagnose(products, offers, claims, reqs);
  return (
    <PCLayout title="Global Product / Offer Catalogue"
      subtitle="Every product, service, subscription, package, add-on, listing, licence and upgrade across all businesses. Internal catalogue runs live; publishing offers, sending prices, discounting, payment links or contracts is approval-gated unless pre-approved.">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <PCStat label="Products active" value={sum.products_active} hint={`${sum.products_total} total`} />
        <PCStat label="Offers" value={sum.offers_total} hint={`${sum.offers_approved} approved`} />
        <PCStat label="Draft offers" value={sum.offers_draft} />
        <PCStat label="Internal-only" value={sum.offers_internal} />
        <PCStat label="Claims pending" value={sum.claims_pending} hint={`${sum.claims_prohibited} prohibited`} />
        <PCStat label="Delivery reqs" value={sum.requirements_total} />
      </div>

      <PCSection title="Warnings" description="Product Catalogue Agent diagnostics — Sales cannot invent prices or claims."
        actions={<Link to="/founder/product-catalogue/claims" className="text-xs text-primary hover:underline">Claims approval →</Link>}>
        {warns.length === 0 ? (
          <p className="text-xs text-muted-foreground">No catalogue warnings.</p>
        ) : (
          <ul className="text-xs space-y-1">
            {warns.slice(0, 60).map((w, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={w.severity === "block" ? "text-destructive" : w.severity === "warn" ? "text-yellow-300" : "text-muted-foreground"}>•</span>
                <span>{w.message}</span>
              </li>
            ))}
          </ul>
        )}
      </PCSection>
    </PCLayout>
  );
}