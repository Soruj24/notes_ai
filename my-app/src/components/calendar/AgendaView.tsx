"use client";

import { useMemo } from "react";
import { CalendarX2, Plus, Repeat } from "lucide-react";
import { dayKey } from "@/src/lib/scheduling/range";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  formatDayHeading,
  toDate,
  type ScheduleItemDTO,
} from "@/src/components/calendar/types";

interface AgendaViewProps {
  items: ScheduleItemDTO[];
  onSelect: (item: ScheduleItemDTO) => void;
  /** Shown as a CTA in the empty state. The schedule route provides it. */
  onNew?: () => void;
}

/** Grouped chronological list. Used by the agenda view + schedule page. */
export function AgendaView({ items, onSelect, onNew }: AgendaViewProps) {
  const groups = useMemo(() => {
    const map = new Map<string, { day: Date; items: ScheduleItemDTO[] }>();
    for (const item of items) {
      const start = toDate(item.start);
      const key = dayKey(start);
      const group = map.get(key) ?? { day: new Date(start), items: [] };
      group.items.push(item);
      map.set(key, group);
    }
    return [...map.values()].sort((a, b) => a.day.getTime() - b.day.getTime());
  }, [items]);

  if (groups.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-14 text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
        >
          <CalendarX2 size={22} />
        </span>
        <h2 className="mt-4 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Nothing scheduled in this range
        </h2>
        <p className="mt-1.5 max-w-sm text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Events and task deadlines will appear here in chronological order.
        </p>
        {onNew ? (
          <Button size="sm" onClick={onNew} className="mt-5">
            <Plus size={15} aria-hidden="true" />
            New event
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {groups.map((group) => (
        <section key={dayKey(group.day)} aria-label={formatDayHeading(group.day)}>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold tracking-[0.06em] text-zinc-500 uppercase dark:text-zinc-400">
              {formatDayHeading(group.day)}
            </h2>
            <span
              aria-label={`${group.items.length} items`}
              className="rounded-full bg-zinc-900/[0.06] px-1.5 py-px text-[11px] font-semibold text-zinc-500 tabular-nums dark:bg-white/[0.08] dark:text-zinc-400"
            >
              {group.items.length}
            </span>
            <span aria-hidden="true" className="h-px flex-1 bg-zinc-100 dark:bg-zinc-900" />
          </div>
          <ul className="mt-2 grid gap-1.5">
            {group.items.map((item) => {
              const start = toDate(item.start);
              const end = toDate(item.end);
              const time = item.allDay
                ? "All day"
                : `${start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })} – ${end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="flex w-full items-center gap-3 rounded-xl border border-zinc-200/90 bg-white px-3.5 py-2.5 text-left shadow-[0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] hover:border-zinc-300 hover:shadow-[0_4px_12px_-4px_rgb(0_0_0/0.12)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none dark:hover:border-zinc-700"
                  >
                    <span className="w-36 shrink-0 text-xs text-zinc-500 tabular-nums max-sm:hidden dark:text-zinc-400">
                      {time}
                    </span>
                    <Badge size="sm" tone={item.kind === "task" ? "warning" : "accent"}>
                      {item.kind === "task" ? "Task" : "Event"}
                    </Badge>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{item.title}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500 sm:hidden dark:text-zinc-400">
                        {time}
                        {item.isRecurringInstance ? " · recurring" : ""}
                      </span>
                      {item.isRecurringInstance ? (
                        <span className="mt-0.5 hidden items-center gap-1 text-xs text-zinc-400 sm:flex dark:text-zinc-500">
                          <Repeat size={11} aria-hidden="true" /> recurring
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
