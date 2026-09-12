import type { Metadata } from "next";
import { LoginForm } from "@/src/components/auth/LoginForm";
import { normalizeNextPath } from "@/src/lib/auth/validation";

export const metadata: Metadata = { title: "Sign in" };

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/** Server wrapper: reads ?next=, form logic lives in LoginForm. */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  return <LoginForm next={normalizeNextPath(raw, "/profile")} />;
}
