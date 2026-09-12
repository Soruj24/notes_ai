import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface NotificationDTO {
  id: string;
  workspaceId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  status: "unread" | "read" | "archived";
  readAt?: string;
  linkHref?: string;
  createdAt: string;
}

/**
 * Inbox cache. Polls every 15s as the delivery baseline; the socket hook
 * invalidates on push for instant updates where a socket server is up.
 */
export const notificationsApi = createApi({
  reducerPath: "notificationsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Notifications"],
  endpoints: (build) => ({
    listNotifications: build.query<
      { notifications: NotificationDTO[]; unread: number },
      { wid: string; status?: string }
    >({
      query: ({ wid, status }) =>
        `workspaces/${wid}/notifications${status ? `?status=${status}` : ""}`,
      providesTags: ["Notifications"],
      keepUnusedDataFor: 15,
    }),
    setNotificationStatus: build.mutation<
      { notification: NotificationDTO },
      { wid: string; id: string; status: "read" | "dismissed" }
    >({
      query: ({ wid, id, status }) => ({
        url: `workspaces/${wid}/notifications/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Notifications"],
    }),
    readAllNotifications: build.mutation<{ updated: number }, { wid: string }>({
      query: ({ wid }) => ({
        url: `workspaces/${wid}/notifications/read-all`,
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useListNotificationsQuery,
  useSetNotificationStatusMutation,
  useReadAllNotificationsMutation,
} = notificationsApi;
