import type { InputHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cx } from "@/src/lib/utils/cx";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "role"> {
  label: ReactNode;
  description?: ReactNode;
}

/** CSS-only checkbox: native input drives styling via peer, no JS needed. */
export function Checkbox({ label, description, id, className, ...rest }: CheckboxProps) {
  return (
    <label
      htmlFor={id}
      className={cx(
        "flex cursor-pointer items-start gap-2.5",
        rest.disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input id={id} type="checkbox" className="peer sr-only" {...rest} />
      <span
        aria-hidden="true"
        className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border border-zinc-300 text-[10px] text-transparent transition-colors peer-checked:border-zinc-900 peer-checked:bg-zinc-900 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-zinc-500 dark:border-zinc-700 dark:peer-checked:border-zinc-100 dark:peer-checked:bg-zinc-100 dark:peer-checked:text-zinc-900"
      >
        <Check size={11} strokeWidth={3.5} aria-hidden="true" />
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
