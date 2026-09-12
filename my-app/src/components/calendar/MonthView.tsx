"use client";

import { useMemo } from "react";
import { dayKey } from "@/src/lib/scheduling/range";
import { decodeDrag } from "@/src/lib/scheduling/move";
import type { ScheduleItemDTO } from "@/src/components/calendar/types";

interface MonthViewProps {
  days: Date[];
  items: ScheduleItemDTO[];
  currentMonth: number;
  onSelect: (item: ScheduleItemDTO) => void;
  onOpenDay: (day: Date) => void;
  onMoveDay: (item: ScheduleItemDTO, day: Date) => void;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** 6×7 month grid. Drops move items across days, keeping clock times. */
export function MonthView({ days, items, currentMonth, onSelect, onOpenDay, onMoveDay }: MonthViewProps) {
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItemDTO[]>();
    for (const item of items) {
      const key = dayKey(new Date(item.start));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const todayKey = dayKey(new Date());

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-800 dark:bg-zinc-900/40">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={`px-2 py-2 text-center text-[11px] font-semibold tracking-wide uppercase ${
              i >= 5 ? "text-zinc-400 dark:text-zinc-500" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            <span className="hidden sm:inline">{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i]}</span>
            <span className="sm:hidden">{d.charAt(0)}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day, i) => {
          const key = dayKey(day);
          const list = (byDay.get(key) ?? []).slice(0, 3);
          const extra = (byDay.get(key) ?? []).length - list.length;
          const outside = day.getMonth() !== currentMonth;
          return (
            <div
              key={`${key}-${i}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const drag = decodeDrag(e.dataTransfer.getData("application/x-notoai-schedule"));
                if (!drag) return;
                onMoveDay(
                  {
                    key: "",
                    kind: drag.kind,
                    sourceId: drag.sourceId,
                    title: "",
                    start: drag.start,
                    end: drag.end,
                    allDay: drag.allDay,
                    status: "",
                  },
                  day,
                );
              }}
              onClick={() => onOpenDay(day)}
              className={`min-h-20 cursor-pointer border-b border-r border-zinc-100 p-1 transition-colors last:border-r-0 hover:bg-indigo-50/40 sm:min-h-24 dark:border-zinc-900 dark:hover:bg-indigo-950/20 ${
                outside ? "bg-zinc-50/70 dark:bg-zinc-950" : ""
              } ${key === todayKey ? "bg-indigo-50/60 dark:bg-indigo-950/20" : ""}`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDay(day);
                }}
                aria-label={`Open ${day.toLocaleDateString(undefined, { month: "long", day: "numeric" })}`}
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
                  key === todayKey
                    ? "bg-indigo-600 font-bold text-white dark:bg-indigo-400 dark:text-zinc-950"
                    : outside
                      ? "text-zinc-400 dark:text-zinc-600"
                      : "font-semibold text-zinc-700 dark:text-zinc-300"
                }`}
              >
                {day.getDate()}
              </button>
              {/* Chips on larger phones; density dots on very small screens. */}
              <span className="mt-0.5 hidden min-[420px]:grid gap-0.5">
                {list.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    draggable
                    onDragStart={(e) => {
                      e.stopPropagation();
                      e.dataTransfer.setData(
                        "application/x-notoai-schedule",
                        JSON.stringify({
                          kind: item.kind,
                          sourceId: item.sourceId,
                          start: item.start,
                          end: item.end,
                          allDay: item.allDay,
                        }),
                      );
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(item);
                    }}
                    title={item.title}
                    className={`truncate rounded px-1 py-px text-left text-[11px] font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500 ${
                      item.kind === "task"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
                {extra > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDay(day);
                    }}
                    className="rounded px-1 text-left text-[11px] font-medium text-zinc-500 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100"
                  >
                    +{extra} more
                  </button>
                ) : null}
              </span>
              {(byDay.get(key) ?? []).length > 0 ? (
                <span aria-hidden="true" className="mt-1 flex justify-center gap-0.5 min-[420px]:hidden">
                  {(byDay.get(key) ?? []).slice(0, 3).map((item) => (
                    <span
                      key={item.key}
                      className={`h-1.5 w-1.5 rounded-full ${
                        item.kind === "task" ? "bg-amber-500" : "bg-zinc-900 dark:bg-zinc-100"
                      }`}
                    />
                  ))}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
