"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/src/components/auth/AuthCard";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { FieldErrors } from "@/src/lib/auth/validation";

/** Registration form. Calls the JSON handler; all rules live in validation.ts. */
export function RegisterForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setErrors({});
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const json = (await res.json()) as {
        user?: { name: string };
        errors?: FieldErrors;
      };
      if (!res.ok) {
        setErrors(json.errors ?? { form: ["Something went wrong."] });
        return;
      }
      toast(`Account created${json.user ? ` — welcome, ${json.user.name}` : ""}.`, {
        tone: "success",
      });
      router.push("/profile");
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
      title="Create your account"
      description="One account for notes, tasks, calendar, and AI."
      footer={
        <>
          Have an account?{" "}
          <Link href="/login" className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Sign in
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
          id="register-name"
          autoComplete="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name?.join(" ")}
        />
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          label="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email?.join(" ")}
        />
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          label="Password"
          hint="At least 8 characters with a letter and a number."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password?.join(" ")}
        />
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          label="Confirm password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword?.join(" ")}
        />
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthCard>
  );
}
