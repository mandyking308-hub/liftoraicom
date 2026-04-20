import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supplierToken } from "@/pages/supplier/SupplierLogin";

export type SupplierSession = {
  supplier_id: string;
  supplier_user_id: string;
  supplier_name: string;
  supplier_email: string;
  business_name: string;
  role: string;
};

const SupplierRoute = ({ children }: { children: (s: SupplierSession) => ReactNode }) => {
  const [session, setSession] = useState<SupplierSession | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const t = supplierToken.get();
    if (!t) { setChecking(false); return; }
    void (async () => {
      const { data } = await supabase.rpc("supplier_login_with_token", { _token: t });
      const r = data as (SupplierSession & { ok: boolean }) | null;
      if (r?.ok) setSession(r);
      else supplierToken.clear();
      setChecking(false);
    })();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!session) return <Navigate to="/supplier/login" replace />;
  return <>{children(session)}</>;
};

export default SupplierRoute;