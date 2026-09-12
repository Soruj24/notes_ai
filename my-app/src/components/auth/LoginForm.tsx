"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { FieldErrors } from "@/src/lib/auth/validation";
import { normalizeNextPath } from "@/src/lib/auth/validation";

interface LoginFormProps {
  next: string;
}

/** Login form. Calls the JSON handler; all rules live in validation.ts. */
export function LoginForm({ next }: LoginFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  const target = normalizeNextPath(next, "/profile");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = (await res.json()) as {
        user?: { name: string };
        errors?: FieldErrors;
      };
      if (!res.ok) {
        setErrors(json.errors ?? { form: ["Something went wrong."] });
        return;
      }
      toast(`Welcome back${json.user ? `, ${json.user.name}` : ""}.`, {
        tone: "success",
      });
      router.push(target);
      router.refresh();
    } catch {
      setErrors({ form: ["Network error. Please try again."] });
    } finally {
      setPending(false);
    }
  }

  const formErrors = errors.form ?? [];
  return (
    <AuthCard
      title="Welcome back"
      description="Sign in to your workspace."
      footer={
        <>
          No account?{" "}
          <Link href="/register" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Create one
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        {formErrors.length ? (
          <p role="alert" className="rounded-lg border border-red-600/20 bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {formErrors.join(" ")}
          </p>
        ) : null}
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.join(" ")}
        />
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password?.join(" ")}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
