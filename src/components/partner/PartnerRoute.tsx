import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const PartnerRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isPartner, setIsPartner] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const has = data?.some((r) => r.role === "partner" || r.role === "founder") ?? false;
        setIsPartner(has);
      });
  }, [user]);

  if (authLoading || (user && isPartner === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/portal/login" replace />;
  if (!isPartner) return <Navigate to="/portal/dashboard" replace />;

  return <>{children}</>;
};

export default PartnerRoute;
