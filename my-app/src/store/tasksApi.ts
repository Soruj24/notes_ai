import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type {
  TaskCountsDTO,
  TaskDTO,
  TasksView,
} from "@/src/components/tasks/types";
import { analyticsApi } from "@/src/store/analyticsApi";
import { scheduleApi } from "@/src/store/scheduleApi";

/**
 * RTK Query cache for tasks. Lists are cached per (wid, view, filters);
 * every mutation invalidates TaskLists + TaskCounts (+ the Task entity)
 * and the shared Schedule cache (calendar shows task deadlines).
 * Instant checkbox feedback lives in component-local state; the cache
 * refetch keeps every view consistent.
 */



export interface ListTasksArgs {
  wid: string;
  view: TasksView;
  query?: string;
  tagId?: string;
  projectId?: string;
  goalId?: string;
}

export const tasksApi = createApi({
  reducerPath: "tasksApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["TaskLists", "TaskCounts", "Task"],
  endpoints: (build) => ({
    listTasks: build.query<TaskDTO[], ListTasksArgs>({
      query: ({ wid, view, ...rest }) => {
        const params = new URLSearchParams({ view });
        for (const [k, v] of Object.entries(rest)) {
          if (v) params.set(k, v);
        }
        return `workspaces/${wid}/tasks?${params.toString()}`;
      },
      transformResponse: (res: { tasks: TaskDTO[] }) => res.tasks,
      providesTags: ["TaskLists"],
    }),
    getTask: build.query<TaskDTO, { wid: string; id: string }>({
      query: ({ wid, id }) => `workspaces/${wid}/tasks/${id}`,
      transformResponse: (res: { task: TaskDTO }) => res.task,
      providesTags: (_res, _err, { id }) => [{ type: "Task", id }],
    }),
    getTaskCounts: build.query<TaskCountsDTO, { wid: string }>({
      query: ({ wid }) => `workspaces/${wid}/tasks/counts`,
      transformResponse: (res: { counts: TaskCountsDTO }) => res.counts,
      providesTags: ["TaskCounts"],
    }),
    createTask: build.mutation<TaskDTO, { wid: string; body: Record<string, unknown> }>({
      query: ({ wid, body }) => ({
        url: `workspaces/${wid}/tasks`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: ["TaskLists", "TaskCounts"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
          dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
        } catch {
          // Mutation failed: nothing to invalidate.
        }
      },
    }),
    updateTask: build.mutation<
      TaskDTO,
      { wid: string; id: string; body: Record<string, unknown> }
    >({
      query: ({ wid, id, body }) => ({
        url: `workspaces/${wid}/tasks/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        "TaskCounts",
        { type: "Task", id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
          dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
        } catch {
          // Mutation failed: nothing to invalidate.
        }
      },
    }),
    deleteTask: build.mutation<{ ok: boolean }, { wid: string; id: string }>({
      query: ({ wid, id }) => ({
        url: `workspaces/${wid}/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TaskLists", "TaskCounts"],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
          dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
        } catch {
          // Mutation failed: nothing to invalidate.
        }
      },
    }),
    completeTask: build.mutation<
      { task: TaskDTO; next: TaskDTO | null },
      { wid: string; id: string }
    >({
      query: ({ wid, id }) => ({
        url: `workspaces/${wid}/tasks/${id}/complete`,
        method: "POST",
      }),
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        "TaskCounts",
        { type: "Task", id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
          dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
        } catch {
          // Mutation failed: nothing to invalidate.
        }
      },
    }),
    reopenTask: build.mutation<TaskDTO, { wid: string; id: string }>({
      query: ({ wid, id }) => ({
        url: `workspaces/${wid}/tasks/${id}/reopen`,
        method: "POST",
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        "TaskCounts",
        { type: "Task", id },
      ],
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(scheduleApi.util.invalidateTags(["Schedule"]));
          dispatch(analyticsApi.util.invalidateTags(["Analytics"]));
        } catch {
          // Mutation failed: nothing to invalidate.
        }
      },
    }),
    addSubtask: build.mutation<TaskDTO, { wid: string; id: string; title: string }>({
      query: ({ wid, id, title }) => ({
        url: `workspaces/${wid}/tasks/${id}/subtasks`,
        method: "POST",
        body: { title },
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        { type: "Task", id },
      ],
    }),
    updateSubtask: build.mutation<
      TaskDTO,
      { wid: string; id: string; subId: string; body: Record<string, unknown> }
    >({
      query: ({ wid, id, subId, body }) => ({
        url: `workspaces/${wid}/tasks/${id}/subtasks/${subId}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        { type: "Task", id },
      ],
    }),
    removeSubtask: build.mutation<TaskDTO, { wid: string; id: string; subId: string }>({
      query: ({ wid, id, subId }) => ({
        url: `workspaces/${wid}/tasks/${id}/subtasks/${subId}`,
        method: "DELETE",
      }),
      transformResponse: (res: { task: TaskDTO }) => res.task,
      invalidatesTags: (_res, _err, { id }) => [
        "TaskLists",
        { type: "Task", id },
      ],
    }),
  }),
});

export const {
  useListTasksQuery,
  useGetTaskQuery,
  useGetTaskCountsQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCompleteTaskMutation,
  useReopenTaskMutation,
  useAddSubtaskMutation,
  useUpdateSubtaskMutation,
  useRemoveSubtaskMutation,
} = tasksApi;
