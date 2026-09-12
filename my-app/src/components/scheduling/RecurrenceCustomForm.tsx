"use client";

import { useState } from "react";
import { ArrowLeft, CalendarDays, ChevronDown } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Calendar } from "@/src/components/ui/calendar";
import { Input } from "@/src/components/ui/input";
import { cx, focusRing } from "@/src/lib/utils/cx";
import {
  WEEKDAY_SHORT,
  type EndMode,
  type RecurrenceValue,
} from "@/src/lib/recurrence/types";

interface RecurrenceCustomFormProps {
  value: RecurrenceValue;
  seriesStart?: Date;
  onDone: (value: RecurrenceValue) => void;
  onBack: () => void;
}

const UNITS = [
  { id: "daily", label: "Day" },
  { id: "weekly", label: "Week" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
] as const;

// Monday-first display order (0=Sun..6=Sat internally).
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/**
 * Progressive-disclosure custom schedule: interval → weekdays (weekly) →
 * end conditions. Emits a complete RecurrenceValue on Done.
 */
export function RecurrenceCustomForm({ value, seriesStart, onDone, onBack }: RecurrenceCustomFormProps) {
  const [interval, setInterval] = useState(value.interval);
  const [frequency, setFrequency] = useState(
    value.frequency === "none" ? "weekly" : value.frequency,
  );
  const [weekdays, setWeekdays] = useState<number[]>(value.weekdays);
  const [endMode, setEndMode] = useState<EndMode>(value.end.mode);
  const [endDate, setEndDate] = useState(
    value.end.date ? toDateInput(value.end.date) : "",
  );
  const [endCount, setEndCount] = useState(value.end.count ?? 10);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  }

  function commit() {
    onDone({
      frequency: frequency as RecurrenceValue["frequency"],
      interval: Math.min(99, Math.max(1, Math.floor(interval) || 1)),
      weekdays: frequency === "weekly" ? [...weekdays].sort((a, b) => a - b) : [],
      end:
        endMode === "onDate" && endDate
          ? { mode: "onDate", date: new Date(`${endDate}T00:00:00`) }
          : endMode === "after"
            ? { mode: "after", count: Math.min(365, Math.max(1, Math.floor(endCount) || 1)) }
            : { mode: "never" },
    });
  }

  return (
    <div className="grid gap-3 p-3">
      <button
        type="button"
        onClick={onBack}
        className={cx("inline-flex w-fit items-center gap-1 rounded-md px-1 py-0.5 text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100", focusRing)}
      >
        <ArrowLeft size={12} aria-hidden="true" />
        All options
      </button>
      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Repeat every
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="recur-interval"
            type="number"
            min={1}
            max={99}
            aria-label="Repeat interval"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value))}
            className="w-20"
          />
          <div className="flex gap-1" role="group" aria-label="Repeat unit">
            {UNITS.map((u) => (
              <button
                key={u.id}
                type="button"
                aria-pressed={frequency === u.id}
                onClick={() => setFrequency(u.id)}
                className={cx(
                  "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  focusRing,
                  frequency === u.id
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900",
                )}
              >
                {u.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {frequency === "weekly" ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300" id="recur-weekdays-label">
            On
          </p>
          <div className="flex gap-1" role="group" aria-labelledby="recur-weekdays-label">
            {WEEKDAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                aria-pressed={weekdays.includes(day)}
                onClick={() => toggleWeekday(day)}
                className={cx(
                  "flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors",
                  focusRing,
                  weekdays.includes(day)
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900",
                )}
              >
                {WEEKDAY_SHORT[day].charAt(0)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300" id="recur-ends-label">
          Ends
        </p>
        <div className="grid gap-1.5" role="radiogroup" aria-labelledby="recur-ends-label">
          {(
            [
              { mode: "never", label: "Never" },
              { mode: "onDate", label: "On date" },
              { mode: "after", label: "After occurrences" },
            ] as const
          ).map((option) => (
            <label
              key={option.mode}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-sm has-checked:border-zinc-900 dark:border-zinc-800 dark:has-checked:border-zinc-100"
            >
              <input
                type="radio"
                name="recur-end"
                checked={endMode === option.mode}
                onChange={() => setEndMode(option.mode)}
                className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
              />
              <span className="min-w-20 text-xs font-medium">{option.label}</span>
              {option.mode === "onDate" && endMode === "onDate" ? (
                <span className="grid flex-1 gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    onClick={() => setEndPickerOpen((v) => !v)}
                    aria-expanded={endPickerOpen}
                    aria-label="Choose end date"
                    className={cx(
                      "flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-transparent px-2 text-xs transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
                      focusRing,
                    )}
                  >
                    <CalendarDays size={13} aria-hidden="true" className="shrink-0 text-zinc-400" />
                    <span className="truncate">
                      {endDate
                        ? new Date(`${endDate}T00:00:00`).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Select date"}
                    </span>
                    <ChevronDown size={12} aria-hidden="true" className="ml-auto shrink-0 text-zinc-400" />
                  </button>
                  {endPickerOpen ? (
                    <span className="block overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <Calendar
                        value={endDate ? new Date(`${endDate}T00:00:00`) : null}
                        minDate={seriesStart}
                        onSelect={(d) => {
                          setEndDate(toDateInput(d));
                          setEndPickerOpen(false);
                        }}
                      />
                    </span>
                  ) : null}
                </span>
              ) : null}
              {option.mode === "after" && endMode === "after" ? (
                <input
                  type="number"
                  min={1}
                  max={365}
                  aria-label="Occurrence count"
                  value={endCount}
                  onChange={(e) => setEndCount(Number(e.target.value))}
                  className="h-8 w-20 rounded-md border border-zinc-200 bg-transparent px-2 text-xs dark:border-zinc-800"
                />
              ) : null}
            </label>
          ))}
        </div>
      </div>

      <Button size="sm" onClick={commit} className="w-full">
        Done
      </Button>
    </div>
  );
}

function toDateInput(value: Date | string): string {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
