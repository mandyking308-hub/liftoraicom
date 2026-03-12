import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { ArrowRight, Brain, BarChart3, Shield, Workflow } from "lucide-react";

const platformModules = [
  {
    icon: Brain,
    title: "AI Intelligence Engine",
    desc: "Central reasoning layer that processes data streams, generates predictive insights, and coordinates automated decision-making across the platform.",
  },
  {
    icon: BarChart3,
    title: "Real-Time Analytics",
    desc: "Continuous monitoring and analysis of portfolio data, market signals, and operational metrics with automated reporting pipelines.",
  },
  {
    icon: Shield,
    title: "Secure Data Integration",
    desc: "Encrypted connections to financial data sources, third-party APIs, and internal systems with full audit logging and access controls.",
  },
  {
    icon: Workflow,
    title: "Automated Workflows",
    desc: "End-to-end process automation for reporting cycles, compliance checks, and data reconciliation without manual intervention.",
  },
];

const Platform = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Platform Architecture
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            AI Intelligence Platform
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            A data intelligence platform combining real-time monitoring, automated reporting, and AI-assisted analysis. The system integrates multiple data sources and generates predictive insights to support strategic decisions.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Platform Modules */}
    <section className="pb-[120px] max-sm:pb-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-10">
            Platform Components
          </motion.h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2">
          {platformModules.map((mod, i) => (
            <motion.div
              key={mod.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="tech-card !p-8"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
                <mod.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{mod.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Architecture Overview */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-6">
            System Architecture
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed mb-4">
            The platform operates as a layered intelligence system. Data ingestion pipelines feed into the AI engine, which processes information through specialised models before distributing insights to automated reporting and decision-support modules.
          </motion.p>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            Each component is independently scalable and operates within a secure, audited environment with role-based access controls and end-to-end encryption.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* CTA */}
    <section className="pb-[120px] max-sm:pb-20 section-dark relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
      <div className="container relative z-10 text-center pt-[120px] max-sm:pt-20">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl font-bold mb-4">
            Build Your <span className="text-gradient">Intelligent System</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
            Tell us about your organisation and the systems you want to build. Our AI proposal engine will generate a structured solution outline.
          </motion.p>
          <motion.div variants={fadeUp} custom={2}>
            <Button variant="glow" size="lg" className="w-full sm:w-auto shadow-[0_0_30px_-5px_hsl(195_100%_50%/0.25)]" asChild>
              <Link to="/project-discovery">Start Your Project</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Platform;
