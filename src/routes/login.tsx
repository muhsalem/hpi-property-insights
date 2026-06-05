import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Loader2, Mail } from "lucide-react";

const ALLOWED_EMAIL = "muh.salem7@gmail.com";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const nav = useNavigate();
  const [status, setStatus] = useState<"checking" | "sending" | "sent" | "error">("checking");
  const [msg, setMsg] = useState<string>("");
  const sentRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        nav({ to: "/dashboard" });
        return;
      }
      if (sentRef.current) return;
      sentRef.current = true;
      setStatus("sending");
      const { error } = await supabase.auth.signInWithOtp({
        email: ALLOWED_EMAIL,
        options: { emailRedirectTo: window.location.origin + "/dashboard" },
      });
      if (error) {
        setStatus("error");
        setMsg(error.message);
      } else {
        setStatus("sent");
      }
    })();
  }, [nav]);

  return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted px-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">مقيّم بورسعيد</span>
          </div>
          {(status === "checking" || status === "sending") && (
            <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              جاري إرسال رابط الدخول…
            </div>
          )}
          {status === "sent" && (
            <div className="space-y-2">
              <Mail className="h-6 w-6 text-primary mx-auto" />
              <p className="text-sm">
                تم إرسال رابط الدخول إلى:
                <br />
                <span className="font-mono font-semibold text-foreground">{ALLOWED_EMAIL}</span>
              </p>
              <p className="text-xs text-muted-foreground">افتح الرابط من بريدك لإكمال الدخول.</p>
            </div>
          )}
          {status === "error" && (
            <div className="text-sm text-destructive">تعذر الإرسال: {msg}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
