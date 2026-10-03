import { Link } from "@tanstack/react-router";
import { Gamepad2, HeartHandshake, LogOut, Radio, ShieldCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function SiteHeader({
  isLive,
  isAdmin,
  onDonate,
}: {
  isLive: boolean;
  isAdmin: boolean;
  onDonate: () => void;
}) {
  const { isSignedIn, displayName } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_-4px_var(--primary)]">
            <Gamepad2 className="size-5" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            GAME<span className="text-primary">VOTE</span>
          </span>
        </Link>

        {isLive && (
          <span className="animate-live-pulse ml-1 hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground sm:inline-flex">
            <Radio className="size-3.5" />
            กำลังไลฟ์
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button
            onClick={onDonate}
            className="bg-accent font-semibold text-accent-foreground hover:bg-accent/90"
          >
            <HeartHandshake className="size-4" />
            <span className="hidden sm:inline">โดเนท</span>
          </Button>

          {isAdmin && (
            <Button asChild variant="secondary" size="icon" title="หน้าแอดมิน">
              <Link to="/admin">
                <ShieldCheck className="size-4" />
              </Link>
            </Button>
          )}

          {isSignedIn ? (
            <Button
              variant="ghost"
              size="icon"
              title={`ออกจากระบบ (${displayName})`}
              onClick={() => void supabase.auth.signOut()}
            >
              <LogOut className="size-4" />
            </Button>
          ) : (
            <Button asChild variant="secondary">
              <Link to="/auth">
                <UserRound className="size-4" />
                <span className="hidden sm:inline">เข้าสู่ระบบ</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {isLive && (
        <div className="bg-primary/15 py-1 text-center text-xs font-semibold text-primary sm:hidden">
          กำลังไลฟ์อยู่ตอนนี้
        </div>
      )}
    </header>
  );
}
