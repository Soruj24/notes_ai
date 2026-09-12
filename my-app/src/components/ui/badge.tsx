import type { ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";
export type BadgeSize = "sm" | "md";

const tones: Record<BadgeTone, string> = {
  neutral:
    "border-zinc-200 bg-zinc-100/80 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300",
  accent:
    "border-indigo-600/20 bg-indigo-50 text-indigo-700 dark:border-indigo-400/25 dark:bg-indigo-950/60 dark:text-indigo-300",
  success:
    "border-emerald-600/20 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-950/60 dark:text-emerald-300",
  warning:
    "border-amber-600/25 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-950/60 dark:text-amber-300",
  danger:
    "border-red-600/20 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-950/60 dark:text-red-300",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-1.5 py-px text-[11px] font-semibold",
  md: "px-2 py-0.5 text-xs font-medium",
};

interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", size = "md", className, children }: BadgeProps) {
  return (
    <span
      className={cx(
        "inline-flex w-fit items-center gap-1 rounded-full border font-medium whitespace-nowrap",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
