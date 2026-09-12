import { cx } from "@/src/lib/utils/cx";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

const sizes: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[11px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-xs",
  lg: "h-11 w-11 text-sm",
};

interface AvatarProps {
  name: string;
  size?: AvatarSize;
  title?: string;
  className?: string;
}

/** Initials avatar. Deterministic shade derived from the name. */
export function Avatar({ name, size = "md", title, className }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      role="img"
      aria-label={name}
      title={title ?? name}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-zinc-900/[0.07] font-semibold text-zinc-700 ring-1 ring-zinc-900/10 select-none dark:bg-zinc-100/10 dark:text-zinc-200 dark:ring-white/10",
        sizes[size],
        className,
      )}
    >
      <span aria-hidden="true">{initials || "•"}</span>
    </span>
  );
}
