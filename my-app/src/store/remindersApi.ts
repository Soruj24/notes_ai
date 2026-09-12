import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface ReminderDTO {
  id: string;
  workspaceId: string;
  ownerId: string;
  title: string;
  remindAt: string | Date;
  channel: string;
  status: string;
  snoozedUntil?: string | Date;
  taskId?: string;
  eventId?: string;
  noteId?: string;
  recurrence: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

/** Reminder cache. Mutations invalidate lists + notification inbox. */
export const remindersApi = createApi({
  reducerPath: "remindersApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Reminders"],
  endpoints: (build) => ({
    listReminders: build.query<ReminderDTO[], { wid: string; status?: string }>({
      query: ({ wid, status }) =>
        `workspaces/${wid}/reminders${status ? `?status=${status}` : ""}`,
      transformResponse: (res: { reminders: ReminderDTO[] }) => res.reminders,
      providesTags: ["Reminders"],
    }),
    createReminder: build.mutation<ReminderDTO, { wid: string; body: Record<string, unknown> }>({
      query: ({ wid, body }) => ({
        url: `workspaces/${wid}/reminders`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { reminder: ReminderDTO }) => res.reminder,
      invalidatesTags: ["Reminders"],
    }),
    updateReminder: build.mutation<
      ReminderDTO,
      { wid: string; id: string; body: Record<string, unknown> }
    >({
      query: ({ wid, id, body }) => ({
        url: `workspaces/${wid}/reminders/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { reminder: ReminderDTO }) => res.reminder,
      invalidatesTags: ["Reminders"],
    }),
    deleteReminder: build.mutation<{ ok: boolean }, { wid: string; id: string }>({
      query: ({ wid, id }) => ({
        url: `workspaces/${wid}/reminders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Reminders"],
    }),
  }),
});

export const {
  useListRemindersQuery,
  useCreateReminderMutation,
  useUpdateReminderMutation,
  useDeleteReminderMutation,
} = remindersApi;
