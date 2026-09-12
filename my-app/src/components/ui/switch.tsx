import type { InputHTMLAttributes, ReactNode } from "react";
import { cx } from "@/src/lib/utils/cx";

interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label: ReactNode;
  description?: ReactNode;
}

/** CSS-only switch: native checkbox with role=switch drives the track/knob. */
export function Switch({ label, description, id, className, ...rest }: SwitchProps) {
  return (
    <label
      htmlFor={id}
      className={cx(
        "group flex cursor-pointer items-start gap-2.5",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        id={id}
        type="checkbox"
        role="switch"
        className="peer sr-only"
        {...rest}
      />
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border border-zinc-300 bg-zinc-200 px-0.5 transition-colors peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100"
      >
        <span className="h-3.5 w-3.5 rounded-full bg-white transition-transform group-has-checked:translate-x-4 dark:bg-zinc-500 dark:group-has-checked:bg-zinc-950" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm leading-5">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-zinc-500">{description}</span>
        ) : null}
      </span>
    </label>
  );
}
