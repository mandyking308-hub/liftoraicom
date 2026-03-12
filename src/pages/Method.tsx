import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Activity, TrendingUp, Brain } from "lucide-react";

const operationCards = [
  { icon: Activity, title: "System Monitoring", desc: "Real-time monitoring ensures platform stability, operational reliability, and performance visibility across the entire system stack." },
  { icon: TrendingUp, title: "Adaptive Optimisation", desc: "Operational data is analysed to refine workflows, improve automation efficiency, and optimise system performance." },
  { icon: Brain, title: "Intelligence Evolution", desc: "AI models and decision systems evolve as new data becomes available, enabling smarter operational outcomes over time." },
];

const steps = [
  { num: "01", title: "Concept", desc: "Understand workflows, identify automation opportunities, and define the intelligent system roadmap." },
  { num: "02", title: "Architecture", desc: "Design the intelligent system structure — data flows, integration points, and AI components." },
  { num: "03", title: "Development", desc: "Build platforms, automation pipelines, and custom interfaces with precision engineering." },
  { num: "04", title: "AI Integration", desc: "Deploy agents, intelligence layers, and machine learning models into the operational stack." },
  { num: "05", title: "Operations", desc: "Maintain, monitor, and continuously optimise the system for peak performance." },
];

const Method = () => (
  <div className="min-h-screen bg-background">
    <Navbar />

    <section className="pt-32 pb-24">
      <div className="container">
        <motion.div initial="hidden" animate="visible" className="max-w-3xl">
          <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
            Process
          </motion.p>
          <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            The Liftor Method
          </motion.h1>
          <motion.p variants={fadeUp} custom={2} className="text-lg text-muted-foreground leading-relaxed">
            A structured approach to building intelligent systems — from initial concept through to continuous operation.
          </motion.p>
        </motion.div>
      </div>
    </section>

    <section className="pb-24">
      <div className="container max-w-3xl">
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[27px] top-0 bottom-0 w-px bg-border" />

          <div className="space-y-12">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative flex gap-6"
              >
                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full border-2 border-primary bg-background flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{s.num}</span>
                </div>
                <div className="pt-3">
                  <h3 className="text-2xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Method;
