import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Building2, Home, LayoutDashboard, MapPinned, FileText, Calculator, TrendingUp, Brain, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

const navItems = [
  { to: "/dashboard", label: "اللوحة", icon: LayoutDashboard },
  { to: "/neighborhoods", label: "الأحياء", icon: MapPinned },
  { to: "/map", label: "الخريطة", icon: MapPinned },
  { to: "/hpi", label: "مؤشر HPI", icon: TrendingUp },
  { to: "/indicators", label: "المؤشرات المتقدمة", icon: Activity },
  { to: "/avm", label: "AVM", icon: Brain },
  { to: "/valuate", label: "تقييم جديد", icon: Calculator },
  { to: "/reports", label: "التقارير", icon: FileText },
] as const;

function AuthLayout() {
  const router = useRouter();
  const [authState, setAuthState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setAuthState("unauthenticated");
        router.navigate({ to: "/login", search: { redirect: window.location.href } });
      } else {
        setAuthState("authenticated");
      }
    });
  }, [router]);

  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="text-muted-foreground">جاري التحقق...</div>
      </div>
    );
  }

  if (authState === "unauthenticated") {
    return null;
  }

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
