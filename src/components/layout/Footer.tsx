import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/40 bg-background">
    <div className="container py-20">
      <div className="grid gap-12 md:grid-cols-5">
        <div>
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            AI systems engineering studio. We design, build, and operate intelligent platforms.
          </p>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/80 mb-5">Services</h4>
          <div className="flex flex-col gap-3">
            <Link to="/what-we-build" className="text-sm text-muted-foreground hover:text-foreground transition-colors">What We Build</Link>
            <Link to="/industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</Link>
            <Link to="/method" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Method</Link>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/80 mb-5">Company</h4>
          <div className="flex flex-col gap-3">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/case-studies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Case Studies</Link>
            <Link to="/partners" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Partner Program</Link>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/80 mb-5">Platform</h4>
          <div className="flex flex-col gap-3">
            <Link to="/systems" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Systems</Link>
            <Link to="/architecture" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Architecture</Link>
            <Link to="/platform" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Platform Overview</Link>
            <Link to="/project-discovery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Start a Project</Link>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.15em] text-foreground/80 mb-5">Legal</h4>
          <div className="flex flex-col gap-3">
            <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Legal Hub</Link>
            <Link to="/legal/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/legal/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="mt-16 pt-8 border-t border-border/30 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Liftor AI. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
