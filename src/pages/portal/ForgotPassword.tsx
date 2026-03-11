import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Loader2 } from "lucide-react";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/portal/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setSent(true);
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
          {sent ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-3">Check Your Email</h2>
              <p className="text-sm text-muted-foreground mb-4">We've sent a password reset link to {email}.</p>
              <Link to="/portal/login" className="text-sm text-primary hover:underline">Back to login</Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6">Reset Password</h2>
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Email</label>
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="bg-secondary border-border" />
                </div>
                <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : "Send Reset Link"}
                </Button>
              </form>
              <div className="mt-4 text-center">
                <Link to="/portal/login" className="text-sm text-muted-foreground hover:text-primary">Back to login</Link>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
