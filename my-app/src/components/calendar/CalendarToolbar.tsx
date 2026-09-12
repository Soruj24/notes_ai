"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Tooltip } from "@/src/components/ui/tooltip";
import { VIEW_TITLES, type CalendarView } from "@/src/components/calendar/types";
import { cx } from "@/src/lib/utils/cx";

const views: CalendarView[] = ["day", "week", "month", "agenda"];

interface CalendarToolbarProps {
  view: CalendarView;
  title: string;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onNew: () => void;
  /** Overrides the "Calendar · View" eyebrow (e.g. the Schedule route). */
  eyebrow?: string;
  /** Optional one-line context shown under the title. */
  description?: string;
}

/** Heading + view switcher + date navigation + new-event action. */
export function CalendarToolbar({ view, title, onPrev, onToday, onNext, onNew, eyebrow, description }: CalendarToolbarProps) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
            {eyebrow ?? `Calendar · ${VIEW_TITLES[view]}`}
          </p>
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
            {title}
          </h1>
          {description ? (
            <p className="mt-0.5 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">{description}</p>
          ) : null}
        </div>
        <Button size="sm" onClick={onNew} className="ml-auto shrink-0">
          <Plus size={15} aria-hidden="true" />
          New event
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="grid max-w-full grid-cols-4 gap-1 rounded-xl bg-zinc-100 p-1 max-sm:w-full dark:bg-zinc-900"
          role="tablist"
          aria-label="Calendar views"
        >
          {views.map((v) => {
            const selected = view === v;
            return (
              <Link
                key={v}
                href={v === "week" ? "/calendar" : `/calendar/${v}`}
                role="tab"
                aria-selected={selected}
                className={cx(
                  "rounded-lg px-2.5 py-1.5 text-center text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 sm:px-3.5",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {VIEW_TITLES[v]}
              </Link>
            );
          })}
        </span>
        <span className="flex shrink-0 items-center gap-1" role="group" aria-label="Change period">
          <Tooltip content="Previous period">
            <Button size="icon" variant="outline" onClick={onPrev} aria-label="Previous period" className="h-8 w-8">
              <ChevronLeft size={16} aria-hidden="true" />
            </Button>
          </Tooltip>
          <Button size="sm" variant="outline" onClick={onToday} className="h-8">
            Today
          </Button>
          <Tooltip content="Next period">
            <Button size="icon" variant="outline" onClick={onNext} aria-label="Next period" className="h-8 w-8">
              <ChevronRight size={16} aria-hidden="true" />
            </Button>
          </Tooltip>
        </span>
        <p className="hidden text-xs text-zinc-400 lg:block dark:text-zinc-500">
          Tip: double-click a time slot to create an event there.
        </p>
      </div>
    </div>
  );
}
