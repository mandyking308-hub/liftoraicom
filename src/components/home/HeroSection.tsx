import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
    <div className="absolute inset-0 grid-pattern opacity-30" />
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/4 blur-[160px]" />
    <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

    <div className="container relative z-10">
      <motion.div
        className="max-w-3xl mx-auto text-center"
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={fadeUp} custom={0} className="mb-6">
          <span className="inline-block text-xs font-medium tracking-[0.3em] uppercase text-primary/70 border border-primary/20 rounded-full px-4 py-1.5">
            AI Infrastructure Studio
          </span>
        </motion.div>

        <motion.h1
          variants={fadeUp}
          custom={1}
          className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight"
        >
          We Build Intelligent{" "}
          <span className="text-gradient relative">
            Business Systems
            <span className="absolute -inset-x-4 -inset-y-2 bg-primary/5 blur-2xl rounded-full -z-10" />
          </span>
        </motion.h1>

        <motion.p
          variants={fadeUp}
          custom={2}
          className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          Liftor designs, builds, and operates AI-powered platforms, automation systems, and intelligent agents for modern organisations.
        </motion.p>

        <motion.div
          variants={fadeUp}
          custom={3}
          className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button variant="glow" size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/ai-proposal">Start a Project</Link>
          </Button>
          <Button variant="outline-light" size="lg" className="w-full sm:w-auto" asChild>
            <Link to="/case-studies">Explore Our Work</Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default HeroSection;
