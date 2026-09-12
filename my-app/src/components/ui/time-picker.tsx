"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { formatTime, toHour12, toHour24 } from "@/src/lib/datetime/format";
import { cx, focusRing } from "@/src/lib/utils/cx";

interface TimePickerProps {
  hour: number;
  minute: number;
  onChange: (hour: number, minute: number) => void;
  hour12?: boolean;
  label?: string;
}

function Segment({
  label,
  display,
  onUp,
  onDown,
}: {
  label: string;
  display: string;
  onUp: () => void;
  onDown: () => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={onUp}
        aria-label={`Increase ${label}`}
        className={cx("rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200", focusRing)}
      >
        <ChevronUp size={14} aria-hidden="true" />
      </button>
      <span
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuetext={display}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            onUp();
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            onDown();
          }
        }}
        className={cx("min-w-12 rounded-lg border border-zinc-200 px-2 py-1.5 text-center text-lg font-semibold tabular-nums dark:border-zinc-800", focusRing)}
      >
        {display}
      </span>
      <button
        type="button"
        onClick={onDown}
        aria-label={`Decrease ${label}`}
        className={cx("rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-900 dark:hover:text-zinc-200", focusRing)}
      >
        <ChevronDown size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * Fast stepper time selector. Hours/minutes adjust with buttons or
 * ArrowUp/Down on the focused segment; AM/PM toggles with click or arrows.
 */
export function TimePicker({ hour, minute, onChange, hour12 = true, label = "Time" }: TimePickerProps) {
  const shownHour = hour12 ? toHour12(hour).hour : hour;
  const period = toHour12(hour).period;

  const setHour = (h: number) => {
    const wrapped = ((h % 24) + 24) % 24;
    onChange(wrapped, minute);
  };

  const cycleHour = (dir: 1 | -1) => {
    if (!hour12) {
      setHour(hour + dir);
      return;
    }
    let next = shownHour + dir;
    let nextPeriod = period;
    if (next > 12) next = 1;
    if (next < 1) next = 12;
    if ((shownHour === 11 && dir === 1) || (shownHour === 12 && dir === -1)) {
      nextPeriod = period === "AM" ? "PM" : "AM";
    }
    setHour(toHour24(next, nextPeriod));
  };

  return (
    <div aria-label={label} role="group" className="flex items-start justify-center gap-1 py-1">
      <Segment
        label={hour12 ? "Hour, 12 hour clock" : "Hour, 24 hour clock"}
        display={String(shownHour).padStart(2, "0")}
        onUp={() => cycleHour(1)}
        onDown={() => cycleHour(-1)}
      />
      <span aria-hidden="true" className="pt-7 text-lg font-semibold text-zinc-400">:</span>
      <Segment
        label="Minute"
        display={String(minute).padStart(2, "0")}
        onUp={() => onChange(hour, (minute + 1) % 60)}
        onDown={() => onChange(hour, (minute + 59) % 60)}
      />
      {hour12 ? (
        <div className="flex flex-col items-center">
          <span className="h-[22px]" aria-hidden="true" />
          <span className="flex overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800" role="group" aria-label="AM or PM">
            {(["AM", "PM"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange(toHour24(shownHour, p), minute)}
                aria-pressed={period === p}
                className={cx(
                  "px-2.5 py-1.5 text-sm font-semibold transition-colors",
                  focusRing,
                  period === p
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900",
                )}
              >
                {p}
              </button>
            ))}
          </span>
          <span className="h-[22px]" aria-hidden="true" />
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {formatTime(hour, minute, hour12)}
      </span>
    </div>
  );
}
