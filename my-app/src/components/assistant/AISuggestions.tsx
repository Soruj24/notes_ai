"use client";

import { CalendarClock, ListTodo, Search, Sparkles, StickyNote, Sunrise } from "lucide-react";
import { SUGGESTIONS } from "@/src/components/assistant/types";

const icons = [ListTodo, Sunrise, StickyNote, Search, CalendarClock, Sunrise];

/** Starter prompts shown on an empty thread. One tap to run. */
export function AISuggestions({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto grid w-full max-w-xl gap-3 py-6">
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <Sparkles size={22} />
        </span>
        <p className="mt-3 text-[15px] font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          How can I help?
        </p>
        <p className="mt-1 max-w-sm text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          I can create tasks and events, plan your day, and find things across your notes.
        </p>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {SUGGESTIONS.map((suggestion, i) => {
          const Icon = icons[i % icons.length];
          return (
            <li key={suggestion}>
              <button
                type="button"
                onClick={() => onPick(suggestion)}
                className="flex w-full items-start gap-2.5 rounded-xl border border-zinc-200/90 px-3 py-2.5 text-left text-[13px] leading-5 text-zinc-700 transition-[border-color,background-color,transform] hover:border-zinc-300 hover:bg-zinc-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 active:translate-y-px dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
              >
                <Icon size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-zinc-400" />
                <span className="min-w-0">{suggestion}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
