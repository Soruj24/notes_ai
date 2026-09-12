import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface DashboardMetrics {
  doneToday: number;
  dueToday: number;
  overdue: number;
  upcoming: number;
  completionRate: number;
  notesThisWeek: number;
  eventsNext7Days: number;
  activeGoals: number;
  goalsAtRisk: number;
}

export interface DashboardInsight {
  id: string;
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  body: string;
}

export interface DashboardGoal {
  id: string;
  title: string;
  status: string;
  progress: number;
  targetDate?: string;
  computedProgress?: { done: number; total: number; percent: number; source: string };
}

/**
 * Dashboard reads: computed insights + goal list.
 * Refetched on every mount (staleTime 0 default) so the overview
 * is always fresh; mutations in other slices trigger refetch via
 * the shared Dashboard tag where wired.
 */
export const dashboardApi = createApi({
  reducerPath: "dashboardApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Dashboard"],
  endpoints: (build) => ({
    getInsights: build.query<
      { metrics: DashboardMetrics; insights: DashboardInsight[] },
      { wid: string }
    >({
      query: ({ wid }) => `workspaces/${wid}/insights`,
      providesTags: ["Dashboard"],
    }),
    getGoals: build.query<{ goals: DashboardGoal[] }, { wid: string }>({
      query: ({ wid }) => `workspaces/${wid}/goals`,
      transformResponse: (res: { goals: DashboardGoal[] }) => ({ goals: res.goals }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const { useGetInsightsQuery, useGetGoalsQuery } = dashboardApi;
