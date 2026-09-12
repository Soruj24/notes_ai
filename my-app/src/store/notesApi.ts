import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { NoteDTO } from "@/src/components/notes/types";

/**
 * RTK Query cache for notes (dashboard + quick capture).
 * Note pages keep their server first-paint; this cache serves
 * embedded surfaces and invalidates on every mutation.
 */

export const notesApi = createApi({
  reducerPath: "notesApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["NoteLists", "Note"],
  endpoints: (build) => ({
    listNotes: build.query<NoteDTO[], { wid: string; limit?: number }>({
      query: ({ wid, limit }) =>
        `workspaces/${wid}/notes${limit ? `?archived=0&limit=${limit}` : "?archived=0"}`,
      transformResponse: (res: { notes: NoteDTO[] }) => res.notes,
      providesTags: ["NoteLists"],
    }),
    createNote: build.mutation<NoteDTO, { wid: string; body: Record<string, unknown> }>({
      query: ({ wid, body }) => ({
        url: `workspaces/${wid}/notes`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { note: NoteDTO }) => res.note,
      invalidatesTags: ["NoteLists"],
    }),
  }),
});

export const { useListNotesQuery, useCreateNoteMutation } = notesApi;
