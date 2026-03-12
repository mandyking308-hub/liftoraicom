import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Brain, Zap, Bot, Rocket, Activity, BarChart3 } from "lucide-react";

const modules = [
  { icon: Brain, label: "AI Brain", desc: "Intelligence & pattern recognition" },
  { icon: Zap, label: "Automation Engine", desc: "Workflow execution at scale" },
  { icon: Bot, label: "Agent Management", desc: "Autonomous agent orchestration" },
  { icon: Rocket, label: "Deployment Pipelines", desc: "Continuous delivery systems" },
  { icon: Activity, label: "Real-Time Monitoring", desc: "System health & performance" },
  { icon: BarChart3, label: "Strategic Intelligence", desc: "Data-driven decision support" },
];

const PlatformSection = () => (
  <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-6"
      >
        <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
          The Platform
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Powered by the Liftor <span className="text-gradient">AI Platform</span>
        </motion.h2>
      </motion.div>
      <motion.p
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        custom={2}
        className="text-center text-muted-foreground max-w-2xl mx-auto mb-16 leading-relaxed"
      >
        Behind every system we build is the Liftor platform — an AI infrastructure environment capable of designing, deploying, and managing intelligent systems at scale.
      </motion.p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m, i) => (
          <motion.div
            key={m.label}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="group tech-card flex items-start gap-4"
          >
            <div className="shrink-0 w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <m.icon size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-1">{m.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{m.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default PlatformSection;
