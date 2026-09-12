import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Schedule" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Schedule = agenda over the merged event+task stream.
 * Reuses CalendarPage (no duplicated view logic).
 */
export default async function SchedulePage({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/schedule"),
    searchParams,
  ]);
  return (
    <CalendarPage
      wid={wid}
      view="agenda"
      initialDate={parseViewDate(params)}
      projects={projects}
      context="schedule"
    />
  );
}
