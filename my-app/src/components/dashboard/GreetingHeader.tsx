import Link from "next/link";
import { CalendarClock, Plus } from "lucide-react";

interface GreetingHeaderProps {
  userName: string;
  now?: Date;
}

function greetingFor(hour: number): string {
  if (hour < 5) return "Up late";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Briefing hero: greeting + date context + primary day actions. */
export function GreetingHeader({ userName, now = new Date() }: GreetingHeaderProps) {
  const firstName = userName.split(" ")[0] || userName;
  const dateLine = now.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-[0.08em] text-zinc-400 uppercase dark:text-zinc-500">
          {dateLine}
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-[28px] sm:leading-9 dark:text-zinc-50">
          {greetingFor(now.getHours())}, {firstName}
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          Here is what needs your attention today — tasks, schedule, and signals in one briefing.
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Link
          href="/planner"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-colors hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-px dark:border-zinc-800 dark:bg-transparent dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <CalendarClock size={15} aria-hidden="true" />
          Plan day
        </Link>
        <Link
          href="/tasks"
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-px dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-white"
        >
          <Plus size={15} aria-hidden="true" />
          Add task
        </Link>
      </div>
    </div>
  );
}
