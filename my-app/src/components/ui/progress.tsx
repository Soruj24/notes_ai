import { cx } from "@/src/lib/utils/cx";

interface ProgressBase {
  value: number;
  label?: string;
  className?: string;
}

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Accessible linear progress bar with width transition. */
export function ProgressBar({ value, label, className }: ProgressBase) {
  const percent = clamp(value);
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900"
      >
        <div
          className="h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** Compact SVG ring for cards and headers. */
export function ProgressRing({
  value,
  label,
  className,
  size = 44,
}: ProgressBase & { size?: number }) {
  const percent = clamp(value);
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
      className={cx("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          className="stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="stroke-zinc-900 transition-[stroke-dashoffset] duration-300 dark:stroke-zinc-100"
        />
      </svg>
      <span className="absolute text-[11px] font-semibold">{percent}%</span>
    </div>
  );
}

/** "3 of 8 done" caption. */
export function ProgressText({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  return (
    <span className={cx("text-xs text-zinc-500", className)}>
      {total === 0 ? "No tasks yet" : `${done} of ${total} done`}
    </span>
  );
}
