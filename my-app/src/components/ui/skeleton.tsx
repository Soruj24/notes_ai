import { cx } from "@/src/lib/utils/cx";

export type SkeletonTone = "text" | "block" | "circle";

interface SkeletonProps {
  tone?: SkeletonTone;
  className?: string;
}

/** Shimmer placeholder. Parents control size to match final content. */
export function Skeleton({ tone = "block", className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        "animate-pulse bg-zinc-200/80 dark:bg-zinc-800/80",
        tone === "text" && "h-4 rounded-md",
        tone === "block" && "rounded-lg",
        tone === "circle" && "rounded-full",
        className,
      )}
    />
  );
}

/** Three-line content placeholder for loading states. */
export function SkeletonLines({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cx("grid gap-3", className)}>
      <Skeleton tone="block" className="h-20 w-full" />
      <Skeleton tone="block" className="h-20 w-full" />
      <Skeleton tone="block" className="h-20 w-full" />
    </div>
  );
}
