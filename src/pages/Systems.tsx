import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Bot, Cpu, Workflow, Zap, Layers, Activity, FileSearch, Users, DollarSign, Cog, BarChart3 } from "lucide-react";
import SystemArchitectureFlow from "@/components/systems/SystemArchitectureFlow";

const systemLayers = [
  { icon: Bot, title: "Intelligent Agents", desc: "Autonomous agents that process data, execute decisions, and coordinate tasks across interconnected systems without manual oversight." },
  { icon: Workflow, title: "Workflow Orchestration", desc: "Centralised workflow engine that sequences operations, manages dependencies, and ensures reliable execution across distributed processes." },
  { icon: Cpu, title: "Integration Layer", desc: "Unified API and data integration framework connecting enterprise applications, databases, and third-party services into a cohesive operational environment." },
  { icon: Zap, title: "Execution Engine", desc: "High-throughput processing infrastructure that handles event-driven triggers, scheduled operations, and real-time data transformations at scale." },
];

const capabilities = [
  { icon: Workflow, title: "Intelligent Workflow Automation", desc: "Automate multi-step operational processes across systems using orchestrated workflows and AI decision logic." },
  { icon: Bot, title: "AI Execution Agents", desc: "Deploy intelligent agents capable of executing tasks, processing data, and coordinating operational activities." },
  { icon: Layers, title: "Enterprise System Integration", desc: "Connect CRM, ERP, financial systems, and internal data platforms through a secure integration layer." },
  { icon: Activity, title: "Operational Intelligence", desc: "Provide real-time operational visibility through dashboards, alerts, and performance monitoring." },
];

const coreComponents = [
  { icon: Cog, title: "Orchestration Engine", desc: "Manages workflow execution, dependencies, retries, and scheduling across automation pipelines." },
  { icon: Bot, title: "AI Agent Layer", desc: "AI-powered agents capable of executing tasks, analysing data, and coordinating automated operations." },
  { icon: Layers, title: "Integration Layer", desc: "Secure connectors linking enterprise applications, APIs, and data infrastructure." },
  { icon: BarChart3, title: "Operational Dashboard", desc: "Provides monitoring, reporting, and operational visibility for automation performance." },
];

const useCases = [
  { icon: DollarSign, title: "Financial Operations Automation", desc: "Automate reporting, reconciliation, and compliance monitoring workflows." },
  { icon: Users, title: "Customer Operations Automation", desc: "Manage onboarding, support workflows, and service coordination through automated processes." },
  { icon: FileSearch, title: "Document & Data Processing", desc: "Extract, process, and analyse documents and structured data using AI-powered workflows." },
];

const Systems = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    {/* Hero */}
    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Systems Engineering
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Automation Systems
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            Enterprise automation infrastructure designed to replace manual workflows with intelligent agents, orchestrated processes, and integrated operational intelligence across the organisation.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* Operational Architecture */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mx-auto text-center">
          <motion.h2 variants={fadeUp} custom={0} className="text-2xl sm:text-3xl font-bold mb-6">
            Operational Architecture
          </motion.h2>
          <motion.p variants={fadeUp} custom={1} className="text-muted-foreground leading-relaxed mb-4">
            The automation infrastructure operates as a multi-layered system. Intelligent agents sit at the execution layer, coordinating tasks through an orchestration engine that manages dependencies, error handling, and retry logic.
          </motion.p>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            The integration layer connects enterprise applications and data sources, enabling seamless data flow across the organisation while maintaining security boundaries and audit trails.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 mt-14">
          {systemLayers.map((layer, i) => (
            <motion.div
              key={layer.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="tech-card !p-8"
            >
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary mb-4">
                <layer.icon size={20} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold mb-2">{layer.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{layer.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* System Architecture Flow */}
    <SystemArchitectureFlow />

    {/* System Capabilities */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Capabilities
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-4">
            System Capabilities
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            Liftor automation systems replace manual operational processes with intelligent agents, orchestrated workflows, and integrated enterprise data systems.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {capabilities.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <cap.icon size={20} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{cap.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{cap.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Core System Components */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Architecture
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-4">
            Core System Components
          </motion.h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {coreComponents.map((comp, i) => (
            <motion.div
              key={comp.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <comp.icon size={20} className="text-primary" />
              </div>
              <h3 className="text-sm font-semibold mb-2 group-hover:text-primary transition-colors">{comp.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{comp.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Example Automation Use Cases */}
    <section className="py-[120px] max-sm:py-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-2xl mb-14">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Use Cases
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-2xl sm:text-3xl font-bold mb-4">
            Example Automation Use Cases
          </motion.h2>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map((uc, i) => (
            <motion.div
              key={uc.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <uc.icon size={20} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-2 group-hover:text-primary transition-colors">{uc.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
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

export default Systems;
