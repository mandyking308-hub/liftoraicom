import { Link } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Bot, Cpu, Workflow, Zap } from "lucide-react";

const systemLayers = [
  {
    icon: Bot,
    title: "Intelligent Agents",
    desc: "Autonomous agents that process data, execute decisions, and coordinate tasks across interconnected systems without manual oversight.",
  },
  {
    icon: Workflow,
    title: "Workflow Orchestration",
    desc: "Centralised workflow engine that sequences operations, manages dependencies, and ensures reliable execution across distributed processes.",
  },
  {
    icon: Cpu,
    title: "Integration Layer",
    desc: "Unified API and data integration framework connecting enterprise applications, databases, and third-party services into a cohesive operational environment.",
  },
  {
    icon: Zap,
    title: "Execution Engine",
    desc: "High-throughput processing infrastructure that handles event-driven triggers, scheduled operations, and real-time data transformations at scale.",
  },
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
            Enterprise-grade automation infrastructure replacing manual workflows with intelligent agents, orchestrated processes, and seamless system integrations.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-8">
            <div className="w-20 h-px bg-primary/10" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    {/* System Layers */}
    <section className="pb-[120px] max-sm:pb-20">
      <div className="container">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} className="text-2xl sm:text-3xl font-bold mb-10">
            System Layers
          </motion.h2>
        </motion.div>
        <div className="grid gap-6 sm:grid-cols-2">
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

    {/* How It Works */}
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
