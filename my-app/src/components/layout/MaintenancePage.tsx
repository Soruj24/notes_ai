import Link from "next/link";
import { Wrench } from "lucide-react";
import { MaintenanceRefresh } from "@/src/components/layout/MaintenanceRefresh";

function formatEndTime(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Server-rendered downtime page. Content comes from stored configuration
 * (message + estimated end), never hardcoded. Refreshes itself so users
 * land back in the app the moment maintenance lifts.
 */
export function MaintenancePage({
  message,
  estimatedEndTime,
  allowAuthentication,
}: {
  message: string;
  estimatedEndTime: string;
  allowAuthentication: boolean;
}) {
  const expected = formatEndTime(estimatedEndTime);
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-4 text-zinc-950 dark:bg-black dark:text-zinc-50">
      <MaintenanceRefresh />
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          <Wrench size={22} />
        </span>
        <p className="mt-4 text-[11px] font-semibold tracking-widest text-zinc-500 uppercase dark:text-zinc-400">
          Scheduled maintenance
        </p>
        <h1 className="mt-1 text-xl font-semibold tracking-tight">We&rsquo;ll be right back</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">{message}</p>
        {expected ? (
          <p className="mt-3 rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            Expected back: {expected}
          </p>
        ) : null}
        {allowAuthentication ? (
          <Link
            href="/login"
            className="mt-6 inline-flex h-9 items-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Sign in
          </Link>
        ) : (
          <p className="mt-6 text-xs text-zinc-500">Sign-in is paused until maintenance completes.</p>
        )}
        <p className="mt-4 text-[11px] text-zinc-400">This page refreshes automatically.</p>
      </div>
    </div>
  );
}
