/** Today's date (YYYY-MM-DD) in Asia/Bangkok, matching the database default. */
export function bangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts;
}

export function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export const CHANNEL_LABEL: Record<string, string> = {
  live: "ไลฟ์สด",
  clip: "อัดคลิปลงช่อง",
  both: "ทั้งสองช่องทาง",
};
