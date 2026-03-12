import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t border-border/50 bg-background">
    <div className="container py-16">
      <div className="grid gap-10 md:grid-cols-5">
        <div>
          <Link to="/" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Liftor</span>
            <span className="text-primary"> AI</span>
          </Link>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            AI systems engineering studio. We design, build, and operate intelligent platforms.
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Services</h4>
          <div className="flex flex-col gap-2">
            <Link to="/what-we-build" className="text-sm text-muted-foreground hover:text-foreground transition-colors">What We Build</Link>
            <Link to="/industries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Industries</Link>
            <Link to="/method" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Method</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Company</h4>
          <div className="flex flex-col gap-2">
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</Link>
            <Link to="/case-studies" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Case Studies</Link>
            <Link to="/partners" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Partner Program</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Get Started</h4>
          <div className="flex flex-col gap-2">
            <Link to="/project-discovery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Start a Project</Link>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-4">Legal</h4>
          <div className="flex flex-col gap-2">
            <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Legal Hub</Link>
            <Link to="/legal/privacy-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link to="/legal/terms-of-service" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Liftor AI. All rights reserved.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
