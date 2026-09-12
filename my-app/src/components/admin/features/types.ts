"use client";

export interface FeatureTargetUser {
  id: string;
  email: string;
}

export interface FeatureRow {
  key: string;
  name: string;
  description: string;
  group: string;
  enabled: boolean;
  rolloutPercentage: number;
  targetRoles: string[];
  targetUsers: FeatureTargetUser[];
  environment: string;
  updatedAt: string;
}

export interface FeatureUpdate {
  enabled?: boolean;
  rolloutPercentage?: number;
  environment?: string;
  targetRoles?: string[];
  targetUserEmails?: string[];
}

export function apiErrorMessage(json: unknown, fallback: string): string {
  if (json && typeof json === "object") {
    const j = json as { error?: unknown; errors?: unknown };
    if (typeof j.error === "string") return j.error;
    if (j.errors && typeof j.errors === "object") {
      const first = Object.values(j.errors as Record<string, unknown>).flat().find((v) => typeof v === "string");
      if (typeof first === "string") return first;
    }
  }
  return fallback;
}

export async function fetchFeatures(): Promise<FeatureRow[]> {
  const res = await fetch("/api/admin/features", { cache: "no-store" });
  const json = (await res.json().catch(() => null)) as { features?: FeatureRow[]; error?: string };
  if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status}).`);
  return json.features ?? [];
}

export async function updateFeature(key: string, input: FeatureUpdate): Promise<FeatureRow> {
  const res = await fetch(`/api/admin/features/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = (await res.json().catch(() => null)) as { feature?: FeatureRow; error?: string; errors?: unknown };
  if (!res.ok || !json.feature) throw new Error(apiErrorMessage(json, `Request failed (${res.status}).`));
  return json.feature;
}
