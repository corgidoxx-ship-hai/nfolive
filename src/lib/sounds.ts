/**
 * Built-in alert sounds, synthesized with the Web Audio API so no
 * binary assets are needed. Admins can still upload their own file.
 */

export type AlertSoundKey =
  "arcade-coin" | "retro-powerup" | "temple-bell" | "soft-chime" | "blip" | "fanfare";

export const ALERT_SOUNDS: { key: AlertSoundKey; label: string }[] = [
  { key: "arcade-coin", label: "เหรียญตู้เกม" },
  { key: "retro-powerup", label: "เกมเรโทร (พาวเวอร์อัป)" },
  { key: "temple-bell", label: "ระฆังใส" },
  { key: "soft-chime", label: "ไชม์นุ่มๆ" },
  { key: "blip", label: "บลิปสั้นๆ" },
  { key: "fanfare", label: "แตรวงฉลอง" },
];

type Note = { freq: number; start: number; dur: number; type?: OscillatorType; gain?: number };

const RECIPES: Record<AlertSoundKey, Note[]> = {
  "arcade-coin": [
    { freq: 988, start: 0, dur: 0.08, type: "square" },
    { freq: 1319, start: 0.07, dur: 0.32, type: "square" },
  ],
  "retro-powerup": [
    { freq: 523, start: 0, dur: 0.07, type: "square" },
    { freq: 659, start: 0.07, dur: 0.07, type: "square" },
    { freq: 784, start: 0.14, dur: 0.07, type: "square" },
    { freq: 1047, start: 0.21, dur: 0.24, type: "square" },
  ],
  "temple-bell": [
    { freq: 880, start: 0, dur: 1.1, type: "sine", gain: 0.5 },
    { freq: 1320, start: 0, dur: 0.8, type: "sine", gain: 0.25 },
    { freq: 2640, start: 0, dur: 0.4, type: "sine", gain: 0.12 },
  ],
  "soft-chime": [
    { freq: 784, start: 0, dur: 0.5, type: "triangle" },
    { freq: 1175, start: 0.12, dur: 0.6, type: "triangle", gain: 0.4 },
  ],
  blip: [{ freq: 1200, start: 0, dur: 0.09, type: "square" }],
  fanfare: [
    { freq: 523, start: 0, dur: 0.12, type: "sawtooth", gain: 0.35 },
    { freq: 659, start: 0.12, dur: 0.12, type: "sawtooth", gain: 0.35 },
    { freq: 784, start: 0.24, dur: 0.12, type: "sawtooth", gain: 0.35 },
    { freq: 1047, start: 0.36, dur: 0.45, type: "sawtooth", gain: 0.4 },
  ],
};

let ctx: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

/** Play a built-in synthesized alert sound. Resolves when it finishes. */
export async function playPresetSound(key: AlertSoundKey, volume = 0.8): Promise<void> {
  const ac = audioContext();
  if (!ac) return;
  if (ac.state === "suspended") await ac.resume().catch(() => {});

  const notes = RECIPES[key] ?? RECIPES["arcade-coin"];
  const t0 = ac.currentTime + 0.02;
  let end = t0;

  for (const n of notes) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = n.type ?? "square";
    osc.frequency.setValueAtTime(n.freq, t0 + n.start);
    const peak = Math.max(0.0001, (n.gain ?? 0.45) * volume);
    g.gain.setValueAtTime(0.0001, t0 + n.start);
    g.gain.exponentialRampToValueAtTime(peak, t0 + n.start + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0 + n.start);
    osc.stop(t0 + n.start + n.dur + 0.02);
    end = Math.max(end, t0 + n.start + n.dur);
  }

  const waitMs = Math.max(0, (end - ac.currentTime) * 1000);
  await new Promise((r) => setTimeout(r, waitMs));
}

/** Play an uploaded custom sound file from a URL. Resolves when it finishes. */
export function playUrlSound(url: string, volume = 0.8): Promise<void> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.onended = () => resolve();
    audio.onerror = () => resolve();
    void audio.play().catch(() => resolve());
  });
}

export function playAlertSound(opts: {
  customUrl?: string | null;
  presetKey?: string | null;
  volume?: number;
}): Promise<void> {
  const volume = opts.volume ?? 0.8;
  if (opts.customUrl) return playUrlSound(opts.customUrl, volume);
  return playPresetSound((opts.presetKey as AlertSoundKey) ?? "arcade-coin", volume);
}
