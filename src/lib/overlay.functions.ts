import { createServerFn } from "@tanstack/react-start";

export type OverlayAlert = {
  id: string;
  donorName: string;
  amount: number;
  message: string;
  ttsUrl: string | null;
};

export type OverlayState = {
  ok: boolean;
  isLive: boolean;
  alertSoundKey: string;
  alertSoundUrl: string | null;
  alertVolume: number;
  alertDurationSec: number;
  queue: OverlayAlert[];
};

const EMPTY: OverlayState = {
  ok: false,
  isLive: false,
  alertSoundKey: "arcade-coin",
  alertSoundUrl: null,
  alertVolume: 0.8,
  alertDurationSec: 8,
  queue: [],
};

/** Public but token-protected: everything the OBS overlay page needs. */
export const getOverlayState = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => ({ token: String(input.token ?? "") }))
  .handler(async ({ data }): Promise<OverlayState> => {
    if (!data.token) return EMPTY;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("donation_settings")
      .select(
        "overlay_token, is_live, alert_sound_key, alert_sound_url, alert_volume, alert_duration_sec",
      )
      .eq("singleton", true)
      .maybeSingle();

    if (!settings || settings.overlay_token !== data.token) return EMPTY;

    let soundUrl: string | null = null;
    if (settings.alert_sound_url) {
      const signed = await supabaseAdmin.storage
        .from("media")
        .createSignedUrl(settings.alert_sound_url, 60 * 60 * 6);
      soundUrl = signed.data?.signedUrl ?? null;
    }

    const { data: rows } = await supabaseAdmin
      .from("donations")
      .select("id, donor_name, amount, message, tts_audio_url")
      .eq("status", "approved")
      .is("shown_at", null)
      .order("approved_at", { ascending: true })
      .limit(5);

    const queue: OverlayAlert[] = [];
    for (const row of rows ?? []) {
      let ttsUrl: string | null = null;
      if (row.tts_audio_url) {
        const signed = await supabaseAdmin.storage
          .from("media")
          .createSignedUrl(row.tts_audio_url, 60 * 30);
        ttsUrl = signed.data?.signedUrl ?? null;
      }
      queue.push({
        id: row.id,
        donorName: row.donor_name,
        amount: Number(row.amount),
        message: row.message,
        ttsUrl,
      });
    }

    return {
      ok: true,
      isLive: settings.is_live,
      alertSoundKey: settings.alert_sound_key,
      alertSoundUrl: soundUrl,
      alertVolume: Number(settings.alert_volume),
      alertDurationSec: settings.alert_duration_sec,
      queue,
    };
  });

/** Marks an alert as already displayed so it is not repeated. */
export const markAlertShown = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string; id: string }) => ({
    token: String(input.token ?? ""),
    id: String(input.id ?? ""),
  }))
  .handler(async ({ data }) => {
    if (!data.token || !data.id) return { ok: false };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: settings } = await supabaseAdmin
      .from("donation_settings")
      .select("overlay_token")
      .eq("singleton", true)
      .maybeSingle();

    if (!settings || settings.overlay_token !== data.token) return { ok: false };

    await supabaseAdmin
      .from("donations")
      .update({ shown_at: new Date().toISOString() })
      .eq("id", data.id)
      .is("shown_at", null);

    return { ok: true };
  });
