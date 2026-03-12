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

    <section className="pb-32">
      <div className="container max-w-3xl">
        <div className="relative">
          {/* Gradient vertical connector */}
          <div
            className="absolute left-[27px] top-0 bottom-0 w-px"
            style={{
              background: 'linear-gradient(to bottom, hsl(195 100% 50% / 0.1) 0%, hsl(195 100% 50% / 0.4) 40%, hsl(195 100% 50% / 0.4) 60%, hsl(195 100% 50% / 0.08) 100%)',
            }}
          />

          <div className="space-y-16">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="group relative flex gap-6 cursor-default"
              >
                <div className="relative z-10 flex-shrink-0 w-14 h-14 rounded-full border-2 border-primary/60 bg-background flex items-center justify-center shadow-[0_0_12px_-3px_hsl(195_100%_50%/0.25)] group-hover:border-primary group-hover:shadow-[0_0_20px_-3px_hsl(195_100%_50%/0.45)] transition-all duration-500">
                  <span className="text-primary font-bold text-sm">{s.num}</span>
                </div>
                <div className="pt-3">
                  <h3 className="text-2xl font-semibold mb-2 text-foreground/90 group-hover:text-foreground transition-colors duration-300">{s.title}</h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground/70 transition-colors duration-300">{s.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* Continuous System Operation */}
    <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="container relative z-10">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} className="max-w-3xl mx-auto text-center mb-12">
          <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary/70 mb-4">
            Post-Deployment
          </motion.p>
          <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Continuous System <span className="text-gradient">Operation</span>
          </motion.h2>
          <motion.p variants={fadeUp} custom={2} className="text-muted-foreground leading-relaxed">
            Liftor systems are designed for continuous operation. After deployment, the infrastructure is monitored, refined, and optimised as operational data grows. Automation pipelines, intelligence layers, and decision systems evolve over time, ensuring that the platform continues to improve as the organisation scales.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {operationCards.map((c, i) => (
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
              <h3 className="text-xl font-semibold mb-3">{c.title}</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">{c.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>

    <Footer />
  </div>
);

export default Method;
