import type { Metadata } from "next";
import { PlannerView } from "@/src/components/planner/PlannerView";
import { requireWorkspace } from "@/src/lib/workspace";

export const metadata: Metadata = { title: "Planner" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Day + week planner. Nothing mutates until Apply Plan confirms. */
export default async function PlannerPage({ searchParams }: Props) {
  const { workspace } = await requireWorkspace("/planner");
  const params = await searchParams;
  const rawDate = Array.isArray(params.date) ? params.date[0] : params.date;
  const date =
    rawDate && !Number.isNaN(new Date(rawDate).getTime())
      ? rawDate
      : new Date().toISOString();
  const rawTab = Array.isArray(params.view) ? params.view[0] : params.view;
  return (
    <PlannerView
      wid={workspace.id}
      initialDate={date}
      initialTab={rawTab === "week" ? "week" : "day"}
    />
  );
}
