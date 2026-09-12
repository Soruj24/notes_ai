import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Calendar" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Default calendar view: week. */
export default async function CalendarHome({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/calendar"),
    searchParams,
  ]);
  return (
    <CalendarPage wid={wid} view="week" initialDate={parseViewDate(params)} projects={projects} />
  );
}
