"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { useToast } from "@/src/components/ui/toast";
import type { FieldErrors } from "@/src/lib/auth/validation";

interface ProfileFormProps {
  initialName: string;
  email: string;
  memberSince: string;
}

function FormError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-red-600/20 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-950/60 dark:text-red-300"
    >
      {messages.join(" ")}
    </p>
  );
}

/** Profile + password management. Thin fetch wrappers over the JSON handlers. */
export function ProfileForm({ initialName, email, memberSince }: ProfileFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [nameErrors, setNameErrors] = useState<FieldErrors>({});
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pwErrors, setPwErrors] = useState<FieldErrors>({});
  const [savingPw, setSavingPw] = useState(false);

  const nameDirty = name.trim() !== savedName.trim();
  const pwReady =
    currentPassword.length > 0 && newPassword.length > 0 && confirmNewPassword.length > 0;

  async function onSaveName(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    setNameErrors({});
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = (await res.json()) as {
        user?: { name: string };
        errors?: FieldErrors;
      };
      if (!res.ok) {
        setNameErrors(json.errors ?? { form: ["Something went wrong."] });
        return;
      }
      if (json.user) {
        setName(json.user.name);
        setSavedName(json.user.name);
      }
      toast("Profile updated.", { tone: "success" });
    } catch {
      setNameErrors({ form: ["Network error. Please try again."] });
    } finally {
      setSavingName(false);
    }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setSavingPw(true);
    setPwErrors({});
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword }),
      });
      const json = (await res.json()) as { errors?: FieldErrors };
      if (!res.ok) {
        setPwErrors(json.errors ?? { form: ["Something went wrong."] });
        return;
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      toast("Password changed. Other devices were signed out.", {
        tone: "success",
      });
    } catch {
      setPwErrors({ form: ["Network error. Please try again."] });
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 sm:gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>How your name appears across the workspace.</CardDescription>
        </CardHeader>
        <form onSubmit={onSaveName} noValidate>
          <CardContent className="grid gap-4">
            <FormError messages={nameErrors.form} />
            <Input id="profile-name" autoComplete="name" label="Display name" value={name} onChange={(e) => setName(e.target.value)} error={nameErrors.name?.join(" ")} />
            <Input id="profile-email" label="Email" value={email} disabled hint={`Member since ${memberSince}. Email changes are not available in this phase.`} />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingName || !nameDirty} className="max-sm:w-full">
              {savingName ? "Saving…" : "Save changes"}
            </Button>
            {!nameDirty && !savingName ? (
              <span className="text-xs text-zinc-400 dark:text-zinc-500">No unsaved changes</span>
            ) : null}
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Changing it signs you out on every other device.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onChangePassword} noValidate>
          <CardContent className="grid gap-4">
            <FormError messages={pwErrors.form} />
            <Input id="pw-current" type="password" autoComplete="current-password" label="Current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} error={pwErrors.currentPassword?.join(" ")} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input id="pw-new" type="password" autoComplete="new-password" label="New password" hint="At least 8 characters with a letter and a number." value={newPassword} onChange={(e) => setNewPassword(e.target.value)} error={pwErrors.newPassword?.join(" ")} />
              <Input id="pw-confirm" type="password" autoComplete="new-password" label="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} error={pwErrors.confirmNewPassword?.join(" ")} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={savingPw || !pwReady} className="max-sm:w-full">
              {savingPw ? "Updating…" : "Change password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
