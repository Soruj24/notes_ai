/** Display formatting for picker triggers and summaries. */

export function formatShort(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(
  hour: number,
  minute: number,
  hour12 = true,
): string {
  if (!hour12) {
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const period = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatDateTime(
  date: Date | string | null | undefined,
  hour: number,
  minute: number,
  hour12 = true,
): string {
  if (!date) return "";
  return `${formatShort(date)} · ${formatTime(hour, minute, hour12)}`;
}

export function toHour24(hour12: number, period: "AM" | "PM"): number {
  if (period === "AM") return hour12 % 12;
  return hour12 % 12 === 0 ? 12 : (hour12 % 12) + 12;
}

export function toHour12(hour24: number): { hour: number; period: "AM" | "PM" } {
  return {
    hour: hour24 % 12 === 0 ? 12 : hour24 % 12,
    period: hour24 < 12 ? "AM" : "PM",
  };
}
