import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { CalendarView } from "@/src/components/calendar/types";
import type {
  EventDTO,
  ScheduleDTO,
} from "@/src/components/calendar/types";

/**
 * RTK Query cache for events + merged schedule.
 * Event mutations invalidate EventLists and Schedule; task mutations
 * invalidate Schedule from tasksApi via onQueryStarted (see tasksApi).
 */

export const scheduleApi = createApi({
  reducerPath: "scheduleApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["EventLists", "Schedule", "CalendarEvent"],
  endpoints: (build) => ({
    listEvents: build.query<
      EventDTO[],
      { wid: string; from?: string; to?: string; status?: string }
    >({
      query: ({ wid, ...rest }) => {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v) params.set(k, v);
        }
        const qs = params.toString();
        return `workspaces/${wid}/events${qs ? `?${qs}` : ""}`;
      },
      transformResponse: (res: { events: EventDTO[] }) => res.events,
      providesTags: ["EventLists"],
    }),
    getSchedule: build.query<
      ScheduleDTO,
      { wid: string; view: CalendarView; date: string }
    >({
      query: ({ wid, view, date }) =>
        `workspaces/${wid}/schedule?view=${view}&date=${encodeURIComponent(date)}`,
      providesTags: ["Schedule"],
    }),
    createEvent: build.mutation<EventDTO, { wid: string; body: Record<string, unknown> }>({
      query: ({ wid, body }) => ({
        url: `workspaces/${wid}/events`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { event: EventDTO }) => res.event,
      invalidatesTags: ["EventLists", "Schedule"],
    }),
    updateEvent: build.mutation<
      EventDTO,
      { wid: string; id: string; body: Record<string, unknown> }
    >({
      query: ({ wid, id, body }) => ({
        url: `workspaces/${wid}/events/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { event: EventDTO }) => res.event,
      invalidatesTags: (_res, _err, { id }) => [
        "EventLists",
        "Schedule",
        { type: "CalendarEvent", id },
      ],
    }),
    deleteEvent: build.mutation<{ ok: boolean }, { wid: string; id: string }>({
      query: ({ wid, id }) => ({
        url: `workspaces/${wid}/events/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["EventLists", "Schedule"],
    }),
  }),
});

export const {
  useListEventsQuery,
  useGetScheduleQuery,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventMutation,
} = scheduleApi;
