/** Server-only helper that turns text into speech via the OpenAI API. */

export type TtsResult = { bytes: Uint8Array; contentType: string };

export async function synthesizeSpeech(opts: {
  text: string;
  voice: string;
  speed: number;
}): Promise<TtsResult> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) throw new Error("ระบบเสียงยังไม่พร้อมใช้งาน (ไม่พบ OPENAI_API_KEY ในไฟล์ .env)");

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini-tts",
      input: opts.text,
      voice: opts.voice,
      speed: Math.min(4, Math.max(0.25, opts.speed)),
      response_format: "mp3",
      instructions:
        "Read this Thai donation shout-out warmly and clearly, with upbeat livestream energy.",
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) throw new Error("OPENAI_API_KEY ไม่ถูกต้องหรือหมดอายุ");
    if (response.status === 429)
      throw new Error("สร้างเสียงถี่เกินไป หรือเครดิต OpenAI หมด กรุณาตรวจสอบบัญชี OpenAI");
    throw new Error(`สร้างเสียงไม่สำเร็จ [${response.status}] ${body}`);
  }

  const buffer = await response.arrayBuffer();
  return { bytes: new Uint8Array(buffer), contentType: "audio/mpeg" };
}
