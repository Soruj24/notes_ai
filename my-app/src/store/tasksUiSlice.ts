import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { TaskSort } from "@/src/components/tasks/types";

/** Local (non-server) task UI state: sort order + current search text. */
interface TasksUiState {
  sort: TaskSort;
  search: string;
}

const initialState: TasksUiState = {
  sort: "due",
  search: "",
};

export const tasksUiSlice = createSlice({
  name: "tasksUi",
  initialState,
  reducers: {
    setTaskSort(state, action: PayloadAction<TaskSort>) {
      state.sort = action.payload;
    },
    setTaskSearch(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
    resetTasksUi() {
      return initialState;
    },
  },
});

export const { setTaskSort, setTaskSearch, resetTasksUi } = tasksUiSlice.actions;
export default tasksUiSlice.reducer;
