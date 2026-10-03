import { CalendarClock, Clapperboard, Radio, Sparkles, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";

export type GameRow = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  deadline: string | null;
};

export type GameCounts = { live: number; clip: number; both: number; total: number };

export function GameCard({
  game,
  counts,
  votedChannel,
  closed,
  onVote,
}: {
  game: GameRow;
  counts: GameCounts;
  votedChannel: string | null;
  closed: boolean;
  onVote: () => void;
}) {
  const max = Math.max(counts.total, 1);
  const bar = (value: number, className: string) => (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={className} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );

  return (
    <article className="marquee-frame group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {game.cover_image_url ? (
          <img
            src={game.cover_image_url}
            alt={`ภาพปกเกม ${game.title}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            <Sparkles className="size-8" />
          </div>
        )}
        <div className="absolute right-2 top-2 rounded-full bg-background/85 px-3 py-1 text-xs font-bold text-foreground backdrop-blur">
          {counts.total} โหวต
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-tight">{game.title}</h3>
          {game.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{game.description}</p>
          )}
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Radio className="size-3.5 text-primary" />
            <span className="w-20 shrink-0 text-muted-foreground">ไลฟ์สด</span>
            {bar(counts.live, "h-full rounded-full bg-primary")}
            <span className="w-6 text-right font-semibold">{counts.live}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clapperboard className="size-3.5 text-[var(--clip)]" />
            <span className="w-20 shrink-0 text-muted-foreground">อัดคลิป</span>
            {bar(counts.clip, "h-full rounded-full bg-[var(--clip)]")}
            <span className="w-6 text-right font-semibold">{counts.clip}</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" />
            <span className="w-20 shrink-0 text-muted-foreground">ทั้งสองแบบ</span>
            {bar(counts.both, "h-full rounded-full bg-accent")}
            <span className="w-6 text-right font-semibold">{counts.both}</span>
          </div>
        </div>

        {game.deadline && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarClock className="size-3.5" />
            ปิดโหวต {new Date(game.deadline).toLocaleDateString("th-TH", { dateStyle: "medium" })}
          </p>
        )}

        <Button
          className="mt-auto w-full font-semibold"
          disabled={!!votedChannel || closed}
          onClick={onVote}
        >
          <Vote className="size-4" />
          {closed ? "ปิดโหวตแล้ว" : votedChannel ? "โหวตวันนี้แล้ว" : "โหวตเกมนี้"}
        </Button>
      </div>
    </article>
  );
}
