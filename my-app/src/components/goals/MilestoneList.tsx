"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { MilestoneDTO } from "@/src/components/projects/types";

interface MilestoneListProps {
  wid: string;
  goalId: string;
  milestones: MilestoneDTO[];
}

/** Milestone checklist: add, toggle, remove. Server refreshes after each op. */
export function MilestoneList({ wid, goalId, milestones }: MilestoneListProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const base = `/api/workspaces/${wid}/goals/${goalId}/milestones`;

  async function mutate(url: string, init: RequestInit, error: string): Promise<boolean> {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error();
      router.refresh();
      return true;
    } catch {
      toast(error, { tone: "danger" });
      return false;
    }
  }

  async function onAdd(e?: React.FormEvent) {
    e?.preventDefault();
    const title = draft.trim();
    if (!title) return;
    setDraft("");
    await mutate(
      base,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      },
      "Could not add the milestone.",
    );
  }

  const done = milestones.filter((m) => m.done).length;
  const percent = milestones.length === 0 ? 0 : Math.round((done / milestones.length) * 100);

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Milestones
        </h2>
        <span
          aria-label={`${done} of ${milestones.length} milestones done`}
          className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-[11px] font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
        >
          {done}/{milestones.length}
        </span>
        {milestones.length > 0 ? (
          <span
            aria-hidden="true"
            className="h-1.5 min-w-16 flex-1 overflow-hidden rounded-full bg-zinc-100 sm:max-w-48 dark:bg-zinc-800"
          >
            <span
              className="block h-full rounded-full bg-zinc-900 transition-[width] duration-300 dark:bg-zinc-100"
              style={{ width: `${percent}%` }}
            />
          </span>
        ) : null}
      </div>
      {milestones.length === 0 ? (
        <p className="rounded-lg bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 dark:bg-zinc-900/60 dark:text-zinc-400">
          Break this goal into checkable milestones — each one moves the progress bar.
        </p>
      ) : (
        <ul className="grid gap-1.5">
          {milestones.map((m) => (
            <li
              key={m.id}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200/80 py-1 pr-1.5 pl-2.5 transition-colors hover:border-zinc-300 focus-within:border-indigo-400 dark:border-zinc-800/80 dark:hover:border-zinc-700"
            >
              <label className="-m-1 flex shrink-0 cursor-pointer items-center justify-center p-1">
                <span className="sr-only">{`Mark milestone "${m.title}" ${m.done ? "undone" : "done"}`}</span>
                <input
                  type="checkbox"
                  checked={m.done}
                  onChange={() =>
                    void mutate(
                      `${base}/${m.id}`,
                      {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ done: !m.done }),
                      },
                      "Could not update the milestone.",
                    )
                  }
                  aria-label={`Mark milestone "${m.title}" ${m.done ? "undone" : "done"}`}
                  className="h-4 w-4 cursor-pointer rounded accent-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:accent-zinc-100"
                />
              </label>
              <span className={`min-w-0 flex-1 truncate text-sm ${m.done ? "text-zinc-400 line-through dark:text-zinc-500" : "text-zinc-800 dark:text-zinc-200"}`}>
                {m.title}
              </span>
              <button
                type="button"
                onClick={() => void mutate(`${base}/${m.id}`, { method: "DELETE" }, "Could not remove the milestone.")}
                aria-label={`Remove milestone ${m.title}`}
                title={`Remove ${m.title}`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
              >
                <X size={13} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={(e) => void onAdd(e)} className="flex gap-2">
        <Input
          id={`milestone-add-${goalId}`}
          aria-label="Add a milestone"
          placeholder="Add a milestone…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          size="sm"
          className="min-w-0 flex-1"
        />
        <Button type="submit" size="sm" variant="secondary" disabled={!draft.trim()} className="shrink-0">
          <Plus size={13} aria-hidden="true" />
          Add
        </Button>
      </form>
    </div>
  );
}
