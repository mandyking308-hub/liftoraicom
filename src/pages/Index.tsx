import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Bot, Cpu, Workflow, Building2, Landmark, Briefcase, Rocket, Building } from "lucide-react";

const features = [
  { icon: Cpu, title: "AI Platforms", desc: "Custom software platforms and operational dashboards." },
  { icon: Bot, title: "AI Agents", desc: "Autonomous agents capable of executing workflows." },
  { icon: Workflow, title: "Automation Systems", desc: "End-to-end automation of business processes." },
  { icon: Building2, title: "Enterprise AI Transformation", desc: "Large-scale AI implementation for organisations." },
];

const methodSteps = [
  { step: "Idea", desc: "Understanding workflows and designing intelligent systems." },
  { step: "Build", desc: "Engineering custom platforms and infrastructure." },
  { step: "Automate", desc: "Deploying AI agents and automated processes." },
  { step: "Operate", desc: "Continuous monitoring and optimisation." },
];

const industries = [
  { icon: Building2, label: "Enterprises" },
  { icon: Landmark, label: "Financial Institutions" },
  { icon: Briefcase, label: "Family Offices" },
  { icon: Rocket, label: "Startups" },
  { icon: Building, label: "Venture Studios" },
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Grid pattern */}
        <div className="absolute inset-0 grid-pattern opacity-40" />
        {/* Gradient orb */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />

        <div className="container relative z-10">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
          >
            <motion.h1
              variants={fadeUp}
              custom={0}
              className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight"
            >
              We Build Intelligent{" "}
              <span className="text-gradient">Business Systems</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              custom={1}
              className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            >
              Liftor AI designs, builds, and operates AI-powered platforms, automation systems, and intelligent agents for modern organisations.
            </motion.p>

            <motion.div
              variants={fadeUp}
              custom={2}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button variant="glow" size="lg" asChild>
                <Link to="/ai-proposal">Start a Project</Link>
              </Button>
              <Button variant="outline-light" size="lg" asChild>
                <Link to="/case-studies">Explore Our Work</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* What Liftor AI Does */}
      <section className="py-24 section-dark">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              What We Do
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Engineering Intelligent Systems
            </motion.h2>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                custom={i}
                className="group relative p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary">
                  <f.icon size={24} />
                </div>
                <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Liftor Method */}
      <section className="py-24 section-light">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Our Process
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              From Idea to Autonomous System
            </motion.h2>
          </motion.div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {methodSteps.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="relative text-center"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full border-2 border-primary text-primary font-bold text-xl mb-4">
                  {i + 1}
                </div>
                {i < methodSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-7 left-[60%] w-[80%] h-px bg-primary/20" />
                )}
                <h3 className="text-xl font-semibold mb-2">{s.step}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Who We Work With */}
      <section className="py-24 section-dark">
        <div className="container">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            className="text-center mb-16"
          >
            <motion.p variants={fadeUp} custom={0} className="text-sm font-medium text-primary tracking-widest uppercase mb-3">
              Our Clients
            </motion.p>
            <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              Who We Work With
            </motion.h2>
          </motion.div>

          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {industries.map((ind, i) => (
              <motion.div
                key={ind.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border/50 bg-card hover:border-primary/30 transition-colors"
              >
                <ind.icon size={28} className="text-primary" />
                <span className="text-sm font-medium text-center">{ind.label}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 section-dark relative overflow-hidden">
        <div className="absolute inset-0 grid-pattern opacity-20" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="container relative z-10 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Build Your <span className="text-gradient">AI System</span>
            </motion.h2>
            <motion.div variants={fadeUp} custom={1}>
              <Button variant="glow" size="lg" asChild>
                <Link to="/project-discovery">Start Your Project</Link>
              </Button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
