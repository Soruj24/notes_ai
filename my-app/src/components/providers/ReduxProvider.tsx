"use client";

import { useState } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/src/store/store";

/** Per-session Redux store (state initializer runs once per mount). */
export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  return <Provider store={store}>{children}</Provider>;
}
