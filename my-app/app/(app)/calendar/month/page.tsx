import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Month" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalendarMonthPage({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/calendar/month"),
    searchParams,
  ]);
  return (
    <CalendarPage wid={wid} view="month" initialDate={parseViewDate(params)} projects={projects} />
  );
}
