"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { Popover } from "@/src/components/ui/popover";
import { RecurrenceCustomForm } from "@/src/components/scheduling/RecurrenceCustomForm";
import { describeRecurrence } from "@/src/lib/recurrence/describe";
import {
  DEFAULT_RECURRENCE,
  type Frequency,
  type RecurrenceValue,
} from "@/src/lib/recurrence/types";
import { cx, focusRing } from "@/src/lib/utils/cx";

interface RecurrencePickerProps {
  value: RecurrenceValue;
  onChange: (value: RecurrenceValue) => void;
  /** Hide the Custom option (simple enum consumers like tasks). */
  allowCustom?: boolean;
  label?: string;
  compact?: boolean;
  className?: string;
}

const PRESETS: Array<{ id: Frequency; label: string }> = [
  { id: "none", label: "Once" },
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

/**
 * Custom repeat dropdown (never a native select). Presets commit instantly;
 * Custom reveals the progressive-disclosure form. Trigger reads
 * "Repeat / <summary>" or the compact "<summary> + chevron".
 */
export function RecurrencePicker({
  value,
  onChange,
  allowCustom = false,
  label = "Repeat",
  compact = false,
  className,
}: RecurrencePickerProps) {
  const [open, setOpen] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const summary =
    value.frequency === "none" &&
    value.interval <= 1 &&
    value.end.mode === "never"
      ? "Once"
      : describeRecurrence(value);

  function pick(frequency: Frequency) {
    onChange({ ...DEFAULT_RECURRENCE, frequency });
    setOpen(false);
  }

  const rowCount = PRESETS.length + (allowCustom ? 1 : 0);

  function openMenu() {
    const selectedIdx = PRESETS.findIndex(
      (p) =>
        value.frequency === p.id &&
        value.interval <= 1 &&
        value.end.mode === "never",
    );
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    setCustomizing(false);
    setOpen(true);
  }

  useEffect(() => {
    if (open && !customizing) {
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
        ?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, customizing]);

  function onListKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => {
        const next = (i + 1) % rowCount;
        listRef.current
          ?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
          ?.focus();
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => {
        const next = (i - 1 + rowCount) % rowCount;
        listRef.current
          ?.querySelector<HTMLElement>(`[data-idx="${next}"]`)
          ?.focus();
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setActive(0);
      listRef.current?.querySelector<HTMLElement>(`[data-idx="0"]`)?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      setActive(rowCount - 1);
      listRef.current
        ?.querySelector<HTMLElement>(`[data-idx="${rowCount - 1}"]`)
        ?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (active < PRESETS.length) {
        const preset = PRESETS[active];
        if (preset) pick(preset.id);
      } else if (allowCustom) {
        setCustomizing(true);
      }
    }
  }

  return (
    <div className={cx("relative", className)}>
      {!compact ? (
        <span className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        onClick={() => {
          if (open) setOpen(false);
          else openMenu();
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}, current: ${summary}`}
        className={cx(
          "flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900",
          focusRing,
          compact && "min-w-0",
        )}
      >
        {!compact ? (
          <span className="text-zinc-500">{label}</span>
        ) : null}
        <span className="truncate font-medium">{summary}</span>
        <ChevronDown size={14} aria-hidden="true" className="ml-auto shrink-0 text-zinc-400" />
      </button>
      <Popover
        open={open}
        onClose={() => setOpen(false)}
        label={label}
        widthClass="w-64"
      >
        {open ? (
          customizing ? (
            <RecurrenceCustomForm
              value={value.frequency === "none" ? { ...value, frequency: "weekly" } : value}
              onBack={() => setCustomizing(false)}
              onDone={(next) => {
                onChange(next);
                setCustomizing(false);
                setOpen(false);
              }}
            />
          ) : (
            <ul
              ref={listRef}
              className="grid gap-0.5 p-1.5"
              role="listbox"
              aria-label={label}
              aria-activedescendant={`repeat-opt-${active}`}
              onKeyDown={onListKey}
            >
              {PRESETS.map((preset, idx) => {
                const selected =
                  value.frequency === preset.id &&
                  value.interval <= 1 &&
                  value.end.mode === "never";
                return (
                  <li key={preset.id}>
                    <button
                      type="button"
                      id={`repeat-opt-${idx}`}
                      data-idx={idx}
                      role="option"
                      aria-selected={selected}
                      tabIndex={active === idx ? 0 : -1}
                      onClick={() => pick(preset.id)}
                      onMouseEnter={() => setActive(idx)}
                      onFocus={() => setActive(idx)}
                      className={cx(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        focusRing,
                        selected
                          ? "bg-zinc-100 font-medium dark:bg-zinc-900"
                          : active === idx
                            ? "bg-zinc-50 dark:bg-zinc-900/60"
                            : "hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{preset.label}</span>
                      {selected ? (
                        <Check size={14} aria-hidden="true" className="shrink-0" />
                      ) : null}
                    </button>
                  </li>
                );
              })}
              {allowCustom ? (
                <li>
                  <button
                    type="button"
                    id={`repeat-opt-${PRESETS.length}`}
                    data-idx={PRESETS.length}
                    role="option"
                    aria-selected={false}
                    tabIndex={active === PRESETS.length ? 0 : -1}
                    onClick={() => setCustomizing(true)}
                    onMouseEnter={() => setActive(PRESETS.length)}
                    onFocus={() => setActive(PRESETS.length)}
                    className={cx(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/60",
                      focusRing,
                      active === PRESETS.length && "bg-zinc-50 dark:bg-zinc-900/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate">Custom…</span>
                    <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-zinc-400" />
                  </button>
                </li>
              ) : null}
            </ul>
          )
        ) : null}
      </Popover>
    </div>
  );
}
