import { useState } from "react";
import Navbar from "@/components/layout/Navbar";
import SEOHead from "@/components/SEOHead";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { toast } from "sonner";

const ProjectDiscovery = () => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Project discovery request submitted. We'll be in touch.");
      (e.target as HTMLFormElement).reset();
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Start a Project | Liftor AI" description="Tell us about your organisation and the intelligent systems you want to build. Liftor AI will generate a structured AI system proposal." />
      <Navbar />

      <section className="pt-32 pb-24">
        <div className="container">
          <motion.div initial="hidden" animate="visible" className="max-w-3xl">
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Get Started
            </motion.p>
            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Project Discovery
            </motion.h1>
            <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
              Tell us about your project. We'll review your requirements and get back to you with a tailored approach.
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Company Name</label>
                <Input required placeholder="Your company" className="bg-secondary border-border" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Industry</label>
                <Select required>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="financial">Financial Services</SelectItem>
                    <SelectItem value="family-office">Family Office</SelectItem>
                    <SelectItem value="startup">Startup</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project Description</label>
                <Textarea required placeholder="Describe your project..." className="bg-secondary border-border min-h-[100px]" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Business Problem</label>
                <Textarea required placeholder="What problem are you trying to solve?" className="bg-secondary border-border min-h-[80px]" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Desired Outcome</label>
                <Textarea required placeholder="What does success look like?" className="bg-secondary border-border min-h-[80px]" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Project Scale</label>
                <Select required>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select scale" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mvp">MVP / Proof of Concept</SelectItem>
                    <SelectItem value="mid">Mid-Scale Platform</SelectItem>
                    <SelectItem value="enterprise">Enterprise System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Timeline</label>
                <Select required>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-3">1–3 months</SelectItem>
                    <SelectItem value="3-6">3–6 months</SelectItem>
                    <SelectItem value="6+">6+ months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" variant="glow" className="w-full" disabled={loading}>
                {loading ? "Submitting..." : "Submit Discovery Request"}
              </Button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProjectDiscovery;
