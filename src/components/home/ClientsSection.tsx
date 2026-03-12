import { motion } from "framer-motion";
import { fadeUp } from "@/lib/animations";
import { Building2, Landmark, Rocket } from "lucide-react";

const clients = [
  {
    icon: Building2,
    title: "Enterprises",
    desc: "Large organisations modernising operations with AI infrastructure.",
  },
  {
    icon: Landmark,
    title: "Family Offices",
    desc: "Automation and intelligence platforms for investment and operational systems.",
  },
  {
    icon: Rocket,
    title: "Scaling Companies",
    desc: "Businesses building intelligent operational infrastructure.",
  },
];

const ClientsSection = () => (
  <section className="py-[120px] max-sm:py-20 relative overflow-hidden" style={{ background: 'hsl(220 18% 9%)' }}>
    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
    <div className="container">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        className="text-center mb-8"
      >
        <motion.p variants={fadeUp} custom={0} className="text-xs font-medium tracking-[0.3em] uppercase text-primary mb-4">
          Our Clients
        </motion.p>
        <motion.h2 variants={fadeUp} custom={1} className="text-3xl sm:text-4xl lg:text-5xl font-bold">
          Who Liftor Works With
        </motion.h2>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3 max-w-4xl mx-auto mt-12">
        {clients.map((c, i) => (
          <motion.div
            key={c.title}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            custom={i}
            className="text-center tech-card"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary mb-5">
              <c.icon size={22} strokeWidth={1.5} />
            </div>
            <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default ClientsSection;
