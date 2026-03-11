import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const PartnerProgram = () => {
  const [loading, setLoading] = useState(false);
  const [partnerType, setPartnerType] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase.from("partner_applications").insert({
      company_name: form.get("company_name") as string,
      contact_email: form.get("contact_email") as string,
      partner_type: partnerType,
      project_description: form.get("project_description") as string,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to submit application.");
    } else {
      toast.success("Partner application submitted successfully.");
      (e.target as HTMLFormElement).reset();
      setPartnerType("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-32 pb-24">
        <div className="container">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Partnerships
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Partner Program
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
              We collaborate with agencies, consultants, venture capital firms, and incubators to deliver intelligent systems at scale.
            </motion.p>
          </motion.div>
        </div>
      </section>

      <section className="pb-24">
        <div className="container max-w-2xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={0}
            className="p-8 rounded-xl border border-border/50 bg-card"
          >
            <h2 className="text-2xl font-semibold mb-6">Partner Application</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                <Input name="company_name" required placeholder="Your company" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Contact Email</label>
                <Input name="contact_email" required type="email" placeholder="contact@company.com" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Partner Type</label>
                <Select value={partnerType} onValueChange={setPartnerType} required>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agency">Agency</SelectItem>
                    <SelectItem value="consultant">Consultant</SelectItem>
                    <SelectItem value="vc">Venture Capital</SelectItem>
                    <SelectItem value="incubator">Incubator</SelectItem>
                    <SelectItem value="enterprise_advisor">Enterprise Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project Type</label>
                <Textarea name="project_description" required placeholder="Describe the type of projects you'd like to collaborate on..." className="bg-secondary border-border min-h-[100px]" />
              </div>
              <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Application"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PartnerProgram;
