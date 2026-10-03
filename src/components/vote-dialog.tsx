import { useState } from "react";
import { Clapperboard, Radio, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GameRow } from "@/components/game-card";

type Channel = "live" | "clip" | "both";

const OPTIONS: { value: Channel; label: string; hint: string; icon: typeof Radio }[] = [
  { value: "live", label: "ไลฟ์สด", hint: "อยากดูเล่นสดพร้อมคุยกัน", icon: Radio },
  { value: "clip", label: "อัดคลิปลงช่อง", hint: "อยากดูแบบตัดต่อเรียบร้อย", icon: Clapperboard },
  { value: "both", label: "ทั้งสองช่องทาง", hint: "เอาทั้งไลฟ์และคลิปเลย", icon: Sparkles },
];

export function VoteDialog({
  game,
  open,
  submitting,
  onOpenChange,
  onConfirm,
}: {
  game: GameRow | null;
  open: boolean;
  submitting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (channel: Channel) => void;
}) {
  const [channel, setChannel] = useState<Channel>("live");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">โหวต: {game?.title}</DialogTitle>
          <DialogDescription>
            เลือกว่าอยากให้เล่นเกมนี้ในช่องทางไหน (1 เกม โหวตได้ 1 ครั้งต่อวัน)
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = channel === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setChannel(option.value)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                  active
                    ? "border-primary bg-primary/10"
                    : "border-border bg-muted/40 hover:bg-muted",
                )}
              >
                <Icon className={cn("size-5", active ? "text-primary" : "text-muted-foreground")} />
                <span>
                  <span className="block font-semibold">{option.label}</span>
                  <span className="block text-xs text-muted-foreground">{option.hint}</span>
                </span>
              </button>
            );
          })}
        </div>

        <Button
          className="w-full font-semibold"
          disabled={submitting}
          onClick={() => onConfirm(channel)}
        >
          {submitting ? "กำลังส่งโหวต..." : "ยืนยันการโหวต"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
