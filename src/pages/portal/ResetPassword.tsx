import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Loader2 } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for recovery token in URL
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setReady(true);
    }
    // Also handle event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully.");
      navigate("/portal/login");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div initial="hidden" animate="visible" className="w-full max-w-md">
        <motion.div variants={fadeUp} custom={0} className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
        </motion.div>

        <motion.div variants={fadeUp} custom={1} className="p-8 rounded-xl border border-border/50 bg-card">
          {!ready ? (
            <div className="text-center">
              <p className="text-muted-foreground">Invalid or expired reset link.</p>
              <Link to="/portal/forgot-password" className="text-sm text-primary hover:underline mt-2 inline-block">Request a new one</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6">Set New Password</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Password</label>
                  <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" minLength={6} className="bg-secondary border-border" />
                </div>
                <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                </Button>
              </form>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
