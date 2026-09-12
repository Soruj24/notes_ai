import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Day" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalendarDayPage({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/calendar/day"),
    searchParams,
  ]);
  return (
    <CalendarPage wid={wid} view="day" initialDate={parseViewDate(params)} projects={projects} />
  );
}
