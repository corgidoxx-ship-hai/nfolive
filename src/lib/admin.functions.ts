import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { renderTtsText } from "@/lib/tts-voices";

async function assertAdmin(context: {
  supabase: { rpc: (fn: "is_admin") => PromiseLike<{ data: unknown }> };
}) {
  const { data } = await context.supabase.rpc("is_admin");
  if (data !== true) throw new Error("เฉพาะแอดมินเท่านั้น");
}

/** Grants the caller admin rights, but only while nobody is admin yet. */
export const claimFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");

    if ((count ?? 0) > 0) throw new Error("มีแอดมินอยู่แล้ว ไม่สามารถรับสิทธิ์ได้");

    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** True when no admin exists yet, so the first sign-in can claim ownership. */
export const adminSeatAvailable = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return { available: (count ?? 0) === 0 };
});

/** Approves a donation and generates its read-aloud audio. */
export const approveDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { synthesizeSpeech } = await import("@/lib/tts.server");

    const { data: donation, error } = await supabaseAdmin
      .from("donations")
      .select("id, donor_name, amount, message, tts_audio_url")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!donation) throw new Error("ไม่พบรายการโดเนทนี้");

    const { data: settings } = await supabaseAdmin
      .from("donation_settings")
      .select("tts_enabled, tts_voice, tts_speed, tts_template")
      .eq("singleton", true)
      .maybeSingle();

    let ttsPath = donation.tts_audio_url;
    let voiceWarning: string | null = null;

    if (settings?.tts_enabled && !ttsPath) {
      const text = renderTtsText(settings.tts_template, {
        name: donation.donor_name,
        amount: Number(donation.amount),
        message: donation.message,
      });
      try {
        const audio = await synthesizeSpeech({
          text,
          voice: settings.tts_voice,
          speed: Number(settings.tts_speed),
        });
        const path = `tts/${donation.id}.mp3`;
        const up = await supabaseAdmin.storage
          .from("media")
          .upload(path, audio.bytes, { contentType: audio.contentType, upsert: true });
        if (up.error) throw new Error(up.error.message);
        ttsPath = path;
      } catch (err) {
        voiceWarning = err instanceof Error ? err.message : "สร้างเสียงอ่านไม่สำเร็จ";
      }
    }

    const { error: updateError } = await supabaseAdmin
      .from("donations")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        tts_audio_url: ttsPath,
      })
      .eq("id", donation.id);
    if (updateError) throw new Error(updateError.message);

    return { ok: true, voiceWarning };
  });

export const rejectDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => ({ id: String(input.id ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("donations")
      .update({ status: "rejected" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Fires a fake donation straight onto the overlay so sound can be checked. */
export const sendTestDonation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { donorName?: string; amount?: number; message?: string }) => ({
    donorName: String(input.donorName ?? "ทดสอบระบบ").slice(0, 60),
    amount: Number(input.amount ?? 99),
    message: String(input.message ?? "เช็คเสียงก่อนไลฟ์ครับ").slice(0, 200),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { synthesizeSpeech } = await import("@/lib/tts.server");

    const { data: settings } = await supabaseAdmin
      .from("donation_settings")
      .select("tts_enabled, tts_voice, tts_speed, tts_template")
      .eq("singleton", true)
      .maybeSingle();

    const { data: inserted, error } = await supabaseAdmin
      .from("donations")
      .insert({
        donor_name: data.donorName,
        amount: data.amount > 0 ? data.amount : 1,
        message: data.message,
        status: "approved",
        approved_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    let voiceWarning: string | null = null;
    if (settings?.tts_enabled) {
      try {
        const text = renderTtsText(settings.tts_template, {
          name: data.donorName,
          amount: data.amount,
          message: data.message,
        });
        const audio = await synthesizeSpeech({
          text,
          voice: settings.tts_voice,
          speed: Number(settings.tts_speed),
        });
        const path = `tts/${inserted.id}.mp3`;
        const up = await supabaseAdmin.storage
          .from("media")
          .upload(path, audio.bytes, { contentType: audio.contentType, upsert: true });
        if (up.error) throw new Error(up.error.message);
        await supabaseAdmin.from("donations").update({ tts_audio_url: path }).eq("id", inserted.id);
      } catch (err) {
        voiceWarning = err instanceof Error ? err.message : "สร้างเสียงอ่านไม่สำเร็จ";
      }
    }

    return { ok: true, voiceWarning };
  });

/** Returns a short-lived data URL so the admin can preview a voice. */
export const previewVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { voice: string; speed?: number; text?: string }) => ({
    voice: String(input.voice ?? "alloy"),
    speed: Number(input.speed ?? 1),
    text: String(input.text ?? "คุณสมชาย โดเนท 100 บาท บอกว่า สู้ๆ นะครับ").slice(0, 300),
  }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { synthesizeSpeech } = await import("@/lib/tts.server");
    const audio = await synthesizeSpeech({
      text: data.text,
      voice: data.voice,
      speed: data.speed,
    });
    const base64 = Buffer.from(audio.bytes).toString("base64");
    return { dataUrl: `data:audio/mpeg;base64,${base64}` };
  });

/** Signed link to a transfer slip image, admins only. */
export const getSlipUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { path: string }) => ({ path: String(input.path ?? "") }))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const signed = await supabaseAdmin.storage.from("slips").createSignedUrl(data.path, 60 * 10);
    return { url: signed.data?.signedUrl ?? null };
  });
