"use client";

import { useState } from "react";
import { ListTodo, PenLine, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import type { NoteAIAction } from "@/src/lib/ai/note-intelligence";

const READ_ACTIONS: Array<{ id: NoteAIAction; label: string }> = [
  { id: "summarize", label: "Summarize" },
  { id: "rewrite", label: "Rewrite" },
  { id: "generate_title", label: "Suggest title" },
  { id: "generate_keywords", label: "Keywords" },
];

const CREATE_ACTIONS: Array<{ id: NoteAIAction; label: string }> = [
  { id: "extract_tasks", label: "Extract tasks" },
  { id: "extract_dates", label: "Find dates" },
  { id: "extract_reminders", label: "Extract reminders" },
  { id: "generate_tags", label: "Suggest tags" },
];

interface NoteAIActionsProps {
  running: NoteAIAction | null;
  onRun: (action: NoteAIAction, question?: string) => void;
}

/** Action buttons + ask row. Running an action only previews — see AINotePreview. */
export function NoteAIActions({ running, onRun }: NoteAIActionsProps) {
  const [question, setQuestion] = useState("");
  const busy = running !== null;

  function group(
    title: string,
    icon: React.ReactNode,
    items: Array<{ id: NoteAIAction; label: string }>,
  ) {
    return (
      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
          <span aria-hidden="true" className="flex items-center">{icon}</span>
          {title}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {items.map((a) => (
            <Button
              key={a.id}
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => onRun(a.id)}
              aria-busy={running === a.id}
            >
              {running === a.id ? "Working…" : a.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="AI assistant"
      className="grid gap-4 rounded-2xl border border-zinc-200/90 bg-white p-5 shadow-[0_1px_2px_rgb(0_0_0/0.05)] sm:p-6 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300"
        >
          <Sparkles size={15} />
        </span>
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI assistant
          </h2>
          <p className="text-[13px] text-zinc-500 dark:text-zinc-400">
            Everything previews first — nothing applies automatically.
          </p>
        </div>
      </div>
      {group("Understand", <PenLine size={12} aria-hidden="true" />, READ_ACTIONS)}
      {group("Create from note", <ListTodo size={12} aria-hidden="true" />, CREATE_ACTIONS)}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim() && !busy) onRun("ask", question.trim());
        }}
        className="flex gap-2"
      >
        <Input
          id="note-ai-question"
          aria-label="Ask about this note"
          placeholder="Ask about this note…"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy}
          size="sm"
          className="flex-1"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={busy || !question.trim()}
          className="shrink-0"
        >
          {running === "ask" ? "Asking…" : "Ask"}
        </Button>
      </form>
    </section>
  );
}
