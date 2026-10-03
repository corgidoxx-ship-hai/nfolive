import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { getOverlayState, markAlertShown, type OverlayAlert } from "@/lib/overlay.functions";
import { playAlertSound } from "@/lib/sounds";
import { formatBaht } from "@/lib/thai";

export const Route = createFileRoute("/overlay/$token")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Donation Overlay — GameVote" },
      {
        name: "description",
        content: "หน้าแสดงข้อความโดเนทสำหรับใช้เป็น Browser Source ในโปรแกรมไลฟ์",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Donation Overlay — GameVote" },
      { property: "og:description", content: "Browser Source สำหรับแสดงข้อความโดเนทบนไลฟ์" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OverlayPage,
  errorComponent: () => <div />,
  notFoundComponent: () => <div />,
});

function OverlayPage() {
  const { token } = Route.useParams();
  const [current, setCurrent] = useState<OverlayAlert | null>(null);
  const [leaving, setLeaving] = useState(false);
  const busy = useRef(false);
  const settings = useRef({
    soundKey: "arcade-coin",
    soundUrl: null as string | null,
    volume: 0.8,
    duration: 8,
  });

  useEffect(() => {
    let stopped = false;

    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const playVoice = (url: string, volume: number) =>
      new Promise<void>((resolve) => {
        const audio = new Audio(url);
        audio.volume = volume;
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        void audio.play().catch(() => resolve());
      });

    const tick = async () => {
      if (busy.current) return;
      const state = await getOverlayState({ data: { token } }).catch(() => null);
      if (!state?.ok || stopped) return;

      settings.current = {
        soundKey: state.alertSoundKey,
        soundUrl: state.alertSoundUrl,
        volume: state.alertVolume,
        duration: state.alertDurationSec,
      };

      const next = state.queue[0];
      if (!next) return;

      busy.current = true;
      try {
        setLeaving(false);
        setCurrent(next);
        await playAlertSound({
          presetKey: state.alertSoundKey,
          customUrl: state.alertSoundUrl,
          volume: state.alertVolume,
        });
        if (next.ttsUrl) await playVoice(next.ttsUrl, state.alertVolume);
        else await wait(state.alertDurationSec * 1000);
        await wait(600);
        setLeaving(true);
        await wait(500);
        setCurrent(null);
        await markAlertShown({ data: { token, id: next.id } }).catch(() => null);
      } finally {
        busy.current = false;
      }
    };

    void tick();
    const timer = setInterval(() => void tick(), 3000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [token]);

  return (
    <div className="grid min-h-dvh place-items-start justify-center bg-transparent p-6">
      {current && (
        <div
          className={`${leaving ? "animate-alert-out" : "animate-alert-pop"} w-full max-w-xl rounded-3xl border-2 border-primary bg-[oklch(0.16_0.04_275_/_0.92)] px-7 py-6 text-center shadow-[0_0_60px_-10px_var(--primary)] backdrop-blur-sm`}
        >
          <p className="font-display text-2xl font-extrabold text-primary">
            {current.donorName}
            <span className="text-accent"> โดเนท {formatBaht(current.amount)} บาท</span>
          </p>
          {current.message && (
            <p className="mt-2 text-xl font-semibold text-foreground">{current.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
