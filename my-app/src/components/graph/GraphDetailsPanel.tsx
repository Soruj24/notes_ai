"use client";

import { useEffect, useMemo, useState } from "react";
import { OptionMenu } from "@/src/components/ui/option-menu";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { useGetTaskQuery, useUpdateTaskMutation, useCompleteTaskMutation, useReopenTaskMutation, useAddSubtaskMutation, useUpdateSubtaskMutation, useRemoveSubtaskMutation } from "@/src/store/tasksApi";

interface Props {
  wid?: string;
  selectedNode?: { id: string; title: string; status: string; priority: string } | null;
  selectedEdge?: { id: string; predecessorTaskId: string; successorTaskId: string; type: string } | null;
  onCreate: (pre: string, succ: string, type: string) => void;
  onDeleteEdge: (id: string) => void;
  onSelectTask?: (id: string) => void;
  tasks: Array<{ id: string; title: string; status?: string }>;
  isBlocked?: boolean;
  dependencies?: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: string }>;
  dependents?: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: string }>;
  onFocus?: () => void;
}

export function GraphDetailsPanel({
  wid,
  selectedNode,
  selectedEdge,
  onCreate,
  onDeleteEdge,
  onSelectTask,
  tasks,
  isBlocked,
  dependencies = [],
  dependents = [],
  onFocus,
}: Props) {
  const [pre, setPre] = useState("");
  const [succ, setSucc] = useState("");
  const [type, setType] = useState("blocks");
  const taskMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.title])), [tasks]);
  const taskOptions = useMemo(() => tasks.map((t) => ({ value: t.id, label: t.title.slice(0, 32) })), [tasks]);

  const { toast } = useToast();
  const [updateTask] = useUpdateTaskMutation();
  const [completeTask] = useCompleteTaskMutation();
  const [reopenTask] = useReopenTaskMutation();
  const [addSubtask] = useAddSubtaskMutation();
  const [updateSubtask] = useUpdateSubtaskMutation();
  const [removeSubtask] = useRemoveSubtaskMutation();

  // Fetch full task for selected node (for subtasks, assignee, dates, etc.)
  const { data: fullTask } = useGetTaskQuery(
    { wid: wid ?? "", id: selectedNode?.id ?? "" },
    { skip: !wid || !selectedNode?.id },
  ) as { data?: { id: string; title: string; status: string; priority: string; notes?: string; dueAt?: string; startAt?: string; durationMin?: number; ownerId?: string; subtasks: Array<{ id: string; title: string; done: boolean }> } };

  // Members for reassignment
  const [members, setMembers] = useState<Array<{ userId: string; name: string; email: string; role: string }>>([]);
  useEffect(() => {
    if (!wid) return;
    fetch(`/api/workspaces/${wid}/members`).then((r) => r.json()).then((j) => setMembers(j.members ?? [])).catch(() => {});
  }, [wid]);

  const [editingTitle, setEditingTitle] = useState("");
  useEffect(() => {
    if (fullTask?.title) queueMicrotask(() => setEditingTitle(fullTask.title));
  }, [fullTask?.title]);

  const [newSubtask, setNewSubtask] = useState("");

  if (!selectedNode && !selectedEdge) {
    return (
      <div className="flex h-full flex-col overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Details</h3>
        </div>
        <div className="flex flex-1 items-center justify-center p-8 text-center">
          <div>
            <p className="text-[13px] font-medium text-zinc-900 dark:text-zinc-100">Select a task</p>
            <p className="mx-auto mt-1 max-w-[20ch] text-xs leading-5 text-zinc-500">Tap a node to manage its task, dependencies, and chain.</p>
          </div>
        </div>
        <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-900 dark:bg-zinc-950">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Create dependency</p>
          <div className="mt-2 grid gap-2">
            <OptionMenu label="Predecessor" value={pre} options={[{ value: "", label: "Predecessor — blocks" }, ...taskOptions]} onChange={setPre} size="sm" widthClass="w-[260px]" />
            <OptionMenu label="Successor" value={succ} options={[{ value: "", label: "Successor — blocked" }, ...taskOptions]} onChange={setSucc} size="sm" widthClass="w-[260px]" />
            <OptionMenu label="Type" value={type} options={[{ value: "blocks", label: "blocks" }, { value: "blocked_by", label: "blocked_by" }, { value: "related", label: "related" }]} onChange={setType} size="sm" />
            <button onClick={() => pre && succ && onCreate(pre, succ, type)} disabled={!pre || !succ} className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full max-h-[720px] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-100 px-4 py-3 dark:border-zinc-900">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">Details</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {selectedNode ? (
          <div className="px-4 py-4">
            {/* Title — inline edit */}
            <div className="flex items-start justify-between gap-2">
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onBlur={() => {
                  if (wid && fullTask && editingTitle.trim() && editingTitle !== fullTask.title) {
                    updateTask({ wid, id: fullTask.id, body: { title: editingTitle.trim() } }).then(() => toast("Title updated", { tone: "success" }));
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && wid && fullTask) {
                    (e.target as HTMLInputElement).blur();
                  }
                }}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1.5 py-1 text-[13px] font-medium leading-5 text-zinc-900 hover:border-zinc-200 focus:border-zinc-900 focus:outline-none dark:text-zinc-50 dark:hover:border-zinc-800"
              />
              <div className="flex shrink-0 gap-1">
                {onFocus ? (
                  <button onClick={onFocus} className="rounded border border-zinc-200 px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400">Focus</button>
                ) : null}
                {fullTask?.status !== "done" ? (
                  <button
                    onClick={() => wid && fullTask && completeTask({ wid, id: fullTask.id }).then(() => toast("Marked done"))}
                    className="rounded bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900"
                  >
                    Done
                  </button>
                ) : (
                  <button onClick={() => wid && fullTask && reopenTask({ wid, id: fullTask.id }).then(() => toast("Reopened"))} className="rounded border px-2 py-1 text-[11px]">Reopen</button>
                )}
              </div>
            </div>

            {/* Status / Priority / Blocked */}
            <div className="mt-2 grid grid-cols-2 gap-2">
              <OptionMenu
                label="Status"
                value={fullTask?.status ?? selectedNode.status}
                options={[
                  { value: "todo", label: "To do" },
                  { value: "in_progress", label: "In progress" },
                  { value: "done", label: "Done" },
                  { value: "archived", label: "Archived" },
                ]}
                onChange={(v) => wid && fullTask && updateTask({ wid, id: fullTask.id, body: { status: v } })}
                size="sm"
              />
              <OptionMenu
                label="Priority"
                value={fullTask?.priority ?? selectedNode.priority}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "urgent", label: "Urgent" },
                ]}
                onChange={(v) => wid && fullTask && updateTask({ wid, id: fullTask.id, body: { priority: v } })}
                size="sm"
              />
            </div>

            {/* Due / Duration / Assignee */}
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Due</label>
                  <input
                    type="date"
                    value={fullTask?.dueAt ? new Date(fullTask.dueAt).toISOString().slice(0, 10) : ""}
                    onChange={(e) => {
                      const v = e.target.value ? new Date(e.target.value).toISOString() : null;
                      if (wid && fullTask) updateTask({ wid, id: fullTask.id, body: { dueAt: v } });
                    }}
                    className="mt-1 h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Duration (min)</label>
                  <input
                    type="number"
                    min={15}
                    max={240}
                    defaultValue={fullTask?.durationMin ?? ""}
                    onBlur={(e) => {
                      const n = Number(e.target.value);
                      if (wid && fullTask && Number.isFinite(n)) updateTask({ wid, id: fullTask.id, body: { durationMin: n } });
                    }}
                    placeholder="30"
                    className="mt-1 h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium uppercase tracking-wide text-zinc-500">Assignee</label>
                <select
                  value={fullTask?.ownerId ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (wid && fullTask && v) updateTask({ wid, id: fullTask.id, body: { ownerId: v } }).then(() => toast("Reassigned"));
                  }}
                  className="mt-1 h-7 w-full rounded-md border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <option value="">Select assignee</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3 rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-2 dark:border-zinc-900 dark:bg-zinc-900/30">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {isBlocked ? "Blocked" : "Ready"} · {selectedNode.status} · {selectedNode.priority}
                </span>
                <span className="font-mono text-zinc-500">{selectedNode.id.slice(0, 8)}</span>
              </div>
            </div>

            {/* Subtasks */}
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Subtasks · {fullTask?.subtasks.length ?? 0}</p>
              <div className="mt-2 grid gap-1.5">
                {(fullTask?.subtasks ?? []).map((s) => (
                  <label key={s.id} className="flex items-center gap-2 rounded border border-zinc-200 px-2 py-1.5 text-xs dark:border-zinc-800">
                    <input
                      type="checkbox"
                      checked={s.done}
                      onChange={(e) => wid && fullTask && updateSubtask({ wid, id: fullTask.id, subId: s.id, body: { done: e.target.checked } })}
                      className="h-3.5 w-3.5 rounded"
                    />
                    <span className={`flex-1 truncate ${s.done ? "line-through text-zinc-400" : "text-zinc-900 dark:text-zinc-100"}`}>{s.title}</span>
                    <button onClick={() => wid && fullTask && removeSubtask({ wid, id: fullTask.id, subId: s.id })} className="text-zinc-400 hover:text-red-600">
                      ×
                    </button>
                  </label>
                ))}
                <div className="flex gap-1">
                  <Input value={newSubtask} onChange={(e) => setNewSubtask(e.target.value)} placeholder="Add subtask" className="h-7 flex-1" />
                  <button
                    onClick={() => {
                      if (!newSubtask.trim() || !wid || !fullTask) return;
                      addSubtask({ wid, id: fullTask.id, title: newSubtask.trim() }).then(() => setNewSubtask(""));
                    }}
                    className="h-7 rounded-md bg-zinc-900 px-2 text-xs font-medium text-white dark:bg-white dark:text-zinc-900"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Dependencies */}
            <div className="mt-5 space-y-4">
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Dependencies · {dependencies.length}</p>
                <p className="text-[11px] leading-4 text-zinc-500">Upstream</p>
                {dependencies.length ? (
                  <ul className="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {dependencies.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 bg-white px-2.5 py-2 dark:bg-zinc-950">
                        <button onClick={() => onSelectTask?.(d.predecessorTaskId)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100">
                          {taskMap.get(d.predecessorTaskId) ?? d.predecessorTaskId.slice(0, 8)}
                        </button>
                        <span className="shrink-0 font-mono text-[10px] text-zinc-400">{d.type}</span>
                        <button onClick={() => onDeleteEdge(d.id)} className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-50 hover:text-red-600 dark:hover:bg-zinc-900">Remove</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">No dependencies</p>
                )}
              </section>
              <section>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Dependents · {dependents.length}</p>
                <p className="text-[11px] leading-4 text-zinc-500">Downstream</p>
                {dependents.length ? (
                  <ul className="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                    {dependents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 bg-white px-2.5 py-2 dark:bg-zinc-950">
                        <button onClick={() => onSelectTask?.(d.successorTaskId)} className="min-w-0 flex-1 truncate text-left text-[13px] font-medium text-zinc-900 hover:text-zinc-600 dark:text-zinc-100">
                          {taskMap.get(d.successorTaskId) ?? d.successorTaskId.slice(0, 8)}
                        </button>
                        <span className="shrink-0 font-mono text-[10px] text-zinc-400">{d.type}</span>
                        <button onClick={() => onDeleteEdge(d.id)} className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-zinc-500 hover:bg-zinc-50 hover:text-red-600 dark:hover:bg-zinc-900">Remove</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-zinc-200 bg-zinc-50 px-2.5 py-2 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/40">No dependents</p>
                )}
              </section>
            </div>
          </div>
        ) : null}

        {selectedEdge ? (
          <div className="mx-4 mb-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
            <p className="font-mono text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Edge {selectedEdge.id.slice(0, 8)}</p>
            <p className="mt-1 font-mono text-[11px] text-zinc-500">{selectedEdge.predecessorTaskId.slice(0, 6)} → {selectedEdge.successorTaskId.slice(0, 6)} · {selectedEdge.type}</p>
            <button onClick={() => onDeleteEdge(selectedEdge.id)} className="mt-2 w-full rounded bg-zinc-900 px-2 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900">Delete</button>
          </div>
        ) : null}
      </div>

      <div className="border-t border-zinc-100 bg-zinc-50/60 p-4 dark:border-zinc-900 dark:bg-zinc-950">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">Create dependency</p>
        <div className="mt-2 grid gap-2">
          <OptionMenu label="Predecessor" value={pre} options={[{ value: "", label: "Predecessor — blocks" }, ...taskOptions]} onChange={setPre} size="sm" widthClass="w-[260px]" />
          <OptionMenu label="Successor" value={succ} options={[{ value: "", label: "Successor — blocked" }, ...taskOptions]} onChange={setSucc} size="sm" widthClass="w-[260px]" />
          <OptionMenu label="Type" value={type} options={[{ value: "blocks", label: "blocks" }, { value: "blocked_by", label: "blocked_by" }, { value: "related", label: "related" }]} onChange={setType} size="sm" />
          <button onClick={() => pre && succ && onCreate(pre, succ, type)} disabled={!pre || !succ} className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-40 dark:bg-white dark:text-zinc-900">Add</button>
        </div>
      </div>
    </div>
  );
}
