"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addMonths,
  isDisabledDay,
  monthGrid,
  monthLabel,
  WEEKDAY_LABELS,
} from "@/src/lib/datetime/calendar";
import { cx, focusRing } from "@/src/lib/utils/cx";

interface CalendarProps {
  value: Date | null;
  onSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  disabledDates?: Date[];
}

const DAY_LABEL = "text-center text-[11px] font-medium text-zinc-500";

/**
 * Custom month calendar. Roving focus with full arrow-key navigation,
 * Enter selects, Home/End jump week bounds, PageUp/Down change month.
 */
export function Calendar({ value, onSelect, minDate, maxDate, disabledDates }: CalendarProps) {
  const [month, setMonth] = useState(() => value ?? new Date());
  const [focusDate, setFocusDate] = useState<Date>(() => value ?? new Date());
  const today = new Date();
  const days = monthGrid(month, today);
  const selectedKey = value ? dayKeyOf(value) : null;
  const focusKey = dayKeyOf(focusDate);

  function dayKeyOf(d: Date): string {
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  function moveFocus(from: Date, deltaDays: number) {
    const next = new Date(from);
    next.setDate(from.getDate() + deltaDays);
    setFocusDate(next);
    if (next.getMonth() !== month.getMonth() || next.getFullYear() !== month.getFullYear()) {
      setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    }
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-day="${dayKeyOf(next)}"]`)?.focus();
    });
  }

  function onGridKey(e: React.KeyboardEvent, day: Date) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      moveFocus(day, 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveFocus(day, -1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      moveFocus(day, 7);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveFocus(day, -7);
    } else if (e.key === "Home") {
      e.preventDefault();
      moveFocus(day, -((day.getDay() + 6) % 7));
    } else if (e.key === "End") {
      e.preventDefault();
      moveFocus(day, 6 - ((day.getDay() + 6) % 7));
    } else if (e.key === "PageDown") {
      e.preventDefault();
      setMonth(addMonths(month, 1));
    } else if (e.key === "PageUp") {
      e.preventDefault();
      setMonth(addMonths(month, -1));
    }
  }

  return (
    <div className="p-3">
      <div className="flex items-center gap-1 pb-2">
        <p className="flex-1 text-sm font-semibold tracking-tight" aria-live="polite">
          {monthLabel(month)}
        </p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Previous month"
          className={cx("rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900", focusRing)}
        >
          <ChevronLeft size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            setMonth(new Date(now.getFullYear(), now.getMonth(), 1));
            setFocusDate(now);
          }}
          aria-label="Go to today"
          className={cx("rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900", focusRing)}
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Next month"
          className={cx("rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900", focusRing)}
        >
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5" role="grid" aria-label={monthLabel(month)}>
        {WEEKDAY_LABELS.map((d) => (
          <span key={d} className={DAY_LABEL} aria-hidden="true">
            {d}
          </span>
        ))}
        {days.map((day) => {
          const key = dayKeyOf(day.date);
          const selected = selectedKey === key;
          const disabled = isDisabledDay(day.date, { minDate, maxDate, disabledDates });
          const isFocus = focusKey === key;
          return (
            <button
              key={key}
              type="button"
              data-day={key}
              disabled={disabled}
              tabIndex={isFocus ? 0 : -1}
              aria-label={day.date.toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
              aria-pressed={selected}
              onClick={() => onSelect(day.date)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (!disabled) onSelect(day.date);
                  return;
                }
                onGridKey(e, day.date);
              }}
              onFocus={() => setFocusDate(day.date)}
              className={cx(
                "flex h-9 flex-col items-center justify-center rounded-lg text-[13px] tabular-nums transition-colors",
                focusRing,
                selected
                  ? "bg-zinc-900 font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : day.today
                    ? "font-semibold text-zinc-900 dark:text-zinc-50"
                    : day.outside
                      ? "text-zinc-400 dark:text-zinc-600"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900",
                disabled && "cursor-not-allowed opacity-40 hover:bg-transparent",
              )}
            >
              <span className="leading-none">{day.date.getDate()}</span>
              <span aria-hidden="true" className="mt-0.5 flex h-1 items-center">
                {day.today && !selected ? (
                  <span className="h-1 w-1 rounded-full bg-zinc-900 dark:bg-zinc-100" />
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
