import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, Home, LayoutDashboard, MapPinned, FileText, Calculator, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const navItems = [
  { to: "/dashboard", label: "اللوحة", icon: LayoutDashboard },
  { to: "/neighborhoods", label: "الأحياء", icon: MapPinned },
  { to: "/hpi", label: "المؤشر والخريطة", icon: TrendingUp },
  { to: "/valuate", label: "تقييم جديد", icon: Calculator },
  { to: "/reports", label: "التقارير", icon: FileText },
] as const;

function AuthLayout() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span className="font-bold">مقيّم بورسعيد</span>
            </Link>
            <nav className="flex gap-1 text-sm">
              {navItems.map((it) => (
                <Link
                  key={it.to}
                  to={it.to}
                  className="px-3 py-1.5 rounded hover:bg-accent flex items-center gap-1.5"
                  activeProps={{ className: "bg-accent font-semibold" }}
                >
                  <it.icon className="h-4 w-4" />
                  {it.label}
                </Link>
              ))}
            </nav>
          </div>
          <Link to="/"><Button variant="ghost" size="sm"><Home className="h-4 w-4 ml-1" />الرئيسية</Button></Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}
