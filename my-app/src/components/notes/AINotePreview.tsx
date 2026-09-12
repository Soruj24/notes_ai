"use client";

import { useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { useToast } from "@/src/components/ui/toast";
import type { NoteAIResult, NoteSuggestion } from "@/src/lib/ai/note-intelligence";

interface AINotePreviewProps {
  result: NoteAIResult;
  appliedKeys: Set<string>;
  onApplyTask: (s: NoteSuggestion) => void;
  onApplyReminder: (s: NoteSuggestion) => void;
  onApplyTag: (s: NoteSuggestion) => void;
  onApplyTitle: (s: NoteSuggestion) => void;
  onReplaceBody: (text: string) => void;
  onDismiss: () => void;
}

function suggestionKey(s: NoteSuggestion, index: number): string {
  return `${s.kind}:${s.label}:${index}`;
}

/** Applied tracking ignores the index: duplicates share applied state. */
function appliedKey(s: NoteSuggestion): string {
  return `${s.kind}:${s.label}`;
}

/**
 * Preview surface for AI output. Text results offer copy/replace (replace
 * confirms first); every creatable suggestion applies individually or all
 * at once. Nothing here mutates data by itself.
 */
export function AINotePreview({
  result,
  appliedKeys,
  onApplyTask,
  onApplyReminder,
  onApplyTag,
  onApplyTitle,
  onReplaceBody,
  onDismiss,
}: AINotePreviewProps) {
  const { toast } = useToast();
  const [confirmReplace, setConfirmReplace] = useState(false);

  const tasks = result.suggestions.filter((s) => s.kind === "task");
  const reminders = result.suggestions.filter((s) => s.kind === "reminder");
  const tags = result.suggestions.filter((s) => s.kind === "tag");
  const titles = result.suggestions.filter((s) => s.kind === "title");
  const keywords = result.suggestions.filter((s) => s.kind === "keyword");
  const dates = result.suggestions.filter((s) => s.kind === "date");

  async function copyText() {
    try {
      await navigator.clipboard.writeText(result.text ?? "");
      toast("Copied to clipboard.", { tone: "success" });
    } catch {
      toast("Could not copy.", { tone: "danger" });
    }
  }

  return (
    <section
      aria-label="AI preview"
      className="grid gap-3 rounded-2xl border border-indigo-600/20 bg-indigo-50/40 p-4 sm:p-5 dark:border-indigo-400/20 dark:bg-indigo-950/30"
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-300"
        >
          <Sparkles size={14} />
        </span>
        <span className="text-[13px] font-semibold text-zinc-900 dark:text-zinc-50">
          AI preview
          <span className="ml-1.5 font-normal text-zinc-500 dark:text-zinc-400">— nothing applied yet</span>
        </span>
        <Button
          size="icon"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss AI preview"
          className="ml-auto h-8 w-8"
        >
          <X size={15} aria-hidden="true" />
        </Button>
      </div>

      {result.text ? (
        <div className="grid gap-2">
          <p className="text-sm leading-6 whitespace-pre-wrap">{result.text}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => void copyText()}>
              Copy
            </Button>
            {result.action === "rewrite" ? (
              <Button size="sm" variant="outline" onClick={() => setConfirmReplace(true)}>
                Replace note content…
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {titles.map((s, i) => (
        <SuggestionRow
          key={suggestionKey(s, i)}
          label={`Title: ${s.label}`}
          applied={appliedKeys.has(appliedKey(s))}
          onApply={() => onApplyTitle(s)}
          applyLabel="Use title"
        />
      ))}

      {tasks.length > 0 ? (
        <SuggestionGroup
          title={`Tasks (${tasks.length})`}
          onApplyAll={() => tasks.forEach((s) => {
            if (!appliedKeys.has(appliedKey(s))) onApplyTask(s);
          })}
        >
          {tasks.map((s, i) => (
            <SuggestionRow
              key={suggestionKey(s, i)}
              label={s.label}
              detail={s.detail}
              applied={appliedKeys.has(appliedKey(s))}
              onApply={() => onApplyTask(s)}
              applyLabel="Create task"
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {reminders.length > 0 ? (
        <SuggestionGroup
          title={`Reminders (${reminders.length})`}
          onApplyAll={() => reminders.forEach((s) => {
            if (!appliedKeys.has(appliedKey(s))) onApplyReminder(s);
          })}
        >
          {reminders.map((s, i) => (
            <SuggestionRow
              key={suggestionKey(s, i)}
              label={s.label}
              detail={s.detail}
              applied={appliedKeys.has(appliedKey(s))}
              onApply={() => onApplyReminder(s)}
              applyLabel="Create reminder"
            />
          ))}
        </SuggestionGroup>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((s, i) =>
            appliedKeys.has(appliedKey(s)) ? (
              <Badge key={suggestionKey(s, i)}>
                #{s.label} <Check size={11} aria-hidden="true" className="inline" />
              </Badge>
            ) : (
              <button
                key={suggestionKey(s, i)}
                type="button"
                onClick={() => onApplyTag(s)}
                title="Apply tag"
                className="rounded-full border border-dashed border-zinc-300 px-2 py-0.5 text-xs text-zinc-600 transition-colors hover:border-zinc-500 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                + #{s.label}
              </button>
            ),
          )}
        </div>
      ) : null}

      {keywords.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((s, i) => (
            <Badge key={suggestionKey(s, i)} size="sm">
              {s.label}
            </Badge>
          ))}
        </div>
      ) : null}

      {dates.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {dates.map((s, i) => (
            <li key={suggestionKey(s, i)} className="flex gap-2">
              <span className="font-medium">{s.label}</span>
              <span className="text-zinc-500">{s.detail}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!result.text && result.suggestions.length === 0 ? (
        <p className="text-sm text-zinc-500">Nothing found — try different wording.</p>
      ) : null}

      <Dialog
        open={confirmReplace}
        onClose={() => setConfirmReplace(false)}
        title="Replace note content?"
        description="The current body will be replaced by the rewritten version. This is a significant change."
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmReplace(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setConfirmReplace(false);
                if (result.text) onReplaceBody(result.text);
              }}
            >
              Replace content
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">You can undo with Ctrl+Z right after.</p>
      </Dialog>
    </section>
  );
}

function SuggestionGroup({
  title,
  onApplyAll,
  children,
}: {
  title: string;
  onApplyAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center gap-2">
        <p className="text-xs font-medium text-zinc-500">{title}</p>
        <Button size="sm" variant="ghost" onClick={onApplyAll} className="ml-auto h-7 text-xs">
          Apply all
        </Button>
      </div>
      {children}
    </div>
  );
}

function SuggestionRow({
  label,
  detail,
  applied,
  onApply,
  applyLabel,
}: {
  label: string;
  detail?: string;
  applied: boolean;
  onApply: () => void;
  applyLabel: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm">{label}</p>
        {detail ? <p className="truncate text-xs text-zinc-500">{detail}</p> : null}
      </div>
      {applied ? (
        <Badge size="sm" tone="success">
          Applied <Check size={11} aria-hidden="true" className="inline" />
        </Badge>
      ) : (
        <Button size="sm" variant="secondary" onClick={onApply} className="h-7 text-xs">
          {applyLabel}
        </Button>
      )}
    </div>
  );
}
