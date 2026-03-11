import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Bot, Cpu, Workflow, BarChart3 } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6 } }),
};

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

    <section className="pt-32 pb-24">
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
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-2">
          {capabilities.map((c, i) => (
            <motion.div
              key={c.title}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="p-8 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
            >
              <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                <c.icon size={24} />
              </div>
              <h3 className="text-2xl font-semibold mb-3">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default WhatWeBuild;
