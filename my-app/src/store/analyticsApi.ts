import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export type AnalyticsRange = "today" | "week" | "month";

export interface AnalyticsData {
  range: AnalyticsRange;
  from: string;
  to: string;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  focusMin: number;
  byPriority: Array<{ priority: string; total: number; done: number }>;
  byProject: Array<{ projectId: string; name: string; done: number; total: number; percent: number }>;
  goals: Array<{ id: string; title: string; percent: number; source: string }>;
  daily: Array<{ date: string; completed: number; focusMin: number }>;
}

/** Analytics cache. Invalidated alongside dashboard/task mutations. */
export const analyticsApi = createApi({
  reducerPath: "analyticsApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Analytics"],
  endpoints: (build) => ({
    getAnalytics: build.query<AnalyticsData, { wid: string; range: AnalyticsRange }>({
      query: ({ wid, range }) => `workspaces/${wid}/analytics?range=${range}`,
      transformResponse: (res: { analytics: AnalyticsData }) => res.analytics,
      providesTags: ["Analytics"],
    }),
  }),
});

export const { useGetAnalyticsQuery } = analyticsApi;
