import { createServerFn } from "@tanstack/react-start";

export type PublicGame = {
  id: string;
  title: string;
  description: string;
  cover_image_url: string | null;
  deadline: string | null;
  counts: { live: number; clip: number; both: number; total: number };
};

/** Public: approved games with anonymous vote tallies. */
export const listPublicGames = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicGame[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: games, error } = await supabaseAdmin
      .from("games")
      .select("id, title, description, cover_image_url, deadline")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const { data: votes } = await supabaseAdmin.from("votes").select("game_id, channel");

    const tally = new Map<string, { live: number; clip: number; both: number; total: number }>();
    for (const vote of votes ?? []) {
      const row = tally.get(vote.game_id) ?? { live: 0, clip: 0, both: 0, total: 0 };
      if (vote.channel === "live") row.live += 1;
      else if (vote.channel === "clip") row.clip += 1;
      else row.both += 1;
      row.total += 1;
      tally.set(vote.game_id, row);
    }

    return (games ?? []).map((game) => ({
      ...game,
      counts: tally.get(game.id) ?? { live: 0, clip: 0, both: 0, total: 0 },
    }));
  },
);
