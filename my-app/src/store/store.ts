import { configureStore } from "@reduxjs/toolkit";
import { analyticsApi } from "@/src/store/analyticsApi";
import { dashboardApi } from "@/src/store/dashboardApi";
import { dependencyGraphApi } from "@/src/store/dependencyGraphApi";
import { notesApi } from "@/src/store/notesApi";
import { notificationsApi } from "@/src/store/notificationsApi";
import { remindersApi } from "@/src/store/remindersApi";
import { scheduleApi } from "@/src/store/scheduleApi";
import { tasksApi } from "@/src/store/tasksApi";
import tasksUiReducer from "@/src/store/tasksUiSlice";

/** Single Redux store: RTK Query caches + local UI slices. */
export function makeStore() {
  return configureStore({
    reducer: {
      [tasksApi.reducerPath]: tasksApi.reducer,
      [scheduleApi.reducerPath]: scheduleApi.reducer,
      [notesApi.reducerPath]: notesApi.reducer,
      [dashboardApi.reducerPath]: dashboardApi.reducer,
      [notificationsApi.reducerPath]: notificationsApi.reducer,
      [remindersApi.reducerPath]: remindersApi.reducer,
      [analyticsApi.reducerPath]: analyticsApi.reducer,
      [dependencyGraphApi.reducerPath]: dependencyGraphApi.reducer,
      tasksUi: tasksUiReducer,
    },
    middleware: (getDefault) =>
      getDefault().concat(
        tasksApi.middleware,
        scheduleApi.middleware,
        notesApi.middleware,
        dashboardApi.middleware,
        notificationsApi.middleware,
        remindersApi.middleware,
        analyticsApi.middleware,
        dependencyGraphApi.middleware,
      ),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
