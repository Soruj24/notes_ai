"use client";

import { useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { cx } from "@/src/lib/utils/cx";

interface AIInputProps {
  onSend: (text: string) => void;
  streaming: boolean;
  placeholder?: string;
}

/** Command input: Enter sends, Shift+Enter breaks lines. */
export function AIInput({ onSend, streaming, placeholder }: AIInputProps) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);

  function submit() {
    const text = value.trim();
    if (!text || streaming) return;
    setValue("");
    onSend(text);
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className={cx(
          "flex items-end gap-2 rounded-2xl border bg-white p-2 pl-3.5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow] dark:bg-zinc-950 dark:shadow-none",
          focused
            ? "border-indigo-500 ring-4 ring-indigo-500/15 dark:border-indigo-400"
            : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
        )}
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder ?? "Ask or command…"}
          aria-label="AI command input"
          rows={1}
          disabled={streaming}
          className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm leading-6 outline-none placeholder:text-zinc-400 disabled:opacity-50 dark:placeholder:text-zinc-500"
        />
        <Button
          type="submit"
          size="icon"
          disabled={streaming || !value.trim()}
          aria-label="Send message"
          className="h-9 w-9 shrink-0 rounded-xl"
        >
          <ArrowUp size={16} aria-hidden="true" />
        </Button>
      </form>
      <p className="mt-1.5 px-1 text-[11px] text-zinc-400 dark:text-zinc-500">
        Enter to send · Shift+Enter for a new line
      </p>
    </div>
  );
}
