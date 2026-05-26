import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Building2, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const enterDemo = () => nav({ to: "/dashboard" });

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("مرحباً بعودتك");
    nav({ to: "/dashboard" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم إنشاء الحساب — راجع بريدك للتفعيل أو سجّل دخول مباشرة");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <button type="button" onClick={enterDemo} className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">مقيّم بورسعيد</span>
          </button>
          <CardTitle>الدخول إلى المنصة</CardTitle>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={enterDemo} className="mb-4 w-full" size="lg">
            افتح المنصة مباشرة بدون تسجيل
            <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">دخول</TabsTrigger>
              <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={signIn} className="space-y-3 mt-4">
                <div><Label>البريد</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div><Label>كلمة السر</Label><Input type="password" required value={password} onChange={e=>setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "دخول"}</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={signUp} className="space-y-3 mt-4">
                <div><Label>الاسم الكامل</Label><Input required value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
                <div><Label>البريد</Label><Input type="email" required value={email} onChange={e=>setEmail(e.target.value)} /></div>
                <div><Label>كلمة السر</Label><Input type="password" required minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="w-full">{loading ? "..." : "إنشاء حساب مقيّم"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
