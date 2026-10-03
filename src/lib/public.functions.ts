import { createServerFn } from "@tanstack/react-start";

export type PublicDonationInfo = {
  channelName: string;
  qrUrl: string | null;
  bankName: string;
  accountNumber: string;
  accountName: string;
  isLive: boolean;
};

/** Public: QR code, bank details and whether the stream is live right now. */
export const getPublicDonationInfo = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicDonationInfo> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data, error } = await supabaseAdmin
      .from("donation_settings")
      .select("channel_name, qr_image_url, bank_name, account_number, account_name, is_live")
      .eq("singleton", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
      return {
        channelName: "",
        qrUrl: null,
        bankName: "",
        accountNumber: "",
        accountName: "",
        isLive: false,
      };
    }

    let qrUrl: string | null = null;
    if (data.qr_image_url) {
      const signed = await supabaseAdmin.storage
        .from("media")
        .createSignedUrl(data.qr_image_url, 60 * 60);
      qrUrl = signed.data?.signedUrl ?? null;
    }

    return {
      channelName: data.channel_name,
      qrUrl,
      bankName: data.bank_name,
      accountNumber: data.account_number,
      accountName: data.account_name,
      isLive: data.is_live,
    };
  },
);
