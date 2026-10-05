import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

async function hasExecutiveAccess(userId: string) {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (error) throw error;
  return data?.some((row) => row.role === "founder" || row.role === "admin") ?? false;
}

const FounderLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingExistingSession, setCheckingExistingSession] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const checkExistingSession = async () => {
      if (authLoading) return;
      if (!user) {
        if (!cancelled) setCheckingExistingSession(false);
        return;
      }

      try {
        const allowed = await hasExecutiveAccess(user.id);
        if (cancelled) return;
        if (allowed) {
          navigate("/founder", { replace: true });
        } else {
          await supabase.auth.signOut();
          toast.error("This account does not have Founder / Executive Console access.");
          setCheckingExistingSession(false);
        }
      } catch {
        if (!cancelled) {
          toast.error("Could not verify executive access. Please try again.");
          setCheckingExistingSession(false);
        }
      }
    };

    void checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, navigate]);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }

      const signedInUser = data.user;
      if (!signedInUser) {
        toast.error("Sign in succeeded but no user session was returned.");
        await supabase.auth.signOut();
        return;
      }

      const allowed = await hasExecutiveAccess(signedInUser.id);
      if (!allowed) {
        await supabase.auth.signOut();
        toast.error("Access denied. This account is not authorised for the Founder / Executive Console.");
        return;
      }

      navigate("/founder", { replace: true });
    } catch {
      await supabase.auth.signOut();
      toast.error("Could not verify executive access. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingExistingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
          <div className="mt-4 flex items-center justify-center gap-2 text-primary">
            <ShieldCheck size={18} />
            <span className="font-medium">Founder / Executive Console</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Private administrative access</p>
        </div>

        <div className="p-8 rounded-xl border border-border/50 bg-card">
          <h1 className="text-xl font-semibold mb-6">Executive Sign In</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="bg-secondary border-border"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <Input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                className="bg-secondary border-border"
              />
            </div>
            <Button type="submit" variant="glow" className="w-full" disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : "Enter Executive Console"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link to="/portal/forgot-password" className="text-muted-foreground hover:text-primary">
              Forgot password?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FounderLogin;
