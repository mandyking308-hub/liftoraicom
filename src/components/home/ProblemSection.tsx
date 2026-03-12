import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const ProblemSection = () => (
  <section className="py-28 section-dark relative overflow-hidden">
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <div className="grid gap-16 lg:grid-cols-2 items-center">
        {/* Left — Text */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
        >
          <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
            The Problem
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-8">
            Most Businesses Still Run on Manual Systems
          </motion.h2>
          <motion.div variants={fadeUp} custom={2} className="space-y-4 text-muted-foreground leading-relaxed">
            <p>Operations are fragmented. Processes are manual. Data is scattered across tools.</p>
            <p>Teams spend thousands of hours managing systems instead of building the future.</p>
            <p>AI has the potential to change this — but implementing it across a real organisation is complex.</p>
          </motion.div>
          <motion.p variants={fadeUp} custom={3} className="mt-8 text-foreground font-medium text-lg">
            Liftor exists to engineer intelligent business infrastructure.
          </motion.p>
        </motion.div>

        {/* Right — Abstract diagram */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          custom={2}
          className="relative"
        >
          <div className="aspect-square max-w-md mx-auto relative">
            {/* Grid overlay */}
            <div className="absolute inset-0 grid-pattern opacity-20 rounded-2xl" />
            {/* Nodes */}
            {[
              { x: "20%", y: "20%", label: "CRM", delay: 0 },
              { x: "65%", y: "15%", label: "ERP", delay: 0.2 },
              { x: "75%", y: "55%", label: "Data", delay: 0.4 },
              { x: "35%", y: "70%", label: "Ops", delay: 0.6 },
              { x: "15%", y: "50%", label: "Mail", delay: 0.8 },
            ].map((node) => (
              <motion.div
                key={node.label}
                className="absolute flex items-center justify-center"
                style={{ left: node.x, top: node.y }}
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: node.delay + 0.3, duration: 0.5 }}
              >
                <div className="w-16 h-16 rounded-lg border border-border/60 bg-card/80 flex items-center justify-center backdrop-blur-sm">
                  <span className="text-xs font-medium text-muted-foreground">{node.label}</span>
                </div>
              </motion.div>
            ))}
            {/* Disconnected lines */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400">
              <line x1="112" y1="100" x2="280" y2="80" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
              <line x1="300" y1="100" x2="320" y2="240" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
              <line x1="300" y1="240" x2="172" y2="300" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
              <line x1="140" y1="300" x2="80" y2="220" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
              <line x1="80" y1="100" x2="80" y2="220" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="6 4" opacity="0.4" />
            </svg>
            {/* Center question */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="w-20 h-20 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                <span className="text-primary/60 text-2xl font-light">?</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default ProblemSection;
