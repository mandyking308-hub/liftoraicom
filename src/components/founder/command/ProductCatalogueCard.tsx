import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fetchProducts, fetchOffers, fetchClaims, fetchRequirements, summarize, diagnose,
  type Product, type Offer, type Claim, type Requirement,
} from "@/lib/productCatalogueEngine";

export default function ProductCatalogueCard() {
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
  const blocks = warns.filter(w => w.severity === "block").length;
  return (
    <Card className="tech-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Package size={14} className="text-primary" />
          Product / Offer Catalogue
          <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/30">Live</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-xs space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Products" value={sum.products_active} />
          <Stat label="Offers" value={sum.offers_total} />
          <Stat label="Approved" value={sum.offers_approved} />
          <Stat label="Drafts" value={sum.offers_draft} />
          <Stat label="Claims pending" value={sum.claims_pending} />
          <Stat label="Prohibited" value={sum.claims_prohibited} />
        </div>
        {blocks > 0 && <p className="text-destructive">{blocks} blocking issue{blocks === 1 ? "" : "s"} — review claims/offers.</p>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <Link to="/founder/product-catalogue" className="text-primary hover:underline">Overview</Link>
          <Link to="/founder/product-catalogue/products" className="text-primary hover:underline">Products</Link>
          <Link to="/founder/product-catalogue/offers" className="text-primary hover:underline">Offers</Link>
          <Link to="/founder/product-catalogue/pricing" className="text-primary hover:underline">Pricing</Link>
          <Link to="/founder/product-catalogue/claims" className="text-primary hover:underline">Claims</Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border border-border/50 rounded p-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}