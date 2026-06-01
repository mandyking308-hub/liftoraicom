import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/SEOHead";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Bot, Cpu, Workflow, BarChart3 } from "lucide-react";

const capabilities = [
  {
    icon: Bot,
    title: "AI Agents",
    desc: "Autonomous systems capable of analysis, decisions, and workflow execution. Our agents operate across business functions — handling data processing, customer interactions, and operational decisions at scale.",
  },
  {
    icon: Workflow,
    title: "Automation Systems",
    desc: "End-to-end operational automation that removes manual bottlenecks. We design workflows that connect systems, process data, and execute tasks without human intervention.",
  },
  {
    icon: Cpu,
    title: "AI Platforms",
    desc: "Custom platforms including dashboards, portals, and internal systems. Purpose-built software that serves as the operational backbone of your organisation.",
  },
  {
    icon: BarChart3,
    title: "Operational Intelligence",
    desc: "Systems that analyse and optimise organisational performance. Real-time insights, predictive analytics, and automated reporting for data-driven decision making.",
  },
];

const WhatWeBuild = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-32 pb-16">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Capabilities
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            What We Build
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            Liftor AI engineers intelligent systems that transform how organisations operate. From autonomous agents to full-scale platforms — we build the infrastructure of the future.
          </motion.p>
          {/* Subtle section divider */}
          <motion.div variants={fadeUp} custom={3} className="mt-8">
            <div className="w-20 h-px bg-primary/10 mx-0" />
          </motion.div>
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container">
        <div className="grid gap-6 sm:grid-cols-2">
          {capabilities.map((c, i) => (
            <motion.div
              key={c.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="group tech-card !p-8 hover:-translate-y-1 transition-all duration-500"
            >
              <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary/15 group-hover:shadow-[0_0_16px_-4px_hsl(195_100%_50%/0.3)] transition-all duration-500">
                <c.icon size={22} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    {/* Micro CTA */}
    <section className="pb-[120px] max-sm:pb-20 section-dark relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
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
              <Link to="/project-discovery">Start a Project</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>

    <Footer />
  </div>
);

export default WhatWeBuild;
