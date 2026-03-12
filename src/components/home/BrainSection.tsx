import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const steps = ["Observation", "Learning", "Optimisation", "Decision", "Strategy"];

const BrainSection = () => (
  <section className="py-28 section-dark relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[140px]" />
    <div className="container relative z-10">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-6"
      >
        <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
          Intelligence Layer
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          The Liftor AI Brain
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
        The Liftor AI Brain continuously analyses systems, detects patterns, generates insights, and recommends improvements. It transforms operational data into strategic intelligence.
      </motion.p>

      {/* Flow diagram */}
      <div className="relative max-w-3xl mx-auto">
        <div className="hidden sm:block absolute top-1/2 left-[10%] right-[10%] h-px bg-border/40 -translate-y-1/2" />
        <motion.div
          className="hidden sm:block absolute top-1/2 w-2 h-2 rounded-full bg-primary glow-sm -translate-y-1/2"
          style={{ left: "10%" }}
          animate={{ left: ["10%", "90%"] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
        />
        <div className="flex flex-col sm:flex-row justify-between gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={step}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              custom={i}
              className="text-center flex-1"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-bold mb-3 relative z-10">
                {String(i + 1).padStart(2, "0")}
              </div>
              <p className="text-sm font-medium">{step}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

export default BrainSection;
