import { WEEKDAY_SHORT, type RecurrenceValue } from "@/src/lib/recurrence/types";

/** Human summary: "Every 2 weeks on Mon, Wed · ends Dec 1". */

const FREQUENCY_LABEL: Record<RecurrenceValue["frequency"], string> = {
  none: "Once",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export function describeRecurrence(value: RecurrenceValue): string {
  if (value.frequency === "none") return "Once";
  let text: string;
  if (value.interval <= 1) {
    text = FREQUENCY_LABEL[value.frequency];
  } else {
    const unit =
      value.frequency === "daily"
        ? value.interval === 1
          ? "day"
          : "days"
        : value.frequency === "weekly"
          ? value.interval === 1
            ? "week"
            : "weeks"
          : value.frequency === "monthly"
            ? value.interval === 1
              ? "month"
              : "months"
            : value.interval === 1
              ? "year"
              : "years";
    text = `Every ${value.interval} ${unit}`;
  }
  if (value.frequency === "weekly" && value.weekdays.length) {
    text += ` on ${[...value.weekdays]
      .sort((a, b) => a - b)
      .map((d) => WEEKDAY_SHORT[d] ?? "")
      .filter(Boolean)
      .join(", ")}`;
  }
  if (value.end.mode === "onDate" && value.end.date) {
    text += ` · ends ${new Date(value.end.date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`;
  } else if (value.end.mode === "after" && value.end.count) {
    text += ` · ${value.end.count} times`;
  }
  return text;
}
