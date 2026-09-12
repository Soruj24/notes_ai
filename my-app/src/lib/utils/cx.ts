/** Join class names, skipping falsy values. Single class-concat helper for all UI. */
export function cx(
  ...parts: Array<string | false | null | undefined>
): string {
  return parts.filter(Boolean).join(" ");
}

/** Shared keyboard-focus style. Apply to every interactive primitive. */
export const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:focus-visible:outline-indigo-400";

/** Shared field chrome: background, border, hover, focus, disabled, invalid. */
export const fieldChrome =
  "border-zinc-200 bg-white shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)] transition-[border-color,box-shadow] hover:border-zinc-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/15 focus:outline-none disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none dark:hover:border-zinc-700 dark:focus:border-indigo-400 dark:disabled:bg-zinc-900";

/** Shared label style for form fields. */
export const fieldLabel =
  "mb-1.5 block text-[13px] font-medium text-zinc-700 dark:text-zinc-300";

/** Shared sizes. Most primitives accept `size`: sm | md | lg. */
export type UISize = "sm" | "md" | "lg";
