"use client";

interface Suggestion {
  sourceTaskId: string;
  targetTaskId: string;
  reason: string;
  confidence: number;
}

interface Props {
  suggestions: Suggestion[];
  taskTitles: Map<string, string>;
  onAccept: (s: Suggestion) => void;
  onReject: (s: Suggestion) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  isProcessing?: boolean;
}

export function SuggestedDependencies({ suggestions, taskTitles, onAccept, onReject, onAcceptAll, onRejectAll, isProcessing }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-indigo-900 dark:text-indigo-200">Suggested Dependencies</h3>
          <p className="text-xs text-indigo-700/70 dark:text-indigo-300/70">AI inspected tasks, projects, goals, dates & durations. Accept does not auto-modify — choose individually.</p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onAcceptAll}
            disabled={isProcessing}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            Accept all
          </button>
          <button onClick={onRejectAll} className="rounded-md border border-indigo-200 bg-white px-3 py-1 text-xs hover:bg-indigo-50 dark:border-indigo-800 dark:bg-zinc-950">
            Reject all
          </button>
        </div>
      </div>

      <ul className="mt-3 grid gap-2">
        {suggestions.map((s) => (
          <li key={`${s.sourceTaskId}->${s.targetTaskId}`} className="flex items-center gap-2 rounded-lg border border-indigo-100 bg-white p-2.5 text-sm dark:border-indigo-900 dark:bg-zinc-950">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">{taskTitles.get(s.sourceTaskId) ?? s.sourceTaskId.slice(0, 6)}</span>
                <span className="text-zinc-400">may block</span>
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium dark:bg-zinc-800">{taskTitles.get(s.targetTaskId) ?? s.targetTaskId.slice(0, 6)}</span>
                <span className="ml-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:bg-amber-950/40">{Math.round(s.confidence * 100)}%</span>
              </div>
              <p className="mt-1 text-xs leading-4 text-zinc-500 dark:text-zinc-400">{s.reason}</p>
              <p className="mt-0.5 font-mono text-[10px] text-zinc-400">
                {s.sourceTaskId.slice(0, 6)} → {s.targetTaskId.slice(0, 6)}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button
                onClick={() => onAccept(s)}
                disabled={isProcessing}
                className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                Accept
              </button>
              <button onClick={() => onReject(s)} className="rounded border px-2.5 py-1 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-900">
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
