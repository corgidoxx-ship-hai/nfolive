export type TtsVoice = {
  id: string;
  label: string;
  gender: "male" | "female" | "neutral";
  note: string;
};

/** Voices available on the text-to-speech model, labelled for Thai admins. */
export const TTS_VOICES: TtsVoice[] = [
  { id: "nova", label: "โนวา", gender: "female", note: "หญิง สดใส กระฉับกระเฉง" },
  { id: "shimmer", label: "ชิมเมอร์", gender: "female", note: "หญิง นุ่มนวล อ่อนโยน" },
  { id: "coral", label: "คอรัล", gender: "female", note: "หญิง อบอุ่น เป็นกันเอง" },
  { id: "sage", label: "เซจ", gender: "female", note: "หญิง สุขุม น่าเชื่อถือ" },
  { id: "echo", label: "เอคโค", gender: "male", note: "ชาย ชัดเจน กระตือรือร้น" },
  { id: "onyx", label: "โอนิกซ์", gender: "male", note: "ชาย ทุ้มลึก มีพลัง" },
  { id: "ash", label: "แอช", gender: "male", note: "ชาย อบอุ่น สบายๆ" },
  { id: "fable", label: "เฟเบิล", gender: "male", note: "ชาย สนุกสนาน เล่าเรื่องเก่ง" },
  { id: "alloy", label: "อัลลอย", gender: "neutral", note: "กลางๆ เรียบ ฟังง่าย" },
];

export const GENDER_LABEL: Record<TtsVoice["gender"], string> = {
  female: "เสียงหญิง",
  male: "เสียงชาย",
  neutral: "เสียงกลาง",
};

export function renderTtsText(
  template: string,
  vars: { name: string; amount: number; message: string },
): string {
  const amount = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 }).format(vars.amount);
  let out = template
    .replaceAll("{name}", vars.name)
    .replaceAll("{ชื่อ}", vars.name)
    .replaceAll("{amount}", amount)
    .replaceAll("{จำนวน}", amount)
    .replaceAll("{message}", vars.message)
    .replaceAll("{ข้อความ}", vars.message);
  if (!vars.message.trim()) {
    out = out.replace(/บอกว่า\s*$/u, "").trim();
  }
  return out.trim();
}
