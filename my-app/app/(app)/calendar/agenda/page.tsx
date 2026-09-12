import type { Metadata } from "next";
import { CalendarPage } from "@/src/components/calendar/CalendarPage";
import { getCalendarContext, parseViewDate } from "@/src/lib/calendar-page";

export const metadata: Metadata = { title: "Agenda" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CalendarAgendaPage({ searchParams }: Props) {
  const [{ wid, projects }, params] = await Promise.all([
    getCalendarContext("/calendar/agenda"),
    searchParams,
  ]);
  return (
    <CalendarPage wid={wid} view="agenda" initialDate={parseViewDate(params)} projects={projects} />
  );
}
