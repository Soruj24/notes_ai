"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LayoutTemplate, Plus, Search, X } from "lucide-react";
import { TemplateCard } from "@/src/components/templates/TemplateCard";
import { TemplateEditorDialog } from "@/src/components/templates/TemplateEditorDialog";
import { TemplateUseDialog } from "@/src/components/templates/TemplateUseDialog";
import type { TemplateDTO } from "@/src/components/templates/types";
import { Button } from "@/src/components/ui/button";
import { Dialog } from "@/src/components/ui/dialog";
import { EmptyState } from "@/src/components/ui/empty-state";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import { cx } from "@/src/lib/utils/cx";

interface TemplatesExplorerProps {
  wid: string;
  userId: string;
  initial: TemplateDTO[];
}

type SourceFilter = "all" | "builtin" | "mine";

const sourceFilters: Array<{ id: SourceFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "builtin", label: "Built-in" },
  { id: "mine", label: "My templates" },
];

function isBuiltIn(t: TemplateDTO): boolean {
  return t.isPublic && !t.workspaceId;
}

function titlesOf(payload: Record<string, unknown>, key: string): string[] {
  const v = (payload as Record<string, unknown>)[key];
  if (!Array.isArray(v)) return [];
  return v
    .map((item) =>
      typeof item === "object" && item !== null
        ? String((item as Record<string, unknown>).title ?? "")
        : "",
    )
    .filter(Boolean);
}

