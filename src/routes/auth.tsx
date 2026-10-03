import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "เข้าสู่ระบบ — GameVote" },
      { name: "description", content: "เข้าสู่ระบบเพื่อโหวตเกมและเสนอเกมใหม่ให้เจ้าของช่อง" },
      { property: "og:title", content: "เข้าสู่ระบบ — GameVote" },
      { property: "og:description", content: "เข้าสู่ระบบเพื่อโหวตเกมและเสนอเกมใหม่" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
  errorComponent: () => <div className="p-6">เกิดข้อผิดพลาด ลองรีเฟรชอีกครั้ง</div>,
  notFoundComponent: () => <div className="p-6">ไม่พบหน้านี้</div>,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  const social = async (provider: "google" | "azure") => {
    // Redirects to the provider, then back here with a session (handled by supabase-js).
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
        ...(provider === "azure" ? { scopes: "email" } : {}),
      },
    });
    if (error) toast.error("เข้าสู่ระบบไม่สำเร็จ ลองอีกครั้งครับ");
  };

  const withEmail = async () => {
    if (!email.trim() || password.length < 6) {
      toast.error("กรอกอีเมลและรหัสผ่านอย่างน้อย 6 ตัวอักษร");
      return;
    }
    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
        : await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }
    if (mode === "signup" && !result.data.session) {
      toast.success("สมัครแล้ว ตรวจอีเมลเพื่อยืนยันบัญชีครับ");
      return;
    }
    void navigate({ to: "/" });
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Gamepad2 className="size-6" />
          </span>
          <h1 className="font-display text-2xl font-extrabold">เข้าสู่ระบบ</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ล็อกอินเพื่อกันการโหวตซ้ำ — โหวตได้วันละ 1 ครั้งต่อเกม
          </p>
        </div>

        <div className="grid gap-2">
          <Button className="font-semibold" onClick={() => void social("google")}>
            เข้าสู่ระบบด้วย Google / YouTube
          </Button>
          <Button
            variant="secondary"
            className="font-semibold"
            onClick={() => void social("azure")}
          >
            เข้าสู่ระบบด้วย Microsoft / Hotmail
          </Button>
        </div>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          หรือใช้อีเมล
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="email">อีเมล</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password">รหัสผ่าน</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="อย่างน้อย 6 ตัวอักษร"
            />
          </div>
          <Button variant="outline" disabled={busy} onClick={() => void withEmail()}>
            {busy ? "กำลังดำเนินการ..." : mode === "signin" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
          </Button>
          <button
            type="button"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "ยังไม่มีบัญชี? สมัครที่นี่" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
          </button>
        </div>
      </div>
    </main>
  );
}
