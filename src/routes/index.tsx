import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb, Trophy } from "lucide-react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { GameCard, type GameRow } from "@/components/game-card";
import { VoteDialog } from "@/components/vote-dialog";
import { DonateDialog } from "@/components/donate-dialog";
import { SuggestDialog } from "@/components/suggest-dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { listPublicGames } from "@/lib/games.functions";
import { getPublicDonationInfo } from "@/lib/public.functions";
import { bangkokToday } from "@/lib/thai";

const gamesQuery = queryOptions({
  queryKey: ["public-games"],
  queryFn: () => listPublicGames(),
});

const donationInfoQuery = queryOptions({
  queryKey: ["donation-info"],
  queryFn: () => getPublicDonationInfo(),
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GameVote — โหวตเกมที่อยากให้เล่น" },
      {
        name: "description",
        content:
          "โหวตเกมที่อยากให้เจ้าของช่องเล่น เลือกไลฟ์สด อัดคลิป หรือทั้งสองแบบ พร้อมโดเนทให้กำลังใจ",
      },
      { property: "og:title", content: "GameVote — โหวตเกมที่อยากให้เล่น" },
      {
        property: "og:description",
        content: "โหวตเกมที่อยากให้เล่น ไลฟ์สดหรืออัดคลิป และโดเนทให้กำลังใจเจ้าของช่อง",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(gamesQuery),
  component: HomePage,
  errorComponent: () => (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <p className="text-muted-foreground">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้าอีกครั้งครับ</p>
    </div>
  ),
  notFoundComponent: () => <div className="p-6">ไม่พบหน้านี้</div>,
});

function HomePage() {
  const { user, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const games = useQuery(gamesQuery);
  const info = useQuery(donationInfoQuery);

  const today = bangkokToday();
  const myVotes = useQuery({
    queryKey: ["my-votes", user?.id, today],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("votes")
        .select("game_id, channel")
        .eq("vote_date", today);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const isAdmin = useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data === true;
    },
  });

  const [voteTarget, setVoteTarget] = useState<GameRow | null>(null);
  const [voting, setVoting] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);
  const [suggestOpen, setSuggestOpen] = useState(false);

  const votedMap = new Map((myVotes.data ?? []).map((vote) => [vote.game_id, vote.channel]));

  const openVote = (game: GameRow) => {
    if (!isSignedIn) {
      toast.info("เข้าสู่ระบบก่อนโหวตนะครับ");
      void navigate({ to: "/auth" });
      return;
    }
    setVoteTarget(game);
  };

  const confirmVote = async (channel: "live" | "clip" | "both") => {
    if (!voteTarget || !user) return;
    setVoting(true);
    const { error } = await supabase.from("votes").insert({
      game_id: voteTarget.id,
      user_id: user.id,
      channel,
      vote_date: today,
    });
    setVoting(false);

    if (error) {
      toast.error(
        error.code === "23505" ? "วันนี้โหวตเกมนี้ไปแล้ว พรุ่งนี้มาโหวตใหม่ได้" : error.message,
      );
      return;
    }
    toast.success("โหวตเรียบร้อย ขอบคุณครับ!");
    setVoteTarget(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["public-games"] }),
      queryClient.invalidateQueries({ queryKey: ["my-votes"] }),
    ]);
  };

  const list = games.data ?? [];
  const ranked = [...list].sort((a, b) => b.counts.total - a.counts.total);

  return (
    <div className="min-h-dvh">
      <SiteHeader
        isLive={info.data?.isLive ?? false}
        isAdmin={isAdmin.data === true}
        onDonate={() => setDonateOpen(true)}
      />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">
        <section className="mb-10 text-center">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
            <Trophy className="size-3.5 text-accent" />
            โหวตได้วันละ 1 ครั้งต่อเกม
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight sm:text-6xl">
            อยากให้เล่น<span className="text-glow text-primary">เกมไหน</span>?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            เลือกเกมที่อยากดู แล้วบอกด้วยว่าอยากให้เล่นสดในไลฟ์ อัดเป็นคลิปลงช่อง หรือเอาทั้งสองแบบ
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Button
              variant="secondary"
              className="font-semibold"
              onClick={() => {
                if (!isSignedIn) {
                  toast.info("เข้าสู่ระบบก่อนเสนอเกมนะครับ");
                  void navigate({ to: "/auth" });
                  return;
                }
                setSuggestOpen(true);
              }}
            >
              <Lightbulb className="size-4" />
              เสนอเกมใหม่
            </Button>
          </div>
        </section>

        {ranked.length === 0 ? (
          <p className="py-16 text-center text-muted-foreground">
            ยังไม่มีเกมให้โหวต ลองเสนอเกมที่อยากดูได้เลยครับ
          </p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ranked.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                counts={game.counts}
                votedChannel={votedMap.get(game.id) ?? null}
                closed={!!game.deadline && game.deadline < today}
                onVote={() => openVote(game)}
              />
            ))}
          </div>
        )}
      </main>

      <VoteDialog
        game={voteTarget}
        open={!!voteTarget}
        submitting={voting}
        onOpenChange={(open) => !open && setVoteTarget(null)}
        onConfirm={(channel) => void confirmVote(channel)}
      />
      <DonateDialog open={donateOpen} info={info.data} onOpenChange={setDonateOpen} />
      <SuggestDialog open={suggestOpen} userId={user?.id ?? null} onOpenChange={setSuggestOpen} />
    </div>
  );
}
