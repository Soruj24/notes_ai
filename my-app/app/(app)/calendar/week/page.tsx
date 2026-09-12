import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Week" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalendarWeekPage({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/calendar/week"),
    searchParams,
  ]);
  return (
    <CalendarPage wid={wid} view="week" initialDate={parseViewDate(params)} projects={projects} />
  );
}
