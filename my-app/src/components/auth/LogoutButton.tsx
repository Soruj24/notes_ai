"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/src/components/ui/button";

/** Signs out via the logout handler, then returns to the sign-in page. */
export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onLogout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Cookie clearing is best-effort; navigate regardless.
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <Button variant="outline" onClick={onLogout} disabled={pending}>
      {pending ? "Signing out…" : "Sign out"}
    </Button>
  );
}
