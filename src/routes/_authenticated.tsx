import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Building2, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
  },
  component: AuthLayout,
});

function AuthLayout() {
  const nav = useNavigate();
  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("تم تسجيل الخروج");
    nav({ to: "/" });
  };
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
              <Link to="/valuate" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>تقييم جديد</Link>
              <Link to="/hpi" className="px-3 py-1 rounded hover:bg-accent" activeProps={{ className: "bg-accent" }}>مؤشر HPI</Link>
            </nav>
          </div>
          <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 ml-1" />خروج</Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-6"><Outlet /></main>
    </div>
  );
}
