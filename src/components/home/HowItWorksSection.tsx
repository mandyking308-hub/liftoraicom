import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { MessageSquare, Cpu, FileText } from "lucide-react";

const steps = [
  {
    icon: MessageSquare,
    step: "01",
    title: "Describe Your System",
    description:
      "Tell us about your organisation and the systems you want to build.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI Designs Your Architecture",
    description:
      "Liftor AI generates a system architecture including integrations, automation workflows, and infrastructure layers.",
  },
  {
    icon: FileText,
    step: "03",
    title: "Receive Your Proposal",
    description:
      "Receive a structured system proposal including architecture outline, cost estimate, and ROI projection.",
  },
];

const HowItWorksSection = () => (
  <section className="py-24 border-b border-border/30">
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <motion.p
          variants={fadeUp}
          custom={0}
          className="text-sm font-medium text-primary tracking-widest uppercase mb-3"
        >
          Process
        </motion.p>
        <motion.h2
          variants={fadeUp}
          custom={1}
          className="text-3xl sm:text-4xl lg:text-5xl font-bold"
        >
          How It Works
        </motion.h2>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        {steps.map((step, i) => (
          <motion.div
            key={step.step}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="relative p-8 rounded-xl border border-border/50 bg-card"
          >
            <span className="text-xs font-mono text-primary/50 mb-4 block">
              Step {step.step}
            </span>
            <step.icon className="h-8 w-8 text-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {step.description}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default HowItWorksSection;
