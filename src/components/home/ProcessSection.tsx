import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const stages = [
  { label: "Discovery", desc: "Understanding your systems and goals" },
  { label: "Architecture", desc: "Designing the intelligent system" },
  { label: "Build", desc: "Engineering the platform" },
  { label: "Deployment", desc: "Launching into production" },
  { label: "Monitoring", desc: "Real-time system oversight" },
  { label: "Optimisation", desc: "Continuous improvement" },
];

const ProcessSection = () => (
  <section className="py-28 section-dark relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-20"
      >
        <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
          Our Process
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          How Liftor Builds Intelligent Systems
        </motion.h2>
      </motion.div>

      {/* Pipeline */}
      <div className="relative">
        {/* Connection line */}
        <div className="hidden lg:block absolute top-8 left-[8%] right-[8%] h-px bg-border/50" />
        {/* Animated pulse */}
        <motion.div
          className="hidden lg:block absolute top-[29px] w-3 h-3 rounded-full bg-primary/60 glow-sm -translate-y-1/2"
          style={{ left: "8%" }}
          animate={{ left: ["8%", "92%"] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
        />

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-6">
          {stages.map((s, i) => (
            <motion.div
              key={s.label}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="text-center relative"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-border/60 bg-card text-sm font-bold text-primary mb-4 relative z-10">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-sm font-semibold mb-1">{s.label}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default ProcessSection;