/** Template library: preview, use, duplicate, edit, delete, create. */
export function TemplatesExplorer({ wid, userId, initial }: TemplatesExplorerProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [source, setSource] = useState<SourceFilter>("all");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<TemplateDTO | null>(null);
  const [using, setUsing] = useState<TemplateDTO | null>(null);
  const [editing, setEditing] = useState<TemplateDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<TemplateDTO | null>(null);

  async function onDuplicate(template: TemplateDTO) {
    try {
      const res = await fetch(`/api/workspaces/${wid}/templates/${template.id}/duplicate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      router.refresh();
      toast("Template duplicated.", { tone: "success" });
    } catch {
      toast("Could not duplicate.", { tone: "danger" });
    }
  }

  async function onDelete() {
    if (!deleting) return;
    setDeleting(null);
    try {
      const res = await fetch(`/api/workspaces/${wid}/templates/${deleting.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      toast("Could not delete the template.", { tone: "danger" });
    }
  }

  const canModify = (t: TemplateDTO): boolean =>
    !t.isPublic || t.ownerId === userId;

  const counts = useMemo(() => {
    return {
      all: initial.length,
      builtin: initial.filter(isBuiltIn).length,
      mine: initial.filter((t) => !isBuiltIn(t)).length,
    };
  }, [initial]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return initial.filter((t) => {
      if (source === "builtin" && !isBuiltIn(t)) return false;
      if (source === "mine" && isBuiltIn(t)) return false;
      if (!q) return true;
      return t.title.toLowerCase().includes(q) || t.kind.toLowerCase().includes(q);
    });
  }, [initial, source, query]);

  const searching = query.trim().length > 0;
  const previewNotes = preview ? titlesOf(preview.payload, "notes") : [];
  const previewTasks = preview ? titlesOf(preview.payload, "tasks") : [];
  const previewGoals = preview ? titlesOf(preview.payload, "goals") : [];
  const previewHasProject = Boolean(preview?.payload.project);

  return (
    <div className="fade-up grid gap-4 sm:gap-5">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900 sm:text-2xl dark:text-zinc-50">
              Templates
            </h1>
            <span
              aria-label={`${initial.length} templates`}
              className="rounded-full bg-zinc-900/[0.06] px-2 py-0.5 text-xs font-semibold text-zinc-600 tabular-nums dark:bg-white/[0.08] dark:text-zinc-300"
            >
              {initial.length}
            </span>
          </div>
          <p className="mt-0.5 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            Reusable structures — start from a built-in or craft your own.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="ml-auto shrink-0">
          <Plus size={15} aria-hidden="true" />
          New template
        </Button>
      </div>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <span
          className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 max-lg:w-full lg:w-auto dark:bg-zinc-900"
          role="tablist"
          aria-label="Template source filter"
        >
          {sourceFilters.map((f) => {
            const selected = source === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSource(f.id)}
                className={cx(
                  "flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500",
                  selected
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-950 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                )}
              >
                {f.label}
                <span
                  aria-label={`${counts[f.id]} ${f.label.toLowerCase()} templates`}
                  className={cx(
                    "rounded-full px-1.5 py-px text-[11px] font-bold tabular-nums",
                    selected
                      ? "bg-zinc-900/[0.07] text-zinc-700 dark:bg-white/10 dark:text-zinc-200"
                      : "bg-zinc-900/[0.05] text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500",
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </span>
        <div className="relative min-w-0 flex-1 lg:max-w-xs xl:ml-auto">
          <Search
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-zinc-400"
          />
          <Input
            id="templates-search"
            aria-label="Search templates"
            placeholder="Search templates…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pr-9 pl-9"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear template search"
              className="absolute top-1/2 right-1.5 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-white/[0.08] dark:hover:text-zinc-100"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>
      <p aria-live="polite" className="text-xs text-zinc-400 tabular-nums dark:text-zinc-500">
        {searching ? `${visible.length} of ${counts[source]} shown` : `${visible.length} ${visible.length === 1 ? "template" : "templates"}`}
      </p>
      {visible.length === 0 ? (
        <EmptyState
          icon={
            searching ? (
              <Search size={20} aria-hidden="true" />
            ) : (
              <LayoutTemplate size={20} aria-hidden="true" />
            )
          }
          title={searching ? "No matching templates" : source === "mine" ? "No custom templates yet" : "No templates"}
          description={
            searching
              ? `Nothing matches “${query.trim()}”. Clear the search to browse everything.`
              : "Start from a built-in or craft your own reusable structure."
          }
          action={
            searching ? (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setCreating(true)}>
                <Plus size={15} aria-hidden="true" />
                New template
              </Button>
            )
          }
        />
      ) : (
        <div className="grid items-start gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={() => setPreview(template)}
              onUse={() => setUsing(template)}
              onDuplicate={() => void onDuplicate(template)}
              onEdit={canModify(template) ? () => setEditing(template) : null}
              onDelete={canModify(template) ? () => setDeleting(template) : null}
            />
          ))}
        </div>
      )}

      <Dialog
        open={preview !== null}
        onClose={() => setPreview(null)}
        title={preview?.title ?? "Preview"}
        description={preview ? "Exactly what this template creates — as independent copies." : undefined}
        footer={
          <>
            <Button variant="ghost" onClick={() => setPreview(null)}>
              Close
            </Button>
            {preview ? (
              <Button
                onClick={() => {
                  setUsing(preview);
                  setPreview(null);
                }}
              >
                Use template
              </Button>
            ) : null}
          </>
        }
      >
        {preview ? (
          <div className="grid gap-3">
            {previewHasProject ? (
              <p className="rounded-lg bg-zinc-50 px-3 py-2 text-[13px] font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Creates a project shell plus the items below.
              </p>
            ) : null}
            {[
              { label: `Notes (${previewNotes.length})`, items: previewNotes },
              { label: `Tasks (${previewTasks.length})`, items: previewTasks },
              { label: `Goals (${previewGoals.length})`, items: previewGoals },
            ].map((group) =>
              group.items.length > 0 ? (
                <div key={group.label}>
                  <p className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-zinc-400 uppercase dark:text-zinc-500">
                    {group.label}
                  </p>
                  <ul className="grid gap-1">
                    {group.items.slice(0, 8).map((t, i) => (
                      <li
                        key={`${t}-${i}`}
                        className="truncate rounded-md bg-zinc-50 px-2.5 py-1.5 text-[13px] text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        {t}
                      </li>
                    ))}
                    {group.items.length > 8 ? (
                      <li className="px-2.5 text-xs text-zinc-400">
                        +{group.items.length - 8} more
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null,
            )}
            {previewNotes.length === 0 && previewTasks.length === 0 && previewGoals.length === 0 && !previewHasProject ? (
              <p className="text-sm text-zinc-500">This template is empty.</p>
            ) : null}
          </div>
        ) : null}
      </Dialog>

      {using ? (
        <TemplateUseDialog wid={wid} open onClose={() => setUsing(null)} template={using} />
      ) : null}
      {editing ? (
        <TemplateEditorDialog
          key={editing.id}
          wid={wid}
          open
          onClose={() => setEditing(null)}
          template={editing}
        />
      ) : null}
      {creating ? (
        <TemplateEditorDialog wid={wid} open onClose={() => setCreating(false)} template={null} />
      ) : null}
      <Dialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete template?"
        description={`"${deleting?.title}" will be deleted. Notes and tasks made from it stay untouched.`}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void onDelete()}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-zinc-500">This cannot be undone.</p>
      </Dialog>
    </div>
  );
}
