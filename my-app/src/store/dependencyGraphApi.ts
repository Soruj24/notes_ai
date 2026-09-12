import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface DependencyRecord {
  id: string;
  workspaceId: string;
  predecessorTaskId: string;
  successorTaskId: string;
  type: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DependencyGraphDTO {
  nodes: Array<{
    id: string;
    title: string;
    status: string;
    projectId?: string;
    priority: string;
    durationMin?: number;
  }>;
  edges: Array<{ id: string; predecessorTaskId: string; successorTaskId: string; type: string }>;
  blocked: Record<string, boolean>;
  blockedDetails: Record<string, string[]>;
  cycle: string[] | null;
  topologicalOrder: string[] | null;
  criticalPath: { path: string[]; totalMin: number };
  stats: { totalTasks: number; totalEdges: number; blockedCount: number };
}

export const dependencyGraphApi = createApi({
  reducerPath: "dependencyGraphApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Dependency", "DependencyGraph"],
  endpoints: (build) => ({
    listDependencies: build.query<
      { dependencies: DependencyRecord[] },
      { workspaceId: string; taskId?: string; type?: string }
    >({
      query: ({ workspaceId, taskId, type }) => {
        const p = new URLSearchParams({ workspaceId });
        if (taskId) p.set("taskId", taskId);
        if (type) p.set("type", type);
        return `v1/dependencies?${p.toString()}`;
      },
      providesTags: ["Dependency"],
    }),
    createDependency: build.mutation<
      { dependency: DependencyRecord },
      { workspaceId: string; predecessorTaskId: string; successorTaskId: string; type: string }
    >({
      query: (body) => ({ url: "v1/dependencies", method: "POST", body }),
      invalidatesTags: ["Dependency", "DependencyGraph"],
    }),
    deleteDependency: build.mutation<{ ok: boolean }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `v1/dependencies/${id}?workspaceId=${encodeURIComponent(workspaceId)}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Dependency", "DependencyGraph"],
    }),
    getDependencyGraph: build.query<DependencyGraphDTO, { workspaceId: string }>({
      query: ({ workspaceId }) => `v1/dependencies/graph?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: ["DependencyGraph"],
    }),
    getProjectDependencyGraph: build.query<
      DependencyGraphDTO,
      { workspaceId: string; projectId: string }
    >({
      query: ({ workspaceId, projectId }) =>
        `v1/projects/${projectId}/dependencies/graph?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: ["DependencyGraph"],
    }),
    getProjectCriticalPath: build.query<
      { criticalTasks: DependencyGraphDTO["nodes"]; criticalPath: string[]; totalDuration: number; totalDurationHours: number; cycle?: string[] | null },
      { workspaceId: string; projectId: string }
    >({
      query: ({ workspaceId, projectId }) =>
        `v1/projects/${projectId}/dependencies/critical-path?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: ["DependencyGraph"],
    }),
    getProjectSuggestions: build.query<
      { suggestions: Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }> },
      { workspaceId: string; projectId?: string }
    >({
      query: ({ workspaceId, projectId }) =>
        projectId
          ? `v1/projects/${projectId}/dependencies/suggestions?workspaceId=${encodeURIComponent(workspaceId)}`
          : `v1/dependencies/suggestions?workspaceId=${encodeURIComponent(workspaceId)}`,
      providesTags: ["Dependency"],
    }),
    suggestProjectDependencies: build.mutation<
      { suggestions: Array<{ sourceTaskId: string; targetTaskId: string; reason: string; confidence: number }> },
      { workspaceId: string; projectId?: string }
    >({
      query: ({ workspaceId, projectId }) => ({
        url: projectId ? `v1/projects/${projectId}/dependencies/suggestions` : `v1/dependencies/suggestions`,
        method: "POST",
        body: { workspaceId },
      }),
    }),
  }),
});

export const {
  useListDependenciesQuery,
  useCreateDependencyMutation,
  useDeleteDependencyMutation,
  useGetDependencyGraphQuery,
  useGetProjectDependencyGraphQuery,
  useGetProjectCriticalPathQuery,
  useGetProjectSuggestionsQuery,
  useSuggestProjectDependenciesMutation,
} = dependencyGraphApi;
