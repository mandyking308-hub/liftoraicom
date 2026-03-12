import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Workflow, Bot, Layers, Activity, Cpu, FileSearch, Database, Lock } from "lucide-react";
import PlatformArchitectureFlow from "@/components/architecture/PlatformArchitectureFlow";

const platformLayers = [
  { icon: Workflow, title: "Workflow Orchestration", desc: "Central orchestration engine coordinating workflows, managing dependencies, scheduling tasks, and ensuring reliable execution across automated operations." },
  { icon: Bot, title: "AI Agent Layer", desc: "Autonomous AI agents capable of processing data, executing tasks, and coordinating operational activities across enterprise systems." },
  { icon: Layers, title: "Integration Layer", desc: "Secure connectors linking enterprise applications, APIs, databases, and external services through a unified integration framework." },
  { icon: Activity, title: "Operational Intelligence", desc: "Dashboards, analytics, and monitoring systems that provide real-time visibility into automation performance and operational data flows." },
];

const coreModules = [
  { icon: Cpu, title: "Automation Engine", desc: "Executes workflow pipelines, manages retries, and processes high-volume operational events." },
  { icon: FileSearch, title: "AI Processing Services", desc: "AI models responsible for analysing documents, generating insights, and supporting automated decision-making." },
  { icon: Database, title: "Data Infrastructure", desc: "Secure data pipelines and storage layers that support operational intelligence and analytics workloads." },
  { icon: Lock, title: "Security & Compliance", desc: "Zero-trust access controls, encryption, audit logging, and regulatory compliance mechanisms embedded across the platform." },
];

const CardGrid = ({ items, cols = "sm:grid-cols-2" }: { items: typeof platformLayers; cols?: string }) => (
  <div className={`grid gap-6 ${cols}`}>
    {items.map((item, i) => (
      <motion.div
        key={item.title}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={i}
        className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
      >
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
          <item.icon size={20} className="text-primary" strokeWidth={1.5} />
        </div>
        <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{item.title}</h3>
        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
      </motion.div>
    ))}
  </div>
);

const Architecture = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Architecture
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Liftor Platform Architecture
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed mb-4">
            The Liftor platform is built as a modular AI infrastructure system combining orchestration engines, intelligent agents, enterprise integrations, and secure operational data pipelines.
          </motion.p>
          <motion.p variants={fadeUp} custom={3} className="text-lg text-muted-foreground leading-relaxed">
            This architecture enables organisations to design, deploy, and operate intelligent systems across complex enterprise environments.
          </motion.p>
          <motion.div variants={fadeUp} custom={4} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Platform Architecture Overview */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-6">
            Platform Architecture Overview
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed mb-4">
            Liftor operates through a layered architecture that coordinates intelligent agents, enterprise workflows, and operational data systems.
          </motion.p>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            Each layer of the platform performs a specialised role while remaining loosely coupled, enabling scalable automation and secure system integration.
          </motion.p>
        </motion.div>
      </div>
    </section>

    {/* Platform Layers */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Infrastructure
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold">
            Platform Layers
          </motion.h2>
        </motion.div>
        <CardGrid items={platformLayers} />
      </div>
    </section>

    {/* Core Platform Modules */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Modules
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold">
            Core Platform Modules
          </motion.h2>
        </motion.div>
        <CardGrid items={coreModules} />
      </div>
    </section>

    {/* Security & Governance */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-6">
            Security & Governance
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed mb-4">
            Liftor systems are designed with enterprise security principles including zero-trust access controls, encrypted data pipelines, role-based access management, and full audit logging.
          </motion.p>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            These controls ensure that automation infrastructure remains secure while meeting regulatory and operational governance requirements.
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

export default Architecture;
