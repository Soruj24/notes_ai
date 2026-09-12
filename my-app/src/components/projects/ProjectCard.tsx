import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { ProgressBar, ProgressText } from "@/src/components/ui/progress";
import { isOverdueDue, type ProjectDTO } from "@/src/components/projects/types";
import { cx } from "@/src/lib/utils/cx";

const statusTone: Record<string, "neutral" | "accent" | "success" | "warning"> = {
  active: "accent",
  on_hold: "warning",
  completed: "success",
  archived: "neutral",
};

/** Project summary card with computed progress. */
export function ProjectCard({ project }: { project: ProjectDTO }) {
  const overdue = project.status === "active" && isOverdueDue(project.dueAt);
  const dimmed = project.status === "archived" || project.status === "completed";
  return (
    <Link
      href={`/projects/${project.id}`}
      className={cx(
        "group block rounded-xl border bg-white p-4 shadow-[0_1px_2px_rgb(0_0_0/0.05)] transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgb(0_0_0/0.18)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:bg-zinc-950 dark:shadow-none dark:hover:shadow-none",
        overdue
          ? "border-red-300 hover:border-red-400 dark:border-red-900/70 dark:hover:border-red-800"
          : "border-zinc-200/90 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700",
        dimmed && "opacity-80",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
          style={{ backgroundColor: project.color || "#52525b" }}
        >
          {project.name.charAt(0).toUpperCase() || "P"}
        </span>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 group-hover:underline group-hover:decoration-zinc-300 group-hover:underline-offset-4 dark:text-zinc-50">
          {project.name}
        </p>
        <Badge size="sm" tone={overdue ? "danger" : (statusTone[project.status] ?? "neutral")}>
          {overdue ? "Overdue" : project.status.replace("_", " ")}
        </Badge>
      </div>
      {project.description ? (
        <p className="mt-2.5 line-clamp-2 min-h-10 text-[13px] leading-5 text-zinc-500 dark:text-zinc-400">
          {project.description}
        </p>
      ) : (
        <p className="mt-2.5 min-h-10 text-[13px] leading-5 text-zinc-400 italic dark:text-zinc-600">
          No description yet.
        </p>
      )}
      <div className="mt-3 border-t border-zinc-100 pt-3 dark:border-zinc-900">
        <ProgressBar value={project.progress.percent} label={`${project.name} progress`} />
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <ProgressText done={project.progress.done} total={project.progress.total} />
          {project.dueAt ? (
            <span
              className={cx(
                "inline-flex shrink-0 items-center gap-1 text-xs tabular-nums",
                overdue ? "font-semibold text-red-600 dark:text-red-400" : "text-zinc-500 dark:text-zinc-400",
              )}
            >
              <CalendarDays size={12} aria-hidden="true" />
              {new Date(project.dueAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          ) : (
            <span className="text-xs text-zinc-400 dark:text-zinc-600">No deadline</span>
          )}
        </div>
      </div>
    </Link>
  );
}
