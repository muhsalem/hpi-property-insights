import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, Home } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

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
              <Link to="/dashboard" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>اللوحة</Link>
              <Link to="/map" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>🗺️ الخريطة</Link>
              <Link to="/valuate" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>تقييم جديد</Link>
              <Link to="/hpi" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>مؤشر HPI</Link>
            </nav>
          </div>
          <Link to="/"><Button variant="ghost" size="sm"><Home className="h-4 w-4 ml-1" />الرئيسية</Button></Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}
