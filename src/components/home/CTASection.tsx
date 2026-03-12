import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";

const CTASection = () => (
  <section className="py-28 section-dark relative overflow-hidden">
    <div className="absolute inset-0 grid-pattern opacity-15" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-primary/4 blur-[120px]" />
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

    <div className="container relative z-10 text-center">
      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <motion.h2 variants={fadeUp} custom={0} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
          Build Your <span className="text-gradient">Intelligent System</span>
        </motion.h2>
        <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-lg mx-auto mb-10 leading-relaxed">
          Tell us about your organisation and the systems you want to build. Our AI proposal engine will generate a structured solution outline.
        </motion.p>
        <motion.div variants={fadeUp} custom={2}>
          <Button variant="glow" size="lg" asChild>
            <Link to="/ai-proposal">Start a Project</Link>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
