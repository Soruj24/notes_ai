"use client";

import { useMemo } from "react";
import { EventBlock, HOUR_PX } from "@/src/components/calendar/EventBlock";
import { dayKey } from "@/src/lib/scheduling/range";
import { layoutDayColumns } from "@/src/lib/scheduling/items";
import { decodeDrag, type MoveTarget } from "@/src/lib/scheduling/move";
import { formatHour, type ScheduleItemDTO } from "@/src/components/calendar/types";
import { cx } from "@/src/lib/utils/cx";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

interface TimeGridProps {
  days: Date[];
  items: ScheduleItemDTO[];
  onSelect: (item: ScheduleItemDTO) => void;
  onMove: (item: ScheduleItemDTO, target: MoveTarget) => void;
  onCreateSlot: (day: Date, minutes: number) => void;
}

/**
 * Reusable time grid for day + week views. Hour cells are drop targets;
 * double-click opens the editor preset for that slot.
 */
export function TimeGrid({ days, items, onSelect, onMove, onCreateSlot }: TimeGridProps) {
  const byDay = useMemo(() => {
    const map = new Map<string, ScheduleItemDTO[]>();
    for (const item of items) {
      if (item.allDay) continue;
      const key = dayKey(new Date(item.start));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const allDayByDay = useMemo(() => {
    const map = new Map<string, ScheduleItemDTO[]>();
    for (const item of items) {
      if (!item.allDay) continue;
      const key = dayKey(new Date(item.start));
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  function dropOn(e: React.DragEvent, day: Date, minutes?: number) {
    e.preventDefault();
    const raw = e.dataTransfer.getData("application/x-notoai-schedule");
    const drag = decodeDrag(raw);
    if (!drag) return;
    const original: ScheduleItemDTO = {
      key: "",
      kind: drag.kind,
      sourceId: drag.sourceId,
      title: "",
      start: drag.start,
      end: drag.end,
      allDay: drag.allDay,
      status: "",
    };
    onMove(original, { day, minutes });
  }

  const todayKey = dayKey(new Date());
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Day view fits any width; multi-day grids scroll horizontally instead
  // of crushing columns on phones.
  const multiDay = days.length > 1;
  // Single-day grids only render from the day view — this hint never
  // appears on week, month, or agenda.
  const showEmptyHint = !multiDay && items.length === 0;
  return (
    <>
    {showEmptyHint ? (
      <p className="rounded-xl border border-dashed border-zinc-200 bg-white px-4 py-3 text-center text-[13px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
        This day is empty — double-click any time slot below to schedule your first block.
      </p>
    ) : null}
    <div className={multiDay ? "overflow-x-auto rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950" : "rounded-xl border border-zinc-200/90 bg-white dark:border-zinc-800 dark:bg-zinc-950"}>
      <div className={multiDay ? `grid min-w-[620px]` : "grid"} style={{ gridTemplateColumns: `3.75rem repeat(${days.length}, minmax(0, 1fr))` }}>
        {/* Day headers */}
        <div className="border-b border-zinc-200 px-1 py-2 dark:border-zinc-800" aria-hidden="true" />
        {days.map((day) => {
          const key = dayKey(day);
          const isToday = key === todayKey;
          return (
            <div
              key={`head-${key}`}
              className={cx(
                "flex items-baseline justify-center gap-1.5 border-b border-l border-zinc-200 px-1 py-2 dark:border-zinc-800",
                isToday && "bg-indigo-50/50 dark:bg-indigo-950/30",
              )}
            >
              <span className="text-[11px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cx(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[13px] tabular-nums",
                  isToday
                    ? "bg-indigo-600 font-bold text-white dark:bg-indigo-400 dark:text-zinc-950"
                    : "font-semibold text-zinc-900 dark:text-zinc-100",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}

        {/* All-day row */}
        <div className="border-b border-zinc-200 px-1 py-2 text-right text-[11px] font-medium text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
          All-day
        </div>
        {days.map((day) => {
          const key = dayKey(day);
          const list = allDayByDay.get(key) ?? [];
          return (
            <div
              key={`allday-${key}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropOn(e, day)}
              className={cx(
                "flex min-h-10 flex-col justify-center gap-1 border-b border-l border-zinc-200 p-1.5 dark:border-zinc-800",
                key === todayKey && "bg-zinc-50/70 dark:bg-zinc-900/40",
              )}
            >
              {list.length === 0 ? (
                <span aria-hidden="true" className="px-1 text-[11px] text-zinc-300 dark:text-zinc-700">—</span>
              ) : (
                list.slice(0, 3).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    draggable
                    onDragStart={(e) => {
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
                    onClick={() => onSelect(item)}
                    className={cx(
                      "truncate rounded-md px-1.5 py-0.5 text-left text-xs font-medium focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-500",
                      item.kind === "task"
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                        : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900",
                    )}
                  >
                    {item.title}
                  </button>
                ))
              )}
            </div>
          );
        })}

        {/* Hour gutter + day columns */}
        <div className="relative" aria-hidden="true">
          {HOURS.map((h) => (
            <div
              key={h}
              className="border-b border-zinc-100 pr-1.5 text-right text-[11px] text-zinc-400 tabular-nums dark:border-zinc-900 dark:text-zinc-500"
              style={{ height: `${HOUR_PX}px` }}
            >
              <span>{h === 0 ? "" : formatHour(new Date(2000, 0, 1, h))}</span>
            </div>
          ))}
        </div>
        {days.map((day) => {
          const key = dayKey(day);
          const isToday = key === todayKey;
          const laidOut = layoutDayColumns(byDay.get(key) ?? []);
          return (
            <div key={key} className={cx("relative border-l border-zinc-200 dark:border-zinc-800", isToday && "bg-zinc-50/50 dark:bg-zinc-900/30")}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  data-day={key}
                  data-hour={h}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const hour = Number(
                      (e.target as HTMLElement).closest("[data-hour]")?.getAttribute("data-hour") ?? h,
                    );
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const minutes = hour * 60 + Math.floor(((e.clientY - rect.top) / rect.height) * 60);
                    dropOn(e, day, Math.max(0, Math.min(1439, minutes)));
                  }}
                  onDoubleClick={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    const minutes = h * 60 + Math.floor(((e.clientY - rect.top) / rect.height) * 60);
                    onCreateSlot(day, minutes);
                  }}
                  className="border-b border-zinc-100 dark:border-zinc-900"
                  style={{ height: `${HOUR_PX}px` }}
                />
              ))}
              {isToday ? (
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute right-0 left-0 z-10 flex items-center"
                  style={{ top: `${(nowMin / 60) * HOUR_PX}px` }}
                >
                  <span className="h-2 w-2 -translate-x-1/2 rounded-full bg-red-500" />
                  <span className="h-px flex-1 bg-red-500/70" />
                </div>
              ) : null}
              {laidOut.map((l) => (
                <EventBlock
                  key={l.item.key}
                  item={l.item}
                  column={l.column}
                  columns={l.columns}
                  onSelect={onSelect}
                  compact={days.length > 2}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
    </>
  );
}
