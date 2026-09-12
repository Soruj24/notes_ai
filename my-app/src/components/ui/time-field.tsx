"use client";

import { useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Popover } from "@/src/components/ui/popover";
import { TimePicker } from "@/src/components/ui/time-picker";
import { formatTime } from "@/src/lib/datetime/format";
import { cx, focusRing } from "@/src/lib/utils/cx";

interface TimeFieldProps {
  /** 24-hour "HH:MM". */
  value: string;
  onChange: (value: string) => void;
  label: string;
  hour12?: boolean;
  className?: string;
}

function parse(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map(Number);
  return {
    hour: Number.isFinite(h) ? Math.min(23, Math.max(0, h as number)) : 9,
    minute: Number.isFinite(m) ? Math.min(59, Math.max(0, m as number)) : 0,
  };
}

function toInput(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * Compact custom time control (never a native time input). The trigger
 * shows the formatted time; the popover holds the stepper TimePicker
 * with a Done action. Bottom sheet on phones via Popover.
 */
export function TimeField({ value, onChange, label, hour12 = true, className }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const parsed = parse(value);

  return (
    <span className={cx("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}, current: ${formatTime(parsed.hour, parsed.minute, hour12)}`}
        className={cx(
          "flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-2 text-xs tabular-nums transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
          focusRing,
        )}
      >
        <Clock size={12} aria-hidden="true" className="shrink-0 text-zinc-400" />
        {formatTime(parsed.hour, parsed.minute, hour12)}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} label={label} widthClass="w-64">
        {open ? (
          <TimeDraft
            key={value}
            hour={parsed.hour}
            minute={parsed.minute}
            hour12={hour12}
            onDone={(h, m) => {
              onChange(toInput(h, m));
              setOpen(false);
            }}
          />
        ) : null}
      </Popover>
    </span>
  );
}

function TimeDraft({
  hour,
  minute,
  hour12,
  onDone,
}: {
  hour: number;
  minute: number;
  hour12: boolean;
  onDone: (hour: number, minute: number) => void;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  return (
    <div>
      <TimePicker
        hour={h}
        minute={m}
        hour12={hour12}
        onChange={(nextH, nextM) => {
          setH(nextH);
          setM(nextM);
        }}
      />
      <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-900">
        <span className="text-xs text-zinc-500 tabular-nums">
          {formatTime(h, m, hour12)}
        </span>
        <span className="ml-auto" />
        <Button size="sm" onClick={() => onDone(h, m)}>
          Done
        </Button>
      </div>
    </div>
  );
}
