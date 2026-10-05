import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { userHasFounderConsoleAccess } from "@/lib/founderAccess";
import { Loader2 } from "lucide-react";

const FounderRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isFounder, setIsFounder] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    userHasFounderConsoleAccess(user.id).then(setIsFounder);
  }, [user]);

  if (authLoading || (user && isFounder === null)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Navigate to="/founder/login" replace />;
  if (!isFounder) return <Navigate to="/portal/dashboard" replace />;

  return <>{children}</>;
};

export default FounderRoute;
