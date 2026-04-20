import { ReactNode } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ListChecks, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supplierToken } from "@/pages/supplier/SupplierLogin";

const navItems = [
  { to: "/supplier/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/supplier/assignments", label: "Assignments", icon: ListChecks },
];

const SupplierLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  function logout() {
    supplierToken.clear();
    navigate("/supplier/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/supplier/dashboard" className="font-semibold text-sm">
            Liftor · Supplier Portal
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm inline-flex items-center gap-1.5 ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            ))}
            <Button size="sm" variant="ghost" onClick={logout} className="ml-2">
              <LogOut className="h-4 w-4 mr-1" /> Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
};

export default SupplierLayout;