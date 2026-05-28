import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Building2, Mail } from "lucide-react";

const ALLOWED_EMAIL = "muh.salem7@gmail.com";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/dashboard" });
    });
  }, [nav]);

  const sendLink = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: ALLOWED_EMAIL,
      options: { emailRedirectTo: window.location.origin + "/dashboard" },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("تم إرسال رابط الدخول إلى بريدك");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">مقيّم بورسعيد</span>
          </div>
          <CardTitle>الدخول إلى المنصة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">
            الدخول مسموح فقط للبريد:
            <br />
            <span className="font-mono font-semibold text-foreground">{ALLOWED_EMAIL}</span>
          </p>
          {sent ? (
            <div className="rounded-lg border bg-muted/50 p-4 text-sm">
              تم إرسال رابط الدخول إلى بريدك. افتح الرابط من بريدك لإكمال الدخول.
            </div>
          ) : (
            <Button onClick={sendLink} disabled={loading} className="w-full" size="lg">
              <Mail className="ml-2 h-4 w-4" />
              {loading ? "جاري الإرسال..." : "أرسل رابط الدخول إلى بريدي"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
