"use client";

import { useCallback, useEffect, useState } from "react";

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

/**
 * Typed GET against a same-origin /api/admin/dashboard/* endpoint.
 * Cookies (httpOnly session) ride along automatically. Non-2xx surfaces
 * the server's { error } message; network failures get a generic message.
 */
export function useDashboardFetch<T>(url: string): FetchState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const json = (await res.json().catch(() => null)) as { error?: string } | T | null;
        if (!res.ok) {
          const message =
            json && typeof json === "object" && "error" in json && typeof json.error === "string"
              ? json.error
              : `Request failed (${res.status}).`;
          throw new Error(message);
        }
        return json as T;
      })
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url, attempt]);

  return { data, loading, error, retry };
}
