import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { userHasFounderConsoleAccess } from "@/lib/founderAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ShieldCheck } from "lucide-react";

const FounderLogin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingAccess, setExistingAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || loading) return;
    let active = true;
    userHasFounderConsoleAccess(user.id).then((ok) => active && setExistingAccess(ok));
    return () => { active = false; };
  }, [user, loading]);

  if (!loading && user && existingAccess === true) return <Navigate to="/founder" replace />;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message ?? "Sign in failed.");
      return;
    }
    const ok = await userHasFounderConsoleAccess(data.user.id);
    if (!ok) {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Access denied. This console is restricted to founder and executive accounts.");
      return;
    }
    setLoading(false);
    navigate("/founder", { replace: true });
  };

  const checking = authLoading || (!!user && existingAccess === null && !loading);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
          <p className="text-muted-foreground mt-2 flex items-center justify-center gap-2">
            <ShieldCheck size={16} className="text-primary" /> Founder / Executive Console
          </p>
        </div>
        <div className="p-8 rounded-xl border border-border/50 bg-card">
          <h1 className="text-xl font-semibold mb-6">Founder / Executive Console</h1>
          {checking ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-primary" /></div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Email</label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Password</label>
                <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border" />
              </div>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Sign In"}
              </Button>
            </form>
          )}
          <div className="mt-4 text-center text-sm">
            <Link to="/portal/forgot-password" className="text-muted-foreground hover:text-primary">Forgot password?</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FounderLogin;