"use client";

import { useMemo } from "react";

export type GraphFilterValues = {
  status: string;
  priority: string;
  projectId: string;
  query: string;
};

interface Props {
  values: GraphFilterValues;
  onChange: (v: GraphFilterValues) => void;
  projectOptions: Array<{ id: string; label: string }>;
}

export function GraphFilters({ values, onChange, projectOptions }: Props) {
  const set = (k: keyof GraphFilterValues, v: string) => onChange({ ...values, [k]: v });
  const hasActive = useMemo(() => Object.values(values).some(Boolean), [values]);
  return (
    <div className="flex flex-wrap gap-2">
      <input
        placeholder="Search tasks"
        value={values.query}
        onChange={(e) => set("query", e.target.value)}
        className="h-8 w-40 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      />
      <select
        value={values.status}
        onChange={(e) => set("status", e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">All statuses</option>
        <option value="todo">Todo</option>
        <option value="in_progress">In progress</option>
        <option value="done">Done</option>
        <option value="archived">Archived</option>
      </select>
      <select
        value={values.priority}
        onChange={(e) => set("priority", e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">All priorities</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
      <select
        value={values.projectId}
        onChange={(e) => set("projectId", e.target.value)}
        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        <option value="">All projects</option>
        {projectOptions.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>
      {hasActive ? (
        <button
          onClick={() => onChange({ status: "", priority: "", projectId: "", query: "" })}
          className="h-8 rounded-md border border-zinc-200 px-2 text-sm dark:border-zinc-800"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
