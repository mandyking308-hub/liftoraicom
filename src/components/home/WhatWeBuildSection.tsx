import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Cpu, Workflow, Bot } from "lucide-react";

const cards = [
  {
    icon: Cpu,
    title: "AI Platforms",
    desc: "Custom AI platforms designed around your organisation. Decision systems, operational intelligence, and scalable infrastructure.",
  },
  {
    icon: Workflow,
    title: "Automation Systems",
    desc: "End-to-end workflow automation replacing manual processes with intelligent execution systems.",
  },
  {
    icon: Bot,
    title: "AI Agents",
    desc: "Autonomous AI agents capable of executing tasks, monitoring systems, and optimising workflows.",
  },
];

const WhatWeBuildSection = () => (
  <section className="py-[120px] max-sm:py-20 section-dark relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-8"
      >
        <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
          What We Build
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Engineering <span className="text-gradient">Intelligent Systems</span>
        </motion.h2>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 mt-12">
        {cards.map((c, i) => (
          <motion.div
            key={c.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeUp}
            custom={i}
            className="group relative tech-card"
          >
            <div className="mb-5 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
              <c.icon size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-xl font-semibold mb-3">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
            <div className="absolute inset-0 rounded-xl bg-primary/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default WhatWeBuildSection;
