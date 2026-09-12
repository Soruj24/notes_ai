"use client";

import { useMemo, useState, type ReactNode } from "react";
import { cx, focusRing } from "@/src/lib/utils/cx";

export interface Column<T> {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  align?: "left" | "center" | "right";
  /** Enables header sorting using this extractor. */
  sortValue?: (row: T) => string | number;
}

interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  keyOf: (row: T, index: number) => string;
  caption?: string;
  empty?: ReactNode;
}

type SortDir = "asc" | "desc";

/** Responsive data table with optional header sorting and an empty slot. */
export function DataTable<T>({
  columns,
  rows,
  keyOf,
  caption,
  empty,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ key: string; dir: SortDir } | null>(null);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sort.dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, columns]);

  const toggleSort = (key: string) => {
    setSort((prev) =>
      prev?.key !== key
        ? { key, dir: "asc" }
        : prev.dir === "asc"
          ? { key, dir: "desc" }
          : null,
    );
  };

  const alignClass = (align?: Column<T>["align"]) =>
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  aria-sort={
                    col.sortValue
                      ? active
                        ? sort.dir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={cx(
                    "px-3 py-2.5 text-xs font-medium text-zinc-500",
                    alignClass(col.align),
                  )}
                >
                  {col.sortValue ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={cx("inline-flex items-center gap-1 rounded-md hover:text-zinc-900 dark:hover:text-zinc-100", focusRing)}
                    >
                      {col.header}
                      <span aria-hidden="true" className="text-[10px]">
                        {active ? (sort.dir === "asc" ? "▲" : "▼") : "△"}
                      </span>
                    </button>
                  ) : (
                    col.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr
              key={keyOf(row, i)}
              className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50/70 dark:border-zinc-900 dark:hover:bg-zinc-900/40"
            >
              {columns.map((col) => (
                <td key={col.key} className={cx("px-3 py-2.5", alignClass(col.align))}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-3 py-10 text-center text-sm text-zinc-500">
                {empty ?? "No rows yet."}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
