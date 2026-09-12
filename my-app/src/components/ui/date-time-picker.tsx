"use client";

import { useState } from "react";
import { CalendarDays, ChevronDown, X } from "lucide-react";
import { Calendar } from "@/src/components/ui/calendar";
import { Popover } from "@/src/components/ui/popover";
import { TimePicker } from "@/src/components/ui/time-picker";
import { Button } from "@/src/components/ui/button";
import { formatDateTime, formatShort } from "@/src/lib/datetime/format";
import { cx, focusRing } from "@/src/lib/utils/cx";

interface DateTimePickerProps {
  value: Date | null;
  onChange: (value: Date | null) => void;
  label: string;
  placeholder?: string;
  /** Hide the time section (date-only mode). */
  withTime?: boolean;
  hour12?: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  className?: string;
}

/**
 * Controlled date (+optional time) picker. Trigger shows the formatted
 * value; the popover holds Calendar + TimePicker with Clear/Done.
 * Draft state resets on every open (content remounts with the popover).
 */
export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = "Select date",
  withTime = true,
  hour12 = true,
  minDate,
  maxDate,
  disabledDates,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const display = value
    ? withTime
      ? formatDateTime(value, value.getHours(), value.getMinutes(), hour12)
      : formatShort(value)
    : "";

  return (
    <div className={cx("relative", className)}>
      <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </span>
      <span className="flex gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label={`${label}${display ? `, current: ${display}` : ""}`}
          className={cx(
            "flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
            focusRing,
            !display && "text-zinc-400",
          )}
        >
          <CalendarDays size={15} aria-hidden="true" className="shrink-0" />
          <span className="truncate">{display || placeholder}</span>
          <ChevronDown size={14} aria-hidden="true" className="ml-auto shrink-0 text-zinc-400" />
        </button>
        {value ? (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(null)}
            aria-label={`Clear ${label}`}
          >
            <X size={15} aria-hidden="true" />
          </Button>
        ) : null}
      </span>
      <Popover open={open} onClose={() => setOpen(false)} label={label} widthClass="w-80">
        {open ? (
          <DraftContent
            key={display}
            value={value}
            withTime={withTime}
            hour12={hour12}
            minDate={minDate}
            maxDate={maxDate}
            disabledDates={disabledDates}
            onDone={(next) => {
              onChange(next);
              setOpen(false);
            }}
            onClear={() => {
              onChange(null);
              setOpen(false);
            }}
          />
        ) : null}
      </Popover>
    </div>
  );
}

function DraftContent({
  value,
  withTime,
  hour12,
  minDate,
  maxDate,
  disabledDates,
  onDone,
  onClear,
}: {
  value: Date | null;
  withTime: boolean;
  hour12: boolean;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
  onDone: (value: Date) => void;
  onClear: () => void;
}) {
  const [date, setDate] = useState<Date | null>(() =>
    value ? new Date(value) : null,
  );
  const [hour, setHour] = useState(() => (value ? value.getHours() : 9));
  const [minute, setMinute] = useState(() => (value ? value.getMinutes() : 0));

  function commit() {
    if (!date) return;
    const next = new Date(date);
    if (withTime) next.setHours(hour, minute, 0, 0);
    else next.setHours(0, 0, 0, 0);
    onDone(next);
  }

  return (
    <div>
      <Calendar
        value={date}
        onSelect={setDate}
        minDate={minDate}
        maxDate={maxDate}
        disabledDates={disabledDates}
      />
      {withTime ? (
        <div className="border-t border-zinc-100 px-3 dark:border-zinc-900">
          <TimePicker
            hour={hour}
            minute={minute}
            hour12={hour12}
            onChange={(h, m) => {
              setHour(h);
              setMinute(m);
            }}
          />
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-900">
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
        <span className="ml-auto" />
        <Button size="sm" onClick={commit} disabled={!date}>
          Done
        </Button>
      </div>
    </div>
  );
}
