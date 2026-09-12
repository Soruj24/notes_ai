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
    <div className="rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-3 py-2.5 dark:border-zinc-900">
        <div>
          <h3 className="text-xs font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">Suggested dependencies</h3>
          <p className="text-[11px] leading-4 text-zinc-500">AI — not yet saved. Review before accepting.</p>
        </div>
        <div className="flex gap-1.5">
          <button onClick={onAcceptAll} disabled={isProcessing} className="h-7 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">
            Accept all
          </button>
          <button onClick={onRejectAll} className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
            Reject all
          </button>
        </div>
      </div>

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
        {suggestions.map((s) => (
          <li key={`${s.sourceTaskId}->${s.targetTaskId}`} className="flex items-start gap-3 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{taskTitles.get(s.sourceTaskId) ?? s.sourceTaskId.slice(0, 6)}</span>
                <span className="text-zinc-400">→</span>
                <span className="truncate font-medium text-zinc-900 dark:text-zinc-100">{taskTitles.get(s.targetTaskId) ?? s.targetTaskId.slice(0, 6)}</span>
                <span className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[10px] font-medium text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">{Math.round(s.confidence * 100)}%</span>
              </div>
              <p className="mt-1 text-xs leading-4 text-zinc-500">{s.reason}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => onAccept(s)} disabled={isProcessing} className="h-7 rounded-md bg-zinc-900 px-2.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">
                Accept
              </button>
              <button onClick={() => onReject(s)} className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
                Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
