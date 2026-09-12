"use client";

import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { OptionMenu } from "@/src/components/ui/option-menu";

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

const statusOptions = [
  { value: "", label: "All statuses" },
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "done", label: "Done" },
  { value: "archived", label: "Archived" },
];

const priorityOptions = [
  { value: "", label: "All priorities" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export function GraphFilters({ values, onChange, projectOptions }: Props) {
  const set = (k: keyof GraphFilterValues, v: string) => onChange({ ...values, [k]: v });
  const hasActive = useMemo(() => Object.values(values).some(Boolean), [values]);

  const projectOpts = useMemo(
    () => [{ value: "", label: "All projects" }, ...projectOptions.map((p) => ({ value: p.id, label: p.label }))],
    [projectOptions],
  );

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2">
      <div className="relative min-w-0 flex-1 sm:max-w-[240px]">
        <Search size={13} aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={values.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Search tasks"
          aria-label="Search tasks"
          className="h-7 w-full rounded-md border border-zinc-200 bg-white pl-7 pr-7 text-[13px] placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-0 dark:border-zinc-800 dark:bg-zinc-950 dark:placeholder:text-zinc-600"
        />
        {values.query ? (
          <button
            type="button"
            onClick={() => set("query", "")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            <X size={12} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <OptionMenu label="Status" value={values.status} options={statusOptions} onChange={(v) => set("status", v)} size="sm" widthClass="w-40" />
        <OptionMenu label="Priority" value={values.priority} options={priorityOptions} onChange={(v) => set("priority", v)} size="sm" widthClass="w-40" />
        <OptionMenu label="Project" value={values.projectId} options={projectOpts} onChange={(v) => set("projectId", v)} size="sm" widthClass="w-44" />
        {hasActive ? (
          <button
            type="button"
            onClick={() => onChange({ status: "", priority: "", projectId: "", query: "" })}
            className="h-7 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400"
          >
            Clear
          </button>
        ) : null}
      </div>
    </div>
  );
}
