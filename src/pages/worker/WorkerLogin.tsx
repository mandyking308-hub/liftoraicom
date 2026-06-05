import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logAuditEvent, portalForRole, type PortalType } from "@/lib/humanWorkforce";

interface Props {
  portal: PortalType;
  title: string;
  subtitle: string;
  successPath: string;
}

export default function WorkerLogin({ portal, title, subtitle, successPath }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  if (user) return <Navigate to={successPath} replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      await logAuditEvent({ eventType: "failed_login", portalType: portal, metadata: { email } });
      toast.error(error?.message || "Login failed");
      setLoading(false);
      return;
    }
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
    const portalRoles = (roles ?? []).map((r: any) => portalForRole(r.role)).filter(Boolean);
    if (!portalRoles.includes(portal)) {
      toast.error("Your account is not authorised for this portal.");
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }
    setLoading(false);
    navigate(successPath);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </h1>
          <p className="text-muted-foreground mt-2">{subtitle}</p>
        </div>
        <div className="p-8 rounded-xl border border-border/50 bg-card">
          <h2 className="text-xl font-semibold mb-6">{title}</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border" />
            </div>
            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
            </Button>
          </form>
          <p className="mt-6 text-xs text-muted-foreground text-center">
            Access is logged. Sessions auto-expire at the end of your access window.
          </p>
        </div>
      </div>
    </div>
  );
}